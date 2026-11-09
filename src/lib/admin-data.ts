import "server-only";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const STATUSES = ["new", "contacted", "quoted", "accepted", "declined", "booked", "archived"] as const;
export type Status = (typeof STATUSES)[number];

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

/* Leads live in Supabase. In local development without Supabase these return empty results. */
export async function listLeads(status?: string) {
  if (!isSupabaseConfigured()) return [] as LeadRow[];
  let q = getServiceClient().from("inquiries").select("*").order("created_at", { ascending: false }).limit(300);
  if (status && (STATUSES as readonly string[]).includes(status)) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LeadRow[];
}

export async function getLead(id: string) {
  if (!isSupabaseConfigured()) return { lead: null, events: [] };
  const db = getServiceClient();
  const [{ data: lead, error }, { data: events }] = await Promise.all([
    db.from("inquiries").select("*").eq("id", id).maybeSingle(),
    db.from("inquiry_events").select("*").eq("inquiry_id", id).order("created_at", { ascending: false }).limit(100),
  ]);
  if (error) throw error;
  return { lead: lead as LeadRow | null, events: (events ?? []) as { id: number; created_at: string; actor: string | null; type: string; from_status: string | null; to_status: string | null; note: string | null }[] };
}

export async function statusCounts() {
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
