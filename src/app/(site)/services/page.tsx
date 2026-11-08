import type { Metadata } from "next";
import Link from "next/link";
import { PhotoFill } from "@/components/media/Photo";
import { SamplePlate } from "@/components/media/SamplePlate";
import { JsonLd } from "@/components/seo/JsonLd";
import { Arrow, ButtonLink, Container, PageHero } from "@/components/ui/primitives";
import { getSiteData } from "@/lib/cms/data";
import { serviceCover } from "@/lib/cms/resolve";
import { servicePages } from "@/lib/cms/sessions";
import { textOf } from "@/lib/cms/texts";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Photography Sessions",
  description:
    "Portrait, family, pet, horse, wedding, event and business photography sessions across South Georgia and North Florida, with clear inclusions and pricing.",
  path: "/services",
});

export default async function ServicesPage() {
  const d = await getSiteData();
  const { texts } = d.content;
  const t = (k: string) => textOf(texts, k);
  const services = servicePages(d.content);
  return (
    <>
      <PageHero eyebrow={t("services.eyebrow")} title={t("services.title")} lede={t("services.lede")} />
      <Container>
        <ul className="grid gap-6 md:grid-cols-2">
          {services.map((s, i) => {
            const cover = serviceCover(d, s.slug, s.categoryId);
            return (
              <li key={s.slug} data-reveal style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}>
                <Link href={`/services/${s.slug}`} className="group block overflow-hidden rounded-[1.4rem] border border-line bg-gallery" data-flick-look>
                  <div className="relative aspect-[16/10] overflow-hidden bg-sand">
                    <span className="absolute inset-0 transition-transform duration-1000 group-hover:scale-[1.04]">
                      {cover ? (
                        <PhotoFill photo={cover} sizes="(min-width: 768px) 50vw, 100vw" showSampleLabel={false} />
                      ) : (
                        <SamplePlate photo={{ id: `svc-${s.slug}`, category: s.categoryId, title: s.name, tone: i * 3, width: 16, height: 10 }} showLabel={false} />
                      )}
                    </span>
                  </div>
                  <div className="p-6 sm:p-8">
                    <p className="eyebrow">{s.pricingMode === "package" ? t("services.packageLabel") : t("services.quoteLabel")}</p>
                    <h2 className="mt-3 text-[2rem] leading-tight">{s.name}</h2>
                    <p className="mt-3 text-muted">{s.headline}</p>
                    <span className="mt-6 inline-flex items-center gap-2 font-semibold text-clay-deep">
                      {t("services.explore")} {s.navLabel} <Arrow />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-14 text-center">
          <p className="text-muted">{t("services.notSure")}</p>
          <ButtonLink href="/book" className="mt-4">
            {t("services.notSureCta")}
          </ButtonLink>
        </div>
      </Container>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Services", path: "/services" }])} />
    </>
  );
}
