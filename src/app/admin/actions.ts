"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminConfig, checkPassword, endSession, requireAdmin, startSession } from "@/lib/admin-auth";
import { addLeadEvent, getLead, NEXT_STAGE, NeedsMigrationError, removeLead, STATUSES, updateLead, type Status } from "@/lib/admin-data";
import { getSiteData } from "@/lib/cms/data";
import { bookingOptions } from "@/lib/cms/sessions";
import { emailProblem } from "@/lib/inquiry/checks";
import { estimate } from "@/lib/inquiry/estimate";
import { newRef } from "@/lib/inquiry/service";
import { resolveStore, type InquiryRow } from "@/lib/inquiry/store";
import { serverEnv } from "@/lib/server-env";
import { clientIp, hashIp } from "@/lib/security";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type ActionState = { ok?: boolean; error?: string; message?: string };

/* ------------------------------------------------------------------ auth */

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const cfg = adminConfig();
  if (!cfg.ok) return { error: `Admin is not configured: ${cfg.problem}` };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const ipHash = hashIp(clientIp(await headers()));
  if ((await recentLoginFailures(ipHash)) >= 8) return { error: "Too many attempts. Please wait 15 minutes." };

  const allowed = serverEnv().adminEmails.includes(email);
  const valid = allowed && (await checkPassword(email, password));
  if (!valid) {
    await recordLoginFailure(ipHash);
    return { error: "That email and password didn't match an admin account." };
  }
  await startSession(email);
  redirect("/admin");
}

/* Login throttling: stored in Supabase in production; in memory for local dev only. */
const localFails = new Map<string, number[]>();
async function recentLoginFailures(ipHash: string) {
  const since = Date.now() - 15 * 60_000;
  if (!isSupabaseConfigured()) return (localFails.get(ipHash) ?? []).filter((t) => t > since).length;
  const { count } = await getServiceClient()
    .from("submission_events")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("outcome", "login-fail")
    .gte("created_at", new Date(since).toISOString());
  return count ?? 0;
}
async function recordLoginFailure(ipHash: string) {
  if (!isSupabaseConfigured()) {
    localFails.set(ipHash, [...(localFails.get(ipHash) ?? []), Date.now()]);
    return;
  }
  await getServiceClient().from("submission_events").insert({ ip_hash: ipHash, outcome: "login-fail" });
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

/* ------------------------------------------------------------------ leads */

const leadId = (fd: FormData) => z.string().min(1).max(64).parse(fd.get("id"));

/** Runs a lead change; a database that still needs the pipeline update comes back as a friendly banner. */
async function leadChange(id: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    if (err instanceof NeedsMigrationError) redirect(`/admin/leads/${id}?error=migration`);
    throw err;
  }
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}

async function moveTo(id: string, to: Status, actor: string) {
  const { lead } = await getLead(id);
  if (!lead || lead.status === to) return;
  await updateLead(id, { status: to });
  await addLeadEvent(id, { type: "status", from_status: lead.status, to_status: to, actor, note: null });
}

export async function updateLeadStatus(formData: FormData) {
  const admin = await requireAdmin();
  const id = leadId(formData);
  const to = z.enum(STATUSES).parse(formData.get("status"));
  await leadChange(id, () => moveTo(id, to, admin.email));
}

/** One tap: booked → shot → edited → delivered. */
export async function advanceLead(formData: FormData) {
  const admin = await requireAdmin();
  const id = leadId(formData);
  const { lead } = await getLead(id);
  const next = lead ? NEXT_STAGE[lead.status] : undefined;
  if (!next) return;
  await leadChange(id, () => moveTo(id, next, admin.email));
  const back = formData.get("back");
  if (back === "list") redirect("/admin/leads");
}

export async function setSessionDate(formData: FormData) {
  const admin = await requireAdmin();
  const id = leadId(formData);
  const date = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).parse(formData.get("session_date") ?? "");
  const time = z.string().trim().max(60).parse(formData.get("session_time") ?? "");
  await leadChange(id, async () => {
    await updateLead(id, { session_date: date || null, session_time: time || null });
    await addLeadEvent(id, { type: "note", note: date ? `Session set for ${date}${time ? `, ${time}` : ""}` : "Session date cleared", actor: admin.email, from_status: null, to_status: null });
  });
}

export async function addLeadNote(formData: FormData) {
  const admin = await requireAdmin();
  const id = leadId(formData);
  const note = z.string().trim().min(1).max(4000).parse(formData.get("note"));
  const { lead } = await getLead(id);
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const notes = `${lead?.admin_notes ? `${lead.admin_notes}\n\n` : ""}[${stamp}] ${note}`;
  await leadChange(id, async () => {
    await updateLead(id, { admin_notes: notes });
    await addLeadEvent(id, { type: "note", note, actor: admin.email, from_status: null, to_status: null });
  });
}

export async function deleteLead(formData: FormData) {
  await requireAdmin();
  const id = leadId(formData);
  if (formData.get("confirm") !== "DELETE") throw new Error("Type DELETE to confirm.");
  await removeLead(id);
  revalidatePath("/admin/leads");
  redirect("/admin/leads");
}

