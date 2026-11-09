"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { getSiteData } from "@/lib/cms/data";
import { draftContent } from "@/lib/cms/ops";
import { getRepo } from "@/lib/cms/repo";
import { bookingOptions } from "@/lib/cms/sessions";
import { sendEmail } from "@/lib/email";
import { publicEnv } from "@/lib/env";
import { hashIp, sha256 } from "@/lib/security";
import { serverEnv } from "@/lib/server-env";
import { bookingSchema, composeErrors, galleryDeliverySchema } from "@/lib/inquiry/compose";
import { sampleEmails } from "@/lib/inquiry/email-samples";
import type { EmailContext } from "@/lib/inquiry/emails";
import { estimate } from "@/lib/inquiry/estimate";
import { bookingConfirmedEmail, galleryDeliveryEmail } from "@/lib/inquiry/sent-emails";
import { newRef } from "@/lib/inquiry/service";
import { resolveStore, type InquiryRow } from "@/lib/inquiry/store";

type Kind = "booking" | "gallery";

/** Sends the sample email to the owner's inbox, so it can be checked on a real phone. */
export async function sendTestEmail(which: "client" | "owner"): Promise<{ ok: boolean; message: string }> {
  const admin = await requireAdmin();
  const env = serverEnv();
  if (!env.resendApiKey || !env.emailFrom) return { ok: false, message: "Email isn't set up yet: add RESEND_API_KEY and EMAIL_FROM in Vercel (see DEPLOYMENT.md, step 3)." };
  const to = env.ownerNotificationEmail ?? admin.email;
  const mail = (await sampleEmails())[which];
  const res = await sendEmail({ to, ...mail, subject: `[Test] ${mail.subject}` });
  return res.status === "sent" ? { ok: true, message: `Sent to ${to}. It should arrive within a minute.` } : { ok: false, message: `Couldn't send: ${res.reason}` };
}

/** Uses your saved-but-unpublished wording, so the preview matches what you're editing. */
async function context(): Promise<EmailContext> {
  const repo = getRepo();
  const content = repo ? await draftContent(repo) : (await getSiteData()).content;
  return { content, options: bookingOptions(content, { includeHidden: true }), siteUrl: publicEnv.siteUrl, contactEmail: publicEnv.contactEmail, contactPhone: publicEnv.contactPhone };
}

const inTwoWeeks = () => new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);

/** Live preview while typing: anything not filled in yet shows a placeholder. */
export async function previewComposed(kind: Kind, raw: Record<string, unknown>): Promise<{ subject: string; html: string }> {
  await requireAdmin();
  const ctx = await context();
  if (kind === "booking") {
    const placeholders: Record<string, unknown> = { name: "Client name", email: "client@example.com", date: inTwoWeeks(), category: ctx.options[0]?.bookingId ?? "other" };
    const input = { ...raw };
    let parsed = bookingSchema.safeParse(input);
    if (!parsed.success) {
      for (const i of parsed.error.issues) {
        const k = String(i.path[0]);
        input[k] = placeholders[k] ?? (Array.isArray(input[k]) ? [] : "");
      }
      parsed = bookingSchema.safeParse(input);
    }
    if (!parsed.success) return { subject: "", html: "" };
    return bookingConfirmedEmail(parsed.data, ctx);
  }
  const placeholders: Record<string, unknown> = { name: "Client name", email: "client@example.com", link: `${publicEnv.siteUrl}/client-gallery/your-gallery`, password: "password" };
  const input = { ...raw };
  let parsed = galleryDeliverySchema.safeParse(input);
  if (!parsed.success) {
    for (const i of parsed.error.issues) input[String(i.path[0])] = placeholders[String(i.path[0])] ?? "";
    parsed = galleryDeliverySchema.safeParse(input);
  }
  if (!parsed.success) return { subject: "", html: "" };
  return galleryDeliveryEmail(parsed.data, ctx);
}

export type SendResult = { ok: true; message: string } | { ok: false; message: string; fields?: Record<string, string> };

