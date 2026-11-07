import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin-auth";
import { listLeads, STATUSES } from "@/lib/admin-data";

export const metadata = { title: "Leads" };

export default function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading leads…</p>}>
      <Leads searchParams={searchParams} />
    </Suspense>
  );
}

async function Leads({ searchParams }: Pick<PageProps<"/admin/leads">, "searchParams">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const leads = await listLeads(status);
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-display-sm">Leads</h1>
        <a href={`/admin/leads/export${status ? `?status=${status}` : ""}`} className="rounded-full border border-ink/25 px-4 py-2 text-sm font-semibold hover:border-ink">
          Export CSV
        </a>
      </div>
      <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-2">
        {[undefined, ...STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin/leads?status=${s}` : "/admin/leads"}
            aria-current={s === status ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm capitalize ${s === status ? "border-ink bg-ink text-gallery" : "border-ink/20"}`}
          >
            {s ?? "all"}
          </Link>
        ))}
      </nav>
      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-parchment">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Estimate</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-gallery">
                <td className="px-4 py-3 whitespace-nowrap">{new Date(l.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/leads/${l.id}`} className="font-semibold underline">
                    {l.name}
                  </Link>
                  <span className="block text-xs text-muted">{l.ref}</span>
                </td>
                <td className="px-4 py-3">
                  {l.category}
                  {l.package_id ? ` · ${l.package_id}` : ""}
                </td>
                <td className="px-4 py-3">{l.estimate_label}</td>
                <td className="px-4 py-3">{l.preferred_date ?? l.date_flexibility ?? "–"}</td>
                <td className="px-4 py-3 capitalize">{l.status}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
