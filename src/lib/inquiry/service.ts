import "server-only";
import { randomBytes } from "node:crypto";
import { getSiteData } from "@/lib/cms/data";
import type { SiteContent } from "@/lib/cms/schema";
import { bookingOptions, type BookingOption } from "@/lib/cms/sessions";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";
import { sendEmail } from "@/lib/email";
import { hashIp, sha256 } from "@/lib/security";
import { verifyTurnstile } from "@/lib/turnstile";
import { clientConfirmationEmail, ownerNotificationEmail, type EmailContext } from "./emails";
import { estimate, type Estimate } from "./estimate";
import { fieldErrors, inquirySchema, type Inquiry } from "./schema";
import { resolveStore, type InquiryRow } from "./store";

export const RATE_LIMIT = { windowMinutes: 15, maxAttempts: 6 };
const MIN_FILL_MS = 2500;

export type InquiryResult =
  | { ok: true; ref: string; duplicate?: boolean; spam?: boolean }
  | { ok: false; status: number; message: string; fields?: Record<string, string> };

const fallbackContact = () =>
  publicEnv.contactEmail ? ` You can also email ${publicEnv.contactEmail} directly.` : "";

export function newRef() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return `RCL-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

/**
 * The single server-side entry point for every inquiry form.
 * Order: validate → spam traps → rate limit → bot check → dedupe → persist → notify.
 * A submission is only reported as received after it has been stored.
 */
export async function handleInquiry(raw: unknown, meta: { ip: string; userAgent: string | null }): Promise<InquiryResult> {
  const parsed = inquirySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, status: 422, message: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
  }
  const data = parsed.data;
  const ipHash = hashIp(meta.ip);

  const resolved = resolveStore();
  if (!resolved.store) {
    console.error(`[inquiry] REJECTED (not stored): ${resolved.reason}`);
    return {
      ok: false,
      status: 503,
      message: `Our booking form is temporarily unavailable, so your message was not sent.${fallbackContact()}`,
    };
  }
  const store = resolved.store;

  // Honeypot / impossibly fast submissions: answer like success, store nothing.
  const tooFast = typeof data.startedAt === "number" && data.startedAt > 0 && Date.now() - data.startedAt < MIN_FILL_MS;
  if ((data.company_website && data.company_website.trim() !== "") || tooFast) {
    await store.recordAttempt(ipHash, "spam").catch(() => {});
    return { ok: true, ref: newRef(), spam: true };
  }

  try {
    const attempts = await store.countRecentAttempts(ipHash, RATE_LIMIT.windowMinutes);
    if (attempts >= RATE_LIMIT.maxAttempts) {
      return {
        ok: false,
        status: 429,
        message: `That's a lot of messages in a short time. Please wait a few minutes and try again.${fallbackContact()}`,
      };
    }
  } catch (err) {
    console.error("[inquiry] rate-limit check failed; continuing", err instanceof Error ? err.message : err);
  }
  await store.recordAttempt(ipHash, "attempt").catch(() => {});

  const bot = await verifyTurnstile(data.turnstileToken, meta.ip);
  if (!bot.ok) {
    return { ok: false, status: 400, message: "We couldn't confirm you're human. Please complete the quick check and try again." };
  }

  const dedupeKey = sha256([data.email, data.kind, data.category, data.message ?? "", data.packageId ?? "", data.preferredDate ?? ""].join("|"));
  try {
    const dup = await store.findRecentDuplicate(dedupeKey, 15);
    if (dup) return { ok: true, ref: dup.ref, duplicate: true };
  } catch (err) {
    console.error("[inquiry] duplicate check failed; continuing", err instanceof Error ? err.message : err);
  }

  const { content } = await getSiteData();
  const { pricing } = content;
  const options = bookingOptions(content, { includeHidden: true });
  // Unknown session types (e.g. a category deleted mid-visit) are kept as "Something else".
  if (!options.some((o) => o.bookingId === data.category)) data.category = "other";
  if (data.packageId && !pricing.packages.some((p) => p.id === data.packageId)) data.packageId = undefined;
  const est = estimate({ category: data.category, packageId: data.packageId, extraPhotos: data.extraPhotos, addOns: data.addOns }, pricing, options);
  const row: InquiryRow = {
    ref: newRef(),
    kind: data.kind,
    category: data.category,
    package_id: data.packageId ?? null,
    extra_photos: data.extraPhotos ?? 0,
    add_ons: data.addOns ?? [],
    group_details: data.groupDetails ?? null,
    animals: data.animals ?? null,
    special_needs: data.specialNeeds ?? null,
    location_preference: data.locationPreference ?? null,
    city: data.city ?? null,
    zip: data.zip ?? null,
    date_flexibility: data.dateFlexibility ?? null,
    preferred_date: data.preferredDate ?? null,
    preferred_date_alt: data.preferredDateAlt ?? null,
    preferred_time: data.preferredTime ?? null,
    travel_notes: data.travelNotes ?? null,
    name: data.name,
    email: data.email,
    phone: data.phone ?? null,
    sms_opt_in: Boolean(data.smsOptIn && data.phone),
    social_link: data.social,
    message: data.message ?? null,
    inspiration_photo_ids: data.inspirationIds ?? [],
    story_subject: data.storySubject ?? null,
    story_feeling: data.storyFeeling ?? null,
    estimate_cents: est.kind === "package" ? est.totalCents : null,
    estimate_label: est.label,
    estimate_detail: est,
    consent_privacy: true,
    consent_at: new Date().toISOString(),
    utm: data.utm ?? {},
    landing_path: data.landingPath ?? null,
    referrer: data.referrer ?? null,
    ip_hash: ipHash,
    user_agent: meta.userAgent?.slice(0, 300) ?? null,
    dedupe_key: dedupeKey,
  };

  let saved: { id: string; ref: string };
  try {
    // Never lose an inquiry because the database hasn't had a one-time update yet:
    // fall back to an older shape and keep the details in the message instead.
    let attempt = row;
    for (let tries = 0; ; tries++) {
      try {
        saved = await store.insert(attempt);
        break;
      } catch (err) {
        if (tries >= 2) throw err;
        if (isMissingColumn(err, "social_link") && "social_link" in attempt) {
          // Before supabase/migrations/20261110000000_social.sql there's no social_link column.
          console.warn("[inquiry] database is missing the social link column (supabase/migrations/20261110000000_social.sql); keeping it in the message");
          const { social_link, ...rest } = attempt;
          attempt = { ...rest, message: [`[Social: ${social_link}]`, rest.message].filter(Boolean).join("\n\n") } as InquiryRow;
          continue;
        }
        // Before the 20261109 database update, inquiries only accept the original session types.
        if (!isCheckViolation(err)) throw err;
        console.warn("[inquiry] database is missing the flexible-categories update (supabase/migrations/20261109000000_flexible.sql); storing as 'other'");
        const note = `[Session: ${labelOf(options, data.category)}${data.packageId ? ` · package ${data.packageId}` : ""}]`;
        attempt = { ...attempt, category: LEGACY_CATEGORIES.has(attempt.category) ? attempt.category : "other", package_id: attempt.package_id && LEGACY_PACKAGES.has(attempt.package_id) ? attempt.package_id : null, message: [note, attempt.message].filter(Boolean).join("\n\n") };
      }
    }
  } catch (err) {
    console.error("[inquiry] INSERT FAILED", err instanceof Error ? err.message : err);
    return {
      ok: false,
      status: 500,
      message: `We couldn't save your inquiry just now, so it was not sent. Please try again in a moment.${fallbackContact()}`,
    };
  }

  const ctx = emailContext(content, options);
  const [owner, client] = await Promise.all([notifyOwner(data, saved.ref, est, ctx, saved.id), confirmClient(data, saved.ref, est, ctx)]);
  await store.updateNotification(saved.id, owner, client);
  if (owner !== "sent") console.warn(`[inquiry] ${saved.ref} saved; owner notification ${owner}`);

  return { ok: true, ref: saved.ref };
}

