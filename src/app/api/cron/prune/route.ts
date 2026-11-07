import { NextResponse, type NextRequest } from "next/server";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { safeEqual } from "@/lib/security";

/**
 * Daily housekeeping (scheduled in vercel.json): removes rate-limit rows older
 * than 7 days. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, reason: "supabase not configured" }, { status: 503 });
  const { error } = await getServiceClient().rpc("prune_submission_events");
  if (error) return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
