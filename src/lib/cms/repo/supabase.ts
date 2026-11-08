import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient, publicStorageUrl } from "@/lib/supabase/server";
import { photoStateSchema, type ContentKey, type PhotoState } from "../schema";
import type { Bucket, CmsRepo, ContentRow, GalleryPhotoRecord, GalleryRecord, MediaRecord, UsageRow } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const state = (v: unknown): PhotoState | null => {
  if (!v) return null;
  const r = photoStateSchema.safeParse(v);
  return r.success ? r.data : null;
};

const toMedia = (r: any): MediaRecord | null => {
  const draft = state(r.draft);
  if (!draft) return null;
  return {
    id: r.id,
    createdAt: r.created_at,
    live: state(r.live),
    draft,
    published: r.published,
    dirty: r.dirty,
    pendingDelete: r.pending_delete,
    orphanPaths: r.orphan_paths ?? [],
  };
};

const toGallery = (r: any): GalleryRecord => ({
  id: r.id,
  createdAt: r.created_at,
  slug: r.slug,
  title: r.title,
  clientName: r.client_name,
  message: r.message,
  passwordHash: r.password_hash,
  expiresAt: r.expires_at,
  allowDownloads: r.allow_downloads,
  active: r.active,
});

const toGalleryPhoto = (r: any): GalleryPhotoRecord => ({
  id: r.id,
  galleryId: r.gallery_id,
  webPath: r.web_path,
  originalPath: r.original_path,
  filename: r.filename,
  width: r.width,
  height: r.height,
  bytes: r.bytes,
  originalBytes: r.original_bytes,
  blur: r.blur_data_url,
  sortOrder: r.sort_order,
});

const mediaCols = (p: Partial<Omit<MediaRecord, "id" | "createdAt">>) => {
  const o: Record<string, unknown> = {};
  if ("live" in p) o.live = p.live;
  if ("draft" in p) o.draft = p.draft;
  if ("published" in p) o.published = p.published;
  if ("dirty" in p) o.dirty = p.dirty;
  if ("pendingDelete" in p) o.pending_delete = p.pendingDelete;
  if ("orphanPaths" in p) o.orphan_paths = p.orphanPaths;
  return o;
};

const galleryCols = (p: Partial<Omit<GalleryRecord, "id" | "createdAt">>) => {
  const map: Record<string, string> = { slug: "slug", title: "title", clientName: "client_name", message: "message", passwordHash: "password_hash", expiresAt: "expires_at", allowDownloads: "allow_downloads", active: "active" };
  return Object.fromEntries(Object.entries(p).map(([k, v]) => [map[k] ?? k, v]));
};

