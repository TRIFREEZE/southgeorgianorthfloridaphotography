import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { defaultContent } from "./defaults";
import { parseContent, photoFromState } from "./data";
import { mosaicPhotos, type SiteData } from "./resolve";
import { ACCEPTED_TYPES, extFor, ImageError, MAX_UPLOAD_BYTES, processImage, slugify, titleFromFilename } from "./images";
import type { CmsRepo, MediaRecord } from "./repo/types";
import {
  categoriesSchema,
  contentSchemas,
  photoPatchSchema,
  photoStateSchema,
  type Category,
  type ContentKey,
  type Layout,
  type PhotoPatch,
  type PhotoState,
  type SiteContent,
} from "./schema";

/**
 * Everything the dashboard can do, as plain functions over a CmsRepo.
 * Edits only ever touch DRAFTS. Visitors see nothing until publishAll()
 * copies drafts to live. Server actions wrap these with auth + cache refresh.
 */

export class CmsError extends Error {}

/** Run async work a few at a time (keeps Publish fast with hundreds of photos, without flooding the database). */
async function inBatches<T>(items: T[], size: number, fn: (item: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn));
}

/* ------------------------------------------------------------------ uploads */

export const uploadRequestSchema = z.object({
  name: z.string().min(1).max(240),
  type: z.string().max(60),
  size: z.number().int().positive(),
});
export type UploadRequest = z.infer<typeof uploadRequestSchema>;

export function checkUpload(f: UploadRequest): string | null {
  if (/\.(heic|heif)$/i.test(f.name) || /heic|heif/.test(f.type)) return `${f.name}: iPhone HEIC files need exporting as JPEG first (Photos → Export, or set Camera → Formats → Most Compatible).`;
  if (!(ACCEPTED_TYPES as readonly string[]).includes(f.type)) return `${f.name}: use JPEG, PNG, WebP, AVIF or TIFF.`;
  if (f.size > MAX_UPLOAD_BYTES) return `${f.name}: files must be under 100 MB.`;
  return null;
}

/** Signed, short-lived URLs so the browser uploads originals straight to private storage (no serverless body limit). */
export async function createUploadTargets(repo: CmsRepo, files: UploadRequest[], bucket: "portfolio-uploads" | "client-galleries" = "portfolio-uploads") {
  if (files.length > 100) throw new CmsError("Upload up to 100 photos at a time.");
  return Promise.all(
    files.map(async (f) => {
      const problem = checkUpload(f);
      if (problem) return { error: problem };
      const path = `incoming/${randomUUID()}.${extFor(f.type, f.name)}`;
      const target = await repo.createUploadUrl(bucket, path);
      return { path, ...target };
    }),
  );
}

const incomingPath = z.string().regex(/^incoming\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/);

type FileFields = Pick<PhotoState, "storagePath" | "width" | "height" | "bytes" | "blur" | "originalPath" | "originalBytes" | "filename">;

/** Process one uploaded original: master JPEG to the public bucket, original preserved privately. */
async function ingest(repo: CmsRepo, path: string, filename: string): Promise<FileFields> {
  incomingPath.parse(path);
  let raw: Buffer;
  try {
    raw = await repo.download("portfolio-uploads", path);
  } catch {
    throw new CmsError("The upload didn't arrive. Please try that file again.");
  }
  let processed;
  try {
    processed = await processImage(raw);
  } catch (e) {
    await repo.remove("portfolio-uploads", [path]).catch(() => {});
    throw new CmsError(e instanceof ImageError ? e.message : "That file couldn't be processed.");
  }
  const year = new Date().getUTCFullYear();
  const stem = `${slugify(filename)}-${randomUUID().slice(0, 8)}`;
  const storagePath = `${year}/${stem}.jpg`;
  await repo.upload("portfolio", storagePath, processed.data, "image/jpeg");
  const originalPath = `originals/${year}/${stem}.${path.split(".").pop()}`;
  await repo.move("portfolio-uploads", path, originalPath);
  return {
    storagePath,
    width: processed.width,
    height: processed.height,
    bytes: processed.bytes,
    blur: processed.blur,
    originalPath,
    originalBytes: raw.length,
    filename: filename.slice(0, 240),
  };
}

