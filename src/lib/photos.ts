import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { samplePhotos } from "@/content/sample-photos";
import type { Photo } from "@/lib/photo-types";
import { getPublicClient, isPublicSupabaseConfigured, publicStorageUrl } from "@/lib/supabase/server";

export const PHOTOS_TAG = "photos";

interface PhotoRow {
  id: string;
  storage_path: string;
  width: number;
  height: number;
  blur_data_url: string | null;
  category: Photo["category"];
  subcategory: string | null;
  title: string | null;
  alt: string;
  location: string | null;
  story_text: string | null;
  story_slug: string | null;
  focal_x: number | null;
  focal_y: number | null;
  featured: boolean;
  hero: boolean;
  sort_order: number;
}

export function rowToPhoto(r: PhotoRow): Photo {
  return {
    id: r.id,
    src: publicStorageUrl(r.storage_path),
    width: r.width,
    height: r.height,
    blurDataUrl: r.blur_data_url,
    category: r.category,
    subcategory: r.subcategory,
    title: r.title ?? r.subcategory ?? "Photograph",
    alt: r.alt,
    location: r.location,
    storyText: r.story_text,
    storySlug: r.story_slug,
    focalX: r.focal_x ?? 50,
    focalY: r.focal_y ?? 50,
    featured: r.featured,
    hero: r.hero,
    isSample: false,
  };
}

export interface PhotoLibrary {
  photos: Photo[];
  /** True when real published photos exist; false = labeled samples. */
  isReal: boolean;
}

/**
 * All published photos, cached and tagged. The admin calls `updateTag("photos")`
 * after any change, and the short cache life is a safety net.
 */
export async function getPhotoLibrary(): Promise<PhotoLibrary> {
  "use cache";
  cacheLife("hours");
  cacheTag(PHOTOS_TAG);

  if (!isPublicSupabaseConfigured()) return { photos: samplePhotos, isReal: false };

  try {
    const { data, error } = await getPublicClient()
      .from("photos")
      .select(
        "id, storage_path, width, height, blur_data_url, category, subcategory, title, alt, location, story_text, story_slug, focal_x, focal_y, featured, hero, sort_order",
      )
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    const rows = (data ?? []) as PhotoRow[];
    if (rows.length === 0) return { photos: samplePhotos, isReal: false };
    return { photos: rows.map(rowToPhoto), isReal: true };
  } catch (err) {
    console.error("[photos] falling back to samples:", err instanceof Error ? err.message : err);
    return { photos: samplePhotos, isReal: false };
  }
}

export async function getPortfolioPhotos(category?: string) {
  const lib = await getPhotoLibrary();
  const photos = lib.photos.filter((p) => p.category !== "about" && (!category || p.category === category));
  return { ...lib, photos };
}

export async function getHeroPhoto() {
  const { photos } = await getPhotoLibrary();
  return photos.find((p) => p.hero) ?? photos.find((p) => p.featured && p.category !== "about") ?? photos[0];
}

export async function getFounderPhoto() {
  const { photos } = await getPhotoLibrary();
  return photos.find((p) => p.category === "about") ?? null;
}

export async function getFeaturedPhotos(limit = 7) {
  const { photos } = await getPhotoLibrary();
  const pool = photos.filter((p) => p.category !== "about" && !p.hero);
  const featured = pool.filter((p) => p.featured);
  return (featured.length >= 5 ? featured : [...featured, ...pool.filter((p) => !p.featured)]).slice(0, limit);
}

/** One cover per category for the "Choose your story" cards. */
export async function getCategoryCovers() {
  const { photos } = await getPhotoLibrary();
  const ids = ["people", "animals", "weddings-events", "brands"] as const;
  return Object.fromEntries(
    ids.map((id) => {
      const inCat = photos.filter((p) => p.category === id);
      return [id, inCat.find((p) => p.featured) ?? inCat[0] ?? null];
    }),
  ) as Record<(typeof ids)[number], Photo | null>;
}
