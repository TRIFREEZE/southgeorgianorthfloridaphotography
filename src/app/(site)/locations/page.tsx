import type { Metadata } from "next";
import Link from "next/link";
import { publishedLocations } from "@/content/locations";
import { getSiteData } from "@/lib/cms/data";
import { site } from "@/content/site";
import { publicEnv } from "@/lib/env";
import { Arrow, ButtonLink, Container, PageHero } from "@/components/ui/primitives";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Service Area: South Georgia & North Florida",
  description:
    "Where Red Clay & Light photographs: Moultrie, Thomasville, Valdosta, Tallahassee, Monticello and nearby towns across South Georgia and North Florida, with travel quoted up front.",
  path: "/locations",
});

export default async function LocationsPage() {
  const { pricing } = (await getSiteData()).content;
  const live = publishedLocations();
  return (
    <>
      <PageHero
        eyebrow="Service area"
        title="South Georgia & North Florida, and the back roads in between."
        lede={`We photograph across ${site.region}${publicEnv.baseCity ? `, based near ${publicEnv.baseCity}` : ""}. These are the towns at the heart of where we work.`}
      />
      <Container>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {site.serviceArea.towns.map((t) => {
            const page = live.find((l) => l.slug === t.slug);
            const inner = (
              <>
                <span className="font-display text-[1.7rem]">{t.name}</span>
                <span className="text-sm text-muted">{t.state === "GA" ? "Georgia" : "Florida"}</span>
                {page && (
                  <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-clay-deep">
                    Local guide <Arrow />
                  </span>
                )}
              </>
            );
            return (
              <li key={t.slug}>
                {page ? (
                  <Link href={`/locations/${t.slug}`} className="flex flex-col rounded-[var(--radius-card)] border border-line bg-gallery p-6 hover:border-ink/40">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex flex-col rounded-[var(--radius-card)] border border-line bg-gallery p-6">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-12 grid gap-8 rounded-[1.4rem] border border-line p-8 md:grid-cols-2">
          <div>
            <h2 className="text-display-sm">Travel, honestly</h2>
            <p className="mt-4 text-ink-soft">{pricing.travel.copy}</p>
          </div>
          <div>
            <p className="text-ink-soft">{site.serviceArea.outsideAreaNote}</p>
            <ButtonLink href="/book" className="mt-6">
              Ask about your location <Arrow />
            </ButtonLink>
          </div>
        </div>
      </Container>
    </>
  );
}