async function removeFiles(repo: CmsRepo, s: { storagePath?: string | null; originalPath?: string | null }, extra: string[] = []) {
  const pub = [s.storagePath, ...extra.filter((p) => !p.startsWith("originals/"))].filter(Boolean) as string[];
  const orig = [s.originalPath, ...extra.filter((p) => p.startsWith("originals/"))].filter(Boolean) as string[];
  if (pub.length) await repo.remove("portfolio", pub).catch(() => {});
  if (orig.length) await repo.remove("portfolio-uploads", orig).catch(() => {});
}

export interface NewPhotoOptions {
  path: string;
  filename: string;
  categoryId?: string | null;
  /** The owner confirmed they own (or have permission for) this batch. */
  consent: boolean;
  /** Visible immediately on the next Publish (default) or held back. */
  published?: boolean;
  /** Position from the upload batch, so photos keep the order they were chosen in. */
  sortOrder?: number;
}

/** First free sort position; a batch uses base, base+10, base+20… in file order. */
export async function nextSortBase(repo: CmsRepo) {
  return (await repo.listMedia()).reduce((max, m) => Math.max(max, m.draft.sortOrder), 0) + 10;
}

export async function addPhoto(repo: CmsRepo, o: NewPhotoOptions) {
  const file = await ingest(repo, o.path, o.filename);
  const media = await repo.listMedia();
  const inScope = media.filter((m) => (m.draft.categoryId ?? null) === (o.categoryId ?? null));
  const sortOrder = o.sortOrder ?? inScope.reduce((max, m) => Math.max(max, m.draft.sortOrder), 0) + 10;
  const title = titleFromFilename(o.filename);
  const content = await draftContent(repo);
  const cat = content.categories.find((c) => c.id === o.categoryId);
  const state = photoStateSchema.parse({
    ...file,
    title,
    alt: title || (cat ? `${cat.label} photograph` : "Photograph"),
    categoryId: o.categoryId ?? null,
    sortOrder,
    published: o.published ?? true,
    license: o.consent ? "owner_original" : "pending",
  });
  const id = await repo.insertMedia(state);
  return id;
}

/** Swap the file behind a photo, keeping its title, alt text, category, placements and order. */
export async function replacePhotoFile(repo: CmsRepo, id: string, path: string, filename: string) {
  const m = await mustGet(repo, id);
  const file = await ingest(repo, path, filename);
  const old = m.draft;
  const live = m.live;
  const orphanPaths = [...m.orphanPaths];
  // Files still used by the live version stay until Publish; draft-only files can go now.
  for (const key of ["storagePath", "originalPath"] as const) {
    const p = old[key];
    if (!p) continue;
    if (live && (live.storagePath === p || live.originalPath === p)) {
      if (!orphanPaths.includes(p)) orphanPaths.push(p);
    } else {
      await removeFiles(repo, key === "storagePath" ? { storagePath: p } : { originalPath: p });
    }
  }
  const draft = photoStateSchema.parse({ ...old, ...file, focal: { dx: 50, dy: 50, mx: 50, my: 50 }, zoom: { d: 1, m: 1 } });
  await repo.updateMedia(id, { draft, dirty: true, orphanPaths });
}

/* ------------------------------------------------------------------ photo edits */

async function mustGet(repo: CmsRepo, id: string): Promise<MediaRecord> {
  const m = await repo.getMedia(z.uuid().parse(id));
  if (!m) throw new CmsError("That photo no longer exists.");
  return m;
}

export async function patchPhotos(repo: CmsRepo, ids: string[], patch: PhotoPatch) {
  const p = photoPatchSchema.parse(patch);
  for (const id of ids) {
    const m = await mustGet(repo, id);
    const draft = photoStateSchema.parse({ ...m.draft, ...p, focal: { ...m.draft.focal, ...p.focal }, zoom: { ...m.draft.zoom, ...p.zoom } });
    await repo.updateMedia(id, { draft, dirty: true });
  }
}

/** Save a new order (ids in display order). */
export async function reorderPhotos(repo: CmsRepo, ids: string[]) {
  const list = z.array(z.uuid()).max(2000).parse(ids);
  const byId = new Map((await repo.listMedia()).map((m) => [m.id, m]));
  const changes = list.flatMap((id, i) => {
    const m = byId.get(id);
    return m && m.draft.sortOrder !== (i + 1) * 10 ? [{ m, sortOrder: (i + 1) * 10 }] : [];
  });
  await inBatches(changes, 8, ({ m, sortOrder }) => repo.updateMedia(m.id, { draft: { ...m.draft, sortOrder }, dirty: true }));
}

