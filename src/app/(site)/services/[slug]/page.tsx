import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { formatPrice } from "@/content/pricing";
import { PackageCard, packageGrid } from "@/components/home/PackageCard";
import { Gallery } from "@/components/media/Gallery";
import { JsonLd } from "@/components/seo/JsonLd";
import { FaqList } from "@/components/ui/FaqList";
import { Arrow, ButtonLink, Container, SectionHeading } from "@/components/ui/primitives";
import { TrackView } from "@/components/ui/TrackView";
import { getSiteData, getT } from "@/lib/cms/data";
import { categoryById, portfolio } from "@/lib/cms/resolve";
import { bookingOptions, servicePages, sessionBySlug } from "@/lib/cms/sessions";
import { packagesFor } from "@/lib/inquiry/estimate";
import { breadcrumbJsonLd, pageMetadata, serviceJsonLd } from "@/lib/seo";

/** Every category with a service page; new ones render on demand, no deploy needed. */
export async function generateStaticParams() {
  const pages = servicePages((await getSiteData()).content);
  return (pages.length ? pages : [{ slug: "portraits-families" }]).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/services/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = sessionBySlug((await getSiteData()).content, slug);
  if (!s) return { robots: { index: false } };
  return pageMetadata({ title: s.seoTitle, description: s.seoDescription, path: `/services/${s.slug}` });
}

/** Unlisted paths wait for the complete static page (so unknown ones get a real 404). */
export const ensureStatic = "navigation";

/**
 * The body sits in a Suspense boundary so the page can be regenerated on demand
 * after an edit is published (params are only known per path). Known paths
 * still prerender completely, so the HTML search engines see is unchanged.
 */
export default function ServicePage({ params }: PageProps<"/services/[slug]">) {
  return (
    <Suspense fallback={null}>
      <ServicePageBody params={params} />
    </Suspense>
  );
}

async function ServicePageBody({ params }: Pick<PageProps<"/services/[slug]">, "params">) {
  const { slug } = await params;
  const d = await getSiteData();
  const s = sessionBySlug(d.content, slug);
  if (!s) notFound();
  const t = await getT();
  const { pricing } = d.content;
  const { photos } = portfolio(d, s.categoryId);
  const cat = categoryById(d, s.categoryId);
  const workHref = cat?.visible ? `/portfolio/${cat.slug}` : "/portfolio";
  const quote = s.pricingMode === "quote" ? s.quote : null;
  const book = s.booking.show ? `/book?category=${s.bookingId}` : "/book";
  const packages = packagesFor(s.bookingId, pricing, bookingOptions(d.content));

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
              <ButtonLink href={book}>
                {s.cta} <Arrow />
              </ButtonLink>
              <ButtonLink href={workHref} variant="secondary">
                {t("service.seeWork")}
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
        <Container className={`grid gap-12 ${s.idealFor.length ? "lg:grid-cols-2" : ""}`}>
          <div hidden={!s.idealFor.length}>
            <h2 id={s.idealFor.length ? "ideal-title" : undefined} className="text-display-sm">
              {t("service.greatFor")}
            </h2>
            <ul className="mt-6 space-y-3 text-lede text-ink-soft">
              {s.idealFor.map((x) => (
                <li key={x} className="flex gap-3">
                  <span aria-hidden className="dash mt-[0.7em] w-4" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 id={s.idealFor.length ? undefined : "ideal-title"} className="text-display-sm">
              {t("service.pace")}
            </h2>
            <p className="mt-6 text-ink-soft">{s.timing}</p>
          </div>
        </Container>
      </section>

      <section className="bg-gallery py-16 sm:py-24" aria-labelledby="how-title">
        <Container>
          <SectionHeading id="how-title" eyebrow={t("service.howEyebrow")} title={t("service.howTitle")} />
          <ol className={`mt-12 grid gap-8 ${s.steps.length === 2 ? "md:grid-cols-2" : s.steps.length === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
            {s.steps.map((h, i) => (
              <li key={i} className="border-t border-line pt-6" data-reveal style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}>
                <p className="font-display text-clay">{String(i + 1).padStart(2, "0")}</p>
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
                <SectionHeading id="price-title" eyebrow={t("service.pricingEyebrow")} title={t("service.quoteTitle")} lede={quote.intro} />
                {quote.exampleEstimate && <p className="mt-4 font-semibold">{quote.exampleEstimate}</p>}
              </div>
              <div className="lg:col-span-6 lg:col-start-7">
                <p className="font-semibold">{t("service.quoteBasis")}</p>
                <ul className="mt-4 space-y-3 text-ink-soft">
                  {quote.factors.map((f) => (
                    <li key={f} className="flex gap-3 border-b border-line pb-3">
                      <span aria-hidden className="dash mt-[0.7em] w-4" />
                      {f}
                    </li>
                  ))}
                </ul>
                <ButtonLink href={book} className="mt-8">
                  {s.quote.cta} <Arrow />
                </ButtonLink>
              </div>
            </div>
          ) : (
            <>
              <SectionHeading
                id="price-title"
                eyebrow={t("service.pricingEyebrow")}
                title={pricing.noStopwatch.headline}
                lede={t("service.packagesLede", { extraPrice: formatPrice(pricing.extraPhoto.priceCents) })}
              />
              <div className={`mt-10 grid gap-4 ${packageGrid(packages.length)}`}>
                {packages.map((p) => (
                  <PackageCard key={p.id} pkg={p} category={s.booking.show ? s.bookingId : undefined} />
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
              {t("service.faqTitle", { service: s.navLabel })}
            </h2>
          </div>
          <div className="lg:col-span-8">
            <FaqList items={d.content.faqs.filter((f) => f.services.includes(s.slug))} />
          </div>
        </Container>
      </section>

      <JsonLd
        data={[
          serviceJsonLd(s, pricing),
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
