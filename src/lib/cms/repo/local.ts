import "server-only";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, sep } from "node:path";
import { hmac } from "@/lib/security";
import type { ContentKey, PhotoState } from "../schema";
import type { Bucket, CmsRepo, ContentRow, GalleryPhotoRecord, GalleryRecord, MediaRecord, UsageRow } from "./types";

/**
 * File-based CMS backend for local development and automated tests ONLY.
 * Never used on Vercel (see repo/index.ts). Data lives in ./.data (git-ignored).
 */
const ROOT = process.env.CMS_LOCAL_DIR || join(process.cwd(), ".data");
const DB = join(ROOT, "cms.json");
const STORAGE = join(ROOT, "storage");

interface LocalDb {
  media: MediaRecord[];
  content: ContentRow[];
  galleries: GalleryRecord[];
  galleryPhotos: GalleryPhotoRecord[];
}

const empty = (): LocalDb => ({ media: [], content: [], galleries: [], galleryPhotos: [] });

function read(): LocalDb {
  try {
    return { ...empty(), ...(JSON.parse(readFileSync(DB, "utf8")) as Partial<LocalDb>) };
  } catch {
    return empty();
  }
}

function write(db: LocalDb) {
  mkdirSync(ROOT, { recursive: true });
  const tmp = `${DB}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(db));
  renameSync(tmp, DB);
}

function mutate<T>(fn: (db: LocalDb) => T): T {
  const db = read();
  const out = fn(db);
  write(db);
  return out;
}

/** Resolve a storage path safely inside .data/storage/<bucket>. */
export function localFile(bucket: string, path: string) {
  const base = join(STORAGE, bucket);
  const full = normalize(join(base, path));
  if (!full.startsWith(base + sep)) throw new Error("Invalid path");
  return full;
}

const secret = () => process.env.ADMIN_SESSION_SECRET || "local-dev-secret";
export const signLocal = (bucket: string, path: string, exp: number) => hmac(secret(), `${bucket}:${path}:${exp}`);

export class LocalRepo implements CmsRepo {
  readonly kind = "local" as const;

  async listMedia() {
    return read().media.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async listPublishedMedia() {
    return read()
      .media.filter((m) => m.published && m.live)
      .map((m) => ({ id: m.id, live: m.live as PhotoState }));
  }
  async getMedia(id: string) {
    return read().media.find((m) => m.id === id) ?? null;
  }
  async insertMedia(draft: PhotoState) {
    const id = randomUUID();
    mutate((db) => db.media.push({ id, createdAt: new Date().toISOString(), live: null, draft, published: false, dirty: true, pendingDelete: false, orphanPaths: [] }));
    return id;
  }
  async updateMedia(id: string, patch: Partial<Omit<MediaRecord, "id" | "createdAt">>) {
    mutate((db) => {
      const m = db.media.find((x) => x.id === id);
      if (m) Object.assign(m, patch);
    });
  }
  async deleteMedia(id: string) {
    mutate((db) => {
      db.media = db.media.filter((m) => m.id !== id);
    });
  }

  async listContent() {
    return read().content;
  }
  async putContent(key: ContentKey, patch: { draft?: unknown; published?: unknown; dirty: boolean; publishedAt?: string }) {
    mutate((db) => {
      let row = db.content.find((c) => c.key === key);
      if (!row) {
        row = { key, draft: patch.draft ?? patch.published ?? null, published: null, dirty: true, publishedAt: null };
        db.content.push(row);
      }
      if ("draft" in patch) row.draft = patch.draft;
      if ("published" in patch) row.published = patch.published;
      if (patch.publishedAt) row.publishedAt = patch.publishedAt;
      row.dirty = patch.dirty;
    });
  }

  async listGalleries() {
    return read().galleries.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getGallery(id: string) {
    return read().galleries.find((g) => g.id === id) ?? null;
  }
  async getGalleryBySlug(slug: string) {
    return read().galleries.find((g) => g.slug === slug) ?? null;
  }
  async insertGallery(g: Omit<GalleryRecord, "id" | "createdAt">) {
    const id = randomUUID();
    mutate((db) => db.galleries.push({ ...g, id, createdAt: new Date().toISOString() }));
    return id;
  }
  async updateGallery(id: string, patch: Partial<Omit<GalleryRecord, "id" | "createdAt">>) {
    mutate((db) => {
      const g = db.galleries.find((x) => x.id === id);
      if (g) Object.assign(g, patch);
    });
  }
  async deleteGallery(id: string) {
    mutate((db) => {
      db.galleries = db.galleries.filter((g) => g.id !== id);
      db.galleryPhotos = db.galleryPhotos.filter((p) => p.galleryId !== id);
    });
  }
  async listGalleryPhotos(galleryId: string) {
    return read()
      .galleryPhotos.filter((p) => p.galleryId === galleryId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
  async insertGalleryPhoto(p: Omit<GalleryPhotoRecord, "id">) {
    const id = randomUUID();
    mutate((db) => db.galleryPhotos.push({ ...p, id }));
    return id;
  }
  async updateGalleryPhoto(id: string, patch: Partial<Omit<GalleryPhotoRecord, "id" | "galleryId">>) {
    mutate((db) => {
      const p = db.galleryPhotos.find((x) => x.id === id);
      if (p) Object.assign(p, patch);
    });
  }
  async deleteGalleryPhoto(id: string) {
    mutate((db) => {
      db.galleryPhotos = db.galleryPhotos.filter((p) => p.id !== id);
    });
  }

  async createUploadUrl(bucket: Bucket, path: string) {
    const exp = Date.now() + 2 * 3600_000;
    const q = new URLSearchParams({ b: bucket, p: path, e: String(exp), s: signLocal(bucket, path, exp) });
    return { url: `/api/dev-storage/upload?${q}`, headers: {} };
  }
  async download(bucket: Bucket, path: string) {
    return readFileSync(localFile(bucket, path));
  }
  async upload(bucket: Bucket, path: string, data: Buffer) {
    const f = localFile(bucket, path);
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, data);
  }
  async move(bucket: Bucket, from: string, to: string) {
    const t = localFile(bucket, to);
    mkdirSync(dirname(t), { recursive: true });
    renameSync(localFile(bucket, from), t);
  }
  async remove(bucket: Bucket, paths: string[]) {
    for (const p of paths) rmSync(localFile(bucket, p), { force: true });
  }
  publicUrl(path: string) {
    return `/api/dev-storage/public/${path.split("/").map(encodeURIComponent).join("/")}`;
  }
  async signedUrl(bucket: Bucket, path: string, expiresSec: number, downloadName?: string) {
    const exp = Date.now() + expiresSec * 1000;
    const q = new URLSearchParams({ b: bucket, p: path, e: String(exp), s: signLocal(bucket, path, exp) });
    if (downloadName) q.set("dl", downloadName);
    return `/api/dev-storage/signed?${q}`;
  }
  async storageUsage(): Promise<UsageRow[]> {
    const out: UsageRow[] = [];
    for (const bucket of ["portfolio", "portfolio-uploads", "client-galleries"]) {
      const dir = join(STORAGE, bucket);
      let files = 0;
      let bytes = 0;
      const walk = (d: string) => {
        if (!existsSync(d)) return;
        for (const e of readdirSync(d, { withFileTypes: true })) {
          const p = join(d, e.name);
          if (e.isDirectory()) walk(p);
          else {
            files++;
            bytes += statSync(p).size;
          }
        }
      };
      walk(dir);
      out.push({ bucket, files, bytes });
    }
    return out;
  }
}
