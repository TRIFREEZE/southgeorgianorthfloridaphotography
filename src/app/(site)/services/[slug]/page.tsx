import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatPrice, pricing } from "@/content/pricing";
import { serviceBySlug, services } from "@/content/services";
import { PackageCard } from "@/components/home/PackageCard";
import { Gallery } from "@/components/media/Gallery";
import { JsonLd } from "@/components/seo/JsonLd";
import { FaqList } from "@/components/ui/FaqList";
import { Arrow, ButtonLink, Container, SectionHeading } from "@/components/ui/primitives";
import { TrackView } from "@/components/ui/TrackView";
import { getPortfolioPhotos } from "@/lib/photos";
import { breadcrumbJsonLd, pageMetadata, serviceJsonLd } from "@/lib/seo";

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/services/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = serviceBySlug(slug);
  if (!s) return {};
  return pageMetadata({ title: s.seoTitle, description: s.seoDescription, path: `/services/${s.slug}` });
}

export default async function ServicePage({ params }: PageProps<"/services/[slug]">) {
  const { slug } = await params;
  const s = serviceBySlug(slug);
  if (!s) notFound();
  const { photos } = await getPortfolioPhotos(s.category);
  const quote = s.pricingMode === "quote" ? pricing.custom[s.slug as "weddings-events" | "business-branding"] : null;

  return (
    <>
      <TrackView event="view_service" props={{ service: s.slug }} />
      <section className="pt-14 pb-12 sm:pt-20 lg:pt-28">
        <Container className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-5">{s.name}</p>
            <h1 className="text-display-lg">{s.headline}</h1>
          </div>
          <div className="lg:col-span-5 lg:pt-10">
            <p className="text-lede text-ink-soft">{s.intro}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href={`/book?category=${s.bookingCategory}`}>
                {s.cta} <Arrow />
              </ButtonLink>
              <ButtonLink href={`/portfolio/${s.category}`} variant="secondary">
                See the work
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {photos.length > 0 && (
        <section aria-label={`${s.name} photographs`} className="pb-16">
          <Container>
            <Gallery photos={photos.slice(0, 7)} layout="mosaic" label={`${s.name} photographs`} />
          </Container>
        </section>
      )}

      <section className="py-16 sm:py-20" aria-labelledby="ideal-title">
        <Container className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 id="ideal-title" className="text-display-sm">
              Great for
            </h2>
            <ul className="mt-6 space-y-3 text-lede text-ink-soft">
              {s.idealFor.map((x) => (
                <li key={x} className="flex gap-3">
                  <span aria-hidden className="mt-[0.7em] h-px w-4 shrink-0 bg-clay" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-display-sm">Time &amp; pace</h2>
            <p className="mt-6 text-ink-soft">{s.timing}</p>
          </div>
        </Container>
      </section>

      <section className="bg-gallery py-16 sm:py-24" aria-labelledby="how-title">
        <Container>
          <SectionHeading id="how-title" eyebrow="How it works" title="Simple, from first note to finished photos." />
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {s.howItWorks.map((h, i) => (
              <li key={h.title} className="border-t border-line pt-6" data-reveal style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}>
                <p className="font-display text-clay">0{i + 1}</p>
                <h3 className="mt-2 text-[1.5rem]">{h.title}</h3>
                <p className="mt-2 text-muted">{h.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="py-16 sm:py-24" aria-labelledby="price-title">
        <Container>
          {quote ? (
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <SectionHeading id="price-title" eyebrow="Pricing" title="Custom quoted, clearly." lede={quote.intro} />
                {quote.exampleEstimate && <p className="mt-4 font-semibold">{quote.exampleEstimate}</p>}
              </div>
              <div className="lg:col-span-6 lg:col-start-7">
                <p className="font-semibold">Your quote is based on:</p>
                <ul className="mt-4 space-y-3 text-ink-soft">
                  {quote.factors.map((f) => (
                    <li key={f} className="flex gap-3 border-b border-line pb-3">
                      <span aria-hidden className="mt-[0.7em] h-px w-4 shrink-0 bg-clay" />
                      {f}
                    </li>
                  ))}
                </ul>
                <ButtonLink href={`/book?category=${s.bookingCategory}`} className="mt-8">
                  {s.cta} <Arrow />
                </ButtonLink>
              </div>
            </div>
          ) : (
            <>
              <SectionHeading
                id="price-title"
                eyebrow="Pricing"
                title={pricing.noStopwatch.headline}
                lede={`Choose how many finished photos you'd like. Extra photos are ${formatPrice(pricing.extraPhoto.priceCents)} each.`}
              />
              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {pricing.packages.map((p) => (
                  <PackageCard key={p.id} pkg={p} />
                ))}
              </div>
            </>
          )}
        </Container>
      </section>

      <section className="pb-8" aria-labelledby="svc-faq-title">
        <Container className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="svc-faq-title" className="text-display-sm">
              Questions about {s.navLabel}
            </h2>
          </div>
          <div className="lg:col-span-8">
            <FaqList items={s.faqs} />
          </div>
        </Container>
      </section>

      <JsonLd
        data={[
          serviceJsonLd(s),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
            { name: s.name, path: `/services/${s.slug}` },
          ]),
        ]}
      />
    </>
  );
}
