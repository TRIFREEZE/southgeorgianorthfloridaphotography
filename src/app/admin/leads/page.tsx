import Link from "next/link";
import { Suspense } from "react";
import { advanceLead } from "@/app/admin/actions";
import { Countdown, shortDate, StageBadge } from "@/components/admin/LeadBits";
import { requireAdmin } from "@/lib/admin-auth";
import { getSiteData } from "@/lib/cms/data";
import { bookingOptions } from "@/lib/cms/sessions";
import { daysUntil, listLeads, NEXT_STAGE, sessionDateOf, SOON_DAYS, STATUS_LABEL, STATUSES, statusCounts, upcomingSessions } from "@/lib/admin-data";

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
  const [leads, upcoming, counts, site] = await Promise.all([listLeads(status), upcomingSessions(), statusCounts(), getSiteData()]);
  const options = bookingOptions(site.content, { includeHidden: true });
  const sessionName = (id: string) => options.find((o) => o.bookingId === id)?.label ?? id;
  const bookedNoDate = counts.booked - upcoming.length;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-display-sm">Leads</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/leads/new" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-gallery hover:bg-ink-soft" data-testid="new-lead">
            + New lead
          </Link>
          <a href={`/admin/leads/export${status ? `?status=${status}` : ""}`} className="rounded-full border border-ink/25 px-4 py-2 text-sm font-semibold hover:border-ink">
            Export CSV
          </a>
        </div>
      </div>

      <section aria-labelledby="coming-up" data-testid="coming-up">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="coming-up" className="text-[1.5rem]">
            Coming up
          </h2>
          <p className="text-sm text-muted">Booked sessions by date. Red means {SOON_DAYS} days or less.</p>
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">No booked sessions with a date yet. Set a session date on a booked lead and it shows up here.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {upcoming.map(({ lead: l, date, days }) => {
              const soon = days <= SOON_DAYS;
              return (
                <li key={l.id} data-testid="upcoming" data-soon={soon ? "true" : "false"} className={`flex flex-col rounded-2xl border-2 p-4 ${soon ? "border-[#a3392b] bg-[#fbeeea]" : "border-line bg-parchment"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className={`font-display text-xl leading-tight ${soon ? "text-[#7d2a20]" : ""}`}>{shortDate(date)}</p>
                    <Countdown days={days} />
                  </div>
                  {l.session_time && <p className="text-sm text-muted">{l.session_time}</p>}
                  <Link href={`/admin/leads/${l.id}`} className="mt-2 font-semibold underline">
                    {l.name}
                  </Link>
                  <p className="text-sm text-muted">
                    {sessionName(l.category)}
                    {l.city ? ` · ${l.city}` : ""}
                  </p>
                  <form action={advanceLead} className="mt-3">
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="back" value="list" />
                    <button className="rounded-full border border-ink/25 px-3 py-1.5 text-xs font-semibold hover:border-ink" data-testid="mark-shot">
                      {days < 0 ? "Done? Mark as shot" : "Mark as shot"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
        {bookedNoDate > 0 && (
          <p className="mt-3 text-sm">
            <Link href="/admin/leads?status=booked" className="underline">
              {bookedNoDate} booked {bookedNoDate === 1 ? "lead has" : "leads have"} no session date yet
            </Link>
          </p>
        )}
      </section>

      <section aria-labelledby="all-leads">
        <h2 id="all-leads" className="sr-only">
          All leads
        </h2>
        <nav aria-label="Filter by stage" className="flex flex-wrap gap-2">
          {[undefined, ...STATUSES].map((s) => (
            <Link
              key={s ?? "all"}
              href={s ? `/admin/leads?status=${s}` : "/admin/leads"}
              aria-current={s === status ? "page" : undefined}
              className={`rounded-full border px-3 py-1.5 text-sm ${s === status ? "border-ink bg-ink text-gallery" : "border-ink/20"}`}
            >
              {s ? STATUS_LABEL[s] : "All"}
              {s && counts[s] ? <span className={`ml-1.5 text-xs ${s === status ? "text-sand" : "text-muted"}`}>{counts[s]}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-parchment">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">Estimate</th>
                <th className="px-4 py-3">Shoot date</th>
                <th className="px-4 py-3">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {leads.map((l) => {
                const date = sessionDateOf(l);
                const days = date ? daysUntil(date) : null;
                const next = NEXT_STAGE[l.status];
                return (
                  <tr key={l.id} className="hover:bg-gallery" data-testid="lead-row">
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(l.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/leads/${l.id}`} className="font-semibold underline">
                        {l.name}
                      </Link>
                      <span className="block text-xs text-muted">
                        {l.ref}
                        {l.kind === "manual" ? " · added by hand" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {sessionName(l.category)}
                      {l.package_id ? <span className="text-muted"> · {site.content.pricing.packages.find((p) => p.id === l.package_id)?.name ?? l.package_id}</span> : ""}
                    </td>
                    <td className="px-4 py-3">{l.estimate_label && !/^Choose /.test(l.estimate_label) ? l.estimate_label : <span className="text-muted">–</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {date ? (
                        <>
                          {shortDate(date)}
                          {l.status === "booked" && days !== null && (
                            <span className="ml-2">
                              <Countdown days={days} />
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted">{l.date_flexibility === "flexible" ? "Flexible" : "–"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StageBadge status={l.status} />
                      {next && <span className="ml-2 text-xs text-muted">next: {STATUS_LABEL[next].toLowerCase()}</span>}
                    </td>
                  </tr>
                );
              })}
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
      </section>
    </div>
  );
}
