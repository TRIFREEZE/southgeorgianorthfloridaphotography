import "server-only";
import { randomBytes } from "node:crypto";
import { bookingCategories } from "@/content/services";
import { formatPrice, pricing } from "@/content/pricing";
import { site } from "@/content/site";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";
import { emailLayout, kv, p, sendEmail } from "@/lib/email";
import { hashIp, sha256 } from "@/lib/security";
import { verifyTurnstile } from "@/lib/turnstile";
import { estimate } from "./estimate";
import { fieldErrors, inquirySchema, type Inquiry } from "./schema";
import { resolveStore, type InquiryRow } from "./store";

export const RATE_LIMIT = { windowMinutes: 15, maxAttempts: 6 };
const MIN_FILL_MS = 2500;

export type InquiryResult =
  | { ok: true; ref: string; duplicate?: boolean; spam?: boolean }
  | { ok: false; status: number; message: string; fields?: Record<string, string> };

const fallbackContact = () =>
  publicEnv.contactEmail ? ` You can also email ${publicEnv.contactEmail} directly.` : "";

function newRef() {
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

  const est = estimate({ category: data.category, packageId: data.packageId, extraPhotos: data.extraPhotos, addOns: data.addOns });
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
    saved = await store.insert(row);
  } catch (err) {
    console.error("[inquiry] INSERT FAILED", err instanceof Error ? err.message : err);
    return {
      ok: false,
      status: 500,
      message: `We couldn't save your inquiry just now, so it was not sent. Please try again in a moment.${fallbackContact()}`,
    };
  }

  const [owner, client] = await Promise.all([notifyOwner(data, saved.ref, est.label), confirmClient(data, saved.ref)]);
  await store.updateNotification(saved.id, owner, client);
  if (owner !== "sent") console.warn(`[inquiry] ${saved.ref} saved; owner notification ${owner}`);

  return { ok: true, ref: saved.ref };
}

const categoryLabel = (id: string) => bookingCategories.find((c) => c.id === id)?.label ?? id;

async function notifyOwner(d: Inquiry, ref: string, estimateLabel: string) {
  const to = serverEnv().ownerNotificationEmail;
  if (!to) return "skipped";
  const pkg = pricing.packages.find((x) => x.id === d.packageId);
  const lines = [
    kv("Reference", ref),
    kv("Type", `${d.kind} · ${categoryLabel(d.category)}`),
    kv("Name", d.name),
    kv("Email", d.email),
    kv("Phone", d.phone),
    kv("OK to text", d.smsOptIn && d.phone ? "Yes" : "No"),
    kv("Package", pkg ? `${pkg.name} (${pkg.photos} photos, ${formatPrice(pkg.priceCents)})` : undefined),
    kv("Estimate", estimateLabel),
    kv("Extra photos", d.extraPhotos ? String(d.extraPhotos) : undefined),
    kv("Add-ons", d.addOns?.length ? d.addOns.join(", ") : undefined),
    kv("Group", d.groupDetails),
    kv("Animals", d.animals),
    kv("Where", [d.city, d.zip].filter(Boolean).join(" ") || undefined),
    kv("Setting", d.locationPreference),
    kv("Date", [d.dateFlexibility, d.preferredDate, d.preferredDateAlt, d.preferredTime].filter(Boolean).join(" · ") || undefined),
    kv("Travel", d.travelNotes),
    kv("Special needs", d.specialNeeds),
    kv("Story card", [d.storySubject, d.storyFeeling].filter(Boolean).join(" · ") || undefined),
    kv("Inspiration photos", d.inspirationIds?.length ? d.inspirationIds.join(", ") : undefined),
    kv("Message", d.message),
    kv("Source", [d.utm?.source, d.utm?.medium, d.utm?.campaign].filter(Boolean).join(" / ") || d.referrer || undefined),
  ].join("");
  const res = await sendEmail({
    to,
    replyTo: d.email,
    subject: `New inquiry ${ref}: ${categoryLabel(d.category)} from ${d.name}`,
    html: emailLayout(`New ${categoryLabel(d.category).toLowerCase()} inquiry`, lines + p("Reply to this email to answer them directly, or open /admin/leads.")),
    text: `New inquiry ${ref}\n${d.name} <${d.email}>${d.phone ? ` ${d.phone}` : ""}\n${categoryLabel(d.category)} · ${estimateLabel}\n\n${d.message ?? ""}`,
  });
  return res.status;
}

async function confirmClient(d: Inquiry, ref: string) {
  const owner = serverEnv().ownerNotificationEmail;
  const res = await sendEmail({
    to: d.email,
    replyTo: owner ?? publicEnv.contactEmail,
    subject: `We got your note: ${site.shortName}`,
    html: emailLayout(`Thanks, ${d.name.split(" ")[0]}. Your note arrived.`, [
      p("A real person will read it and reply personally, usually with a couple of questions and availability."),
      p("This isn't a confirmed booking yet. Nothing is reserved or charged until we've agreed on the details together."),
      kv("Your reference", ref),
      p(site.primaryLine),
    ].join("")),
    text: `Thanks, ${d.name}. Your note arrived (reference ${ref}). A real person will reply personally. This isn't a confirmed booking yet; nothing is reserved or charged until we agree on the details.`,
  });
  return res.status;
}