/** Never-published photos are removed immediately; live ones are removed when you Publish (and can be restored until then). */
export async function deletePhoto(repo: CmsRepo, id: string) {
  const m = await mustGet(repo, id);
  if (!m.published) {
    await removeFiles(repo, m.draft, m.orphanPaths);
    await repo.deleteMedia(id);
    await scrubLayout(repo, [id]);
    return { removedNow: true };
  }
  await repo.updateMedia(id, { pendingDelete: true, dirty: true });
  return { removedNow: false };
}

export async function restorePhoto(repo: CmsRepo, id: string) {
  const m = await mustGet(repo, id);
  await repo.updateMedia(id, { pendingDelete: false, dirty: !sameState(m.draft, m.live) || m.orphanPaths.length > 0 });
}

const sameState = (a: PhotoState | null, b: PhotoState | null) => JSON.stringify(a) === JSON.stringify(b);

/* ------------------------------------------------------------------ content */

export async function draftContent(repo: CmsRepo): Promise<SiteContent> {
  const content = defaultContent();
  for (const row of await repo.listContent()) {
    (content as unknown as Record<string, unknown>)[row.key] = parseContent(row.key, row.draft ?? row.published, content[row.key]);
  }
  return content;
}

export async function saveContent<K extends ContentKey>(repo: CmsRepo, key: K, value: unknown) {
  const parsed = contentSchemas[key].safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new CmsError(`${issue?.path.join(" → ") || key}: ${issue?.message ?? "invalid"}`);
  }
  await repo.putContent(key, { draft: parsed.data, dirty: true });
  return parsed.data as SiteContent[K];
}

/** Categories: validates unique slugs; photos in a deleted category become "Unsorted" (never deleted). */
export async function saveCategories(repo: CmsRepo, list: Category[]) {
  const cats = categoriesSchema.parse(list);
  const slugs = new Set<string>();
  const ids = new Set<string>();
  for (const c of cats) {
    if (slugs.has(c.slug)) throw new CmsError(`Two categories use the web address “${c.slug}”.`);
    if (ids.has(c.id)) throw new CmsError("Duplicate category.");
    slugs.add(c.slug);
    ids.add(c.id);
  }
  if (!cats.some((c) => c.visible)) throw new CmsError("Keep at least one category visible.");
  const before = (await draftContent(repo)).categories;
  const removed = before.filter((c) => !ids.has(c.id)).map((c) => c.id);
  let moved = 0;
  if (removed.length) {
    for (const m of await repo.listMedia()) {
      if (m.draft.categoryId && removed.includes(m.draft.categoryId)) {
        await repo.updateMedia(m.id, { draft: { ...m.draft, categoryId: null }, dirty: true });
        moved++;
      }
    }
    const layout = (await draftContent(repo)).layout;
    for (const id of removed) delete layout.categoryCovers[id];
    await repo.putContent("layout", { draft: layout, dirty: true });
  }
  await repo.putContent("categories", { draft: cats, dirty: true });
  return { moved };
}

/* ------------------------------------------------------------------ placements ("Site photos") */

export type SlotKey = "hero" | "founder" | `category:${string}` | `service:${string}` | `journal:${string}` | `mosaic:${number}`;

const slotSchema = z.string().regex(/^(hero|founder|(category|service|journal):[a-z0-9-]{1,60}|mosaic:[0-6])$/);

export function applySlot(layout: Layout, slot: string, photoId: string | null): Layout {
  slotSchema.parse(slot);
  const next: Layout = { ...layout, mosaic: [...layout.mosaic], categoryCovers: { ...layout.categoryCovers }, serviceCovers: { ...layout.serviceCovers }, journalCovers: { ...layout.journalCovers } };
  const [kind, key] = slot.split(":");
  if (kind === "hero") next.hero = photoId;
  else if (kind === "founder") next.founder = photoId;
  else if (kind === "category") next.categoryCovers[key] = photoId;
  else if (kind === "service") next.serviceCovers[key] = photoId;
  else if (kind === "journal") next.journalCovers[key] = photoId;
  else if (kind === "mosaic") {
    const i = Number(key);
    const arr = next.mosaic.filter(Boolean);
    if (photoId) {
      const existing = arr.indexOf(photoId);
      if (existing >= 0) arr.splice(existing, 1);
      arr.splice(Math.min(i, arr.length), i < arr.length ? 1 : 0, photoId);
    } else if (i < arr.length) arr.splice(i, 1);
    next.mosaic = arr.slice(0, 7);
  }
  return next;
}

