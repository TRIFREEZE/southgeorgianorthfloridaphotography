import Link from "next/link";
import { Suspense } from "react";
import { about, FOUNDER2_PLACEHOLDER } from "@/content/about";
import { publishedLocations } from "@/content/locations";
import { site } from "@/content/site";
import { formatBytes } from "@/lib/format-bytes";
import { requireAdmin } from "@/lib/admin-auth";
import { Countdown, shortDate } from "@/components/admin/LeadBits";
import { bookingOptions } from "@/lib/cms/sessions";
import { listLeads, SOON_DAYS, STATUS_LABEL, statusCounts, STATUSES, upcomingSessions } from "@/lib/admin-data";
import { getSiteData } from "@/lib/cms/data";
import { founderPhoto } from "@/lib/cms/resolve";
import { getRepo } from "@/lib/cms/repo";
import type { UsageRow } from "@/lib/cms/repo/types";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Overview" };

export default function AdminHome() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  await requireAdmin();
  const env = serverEnv();
  const repo = getRepo();
  const [counts, recent, d, usage, upcoming] = await Promise.all([statusCounts(), listLeads(), getSiteData(), repo ? repo.storageUsage().catch(() => [] as UsageRow[]) : Promise.resolve([] as UsageRow[]), upcomingSessions()]);
  const { pricing, texts, testimonials } = d.content;
  const realPhotos = d.photos.filter((p) => p.category).length;
  const founder = Boolean(founderPhoto(d, 1).src && founderPhoto(d, 2).src);
  const quotaGb = Number(process.env.STORAGE_QUOTA_GB) || 100;
  const used = usage.reduce((n, u) => n + u.bytes, 0);
  const pct = Math.min(100, (used / (quotaGb * 1e9)) * 100);
  const BUCKET_LABEL: Record<string, string> = { portfolio: "Website photos (optimized)", "portfolio-uploads": "Original uploads (private)", "client-galleries": "Client galleries (private)" };

  const checks: { label: string; ok: boolean; required: boolean; hint: string }[] = [
    { label: "Supabase connected", ok: isSupabaseConfigured(), required: true, hint: isSupabaseConfigured() ? "Inquiries, photos and content are stored in Supabase." : "Local test mode. Add Supabase keys before launch." },
    { label: "Email notifications", ok: Boolean(env.resendApiKey && env.emailFrom && env.ownerNotificationEmail), required: true, hint: "RESEND_API_KEY, EMAIL_FROM, OWNER_NOTIFICATION_EMAIL" },
    { label: "Site URL set", ok: Boolean(process.env.NEXT_PUBLIC_SITE_URL), required: true, hint: "NEXT_PUBLIC_SITE_URL = your real domain" },
    { label: "Public contact email", ok: Boolean(publicEnv.contactEmail), required: true, hint: "NEXT_PUBLIC_CONTACT_EMAIL" },
    { label: "IP hash salt", ok: Boolean(env.ipHashSalt), required: true, hint: "IP_HASH_SALT (random string)" },
    { label: "Prices confirmed", ok: pricing.status === "confirmed", required: true, hint: "Pricing & text → Pricing → “These prices are final”, then Publish" },
    { label: "Service area confirmed", ok: site.serviceArea.confirmed, required: true, hint: "src/content/site.ts → serviceArea.confirmed" },
    { label: "About page is yours", ok: about.confirmed || Boolean(texts["about.story"]?.trim() && texts["about.story2"]?.trim() && texts["about.story2"].trim() !== FOUNDER2_PLACEHOLDER), required: true, hint: "Pricing & text → All site text → About page: both founders' stories" },
    { label: "Both founders named", ok: Boolean(texts["about.name"]?.trim() && texts["about.name2"]?.trim()), required: false, hint: "Pricing & text → All site text → About page → Founder 1 / 2 · Name" },
    { label: "12+ real portfolio photos published", ok: realPhotos >= 12, required: true, hint: `${realPhotos} live. Upload in Photo library.` },
    { label: "Founder portraits", ok: founder, required: true, hint: "Site photos → About page → Founder 1 and Founder 2 portraits" },
    { label: "Turnaround time confirmed", ok: Boolean(site.turnaroundCopy || texts["delivery.turnaround"]?.trim()), required: false, hint: "Pricing & text → Page text → Delivery turnaround" },
    { label: "Travel radius published", ok: pricing.travel.includedRadiusMiles != null, required: false, hint: "Pricing & text → Pricing → Travel" },
    { label: "Bot check (Turnstile)", ok: Boolean(env.turnstileSecret && publicEnv.turnstileSiteKey), required: false, hint: "Optional extra spam protection" },
    { label: "Real reviews added", ok: testimonials.some((t) => t.consent && t.published), required: false, hint: "Pricing & text → Testimonials (with permission only)" },
    { label: "City pages published", ok: publishedLocations().length > 0, required: false, hint: "Only with real local photos & info" },
  ];

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-display-sm">Overview</h1>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10">
          {STATUSES.map((s) => (
            <li key={s}>
              <Link href={`/admin/leads?status=${s}`} className="block rounded-xl border border-line bg-parchment p-4 hover:border-ink/40">
                <span className="block font-display text-3xl">{counts[s]}</span>
                <span className="text-sm text-muted">{STATUS_LABEL[s]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {upcoming.length > 0 && (
        <section aria-labelledby="overview-coming-up">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="overview-coming-up" className="text-[1.6rem]">
              Coming up
            </h2>
            <Link href="/admin/leads" className="text-sm underline">
              All leads →
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-parchment">
            {upcoming.slice(0, 5).map(({ lead: l, date, days }) => (
              <li key={l.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${days <= SOON_DAYS ? "bg-[#fbeeea]" : ""}`}>
                <span className={`w-28 font-semibold ${days <= SOON_DAYS ? "text-[#7d2a20]" : ""}`}>{shortDate(date)}</span>
                <Link href={`/admin/leads/${l.id}`} className="font-semibold underline">
                  {l.name}
                </Link>
                <span className="text-sm text-muted">{[l.session_time, bookingOptions(d.content, { includeHidden: true }).find((o) => o.bookingId === l.category)?.label ?? l.category].filter(Boolean).join(" · ")}</span>
                <span className="ml-auto">
                  <Countdown days={days} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { href: "/admin/site-photos", title: "Replace site photos", body: "Hero, homepage, covers and service pages. Drop a file on any spot." },
          { href: "/admin/library", title: "Upload & organize", body: "Bulk upload, crop for desktop & mobile, reorder, feature." },
          { href: "/admin/content", title: "Pricing & text", body: "Packages, add-ons, page wording, FAQs and testimonials." },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="rounded-2xl border border-line bg-parchment p-5 hover:border-ink/40">
            <span className="font-display text-[1.3rem]">{c.title} →</span>
            <span className="mt-1 block text-sm text-muted">{c.body}</span>
          </Link>
        ))}
      </section>

      <section aria-labelledby="storage">
        <h2 id="storage" className="text-[1.6rem]">
          Storage
        </h2>
        <div className="mt-4 rounded-2xl border border-line bg-parchment p-5" data-testid="storage-usage">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-display text-2xl">{formatBytes(used)}</span>
            <span className="text-sm text-muted">of {quotaGb} GB plan storage ({pct < 0.1 && used > 0 ? "<0.1" : pct.toFixed(1)}%)</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Storage used">
            <div className={`h-full rounded-full ${pct > 85 ? "bg-[#a3392b]" : "bg-clay-deep"}`} style={{ width: `${Math.max(pct, used ? 0.6 : 0)}%` }} />
          </div>
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            {["portfolio", "portfolio-uploads", "client-galleries"].map((b) => {
              const row = usage.find((u) => u.bucket === b);
              return (
                <li key={b} className="rounded-xl bg-gallery px-3 py-2">
                  <span className="block font-semibold">{BUCKET_LABEL[b]}</span>
                  <span className="text-muted">
                    {row ? `${row.files} files · ${formatBytes(row.bytes)}` : "Empty"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-[1.6rem]">Latest inquiries</h2>
          <Link href="/admin/leads" className="text-sm font-semibold underline">
            All leads
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-parchment">
          {recent.slice(0, 6).map((l) => (
            <li key={l.id}>
              <Link href={`/admin/leads/${l.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-gallery">
                <span>
                  <strong>{l.name}</strong> <span className="text-muted">· {l.category} · {l.estimate_label}</span>
                </span>
                <span className="text-sm text-muted">
                  <span className="mr-3 rounded-full bg-gallery px-2 py-0.5 capitalize">{l.status}</span>
                  {new Date(l.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </Link>
            </li>
          ))}
          {recent.length === 0 && <li className="px-4 py-6 text-muted">No inquiries yet.</li>}
        </ul>
      </section>

      <section>
        <h2 className="text-[1.6rem]">Launch readiness</h2>
        <p className="mt-1 text-sm text-muted">Everything marked required should be green before you share the site publicly.</p>
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-3 rounded-xl border border-line bg-parchment px-4 py-3">
              <span aria-hidden className={`mt-1 h-3 w-3 shrink-0 rounded-full ${c.ok ? "bg-moss" : c.required ? "bg-[#a3392b]" : "bg-sand"}`} />
              <span>
                <span className="font-semibold">{c.label}</span>
                <span className="sr-only">{c.ok ? " (done)" : c.required ? " (required, not done)" : " (optional)"}</span>
                <span className="block text-sm text-muted">{c.hint}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
