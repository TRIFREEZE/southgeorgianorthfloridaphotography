import type { ContentKey, PhotoState } from "../schema";

export type Bucket = "portfolio" | "portfolio-uploads" | "client-galleries";

export interface MediaRecord {
  id: string;
  createdAt: string;
  live: PhotoState | null;
  draft: PhotoState;
  published: boolean;
  dirty: boolean;
  pendingDelete: boolean;
  orphanPaths: string[];
}

export interface ContentRow {
  key: ContentKey;
  draft: unknown;
  published: unknown | null;
  dirty: boolean;
  publishedAt: string | null;
}

export interface GalleryRecord {
  id: string;
  createdAt: string;
  slug: string;
  title: string;
  clientName: string | null;
  message: string | null;
  passwordHash: string;
  expiresAt: string | null;
  allowDownloads: boolean;
  active: boolean;
}

export interface GalleryPhotoRecord {
  id: string;
  galleryId: string;
  webPath: string;
  originalPath: string;
  filename: string | null;
  width: number;
  height: number;
  bytes: number | null;
  originalBytes: number | null;
  blur: string | null;
  sortOrder: number;
}

export interface UsageRow {
  bucket: string;
  files: number;
  bytes: number;
}

/**
 * Everything the CMS needs from a backend. Production uses Supabase
 * (Postgres + Storage); local development and automated tests use a file-based
 * implementation that is never active on Vercel.
 */
export interface CmsRepo {
  readonly kind: "supabase" | "local";

  listMedia(): Promise<MediaRecord[]>;
  listPublishedMedia(): Promise<{ id: string; live: PhotoState }[]>;
  getMedia(id: string): Promise<MediaRecord | null>;
  insertMedia(draft: PhotoState): Promise<string>;
  updateMedia(id: string, patch: Partial<Omit<MediaRecord, "id" | "createdAt">>): Promise<void>;
  deleteMedia(id: string): Promise<void>;

  listContent(): Promise<ContentRow[]>;
  putContent(key: ContentKey, patch: { draft?: unknown; published?: unknown; dirty: boolean; publishedAt?: string }): Promise<void>;

  listGalleries(): Promise<GalleryRecord[]>;
  getGallery(id: string): Promise<GalleryRecord | null>;
  getGalleryBySlug(slug: string): Promise<GalleryRecord | null>;
  insertGallery(g: Omit<GalleryRecord, "id" | "createdAt">): Promise<string>;
  updateGallery(id: string, patch: Partial<Omit<GalleryRecord, "id" | "createdAt">>): Promise<void>;
  deleteGallery(id: string): Promise<void>;
  listGalleryPhotos(galleryId: string): Promise<GalleryPhotoRecord[]>;
  insertGalleryPhoto(p: Omit<GalleryPhotoRecord, "id">): Promise<string>;
  updateGalleryPhoto(id: string, patch: Partial<Omit<GalleryPhotoRecord, "id" | "galleryId">>): Promise<void>;
  deleteGalleryPhoto(id: string): Promise<void>;

  createUploadUrl(bucket: Bucket, path: string): Promise<{ url: string; headers: Record<string, string> }>;
  download(bucket: Bucket, path: string): Promise<Buffer>;
  upload(bucket: Bucket, path: string, data: Buffer, contentType: string): Promise<void>;
  move(bucket: Bucket, from: string, to: string): Promise<void>;
  remove(bucket: Bucket, paths: string[]): Promise<void>;
  publicUrl(path: string): string;
  signedUrl(bucket: Bucket, path: string, expiresSec: number, downloadName?: string): Promise<string>;
  storageUsage(): Promise<UsageRow[]>;
}
