import Link from "next/link";
import { Suspense } from "react";
import { about } from "@/content/about";
import { publishedLocations } from "@/content/locations";
import { pricing } from "@/content/pricing";
import { reviews } from "@/content/reviews";
import { site } from "@/content/site";
import { requireAdmin } from "@/lib/admin-auth";
import { listLeads, statusCounts, STATUSES } from "@/lib/admin-data";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";
import { getPhotoLibrary } from "@/lib/photos";

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
  const [counts, recent, lib] = await Promise.all([statusCounts(), listLeads(), getPhotoLibrary()]);
  const realPhotos = lib.isReal ? lib.photos.filter((p) => p.category !== "about").length : 0;
  const founder = lib.isReal && lib.photos.some((p) => p.category === "about");

  const checks: { label: string; ok: boolean; required: boolean; hint: string }[] = [
    { label: "Supabase connected", ok: true, required: true, hint: "Inquiries are being stored." },
    { label: "Email notifications", ok: Boolean(env.resendApiKey && env.emailFrom && env.ownerNotificationEmail), required: true, hint: "RESEND_API_KEY, EMAIL_FROM, OWNER_NOTIFICATION_EMAIL" },
    { label: "Site URL set", ok: Boolean(process.env.NEXT_PUBLIC_SITE_URL), required: true, hint: "NEXT_PUBLIC_SITE_URL = your real domain" },
    { label: "Public contact email", ok: Boolean(publicEnv.contactEmail), required: true, hint: "NEXT_PUBLIC_CONTACT_EMAIL" },
    { label: "IP hash salt", ok: Boolean(env.ipHashSalt), required: true, hint: "IP_HASH_SALT (random string)" },
    { label: "Prices confirmed", ok: pricing.status === "confirmed", required: true, hint: "src/content/pricing.ts → status: \"confirmed\"" },
    { label: "Service area confirmed", ok: site.serviceArea.confirmed, required: true, hint: "src/content/site.ts → serviceArea.confirmed" },
    { label: "About story is yours", ok: about.confirmed, required: true, hint: "src/content/about.ts → confirmed: true" },
    { label: "12+ real portfolio photos published", ok: realPhotos >= 12, required: true, hint: `${realPhotos} published. Upload in Photos.` },
    { label: "Founder portrait", ok: founder, required: true, hint: "Upload one photo with category About / founder" },
    { label: "Turnaround time confirmed", ok: Boolean(site.turnaroundCopy), required: false, hint: "src/content/site.ts → turnaroundCopy" },
    { label: "Travel radius published", ok: pricing.travel.includedRadiusMiles != null, required: false, hint: "src/content/pricing.ts → travel.includedRadiusMiles" },
    { label: "Bot check (Turnstile)", ok: Boolean(env.turnstileSecret && publicEnv.turnstileSiteKey), required: false, hint: "Optional extra spam protection" },
    { label: "Real reviews added", ok: reviews.length > 0, required: false, hint: "src/content/reviews.ts (consented reviews only)" },
    { label: "City pages published", ok: publishedLocations().length > 0, required: false, hint: "Only with real local photos & info" },
  ];

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-display-sm">Overview</h1>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {STATUSES.map((s) => (
            <li key={s}>
              <Link href={`/admin/leads?status=${s}`} className="block rounded-xl border border-line bg-parchment p-4 hover:border-ink/40">
                <span className="block font-display text-3xl">{counts[s]}</span>
                <span className="text-sm capitalize text-muted">{s}</span>
              </Link>
            </li>
          ))}
        </ul>
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
