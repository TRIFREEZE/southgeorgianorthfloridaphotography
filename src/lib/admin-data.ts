import "server-only";
import { getServiceClient } from "@/lib/supabase/server";

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

export async function listLeads(status?: string) {
  let q = getServiceClient().from("inquiries").select("*").order("created_at", { ascending: false }).limit(300);
  if (status && (STATUSES as readonly string[]).includes(status)) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LeadRow[];
}

export async function getLead(id: string) {
  const db = getServiceClient();
  const [{ data: lead, error }, { data: events }] = await Promise.all([
    db.from("inquiries").select("*").eq("id", id).maybeSingle(),
    db.from("inquiry_events").select("*").eq("inquiry_id", id).order("created_at", { ascending: false }).limit(100),
  ]);
  if (error) throw error;
  return { lead: lead as LeadRow | null, events: (events ?? []) as { id: number; created_at: string; actor: string | null; type: string; from_status: string | null; to_status: string | null; note: string | null }[] };
}

export async function statusCounts() {
  const db = getServiceClient();
  const results = await Promise.all(
    STATUSES.map(async (s) => {
      const { count } = await db.from("inquiries").select("id", { count: "exact", head: true }).eq("status", s);
      return [s, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(results) as Record<Status, number>;
}

export interface AdminPhoto {
  id: string;
  created_at: string;
  storage_path: string;
  width: number;
  height: number;
  bytes: number | null;
  original_filename: string | null;
  category: string;
  subcategory: string | null;
  title: string | null;
  alt: string;
  location: string | null;
  capture_date: string | null;
  focal_x: number;
  focal_y: number;
  sort_order: number;
  featured: boolean;
  hero: boolean;
  published: boolean;
  story_text: string | null;
  license_status: string;
  permission_note: string | null;
}

export async function listAdminPhotos() {
  const { data, error } = await getServiceClient().from("photos").select("*").order("sort_order").order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []) as AdminPhoto[];
}
