import type { Metadata } from "next";
import Link from "next/link";
import { defaultPricing, formatPrice, pricedPackages } from "@/content/pricing";
import { bookingOptions, sessionTypes } from "@/lib/cms/sessions";
import { getSiteData } from "@/lib/cms/data";
import { textOf } from "@/lib/cms/texts";
import { PackageCard, packageGrid } from "@/components/home/PackageCard";
import { FaqList } from "@/components/ui/FaqList";
import { Arrow, ButtonLink, Container, PageHero } from "@/components/ui/primitives";
import { TrackView } from "@/components/ui/TrackView";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { pricing } = (await getSiteData()).content;
  const priced = pricedPackages(pricing.packages);
  const low = priced[0]?.priceCents ?? defaultPricing.packages[0].priceCents;
  const counts = pricing.packages.map((p) => p.photos).filter((n): n is number => n != null);
  return pageMetadata({
    title: counts.length > 1 ? `Photography Pricing: Packages from ${Math.min(...counts)} to ${Math.max(...counts)} Photos` : "Photography Pricing",
    description: `Straightforward photography pricing in South Georgia & North Florida. Packages from ${formatPrice(low)} priced by finished photos, plus custom quotes for bigger or different work.`,
    path: "/pricing",
  });
}

export default async function PricingPage() {
  const { content } = await getSiteData();
  const { pricing, faqs, texts } = content;
  const quoted = sessionTypes(content).filter((s) => s.pricingMode === "quote" && s.booking.show);
  const packageCategory = bookingOptions(content).find((o) => o.pricingMode === "package")?.bookingId;
  const t = (k: string) => textOf(texts, k);
  return (
    <>
      <TrackView event="view_pricing" />
      <PageHero
        eyebrow={t("pricing.eyebrow")}
        title={pricing.noStopwatch.headline}
        lede={textOf(texts, "pricing.lede")}
      />

      <section aria-labelledby="packages-title">
        <Container>
          <h2 id="packages-title" className="sr-only">
            Portrait packages
          </h2>
          <div className={`grid gap-4 lg:gap-5 ${packageGrid(pricing.packages.length)}`}>
            {pricing.packages.map((p) => (
              <PackageCard key={p.id} pkg={p} category={packageCategory} />
            ))}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Info title={t("pricing.extraTitle")} body={`${formatPrice(pricing.extraPhoto.priceCents)} each. ${pricing.extraPhoto.note}`} />
            <Info title={t("pricing.travelTitle")} body={`${pricing.travel.copy}${pricing.travel.includedRadiusMiles ? ` Included within ${pricing.travel.includedRadiusMiles} miles of our base.` : ""}`} />
            <Info title={t("pricing.deliveryTitle")} body={t("delivery.turnaround")} />
          </div>
          <p className="mt-6 text-sm text-muted">{pricing.legalNote}</p>
        </Container>
      </section>

      <section className="py-20 sm:py-24" aria-labelledby="nostop-title">
        <Container className="grid gap-10 rounded-[1.5rem] bg-ink p-8 text-gallery on-dark sm:p-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-4">{t("pricing.unhurried.eyebrow")}</p>
            <h2 id="nostop-title" className="text-display-sm">
              {t("pricing.unhurried.title")}
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
          {quoted.length > 0 && (
            <>
              <h2 id="custom-title" className="text-display-md">
                {t("pricing.custom.title")}
              </h2>
              <p className="mt-4 max-w-2xl text-lede text-muted">{t("pricing.custom.lede")}</p>
              <div className={`mt-10 grid gap-5 ${quoted.length === 1 ? "" : quoted.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`} data-testid="custom-quotes">
                {quoted.map((s) => (
                  <article key={s.categoryId} className="flex flex-col rounded-[var(--radius-card)] border border-line bg-gallery p-7" data-reveal>
                    <p className="eyebrow">Custom quote</p>
                    <h3 className="mt-3 text-[1.8rem]">{s.quote.title}</h3>
                    <p className="mt-3 text-muted">{s.quote.intro}</p>
                    {s.quote.exampleEstimate && <p className="mt-3 font-semibold">{s.quote.exampleEstimate}</p>}
                    <ul className="mt-5 space-y-2 text-[0.95rem] text-ink-soft">
                      {s.quote.factors.map((f) => (
                        <li key={f} className="flex gap-3">
                          <span aria-hidden className="dash" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto pt-7">
                      <ButtonLink href={`/book?category=${s.bookingId}`} variant="secondary">
                        {s.quote.cta} <Arrow />
                      </ButtonLink>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
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
              {t("pricing.faqTitle")}
            </h2>
            <p className="mt-4 text-muted">
              {t("pricing.help")}{" "}
              <Link className="font-semibold text-clay-deep underline" href="/book">
                {t("pricing.helpLink")}
              </Link>
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
