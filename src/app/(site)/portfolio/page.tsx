import type { Metadata } from "next";
import { PortfolioView } from "@/components/media/PortfolioView";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/ui/primitives";
import { getSiteData } from "@/lib/cms/data";
import { portfolio, visibleCategories } from "@/lib/cms/resolve";
import { textOf } from "@/lib/cms/texts";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Portfolio: Portraits, Pets, Horses, Weddings & Brands",
  description:
    "Natural-light photography from South Georgia and North Florida: families, couples, seniors, horses, pets, weddings, events and small businesses.",
  path: "/portfolio",
});

export default async function PortfolioPage() {
  const d = await getSiteData();
  const { photos, isReal } = portfolio(d);
  return (
    <>
      <PageHero eyebrow="Portfolio" title={textOf(d.content.texts, "portfolio.title")} lede={textOf(d.content.texts, "portfolio.lede")} />
      <PortfolioView photos={photos} isReal={isReal} categories={visibleCategories(d)} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Portfolio", path: "/portfolio" }])} />
    </>
  );
}
