import type { Metadata } from "next";
import Link from "next/link";
import { faqs } from "@/content/faqs";
import { formatPrice, pricing } from "@/content/pricing";
import { site } from "@/content/site";
import { PackageCard } from "@/components/home/PackageCard";
import { FaqList } from "@/components/ui/FaqList";
import { Arrow, ButtonLink, Container, PageHero } from "@/components/ui/primitives";
import { TrackView } from "@/components/ui/TrackView";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Photography Pricing: Portrait Packages from 8 to 40 Photos",
  description: `Straightforward photography pricing in South Georgia & North Florida. Portrait packages from ${formatPrice(pricing.packages[0].priceCents)} priced by finished photos, plus custom wedding, event and business quotes.`,
  path: "/pricing",
});

export default function PricingPage() {
  const wedding = pricing.custom["weddings-events"];
  const business = pricing.custom["business-branding"];
  return (
    <>
      <TrackView event="view_pricing" />
      <PageHero
        eyebrow="Pricing"
        title={pricing.noStopwatch.headline}
        lede="Intentionally accessible pricing for portraits, families, pets and horses, built around how many finished photos you'd like rather than how many minutes we shoot."
      />

      <section aria-labelledby="packages-title">
        <Container>
          <h2 id="packages-title" className="sr-only">
            Portrait packages
          </h2>
          <div className="grid gap-4 md:grid-cols-3 lg:gap-5">
            {pricing.packages.map((p) => (
              <PackageCard key={p.id} pkg={p} />
            ))}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Info title="Extra photos" body={`${formatPrice(pricing.extraPhoto.priceCents)} each. ${pricing.extraPhoto.note}`} />
            <Info title="Travel" body={`${pricing.travel.copy}${pricing.travel.includedRadiusMiles ? ` Included within ${pricing.travel.includedRadiusMiles} miles of our base.` : ""}`} />
            <Info title="Delivery" body={site.turnaroundCopy ?? site.provisionalTurnaroundCopy} />
          </div>
          <p className="mt-6 text-sm text-muted">{pricing.legalNote}</p>
        </Container>
      </section>

      <section className="py-20 sm:py-24" aria-labelledby="nostop-title">
        <Container className="grid gap-10 rounded-[1.5rem] bg-ink p-8 text-gallery on-dark sm:p-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-4">About &ldquo;no stopwatch&rdquo;</p>
            <h2 id="nostop-title" className="text-display-sm">
              What unhurried actually means.
            </h2>
          </div>
          <div className="space-y-4 text-sand lg:col-span-7">
            <p className="text-lede text-gallery">{pricing.noStopwatch.body}</p>
            <p>{pricing.noStopwatch.boundaries}</p>
            <p>{pricing.revisionPolicy}</p>
          </div>
        </Container>
      </section>

      <section aria-labelledby="custom-title" className="pb-20">
        <Container>
          <h2 id="custom-title" className="text-display-md">
            Weddings, events &amp; businesses
          </h2>
          <p className="mt-4 max-w-2xl text-lede text-muted">
            These are custom quoted, in writing, before you commit to anything. We&apos;ll never promise unlimited coverage or squeeze a
            wedding into a portrait price.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {[
              { title: "Weddings & events", data: wedding, href: "/book?category=weddings-events", cta: "Ask about my date" },
              { title: "Business & branding", data: business, href: "/book?category=business-branding", cta: "Start planning" },
            ].map((c) => (
              <article key={c.title} className="flex flex-col rounded-[var(--radius-card)] border border-line bg-gallery p-7" data-reveal>
                <p className="eyebrow">{c.data.label}</p>
                <h3 className="mt-3 text-[1.8rem]">{c.title}</h3>
                <p className="mt-3 text-muted">{c.data.intro}</p>
                {c.data.exampleEstimate && <p className="mt-3 font-semibold">{c.data.exampleEstimate}</p>}
                <ul className="mt-5 space-y-2 text-[0.95rem] text-ink-soft">
                  {c.data.factors.map((f) => (
                    <li key={f} className="flex gap-3">
                      <span aria-hidden className="mt-[0.65em] h-px w-3 shrink-0 bg-clay" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-7">
                  <ButtonLink href={c.href} variant="secondary">
                    {c.cta} <Arrow />
                  </ButtonLink>
                </div>
              </article>
            ))}
          </div>
          {pricing.deposit.enabled && pricing.deposit.amountCents && (
            <p className="mt-8 text-muted">
              {pricing.deposit.copy} Retainer: {formatPrice(pricing.deposit.amountCents)}.
            </p>
          )}
        </Container>
      </section>

      <section aria-labelledby="pricing-faq" className="pb-8">
        <Container className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="pricing-faq" className="text-display-sm">
              Pricing questions
            </h2>
            <p className="mt-4 text-muted">
              Still unsure? <Link className="font-semibold text-clay-deep underline" href="/book">We&apos;ll help you choose.</Link>
            </p>
          </div>
          <div className="lg:col-span-8">
            <FaqList items={faqs.filter((f) => ["time", "more-photos", "travel", "deposit", "rights", "raw"].includes(f.id))} />
          </div>
        </Container>
      </section>
    </>
  );
}

function Info({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line p-5">
      <h3 className="font-sans text-sm font-bold uppercase tracking-[0.12em] text-clay-deep">{title}</h3>
      <p className="mt-2 text-[0.95rem] text-ink-soft">{body}</p>
    </div>
  );
}
