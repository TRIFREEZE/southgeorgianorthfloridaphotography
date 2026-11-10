import "server-only";
import { devInquiries, resolveStore } from "@/lib/inquiry/store";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

/** Lead stages, in the order work moves through them. */
export const STATUSES = ["new", "contacted", "quoted", "accepted", "booked", "shot", "edited", "delivered", "declined", "archived"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  accepted: "Accepted",
  booked: "Booked",
  shot: "Shot",
  edited: "Edited",
  delivered: "Delivered",
  declined: "Declined",
  archived: "Archived",
};

/** After booking: what comes next, for the one-tap "Mark as …" button. */
export const NEXT_STAGE: Partial<Record<Status, Status>> = { booked: "shot", shot: "edited", edited: "delivered" };

/** Dates are counted in the studio's time zone, so "in 3 days" means what it says in Florida. */
export const STUDIO_TZ = "America/New_York";

export function todayInStudio(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: STUDIO_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Whole days from today (studio time) to an ISO date: 0 today, 1 tomorrow, negative if past. */
export function daysUntil(iso: string, now = new Date()) {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${todayInStudio(now)}T00:00:00Z`)) / 86_400_000);
}

/** The shoot date: the confirmed session date, or the exact date they asked for. */
export const sessionDateOf = (l: Pick<LeadRow, "session_date" | "preferred_date" | "date_flexibility">) => l.session_date ?? (l.date_flexibility === "specific" ? l.preferred_date : null);

/** Coming up gets urgent (red) within this many days. */
export const SOON_DAYS = 3;

export interface LeadRow {
  id: string;
  ref: string;
  created_at: string;
  updated_at: string;
  status: Status;
  kind: string;
  category: string;
  package_id: string | null;
  extra_photos: number;
  add_ons: string[];
  group_details: string | null;
  animals: string | null;
  special_needs: string | null;
  location_preference: string | null;
  city: string | null;
  zip: string | null;
  date_flexibility: string | null;
  preferred_date: string | null;
  preferred_date_alt: string | null;
  preferred_time: string | null;
  travel_notes: string | null;
  name: string;
  email: string;
  phone: string | null;
  sms_opt_in: boolean;
  social_link?: string | null;
  session_date?: string | null;
  session_time?: string | null;
  message: string | null;
  inspiration_photo_ids: string[];
  story_subject: string | null;
  story_feeling: string | null;
  estimate_cents: number | null;
  estimate_label: string | null;
  utm: Record<string, string>;
  landing_path: string | null;
  referrer: string | null;
  owner_notification: string | null;
  client_confirmation: string | null;
  admin_notes: string | null;
}

export type LeadEvent = { id: number; created_at: string; actor: string | null; type: string; from_status: string | null; to_status: string | null; note: string | null };

/* Leads live in Supabase. Locally without Supabase (tests, `ALLOW_MEMORY_STORE`), they live in memory. */
const memoryMode = () => !isSupabaseConfigured() && resolveStore().store?.name === "dev-memory";
const memEvents = () => ((globalThis as unknown as { __rclDevEvents?: (LeadEvent & { inquiry_id: string })[] }).__rclDevEvents ??= []);

function memLead(r: ReturnType<typeof devInquiries>[number]): LeadRow {
  const x = r as unknown as LeadRow & { created_at: number | string; updated_at?: string };
  const created = typeof x.created_at === "number" ? new Date(x.created_at).toISOString() : x.created_at;
  const defaults: Partial<LeadRow> = { owner_notification: null, client_confirmation: null, admin_notes: null, session_date: null, session_time: null };
  return { ...defaults, ...x, status: (x.status as Status) ?? "new", created_at: created, updated_at: x.updated_at ?? created } as LeadRow;
}

export async function listLeads(status?: string) {
  const valid = status && (STATUSES as readonly string[]).includes(status) ? status : undefined;
  if (memoryMode()) return devInquiries().map(memLead).filter((l) => !valid || l.status === valid);
  if (!isSupabaseConfigured()) return [] as LeadRow[];
  let q = getServiceClient().from("inquiries").select("*").order("created_at", { ascending: false }).limit(300);
  if (valid) q = q.eq("status", valid);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LeadRow[];
}

/** Booked sessions with a date, soonest first (past-due ones first of all). */
export async function upcomingSessions() {
  const booked = await listLeads("booked");
  return booked
    .map((l) => ({ lead: l, date: sessionDateOf(l) }))
    .filter((x): x is { lead: LeadRow; date: string } => Boolean(x.date))
    .map((x) => ({ ...x, days: daysUntil(x.date) }))
    .sort((a, b) => a.days - b.days);
}

export async function getLead(id: string) {
  if (memoryMode()) {
    const r = devInquiries().find((x) => x.id === id);
    return { lead: r ? memLead(r) : null, events: memEvents().filter((e) => e.inquiry_id === id) as LeadEvent[] };
  }
  if (!isSupabaseConfigured()) return { lead: null, events: [] as LeadEvent[] };
  const db = getServiceClient();
  const [{ data: lead, error }, { data: events }] = await Promise.all([
    db.from("inquiries").select("*").eq("id", id).maybeSingle(),
    db.from("inquiry_events").select("*").eq("inquiry_id", id).order("created_at", { ascending: false }).limit(100),
  ]);
  if (error) throw error;
  return { lead: lead as LeadRow | null, events: (events ?? []) as LeadEvent[] };
}

export async function statusCounts() {
  if (memoryMode()) {
    const all = devInquiries().map(memLead);
    return Object.fromEntries(STATUSES.map((s) => [s, all.filter((l) => l.status === s).length])) as Record<Status, number>;
  }
  if (!isSupabaseConfigured()) return Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  const db = getServiceClient();
  const results = await Promise.all(
    STATUSES.map(async (s) => {
      const { count } = await db.from("inquiries").select("id", { count: "exact", head: true }).eq("status", s);
      return [s, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(results) as Record<Status, number>;
}

/** Thrown when the database hasn't had the pipeline update yet. */
export class NeedsMigrationError extends Error {
  constructor() {
    super("Your database needs a one-time update: run supabase/migrations/20261112000000_pipeline.sql in Supabase → SQL Editor.");
  }
}

function migrationProblem(err: { code?: string; message?: string } | null) {
  if (!err) return false;
  return err.code === "22P02" || err.code === "42703" || err.code === "PGRST204" || /invalid input value for enum|session_(date|time)/i.test(err.message ?? "");
}

export type LeadPatch = Partial<Pick<LeadRow, "status" | "session_date" | "session_time" | "admin_notes">>;

export async function updateLead(id: string, patch: LeadPatch) {
  if (memoryMode()) {
    const r = devInquiries().find((x) => x.id === id) as unknown as Record<string, unknown> | undefined;
    if (r) Object.assign(r, patch, { updated_at: new Date().toISOString() });
    return;
  }
  const { error } = await getServiceClient().from("inquiries").update(patch).eq("id", id);
  if (migrationProblem(error)) throw new NeedsMigrationError();
  if (error) throw new Error(error.message);
}

export async function addLeadEvent(id: string, e: Omit<LeadEvent, "id" | "created_at">) {
  if (memoryMode()) {
    memEvents().unshift({ ...e, id: memEvents().length + 1, created_at: new Date().toISOString(), inquiry_id: id });
    return;
  }
  await getServiceClient().from("inquiry_events").insert({ inquiry_id: id, ...e });
}

export async function removeLead(id: string) {
  if (memoryMode()) {
    const list = devInquiries();
    const i = list.findIndex((x) => x.id === id);
    if (i >= 0) list.splice(i, 1);
    return;
  }
  await getServiceClient().from("inquiries").delete().eq("id", id);
}
