import "server-only";
import { randomUUID } from "node:crypto";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface InquiryRow {
  ref: string;
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
  estimate_label: string;
  estimate_detail: unknown;
  consent_privacy: boolean;
  consent_at: string;
  utm: Record<string, string | undefined>;
  landing_path: string | null;
  referrer: string | null;
  ip_hash: string;
  user_agent: string | null;
  dedupe_key: string;
}

export interface InquiryStore {
  readonly name: "supabase" | "dev-memory";
  countRecentAttempts(ipHash: string, minutes: number): Promise<number>;
  recordAttempt(ipHash: string, outcome: string): Promise<void>;
  findRecentDuplicate(dedupeKey: string, minutes: number): Promise<{ id: string; ref: string } | null>;
  insert(row: InquiryRow): Promise<{ id: string; ref: string }>;
  updateNotification(id: string, owner: string, client: string): Promise<void>;
}

const since = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

class SupabaseStore implements InquiryStore {
  readonly name = "supabase" as const;
  private db = getServiceClient();

  async countRecentAttempts(ipHash: string, minutes: number) {
    const { count, error } = await this.db
      .from("submission_events")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since(minutes));
    if (error) throw error;
    return count ?? 0;
  }

  async recordAttempt(ipHash: string, outcome: string) {
    const { error } = await this.db.from("submission_events").insert({ ip_hash: ipHash, outcome });
    if (error) console.error("[inquiry] could not record attempt", error.message);
  }

  async findRecentDuplicate(dedupeKey: string, minutes: number) {
    const { data, error } = await this.db
      .from("inquiries")
      .select("id, ref")
      .eq("dedupe_key", dedupeKey)
      .gte("created_at", since(minutes))
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async insert(row: InquiryRow) {
    const { data, error } = await this.db.from("inquiries").insert(row).select("id, ref").single();
    if (error) throw error;
    await this.db.from("inquiry_events").insert({ inquiry_id: data.id, type: "created", to_status: "new", actor: "system" });
    return data;
  }

  async updateNotification(id: string, owner: string, client: string) {
    const { error } = await this.db.from("inquiries").update({ owner_notification: owner, client_confirmation: client }).eq("id", id);
    if (error) console.error("[inquiry] could not update notification status", error.message);
  }
}

/** Local development only. Never used on Vercel production. */
type Mem = { inquiries: (InquiryRow & { id: string; created_at: number })[]; attempts: { ip: string; at: number }[] };
const g = globalThis as unknown as { __rclDevStore?: Mem };

class DevMemoryStore implements InquiryStore {
  readonly name = "dev-memory" as const;
  private mem: Mem = (g.__rclDevStore ??= { inquiries: [], attempts: [] });

  async countRecentAttempts(ip: string, minutes: number) {
    const t = Date.now() - minutes * 60_000;
    return this.mem.attempts.filter((a) => a.ip === ip && a.at >= t).length;
  }
  async recordAttempt(ip: string) {
    this.mem.attempts.push({ ip, at: Date.now() });
  }
  async findRecentDuplicate(key: string, minutes: number) {
    const t = Date.now() - minutes * 60_000;
    const hit = this.mem.inquiries.find((i) => i.dedupe_key === key && i.created_at >= t);
    return hit ? { id: hit.id, ref: hit.ref } : null;
  }
  async insert(row: InquiryRow) {
    const id = randomUUID();
    this.mem.inquiries.unshift({ ...row, id, created_at: Date.now() });
    console.info(`[inquiry:dev] stored ${row.ref} from ${row.email} (in memory; connect Supabase to persist)`);
    return { id, ref: row.ref };
  }
  async updateNotification() {}
}

export type StoreResolution = { store: InquiryStore } | { store: null; reason: string };

export function resolveStore(): StoreResolution {
  if (isSupabaseConfigured()) return { store: new SupabaseStore() };
  // A local `next start` can opt in for testing; Vercel deployments never can.
  const localTestOptIn = !process.env.VERCEL && process.env.ALLOW_MEMORY_STORE === "1";
  const deployed = Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";
  if (deployed && !localTestOptIn) return { store: null, reason: "Supabase is not configured for this deployment." };
  return { store: new DevMemoryStore() };
}

export function devInquiries() {
  return g.__rclDevStore?.inquiries ?? [];
}
