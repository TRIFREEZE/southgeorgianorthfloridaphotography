import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { locationBySlug, locationPages, type LocationPage } from "@/content/locations";
import { Gallery } from "@/components/media/Gallery";
import { JsonLd } from "@/components/seo/JsonLd";
import { FaqList } from "@/components/ui/FaqList";
import { Arrow, ButtonLink, Container, PageHero } from "@/components/ui/primitives";
import { getSiteData } from "@/lib/cms/data";
import { portfolio } from "@/lib/cms/resolve";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

/** City pages only render once they're published with genuinely local content (see content/locations.ts). */
const isLive = (l: LocationPage | undefined): l is LocationPage => Boolean(l && l.published && l.intro.trim());

export function generateStaticParams() {
  return locationPages.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: PageProps<"/locations/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const l = locationBySlug(slug);
  if (!isLive(l)) return { robots: { index: false, follow: false } };
  return pageMetadata({ title: l.seoTitle, description: l.seoDescription, path: `/locations/${l.slug}`, absoluteTitle: true });
}

/** Unlisted paths wait for the complete static page (so unknown ones get a real 404). */
export const ensureStatic = "navigation";

/**
 * The body sits in a Suspense boundary so the page can be regenerated on demand
 * after an edit is published (params are only known per path). Known paths
 * still prerender completely, so the HTML search engines see is unchanged.
 */
export default function LocationPage({ params }: PageProps<"/locations/[slug]">) {
  return (
    <Suspense fallback={null}>
      <LocationPageBody params={params} />
    </Suspense>
  );
}

async function LocationPageBody({ params }: Pick<PageProps<"/locations/[slug]">, "params">) {
  const { slug } = await params;
  const l = locationBySlug(slug);
  if (!isLive(l)) notFound();
  const { photos, isReal } = portfolio(await getSiteData());
  const local = isReal ? photos.filter((p) => p.location?.toLowerCase().includes(l.photoLocationMatch.toLowerCase())) : [];

  return (
    <>
      <PageHero eyebrow={`${l.town}, ${l.state}`} title={`Photography in ${l.town}, without the rush.`} lede={l.intro} />
      {local.length > 0 && (
        <section className="pb-16" aria-label={`Photos made in ${l.town}`}>
          <Container>
            <Gallery photos={local} layout="masonry" deepLink label={`Photos made in ${l.town}`} />
          </Container>
        </section>
      )}
      {l.favoriteSettings.length > 0 && (
        <section className="pb-16" aria-labelledby="settings-title">
          <Container>
            <h2 id="settings-title" className="text-display-sm">
              Favorite settings near {l.town}
            </h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {l.favoriteSettings.map((s) => (
                <li key={s.name} className="rounded-[var(--radius-card)] border border-line bg-gallery p-6">
                  <h3 className="text-[1.4rem]">{s.name}</h3>
                  <p className="mt-2 text-muted">{s.note}</p>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}
      {l.travelNote && (
        <section className="pb-16">
          <Container>
            <h2 className="text-display-sm">Getting here</h2>
            <p className="mt-4 max-w-2xl text-ink-soft">{l.travelNote}</p>
          </Container>
        </section>
      )}
      {l.faqs.length > 0 && (
        <section className="pb-16">
          <Container>
            <FaqList items={l.faqs} />
          </Container>
        </section>
      )}
      <Container>
        <ButtonLink href="/book">
          Plan a session in {l.town} <Arrow />
        </ButtonLink>
      </Container>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Service area", path: "/locations" },
          { name: l.town, path: `/locations/${l.slug}` },
        ])}
      />
    </>
  );
}