const galleryPhotoCols = (p: Partial<Omit<GalleryPhotoRecord, "id">>) => {
  const map: Record<string, string> = { galleryId: "gallery_id", webPath: "web_path", originalPath: "original_path", filename: "filename", width: "width", height: "height", bytes: "bytes", originalBytes: "original_bytes", blur: "blur_data_url", sortOrder: "sort_order" };
  return Object.fromEntries(Object.entries(p).map(([k, v]) => [map[k] ?? k, v]));
};

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export class SupabaseRepo implements CmsRepo {
  readonly kind = "supabase" as const;
  private db: SupabaseClient = getServiceClient();

  async listMedia() {
    const rows = check(await this.db.from("media").select("*").order("created_at", { ascending: false }).limit(2000));
    return (rows ?? []).map(toMedia).filter((m): m is MediaRecord => Boolean(m));
  }
  async listPublishedMedia() {
    const rows = check(await this.db.from("media").select("id, live").eq("published", true).limit(2000));
    return (rows ?? []).flatMap((r: any) => {
      const live = state(r.live);
      return live ? [{ id: r.id as string, live }] : [];
    });
  }
  async getMedia(id: string) {
    const r = check(await this.db.from("media").select("*").eq("id", id).maybeSingle());
    return r ? toMedia(r) : null;
  }
  async insertMedia(draft: PhotoState) {
    const r = check(await this.db.from("media").insert({ draft, dirty: true }).select("id").single());
    return (r as any).id as string;
  }
  async updateMedia(id: string, patch: Partial<Omit<MediaRecord, "id" | "createdAt">>) {
    check(await this.db.from("media").update(mediaCols(patch)).eq("id", id));
  }
  async deleteMedia(id: string) {
    check(await this.db.from("media").delete().eq("id", id));
  }

  async listContent(): Promise<ContentRow[]> {
    const rows = check(await this.db.from("site_content").select("*"));
    return (rows ?? []).map((r: any) => ({ key: r.key, draft: r.draft, published: r.published, dirty: r.dirty, publishedAt: r.published_at }));
  }
  async putContent(key: ContentKey, patch: { draft?: unknown; published?: unknown; dirty: boolean; publishedAt?: string }) {
    const existing = check(await this.db.from("site_content").select("key, draft").eq("key", key).maybeSingle());
    const row: Record<string, unknown> = { key, dirty: patch.dirty };
    if ("draft" in patch) row.draft = patch.draft;
    if ("published" in patch) row.published = patch.published;
    if (patch.publishedAt) row.published_at = patch.publishedAt;
    if (existing) check(await this.db.from("site_content").update(row).eq("key", key));
    else check(await this.db.from("site_content").insert({ draft: patch.draft ?? patch.published, ...row }));
  }

  async listGalleries() {
    const rows = check(await this.db.from("client_galleries").select("*").order("created_at", { ascending: false }));
    return (rows ?? []).map(toGallery);
  }
  async getGallery(id: string) {
    const r = check(await this.db.from("client_galleries").select("*").eq("id", id).maybeSingle());
    return r ? toGallery(r) : null;
  }
  async getGalleryBySlug(slug: string) {
    const r = check(await this.db.from("client_galleries").select("*").eq("slug", slug).maybeSingle());
    return r ? toGallery(r) : null;
  }
  async insertGallery(g: Omit<GalleryRecord, "id" | "createdAt">) {
    const r = check(await this.db.from("client_galleries").insert(galleryCols(g)).select("id").single());
    return (r as any).id as string;
  }
  async updateGallery(id: string, patch: Partial<Omit<GalleryRecord, "id" | "createdAt">>) {
    check(await this.db.from("client_galleries").update(galleryCols(patch)).eq("id", id));
  }
  async deleteGallery(id: string) {
    check(await this.db.from("client_galleries").delete().eq("id", id));
  }
  async listGalleryPhotos(galleryId: string) {
    const rows = check(await this.db.from("client_gallery_photos").select("*").eq("gallery_id", galleryId).order("sort_order").order("created_at"));
    return (rows ?? []).map(toGalleryPhoto);
  }
  async insertGalleryPhoto(p: Omit<GalleryPhotoRecord, "id">) {
    const r = check(await this.db.from("client_gallery_photos").insert(galleryPhotoCols(p)).select("id").single());
    return (r as any).id as string;
  }
  async updateGalleryPhoto(id: string, patch: Partial<Omit<GalleryPhotoRecord, "id" | "galleryId">>) {
    check(await this.db.from("client_gallery_photos").update(galleryPhotoCols(patch)).eq("id", id));
  }
  async deleteGalleryPhoto(id: string) {
    check(await this.db.from("client_gallery_photos").delete().eq("id", id));
  }

  async createUploadUrl(bucket: Bucket, path: string) {
    const { data, error } = await this.db.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data) throw new Error(error?.message ?? "Could not create upload URL");
    return { url: data.signedUrl, headers: { "x-upsert": "false" } };
  }
  async download(bucket: Bucket, path: string) {
    const { data, error } = await this.db.storage.from(bucket).download(path);
    if (error || !data) throw new Error(error?.message ?? "Download failed");
    return Buffer.from(await data.arrayBuffer());
  }
  async upload(bucket: Bucket, path: string, data: Buffer, contentType: string) {
    const { error } = await this.db.storage.from(bucket).upload(path, data, { contentType, cacheControl: "31536000", upsert: false });
    if (error) throw new Error(error.message);
  }
  async move(bucket: Bucket, from: string, to: string) {
    const { error } = await this.db.storage.from(bucket).move(from, to);
    if (error) throw new Error(error.message);
  }
  async remove(bucket: Bucket, paths: string[]) {
    if (!paths.length) return;
    const { error } = await this.db.storage.from(bucket).remove(paths);
    if (error) console.error("[cms] storage remove failed", error.message);
  }
  publicUrl(path: string) {
    return publicStorageUrl(path);
  }
  async signedUrl(bucket: Bucket, path: string, expiresSec: number, downloadName?: string) {
    const { data, error } = await this.db.storage.from(bucket).createSignedUrl(path, expiresSec, downloadName ? { download: downloadName } : undefined);
    if (error || !data) throw new Error(error?.message ?? "Could not sign URL");
    return data.signedUrl;
  }
  async storageUsage(): Promise<UsageRow[]> {
    const { data, error } = await this.db.rpc("storage_usage");
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]).map((r) => ({ bucket: r.bucket, files: Number(r.files), bytes: Number(r.bytes) }));
  }
}