/* ------------------------------------------------------------------ new lead */

const manualLeadSchema = z.object({
  name: z.string().trim().min(1, "Add their name.").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .refine((v) => v === "" || !emailProblem(v), "That email address doesn't look right."),
  phone: z.string().trim().max(40),
  social: z.string().trim().max(120),
  category: z.string().trim().regex(/^[a-z0-9-]{1,70}$/, "Choose what you're photographing."),
  packageId: z.string().regex(/^[a-z0-9-]{0,40}$/),
  status: z.enum(STATUSES),
  sessionDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  sessionTime: z.string().trim().max(60),
  city: z.string().trim().max(120),
  source: z.string().trim().max(80),
  message: z.string().trim().max(4000),
});

export type NewLeadState = { error?: string; fields?: Record<string, string>; values?: Record<string, string> };

export async function createLead(_prev: NewLeadState, formData: FormData): Promise<NewLeadState> {
  const admin = await requireAdmin();
  const values = Object.fromEntries(["name", "email", "phone", "social", "category", "packageId", "status", "sessionDate", "sessionTime", "city", "source", "message"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = manualLeadSchema.safeParse(values);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
    return { error: "A couple of things need fixing.", fields, values };
  }
  const v = parsed.data;
  if (!v.email && !v.phone && !v.social) return { error: "Add at least one way to reach them: email, phone or Facebook/Instagram.", fields: { email: "Add an email, phone or social name." }, values };

  const r = resolveStore();
  if (!r.store) return { error: r.reason, values };
  const site = await getSiteData();
  const options = bookingOptions(site.content, { includeHidden: true });
  const est = estimate({ category: v.category, packageId: v.packageId || null, extraPhotos: 0, addOns: [] }, site.content.pricing, options);
  const row: InquiryRow = {
    ref: newRef(),
    kind: "manual",
    status: v.status === "booked" ? "booked" : "new",
    category: v.category,
    package_id: v.packageId || null,
    extra_photos: 0,
    add_ons: [],
    group_details: null,
    animals: null,
    special_needs: null,
    location_preference: null,
    city: v.city || null,
    zip: null,
    date_flexibility: v.sessionDate ? "specific" : "flexible",
    preferred_date: v.sessionDate || null,
    preferred_date_alt: null,
    preferred_time: null,
    travel_notes: null,
    name: v.name,
    email: v.email,
    phone: v.phone || null,
    sms_opt_in: false,
    social_link: v.social || null,
    message: v.message || null,
    inspiration_photo_ids: [],
    story_subject: null,
    story_feeling: null,
    estimate_cents: est.kind === "package" ? est.totalCents : null,
    estimate_label: est.kind === "incomplete" ? "" : est.label,
    estimate_detail: est,
    consent_privacy: true,
    consent_at: new Date().toISOString(),
    utm: v.source ? { source: v.source } : {},
    landing_path: "/admin/leads/new",
    referrer: null,
    ip_hash: hashIp("owner"),
    user_agent: null,
    dedupe_key: hashIp(`manual|${v.name}|${Date.now()}`),
  };
  let saved: { id: string; ref: string };
  try {
    saved = await insertWithFallbacks(r.store, row);
  } catch (err) {
    console.error("[leads] could not add lead", err instanceof Error ? err.message : err);
    return { error: "Couldn't save the lead. Please try again.", values };
  }
  // The rest is best-effort: any of it may need the pipeline update first.
  try {
    if (v.status !== "new" && v.status !== "booked") await updateLead(saved.id, { status: v.status });
    if (v.sessionDate || v.sessionTime) await updateLead(saved.id, { session_date: v.sessionDate || null, session_time: v.sessionTime || null });
    await addLeadEvent(saved.id, { type: "note", note: "Added by hand", actor: admin.email, from_status: null, to_status: null });
  } catch (err) {
    if (!(err instanceof NeedsMigrationError)) console.error("[leads] follow-up update failed", err instanceof Error ? err.message : err);
    revalidatePath("/admin/leads");
    redirect(`/admin/leads/${saved.id}?error=migration`);
  }
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  redirect(`/admin/leads/${saved.id}?added=1`);
}

/** Inserts a lead even on an older database: no "manual" kind or social_link column yet. */
async function insertWithFallbacks(store: NonNullable<ReturnType<typeof resolveStore>["store"]>, row: InquiryRow) {
  let attempt = row;
  for (let tries = 0; ; tries++) {
    try {
      return await store.insert(attempt);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (tries >= 3) throw err;
      if ((e.code === "42703" || e.code === "PGRST204") && "social_link" in attempt) {
        const { social_link, ...rest } = attempt;
        attempt = { ...rest, message: [social_link ? `[Social: ${social_link}]` : "", rest.message].filter(Boolean).join("\n\n") || null } as InquiryRow;
      } else if (e.code === "23514" || /check constraint/i.test(e.message ?? "")) {
        if (attempt.kind === "manual") attempt = { ...attempt, kind: "wizard", message: ["[Added by hand]", attempt.message].filter(Boolean).join("\n\n") };
        else if (attempt.package_id) attempt = { ...attempt, package_id: null };
        else throw err;
      } else throw err;
    }
  }
}
