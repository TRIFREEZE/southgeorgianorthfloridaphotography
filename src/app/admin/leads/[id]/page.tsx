import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { site } from "@/content/site";
import { requireAdmin } from "@/lib/admin-auth";
import { Countdown, longDate, StageBadge } from "@/components/admin/LeadBits";
import { daysUntil, getLead, NEXT_STAGE, sessionDateOf, STATUS_LABEL, STATUSES } from "@/lib/admin-data";
import { addLeadNote, advanceLead, deleteLead, setSessionDate, updateLeadStatus } from "../../actions";

export const metadata = { title: "Lead" };

export default function LeadPage({ params, searchParams }: PageProps<"/admin/leads/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Lead params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Lead({ params, searchParams }: Pick<PageProps<"/admin/leads/[id]">, "params" | "searchParams">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { lead, events } = await getLead(id);
  if (!lead) notFound();

  const first = lead.name.split(" ")[0];
  const shootDate = sessionDateOf(lead);
  const days = shootDate ? daysUntil(shootDate) : null;
  const next = NEXT_STAGE[lead.status];
  const replyHref = `mailto:${lead.email}?subject=${encodeURIComponent(`Your ${site.shortName} inquiry (${lead.ref})`)}&body=${encodeURIComponent(`Hi ${first},\n\nThanks so much for reaching out about your session!\n\n`)}`;

  const rows: [string, string | null | undefined][] = [
    ["Reference", lead.ref],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["OK to text", lead.sms_opt_in ? "Yes (opted in)" : "No"],
    ["Social", lead.social_link],
    ["Type", `${lead.kind} · ${lead.category}`],
    ["Package", lead.package_id],
    ["Extra photos", lead.extra_photos ? String(lead.extra_photos) : null],
    ["Add-ons", lead.add_ons?.join(", ")],
    ["Estimate", lead.estimate_label],
    ["Group", lead.group_details],
    ["Animals", lead.animals],
    ["Setting", lead.location_preference],
    ["City / ZIP", [lead.city, lead.zip].filter(Boolean).join(" ")],
    ["Dates", [lead.date_flexibility, lead.preferred_date, lead.preferred_date_alt].filter(Boolean).join(" · ")],
    ["Time of day", lead.preferred_time],
    ["Travel notes", lead.travel_notes],
    ["Plan around", lead.special_needs],
    ["Story card", [lead.story_subject, lead.story_feeling].filter(Boolean).join(" · ")],
    ["Inspiration photo IDs", lead.inspiration_photo_ids?.join(", ")],
    ["Source", [lead.utm?.source, lead.utm?.medium, lead.utm?.campaign].filter(Boolean).join(" / ") || lead.referrer],
    ["Landing page", lead.landing_path],
    ["Owner email", lead.owner_notification],
    ["Client confirmation", lead.client_confirmation],
  ];

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <Link href="/admin/leads" className="text-sm underline">
          ← All leads
        </Link>
        {sp.error === "migration" && (
          <p role="alert" className="mt-4 rounded-xl border border-[#a3392b]/40 bg-[#fbeeea] px-4 py-3 text-sm text-[#7d2a20]" data-testid="needs-migration">
            That change couldn&apos;t be saved yet: your database needs a one-time update. In Supabase → SQL Editor, run <code>supabase/migrations/20261112000000_pipeline.sql</code>, then try again.
          </p>
        )}
        {sp.added === "1" && (
          <p role="status" className="mt-4 rounded-xl bg-[#e7efe5] px-4 py-3 text-sm" data-testid="lead-added">
            Lead added.
          </p>
        )}
        <h1 className="mt-3 text-display-sm">{lead.name}</h1>
        <p className="flex flex-wrap items-center gap-2 text-muted">
          <StageBadge status={lead.status} />
          <span>
            {lead.kind === "manual" ? "Added by hand" : "Received"} {new Date(lead.created_at).toLocaleString("en-US")}
          </span>
        </p>
        {shootDate && (
          <div className={`mt-5 flex flex-wrap items-center gap-3 rounded-2xl border-2 px-5 py-4 ${lead.status === "booked" && days !== null && days <= 3 ? "border-[#a3392b] bg-[#fbeeea]" : "border-line bg-parchment"}`} data-testid="shoot-date">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">{lead.session_date ? "Session" : "Date they asked for"}</p>
              <p className="font-display text-2xl">
                {longDate(shootDate)}
                {lead.session_time ? <span className="text-lg text-muted"> · {lead.session_time}</span> : null}
              </p>
            </div>
            {lead.status === "booked" && days !== null && <Countdown days={days} />}
          </div>
        )}
        {lead.message && <blockquote className="mt-6 whitespace-pre-wrap rounded-xl border-l-2 border-clay bg-parchment p-5">{lead.message}</blockquote>}
        <dl className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-bold uppercase tracking-wider text-muted">{k}</dt>
                <dd className="break-words">
                  {k === "Social" && v && /^https?:\/\//.test(v) ? (
                    <a href={v} target="_blank" rel="noopener noreferrer nofollow" className="underline">
                      {v}
                    </a>
                  ) : (
                    v
                  )}
                </dd>
              </div>
            ))}
        </dl>
        {lead.admin_notes && (
          <section className="mt-8">
            <h2 className="text-xl">Notes</h2>
            <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-parchment p-4 font-sans text-sm">{lead.admin_notes}</pre>
          </section>
        )}
        <section className="mt-8">
          <h2 className="text-xl">History</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {events.map((e) => (
              <li key={e.id}>
                {new Date(e.created_at).toLocaleString("en-US")} · {e.type}
                {e.to_status ? ` → ${e.to_status}` : ""}
                {e.actor ? ` · ${e.actor}` : ""}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="space-y-6 lg:col-span-4">
        {lead.email && (
          <a href={replyHref} className="flex min-h-12 items-center justify-center rounded-full bg-ink font-semibold text-gallery">
            Reply by email
          </a>
        )}
        {next && (
          <form action={advanceLead}>
            <input type="hidden" name="id" value={lead.id} />
            <button className="flex min-h-12 w-full items-center justify-center rounded-full bg-clay-deep font-semibold text-gallery hover:bg-clay" data-testid="advance">
              Mark as {STATUS_LABEL[next].toLowerCase()} →
            </button>
          </form>
        )}
        <form action={setSessionDate} className="rounded-xl border border-line bg-parchment p-4" data-testid="session-form">
          <input type="hidden" name="id" value={lead.id} />
          <p className="text-sm font-semibold">Session date</p>
          <p className="mt-0.5 text-xs text-muted">Booked leads with a date show in “Coming up”, and turn red 3 days before.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="text-xs">
              Date
              <input type="date" name="session_date" defaultValue={lead.session_date ?? shootDate ?? ""} className="field mt-1" data-testid="session-date" />
            </label>
            <label className="text-xs">
              Time
              <input name="session_time" defaultValue={lead.session_time ?? ""} placeholder="5:30 PM" className="field mt-1" maxLength={60} />
            </label>
          </div>
          <button className="mt-3 min-h-11 w-full rounded-full border border-ink/25 font-semibold" data-testid="save-session">
            Save session date
          </button>
        </form>
        <form action={updateLeadStatus} className="rounded-xl border border-line bg-parchment p-4">
          <input type="hidden" name="id" value={lead.id} />
          <label className="block text-sm font-semibold">
            Stage
            <select name="status" defaultValue={lead.status} className="field mt-1.5" data-testid="stage-select">
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <button className="mt-3 min-h-11 w-full rounded-full border border-ink/25 font-semibold">Update stage</button>
          <p className="mt-2 text-xs text-muted">After &ldquo;Booked&rdquo;: Shot → Edited → Delivered. The site never changes a stage on its own (except bookings you send from Emails, which start as Booked).</p>
        </form>
        <form action={addLeadNote} className="rounded-xl border border-line bg-parchment p-4">
          <input type="hidden" name="id" value={lead.id} />
          <label className="block text-sm font-semibold">
            Add a note
            <textarea name="note" rows={3} required className="field mt-1.5" />
          </label>
          <button className="mt-3 min-h-11 w-full rounded-full border border-ink/25 font-semibold">Save note</button>
        </form>
        <details className="rounded-xl border border-line p-4 text-sm">
          <summary className="cursor-pointer font-semibold">Delete this inquiry</summary>
          <form action={deleteLead} className="mt-3 space-y-2">
            <input type="hidden" name="id" value={lead.id} />
            <label className="block">
              Type DELETE to permanently remove it (e.g. a privacy request).
              <input name="confirm" className="field mt-1.5" autoComplete="off" />
            </label>
            <button className="min-h-11 w-full rounded-full bg-[#a3392b] font-semibold text-gallery">Delete permanently</button>
          </form>
        </details>
      </aside>
    </div>
  );
}
