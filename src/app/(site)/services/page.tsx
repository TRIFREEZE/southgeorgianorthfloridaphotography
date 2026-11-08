import type { Metadata } from "next";
import Link from "next/link";
import { services } from "@/content/services";
import { PhotoFill } from "@/components/media/Photo";
import { SamplePlate } from "@/components/media/SamplePlate";
import { JsonLd } from "@/components/seo/JsonLd";
import { Arrow, ButtonLink, Container, PageHero } from "@/components/ui/primitives";
import { getSiteData } from "@/lib/cms/data";
import { serviceCover } from "@/lib/cms/resolve";
import { textOf } from "@/lib/cms/texts";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Photography Sessions: Portraits, Pets & Horses, Weddings, Brands",
  description:
    "Portrait, family, pet, horse, wedding, event and business photography sessions across South Georgia and North Florida, with clear inclusions and pricing.",
  path: "/services",
});

export default async function ServicesPage() {
  const d = await getSiteData();
  const { pricing, texts } = d.content;
  return (
    <>
      <PageHero
        eyebrow="Sessions"
        title="Four kinds of stories. One unhurried way of working."
        lede="Portrait and animal sessions are priced by finished photos. Weddings, events and business work are custom quoted with clear coverage and usage."
      />
      <Container>
        <ul className="grid gap-6 md:grid-cols-2">
          {services.map((s, i) => {
            const cover = serviceCover(d, s.slug, s.category);
            return (
              <li key={s.slug} data-reveal style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}>
                <Link href={`/services/${s.slug}`} className="group block overflow-hidden rounded-[1.4rem] border border-line bg-gallery" data-flick-look>
                  <div className="relative aspect-[16/10] overflow-hidden bg-sand">
                    <span className="absolute inset-0 transition-transform duration-1000 group-hover:scale-[1.04]">
                      {cover ? (
                        <PhotoFill photo={cover} sizes="(min-width: 768px) 50vw, 100vw" showSampleLabel={false} />
                      ) : (
                        <SamplePlate photo={{ id: `svc-${s.slug}`, category: s.category, title: s.name, tone: i * 3, width: 16, height: 10 }} showLabel={false} />
                      )}
                    </span>
                  </div>
                  <div className="p-6 sm:p-8">
                    <p className="eyebrow">{s.pricingMode === "package" ? "Priced by photo count" : pricing.custom["weddings-events"].label}</p>
                    <h2 className="mt-3 text-[2rem] leading-tight">{s.name}</h2>
                    <p className="mt-3 text-muted">{textOf(texts, `services.${s.slug}.headline`)}</p>
                    <span className="mt-6 inline-flex items-center gap-2 font-semibold text-clay-deep">
                      Explore {s.navLabel} <Arrow />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-14 text-center">
          <p className="text-muted">Not sure which fits?</p>
          <ButtonLink href="/book" className="mt-4">
            Find my session
          </ButtonLink>
        </div>
      </Container>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Services", path: "/services" }])} />
    </>
  );
}
