import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { draftMode } from "next/headers";
import type { Photo } from "@/lib/photo-types";
import { defaultContent } from "./defaults";
import { getRepo } from "./repo";
import type { SiteData } from "./resolve";
import { contentSchemas, type ContentKey, type PhotoState, type SiteContent } from "./schema";

export const CONTENT_TAG = "content";
export const MEDIA_TAG = "photos";

export function photoFromState(id: string, s: PhotoState, url: (path: string) => string): Photo {
  return {
    id,
    src: url(s.storagePath),
    width: s.width,
    height: s.height,
    blurDataUrl: s.blur,
    category: s.categoryId,
    title: s.title || s.filename?.replace(/\.[a-z0-9]+$/i, "") || "Photograph",
    alt: s.alt,
    location: s.location || null,
    storyText: s.description || null,
    focalX: s.focal.dx,
    focalY: s.focal.dy,
    focalMX: s.focal.mx,
    focalMY: s.focal.my,
    zoomD: s.zoom.d,
    zoomM: s.zoom.m,
    featured: s.featured,
    hero: false,
    sortOrder: s.sortOrder,
    isSample: false,
  };
}

/** Parse a stored content value, falling back to the default for anything invalid. */
export function parseContent<K extends ContentKey>(key: K, value: unknown, fallback: SiteContent[K]): SiteContent[K] {
  if (value == null) return fallback;
  const r = contentSchemas[key].safeParse(value);
  if (!r.success) {
    console.error(`[cms] invalid stored ${key}; using defaults`, r.error.issues[0]?.message);
    return fallback;
  }
  return r.data as SiteContent[K];
}

/**
 * Everything the public site renders from the CMS. Cached and tagged, so Publish
 * (updateTag) refreshes the live site instantly with no redeploy. In Draft Mode
 * (admin preview) it re-runs per request and returns drafts instead.
 */
export async function getSiteData(): Promise<SiteData> {
  "use cache";
  cacheLife("hours");
  cacheTag(CONTENT_TAG, MEDIA_TAG);

  // In Draft Mode Next.js re-runs this on every request and never caches it (by design), so the
  // owner's preview always shows the latest drafts. Prefetches made while previewing may log
  // "Unexpected cache miss" warnings; visitors never trigger them.
  const { isEnabled: preview } = await draftMode();
  const content = defaultContent();
  const repo = getRepo();
  if (!repo) return { content, photos: [], preview };

  try {
    for (const row of await repo.listContent()) {
      const value = preview ? row.draft : row.published;
      (content as unknown as Record<string, unknown>)[row.key] = parseContent(row.key, value, content[row.key]);
    }
  } catch (err) {
    console.error("[cms] content unavailable; using defaults", err instanceof Error ? err.message : err);
  }

  let photos: Photo[] = [];
  try {
    const states = preview
      ? (await repo.listMedia()).filter((m) => !m.pendingDelete).map((m) => ({ id: m.id, state: m.draft }))
      : (await repo.listPublishedMedia()).map((m) => ({ id: m.id, state: m.live }));
    photos = states.filter((x) => x.state.published).map((x) => photoFromState(x.id, x.state, (p) => repo.publicUrl(p)));
  } catch (err) {
    console.error("[cms] media unavailable; showing samples", err instanceof Error ? err.message : err);
  }

  return { content, photos, preview };
}
