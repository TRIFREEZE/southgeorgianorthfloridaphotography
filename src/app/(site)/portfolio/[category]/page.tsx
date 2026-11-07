import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categoryById, portfolioCategories, type CategoryId } from "@/content/services";
import { PortfolioView } from "@/components/media/PortfolioView";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/ui/primitives";
import { getPortfolioPhotos } from "@/lib/photos";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

const copy: Record<CategoryId, { title: string; lede: string; seo: string }> = {
  people: {
    title: "People & families",
    lede: "Families, maternity, couples, seniors, individuals and headshots, with room to warm up and be yourselves.",
    seo: "Family, maternity, couples, senior and headshot photography in South Georgia and North Florida.",
  },
  animals: {
    title: "Pets & horses",
    lede: "Horses, dogs, cats and farm animals, photographed patiently, at their pace, with safety first.",
    seo: "Horse, equestrian, dog, cat and farm animal photography in South Georgia and North Florida.",
  },
  "weddings-events": {
    title: "Weddings & celebrations",
    lede: "Weddings, engagements and milestone events, documented calmly so you can stay present.",
    seo: "Wedding, engagement and event photography in South Georgia and North Florida.",
  },
  brands: {
    title: "Businesses & brands",
    lede: "Teams, founders, products and storefronts, natural and editorial, made to be used.",
    seo: "Brand, headshot, product and small-business photography in South Georgia and North Florida.",
  },
};

export function generateStaticParams() {
  return portfolioCategories.map((c) => ({ category: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/portfolio/[category]">): Promise<Metadata> {
  const { category } = await params;
  const cat = categoryById(category);
  if (!cat) return {};
  return pageMetadata({ title: `${cat.label} Photography Portfolio`, description: copy[cat.id].seo, path: `/portfolio/${cat.id}` });
}

export default async function CategoryPage({ params }: PageProps<"/portfolio/[category]">) {
  const { category } = await params;
  const cat = categoryById(category);
  if (!cat) notFound();
  const { photos, isReal } = await getPortfolioPhotos(cat.id);
  return (
    <>
      <PageHero eyebrow="Portfolio" title={copy[cat.id].title} lede={copy[cat.id].lede} />
      <PortfolioView photos={photos} isReal={isReal} active={cat.id} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Portfolio", path: "/portfolio" },
          { name: cat.label, path: `/portfolio/${cat.id}` },
        ])}
      />
    </>
  );
}
