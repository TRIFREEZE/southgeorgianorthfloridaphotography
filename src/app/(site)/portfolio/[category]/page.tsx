import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PortfolioView } from "@/components/media/PortfolioView";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/ui/primitives";
import { getSiteData } from "@/lib/cms/data";
import { categoryBySlug, portfolio, visibleCategories } from "@/lib/cms/resolve";
import { site } from "@/content/site";
import { textOf } from "@/lib/cms/texts";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

/** Categories are managed in /admin → Categories; new ones render on demand, no deploy needed. */
export async function generateStaticParams() {
  const d = await getSiteData();
  const cats = visibleCategories(d);
  return (cats.length ? cats : [{ slug: "people" }]).map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/portfolio/[category]">): Promise<Metadata> {
  const { category } = await params;
  const cat = categoryBySlug(await getSiteData(), category);
  if (!cat) return { robots: { index: false } };
  return pageMetadata({
    title: `${cat.label} Photography Portfolio`,
    description: `${cat.description || cat.label} Photography in ${site.region}.`.slice(0, 300),
    path: `/portfolio/${cat.slug}`,
  });
}

/** Unlisted paths wait for the complete static page (so unknown ones get a real 404). */
export const ensureStatic = "navigation";

/**
 * The body sits in a Suspense boundary so the page can be regenerated on demand
 * after an edit is published (params are only known per path). Known paths
 * still prerender completely, so the HTML search engines see is unchanged.
 */
export default function CategoryPage({ params }: PageProps<"/portfolio/[category]">) {
  return (
    <Suspense fallback={null}>
      <CategoryPageBody params={params} />
    </Suspense>
  );
}

async function CategoryPageBody({ params }: Pick<PageProps<"/portfolio/[category]">, "params">) {
  const { category } = await params;
  const d = await getSiteData();
  const cat = categoryBySlug(d, category);
  if (!cat) notFound();
  const { photos, isReal } = portfolio(d, cat.id);
  return (
    <>
      <PageHero eyebrow={textOf(d.content.texts, "portfolio.eyebrow")} title={cat.label} lede={cat.description || undefined} />
      <PortfolioView photos={photos} isReal={isReal} categories={visibleCategories(d)} active={cat} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Portfolio", path: "/portfolio" },
          { name: cat.label, path: `/portfolio/${cat.slug}` },
        ])}
      />
    </>
  );
}
