import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { site } from "@/content/site";
import { requireAdmin } from "@/lib/admin-auth";
import { getLead, STATUSES } from "@/lib/admin-data";
import { addLeadNote, deleteLead, updateLeadStatus } from "../../actions";

export const metadata = { title: "Lead" };

export default function LeadPage({ params }: PageProps<"/admin/leads/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Lead params={params} />
    </Suspense>
  );
}

async function Lead({ params }: Pick<PageProps<"/admin/leads/[id]">, "params">) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { lead, events } = await getLead(id);
  if (!lead) notFound();

  const first = lead.name.split(" ")[0];
  const replyHref = `mailto:${lead.email}?subject=${encodeURIComponent(`Your ${site.shortName} inquiry (${lead.ref})`)}&body=${encodeURIComponent(`Hi ${first},\n\nThanks so much for reaching out about your session!\n\n`)}`;

  const rows: [string, string | null | undefined][] = [
    ["Reference", lead.ref],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["OK to text", lead.sms_opt_in ? "Yes (opted in)" : "No"],
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
        <h1 className="mt-3 text-display-sm">{lead.name}</h1>
        <p className="text-muted">Received {new Date(lead.created_at).toLocaleString("en-US")}</p>
        {lead.message && <blockquote className="mt-6 whitespace-pre-wrap rounded-xl border-l-2 border-clay bg-parchment p-5">{lead.message}</blockquote>}
        <dl className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-bold uppercase tracking-wider text-muted">{k}</dt>
                <dd className="break-words">{v}</dd>
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
        <a href={replyHref} className="flex min-h-12 items-center justify-center rounded-full bg-ink font-semibold text-gallery">
          Reply by email
        </a>
        <form action={updateLeadStatus} className="rounded-xl border border-line bg-parchment p-4">
          <input type="hidden" name="id" value={lead.id} />
          <label className="block text-sm font-semibold">
            Stage
            <select name="status" defaultValue={lead.status} className="field mt-1.5 capitalize">
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <button className="mt-3 min-h-11 w-full rounded-full border border-ink/25 font-semibold">Update stage</button>
          <p className="mt-2 text-xs text-muted">&ldquo;Booked&rdquo; is your manual confirmation. The site never marks anything booked on its own.</p>
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