export async function setSlot(repo: CmsRepo, slot: string, photoId: string | null) {
  slotSchema.parse(slot);
  if (photoId) await mustGet(repo, photoId);
  const content = await draftContent(repo);
  let layout = content.layout;
  if (slot.startsWith("mosaic:")) {
    // Work from what the homepage shows right now, so card #4 stays card #4.
    const shown = mosaicPhotos(await draftSiteData(repo), 7)
      .filter((p) => !p.isSample)
      .map((p) => p.id);
    layout = { ...layout, mosaic: placeInMosaic(shown, Number(slot.split(":")[1]), photoId) };
  } else layout = applySlot(layout, slot, photoId);
  await repo.putContent("layout", { draft: layout, dirty: true });
}

export function placeInMosaic(shown: string[], i: number, photoId: string | null): string[] {
  const arr = [...shown];
  if (!photoId) {
    if (i < arr.length) arr.splice(i, 1);
    return arr;
  }
  const j = arr.indexOf(photoId);
  if (i < arr.length) {
    if (j >= 0) arr[j] = arr[i];
    arr[i] = photoId;
  } else {
    if (j >= 0) arr.splice(j, 1);
    arr.push(photoId);
  }
  return arr.slice(0, 7);
}

export async function setMosaic(repo: CmsRepo, ids: string[]) {
  const list = z.array(z.uuid()).max(7).parse(ids);
  const layout = (await draftContent(repo)).layout;
  await repo.putContent("layout", { draft: { ...layout, mosaic: list }, dirty: true });
}

async function scrubLayout(repo: CmsRepo, ids: string[]) {
  const rows = await repo.listContent();
  const row = rows.find((r) => r.key === "layout");
  if (!row) return;
  const clean = (layout: Layout): Layout => {
    const strip = (r: Record<string, string | null>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v && ids.includes(v) ? null : v]));
    return {
      hero: layout.hero && ids.includes(layout.hero) ? null : layout.hero,
      founder: layout.founder && ids.includes(layout.founder) ? null : layout.founder,
      mosaic: layout.mosaic.filter((x) => !ids.includes(x)),
      categoryCovers: strip(layout.categoryCovers),
      serviceCovers: strip(layout.serviceCovers),
      journalCovers: strip(layout.journalCovers),
    };
  };
  const base = defaultContent().layout;
  const draft = clean(parseContent("layout", row.draft, base));
  const published = row.published == null ? null : clean(parseContent("layout", row.published, base));
  await repo.putContent("layout", { draft, ...(published ? { published } : {}), dirty: row.dirty || JSON.stringify(draft) !== JSON.stringify(published) });
}

/* ------------------------------------------------------------------ publish */

export interface Pending {
  newPhotos: number;
  editedPhotos: number;
  deletions: number;
  content: ContentKey[];
  total: number;
  blockers: string[];
}

export async function pendingChanges(repo: CmsRepo): Promise<Pending> {
  const media = await repo.listMedia();
  const dirty = media.filter((m) => m.dirty);
  const content = (await repo.listContent()).filter((r) => r.dirty).map((r) => r.key);
  const blockers: string[] = [];
  for (const m of dirty) {
    if (m.pendingDelete) continue;
    const name = m.draft.title || m.draft.filename || "A photo";
    if (m.draft.published && !m.draft.alt.trim()) blockers.push(`${name} needs alt text (a short description) before it can go live.`);
    if (m.draft.published && m.draft.license === "pending") blockers.push(`${name}: confirm you own it or have permission (License) before it can go live.`);
  }
  const newPhotos = dirty.filter((m) => !m.published && !m.pendingDelete).length;
  const deletions = dirty.filter((m) => m.pendingDelete).length;
  const editedPhotos = dirty.length - newPhotos - deletions;
  return { newPhotos, editedPhotos, deletions, content, total: dirty.length + content.length, blockers };
}