const LEGACY_CATEGORIES = new Set(["people", "animals", "weddings-events", "business-branding", "other"]);
const LEGACY_PACKAGES = new Set(["little", "full", "whole"]);
/** Postgres "undefined column" or PostgREST's "could not find the column in the schema cache". */
const isMissingColumn = (err: unknown, column: string) => {
  const e = err as { code?: string; message?: string } | null;
  return (e?.code === "42703" || e?.code === "PGRST204") && (e?.message ?? "").includes(column);
};
const isCheckViolation = (err: unknown) => {
  const e = err as { code?: string; message?: string } | null;
  return e?.code === "23514" || /check constraint/i.test(e?.message ?? "");
};
const labelOf = (options: BookingOption[], id: string) => options.find((c) => c.bookingId === id)?.label ?? id;

function emailContext(content: SiteContent, options: BookingOption[]): EmailContext {
  return { content, options, siteUrl: publicEnv.siteUrl, contactEmail: publicEnv.contactEmail, contactPhone: publicEnv.contactPhone };
}

async function notifyOwner(d: Inquiry, ref: string, est: Estimate, ctx: EmailContext, leadId: string) {
  const to = serverEnv().ownerNotificationEmail;
  if (!to) return "skipped";
  const mail = ownerNotificationEmail(d, ref, est, ctx, leadId);
  const res = await sendEmail({ to, replyTo: d.email, ...mail });
  return res.status;
}

async function confirmClient(d: Inquiry, ref: string, est: Estimate, ctx: EmailContext) {
  const owner = serverEnv().ownerNotificationEmail;
  const mail = clientConfirmationEmail(d, ref, est, ctx);
  const res = await sendEmail({ to: d.email, replyTo: owner ?? publicEnv.contactEmail, ...mail });
  return res.status;
}
