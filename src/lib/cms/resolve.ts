import { samplePhotos } from "@/content/sample-photos";
import type { Photo } from "@/lib/photo-types";
import type { Category, SiteContent } from "./schema";

/**
 * Pure rules that decide which photograph fills each spot on the site.
 * Every spot can be set explicitly in /admin → Site photos; otherwise it falls back
 * sensibly (featured → first in category → labeled sample). Kept pure for testing.
 */
export interface SiteData {
  content: SiteContent;
  /** Visible real photos (published, or drafts while previewing). */
  photos: Photo[];
  preview: boolean;
}

const byOrder = (a: Photo, b: Photo) => (a.sortOrder ?? 1000) - (b.sortOrder ?? 1000) || a.id.localeCompare(b.id);

export const visibleCategories = (d: SiteData): Category[] => d.content.categories.filter((c) => c.visible);
export const categoryBySlug = (d: SiteData, slug: string) => visibleCategories(d).find((c) => c.slug === slug) ?? null;
export const categoryById = (d: SiteData, id: string | null | undefined) => (id ? (d.content.categories.find((c) => c.id === id) ?? null) : null);

const photoById = (d: SiteData, id: string | null | undefined) => (id ? (d.photos.find((p) => p.id === id) ?? null) : null);

/** Portfolio photos: real ones when any exist for the scope, else labeled samples. */
export function portfolio(d: SiteData, categoryId?: string): { photos: Photo[]; isReal: boolean } {
  const visible = new Set(visibleCategories(d).map((c) => c.id));
  const real = d.photos.filter((p) => p.category && visible.has(p.category) && (!categoryId || p.category === categoryId)).sort(byOrder);
  if (real.length) return { photos: real, isReal: true };
  const anyReal = d.photos.some((p) => p.category && visible.has(p.category));
  if (!categoryId && anyReal) return { photos: [], isReal: true };
  const samples = samplePhotos.filter((p) => p.category && (categoryId ? p.category === categoryId : visible.has(p.category)));
  return { photos: samples, isReal: false };
}

export function heroPhoto(d: SiteData): Photo {
  return (
    photoById(d, d.content.layout.hero) ??
    portfolio(d).photos.find((p) => p.featured && !p.isSample) ??
    portfolio(d).photos.find((p) => !p.isSample) ??
    samplePhotos.find((p) => p.hero)!
  );
}

/** Founder portraits: 1 = the first founder, 2 = the second. Labeled samples until chosen. */
export function founderPhoto(d: SiteData, which: 1 | 2 = 1): Photo {
  const id = which === 1 ? d.content.layout.founder : d.content.layout.founder2;
  return photoById(d, id) ?? samplePhotos.find((p) => p.id === (which === 1 ? "sample-founder" : "sample-founder-2"))!;
}

/** Extra About-page photos the owner chose (never samples). */
export function aboutPhotos(d: SiteData): Photo[] {
  return d.content.layout.aboutPhotos.map((id) => photoById(d, id)).filter((p): p is Photo => Boolean(p));
}

/** Homepage mosaic: the hand-picked order first, topped up with featured photos. */
export function mosaicPhotos(d: SiteData, limit = 7): Photo[] {
  const hero = heroPhoto(d);
  const picked = d.content.layout.mosaic.map((id) => photoById(d, id)).filter((p): p is Photo => Boolean(p));
  const { photos, isReal } = portfolio(d);
  if (!isReal && !picked.length) return photos.filter((p) => p.featured && p.id !== hero.id).slice(0, limit);
  const out = [...picked];
  const pool = photos.filter((p) => p.id !== hero.id && !out.some((o) => o.id === p.id));
  if (out.length < 5) out.push(...pool.filter((p) => p.featured), ...pool.filter((p) => !p.featured));
  return out.slice(0, limit);
}

export function categoryCover(d: SiteData, categoryId: string): Photo | null {
  const explicit = photoById(d, d.content.layout.categoryCovers[categoryId]);
  if (explicit) return explicit;
  const { photos } = portfolio(d, categoryId);
  return photos.find((p) => p.featured) ?? photos[0] ?? null;
}

export function serviceCover(d: SiteData, serviceSlug: string, categoryId: string): Photo | null {
  return photoById(d, d.content.layout.serviceCovers[serviceSlug]) ?? categoryCover(d, categoryId);
}

export function journalCover(d: SiteData, postSlug: string): Photo | null {
  return photoById(d, d.content.layout.journalCovers[postSlug]);
}

/** Lightweight list for Build Your Story / film strip. */
export function storyPool(d: SiteData) {
  return portfolio(d).photos;
}
