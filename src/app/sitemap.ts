import type { MetadataRoute } from "next";
import { publishedPosts } from "@/content/journal";
import { publishedLocations } from "@/content/locations";
import { portfolioCategories, services } from "@/content/services";
import { absoluteUrl } from "@/lib/seo";

/** Only indexable, published pages. Unpublished city pages stay out until they have real local content. */
export default function sitemap(): MetadataRoute.Sitemap {
  const core = ["/", "/portfolio", "/services", "/pricing", "/experience", "/about", "/locations", "/journal", "/faq", "/contact", "/book"];
  return [
    ...core.map((p) => ({ url: absoluteUrl(p), changeFrequency: "monthly" as const, priority: p === "/" ? 1 : 0.8 })),
    ...portfolioCategories.map((c) => ({ url: absoluteUrl(`/portfolio/${c.id}`), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...services.map((s) => ({ url: absoluteUrl(`/services/${s.slug}`), changeFrequency: "monthly" as const, priority: 0.8 })),
    ...publishedLocations().map((l) => ({ url: absoluteUrl(`/locations/${l.slug}`), changeFrequency: "monthly" as const, priority: 0.6 })),
    ...publishedPosts().map((p) => ({ url: absoluteUrl(`/journal/${p.slug}`), lastModified: p.date, changeFrequency: "yearly" as const, priority: 0.5 })),
    ...["/privacy", "/terms", "/accessibility"].map((p) => ({ url: absoluteUrl(p), changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