/** Copy every draft to live in one go. Nothing changes if anything blocks publishing. */
export async function publishAll(repo: CmsRepo) {
  const pending = await pendingChanges(repo);
  if (pending.blockers.length) throw new CmsError(pending.blockers.slice(0, 5).join(" "));
  const media = (await repo.listMedia()).filter((m) => m.dirty);
  const deleted: string[] = [];
  await inBatches(media, 8, async (m) => {
    if (m.pendingDelete) {
      await removeFiles(repo, m.draft, [...m.orphanPaths, ...(m.live ? [m.live.storagePath, m.live.originalPath ?? ""] : [])].filter(Boolean));
      await repo.deleteMedia(m.id);
      deleted.push(m.id);
      return;
    }
    await repo.updateMedia(m.id, { live: m.draft, published: true, dirty: false, orphanPaths: [] });
    if (m.orphanPaths.length) await removeFiles(repo, {}, m.orphanPaths);
  });
  const now = new Date().toISOString();
  for (const row of await repo.listContent()) {
    if (row.dirty) await repo.putContent(row.key, { published: row.draft, dirty: false, publishedAt: now });
  }
  if (deleted.length) await scrubLayout(repo, deleted);
  return pending;
}

/** Throw away every unpublished change. New, never-published uploads are removed. */
export async function discardAll(repo: CmsRepo) {
  for (const m of (await repo.listMedia()).filter((x) => x.dirty)) {
    if (!m.published || !m.live) {
      await removeFiles(repo, m.draft, m.orphanPaths);
      await repo.deleteMedia(m.id);
      continue;
    }
    const liveFiles = [m.live.storagePath, m.live.originalPath];
    const draftOnly = [m.draft.storagePath, m.draft.originalPath].filter((p) => p && !liveFiles.includes(p)) as string[];
    if (draftOnly.length) await removeFiles(repo, {}, draftOnly);
    await repo.updateMedia(m.id, { draft: m.live, dirty: false, pendingDelete: false, orphanPaths: [] });
  }
  for (const row of await repo.listContent()) {
    if (row.dirty) await repo.putContent(row.key, { draft: row.published ?? defaultContent()[row.key], dirty: false });
  }
}

/* ------------------------------------------------------------------ dashboard view model */

export interface AdminPhoto {
  id: string;
  createdAt: string;
  url: string;
  liveUrl: string | null;
  state: PhotoState;
  isNew: boolean;
  changed: boolean;
  pendingDelete: boolean;
  usedIn: string[];
}

export function usageLabels(id: string, c: SiteContent, state: PhotoState) {
  const out: string[] = [];
  const l = c.layout;
  if (l.hero === id) out.push("Homepage hero");
  if (l.founder === id) out.push("About portrait");
  const mi = l.mosaic.indexOf(id);
  if (mi >= 0) out.push(`Homepage selected work #${mi + 1}`);
  for (const [k, v] of Object.entries(l.categoryCovers)) if (v === id) out.push(`${c.categories.find((x) => x.id === k)?.label ?? k} cover`);
  for (const [k, v] of Object.entries(l.serviceCovers)) if (v === id) out.push(`Service page: ${k}`);
  for (const [k, v] of Object.entries(l.journalCovers)) if (v === id) out.push(`Journal: ${k}`);
  const cat = c.categories.find((x) => x.id === state.categoryId);
  if (cat && state.published) out.push(`${cat.label} gallery`);
  return out;
}

export async function adminPhotos(repo: CmsRepo): Promise<AdminPhoto[]> {
  const [media, content] = await Promise.all([repo.listMedia(), draftContent(repo)]);
  return media
    .map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      url: repo.publicUrl(m.draft.storagePath),
      liveUrl: m.live ? repo.publicUrl(m.live.storagePath) : null,
      state: m.draft,
      isNew: !m.published,
      changed: m.dirty,
      pendingDelete: m.pendingDelete,
      usedIn: usageLabels(m.id, content, m.draft),
    }))
    .sort((a, b) => a.state.sortOrder - b.state.sortOrder || b.createdAt.localeCompare(a.createdAt));
}

/** What the site will look like after Publish: drafts resolved exactly like the public pages. */
export async function draftSiteData(repo: CmsRepo): Promise<SiteData> {
  const [media, content] = await Promise.all([repo.listMedia(), draftContent(repo)]);
  const photos = media.filter((m) => !m.pendingDelete && m.draft.published).map((m) => photoFromState(m.id, m.draft, (p) => repo.publicUrl(p)));
  return { content, photos, preview: true };
}
