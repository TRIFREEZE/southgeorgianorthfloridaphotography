import type { Metadata } from "next";
import { PortfolioView } from "@/components/media/PortfolioView";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/ui/primitives";
import { getPortfolioPhotos } from "@/lib/photos";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Portfolio: Portraits, Pets, Horses, Weddings & Brands",
  description:
    "Natural-light photography from South Georgia and North Florida: families, couples, seniors, horses, pets, weddings, events and small businesses.",
  path: "/portfolio",
});

export default async function PortfolioPage() {
  const { photos, isReal } = await getPortfolioPhotos();
  return (
    <>
      <PageHero
        eyebrow="Portfolio"
        title="Real moments, beautifully kept."
        lede="People, animals, celebrations and businesses, photographed in honest light and edited to still look like themselves. Tap any photo to view it larger."
      />
      <PortfolioView photos={photos} isReal={isReal} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Portfolio", path: "/portfolio" }])} />
    </>
  );
}
