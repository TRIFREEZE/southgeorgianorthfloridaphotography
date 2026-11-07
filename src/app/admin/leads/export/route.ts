import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-auth";
import { listLeads } from "@/lib/admin-data";

const cols = ["ref", "created_at", "status", "kind", "category", "package_id", "extra_photos", "estimate_label", "name", "email", "phone", "sms_opt_in", "city", "zip", "date_flexibility", "preferred_date", "preferred_date_alt", "preferred_time", "group_details", "animals", "location_preference", "special_needs", "travel_notes", "message", "admin_notes"] as const;

const cell = (v: unknown) => {
  const s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v);
  // Neutralize spreadsheet formula injection, then CSV-escape.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(req: NextRequest) {
  if (!verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const leads = await listLeads(req.nextUrl.searchParams.get("status") ?? undefined);
  const csv = [cols.join(","), ...leads.map((l) => cols.map((c) => cell(l[c as keyof typeof l])).join(","))].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="red-clay-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