/** Sends the email to the client (and a copy to you), and saves a booking as a Booked lead. */
export async function sendComposed(kind: Kind, raw: Record<string, unknown>, copyMe: boolean): Promise<SendResult> {
  const admin = await requireAdmin();
  const env = serverEnv();
  const ctx = await context();
  const schema = kind === "booking" ? bookingSchema : galleryDeliverySchema;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "A few things need fixing first.", fields: composeErrors(parsed.error) };
  if (!env.resendApiKey || !env.emailFrom) return { ok: false, message: "Email isn't set up yet: add RESEND_API_KEY and EMAIL_FROM in Vercel (see DEPLOYMENT.md, step 3). Nothing was sent." };

  const owner = env.ownerNotificationEmail ?? admin.email;
  const mail = kind === "booking" ? bookingConfirmedEmail(parsed.data as z.output<typeof bookingSchema>, ctx) : galleryDeliveryEmail(parsed.data as z.output<typeof galleryDeliverySchema>, ctx);
  const res = await sendEmail({ to: parsed.data.email, replyTo: owner, bcc: copyMe ? owner : undefined, ...mail });
  if (res.status !== "sent") return { ok: false, message: `Couldn't send: ${res.reason}. Nothing was sent.` };

  let saved = "";
  if (kind === "booking" && (parsed.data as z.output<typeof bookingSchema>).saveLead) {
    try {
      saved = await saveBooking(parsed.data as z.output<typeof bookingSchema>, ctx, res.status);
    } catch (err) {
      console.error("[compose] email sent but saving the lead failed", err instanceof Error ? err.message : err);
      return { ok: true, message: `Sent to ${parsed.data.email}. (It couldn't be added to Leads, so add a note there yourself.)` };
    }
  }
  return { ok: true, message: `Sent to ${parsed.data.email}${copyMe ? `, with a copy to ${owner}` : ""}.${saved ? ` Added to Leads as Booked (${saved}).` : ""}` };
}

async function saveBooking(b: z.output<typeof bookingSchema>, ctx: EmailContext, sent: string): Promise<string> {
  const r = resolveStore();
  if (!r.store) throw new Error(r.reason);
  const { pricing } = ctx.content;
  const est = estimate({ category: b.category, packageId: b.packageId || null, extraPhotos: b.extraPhotos, addOns: b.addOns }, pricing, ctx.options);
  const message = [b.price ? `Price: ${b.price}` : "", b.place ? `Meeting spot: ${b.place}` : "", b.time ? `Time: ${b.time}` : "", b.note ? `Note sent:\n${b.note}` : ""].filter(Boolean).join("\n");
  const row: InquiryRow = {
    ref: newRef(),
    kind: "booking",
    status: "booked",
    category: b.category,
    package_id: b.packageId || null,
    extra_photos: b.extraPhotos,
    add_ons: b.addOns,
    group_details: b.groupDetails || null,
    animals: b.animals || null,
    special_needs: b.specialNeeds || null,
    location_preference: null,
    city: b.city || null,
    zip: null,
    date_flexibility: "specific",
    preferred_date: b.date,
    preferred_date_alt: null,
    preferred_time: null,
    travel_notes: null,
    name: b.name,
    email: b.email,
    phone: b.phone || null,
    sms_opt_in: false,
    social_link: b.social || null,
    message: message || null,
    inspiration_photo_ids: [],
    story_subject: null,
    story_feeling: null,
    estimate_cents: est.kind === "package" ? est.totalCents : null,
    estimate_label: b.price || est.label,
    estimate_detail: est,
    consent_privacy: true,
    consent_at: new Date().toISOString(),
    utm: {},
    landing_path: "/admin/emails",
    referrer: null,
    ip_hash: hashIp("owner"),
    user_agent: null,
    dedupe_key: sha256(`booking|${b.email}|${b.date}|${Date.now()}`),
  };
  // Older databases: no "booking" kind yet, or no social_link column. Never lose the record over that.
  let attempt = row;
  for (let tries = 0; ; tries++) {
    try {
      const out = await r.store.insert(attempt);
      await r.store.updateNotification(out.id, "skipped", sent);
      return out.ref;
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (tries >= 2) throw err;
      if ((e.code === "42703" || e.code === "PGRST204") && "social_link" in attempt) {
        const { social_link, ...rest } = attempt;
        attempt = { ...rest, message: [social_link ? `[Social: ${social_link}]` : "", rest.message].filter(Boolean).join("\n\n") || null } as InquiryRow;
      } else if (e.code === "23514" || /check constraint/i.test(e.message ?? "")) {
        attempt = { ...attempt, kind: "wizard", message: ["[Booked from the dashboard]", attempt.message].filter(Boolean).join("\n\n") };
      } else throw err;
    }
  }
}
