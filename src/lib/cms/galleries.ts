import "server-only";
import { randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import { hmac, safeEqual } from "@/lib/security";
import { ImageError, processImage, slugify } from "./images";
import { CmsError } from "./ops";
import type { CmsRepo, GalleryRecord } from "./repo/types";

/**
 * Private client galleries. Completely separate from the public portfolio:
 * files live in the private `client-galleries` bucket and are only ever served
 * through short-lived signed URLs after the visitor enters the gallery password.
 */
const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 32);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(pw: string, stored: string) {
  const [alg, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64url");
  const actual = await scrypt(pw, Buffer.from(saltB64, "base64url"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const galleryInputSchema = z.object({
  title: z.string().trim().min(1, "Give the gallery a title.").max(120),
  clientName: z.string().trim().max(120).optional().default(""),
  message: z.string().trim().max(1200).optional().default(""),
  expiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(""))
    .default(""),
  allowDownloads: z.boolean().default(true),
  active: z.boolean().default(true),
});

export const passwordSchema = z.string().min(6, "Use at least 6 characters for the gallery password.").max(100);

/** Share links use an unguessable slug in addition to the password. */
export const newGallerySlug = (title: string) => `${slugify(title, "gallery").slice(0, 30)}-${randomBytes(6).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "x")}`;

export async function createGallery(repo: CmsRepo, input: z.input<typeof galleryInputSchema>, password: string) {
  const g = galleryInputSchema.parse(input);
  const pw = passwordSchema.parse(password);
  return repo.insertGallery({
    slug: newGallerySlug(g.title),
    title: g.title,
    clientName: g.clientName || null,
    message: g.message || null,
    passwordHash: await hashPassword(pw),
    expiresAt: g.expiresAt ? new Date(`${g.expiresAt}T23:59:59Z`).toISOString() : null,
    allowDownloads: g.allowDownloads,
    active: g.active,
  });
}

export async function updateGallery(repo: CmsRepo, id: string, input: z.input<typeof galleryInputSchema>, password?: string) {
  const g = galleryInputSchema.parse(input);
  const patch: Partial<GalleryRecord> = {
    title: g.title,
    clientName: g.clientName || null,
    message: g.message || null,
    expiresAt: g.expiresAt ? new Date(`${g.expiresAt}T23:59:59Z`).toISOString() : null,
    allowDownloads: g.allowDownloads,
    active: g.active,
  };
  if (password) patch.passwordHash = await hashPassword(passwordSchema.parse(password));
  await repo.updateGallery(z.uuid().parse(id), patch);
}

export async function deleteGallery(repo: CmsRepo, id: string) {
  const photos = await repo.listGalleryPhotos(id);
  const paths = photos.flatMap((p) => [p.webPath, p.originalPath]);
  for (let i = 0; i < paths.length; i += 100) await repo.remove("client-galleries", paths.slice(i, i + 100)).catch(() => {});
  await repo.deleteGallery(id);
}

export async function addGalleryPhoto(repo: CmsRepo, galleryId: string, path: string, filename: string) {
  z.string()
    .regex(/^incoming\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/)
    .parse(path);
  const g = await repo.getGallery(z.uuid().parse(galleryId));
  if (!g) throw new CmsError("Gallery not found.");
  let raw: Buffer;
  try {
    raw = await repo.download("client-galleries", path);
  } catch {
    throw new CmsError("The upload didn't arrive. Please try again.");
  }
  let web;
  try {
    web = await processImage(raw, 2400, 84);
  } catch (e) {
    await repo.remove("client-galleries", [path]).catch(() => {});
    throw new CmsError(e instanceof ImageError ? e.message : "That file couldn't be processed.");
  }
  const id = randomUUID();
  const webPath = `${galleryId}/web/${id}.jpg`;
  const originalPath = `${galleryId}/originals/${id}.${path.split(".").pop()}`;
  await repo.upload("client-galleries", webPath, web.data, "image/jpeg");
  await repo.move("client-galleries", path, originalPath);
  const existing = await repo.listGalleryPhotos(galleryId);
  await repo.insertGalleryPhoto({
    galleryId,
    webPath,
    originalPath,
    filename: filename.slice(0, 240),
    width: web.width,
    height: web.height,
    bytes: web.bytes,
    originalBytes: raw.length,
    blur: web.blur,
    sortOrder: existing.reduce((m, p) => Math.max(m, p.sortOrder), 0) + 10,
  });
}

export async function removeGalleryPhoto(repo: CmsRepo, galleryId: string, photoId: string) {
  const p = (await repo.listGalleryPhotos(galleryId)).find((x) => x.id === photoId);
  if (!p) return;
  await repo.remove("client-galleries", [p.webPath, p.originalPath]).catch(() => {});
  await repo.deleteGalleryPhoto(photoId);
}

export async function reorderGalleryPhotos(repo: CmsRepo, galleryId: string, ids: string[]) {
  const photos = await repo.listGalleryPhotos(galleryId);
  for (const [i, id] of z.array(z.uuid()).parse(ids).entries()) {
    if (photos.some((p) => p.id === id)) await repo.updateGalleryPhoto(id, { sortOrder: (i + 1) * 10 });
  }
}

/* ------------------------------------------------------------------ visitor access */

export const galleryCookie = (id: string) => `rcl_g_${id.replace(/-/g, "").slice(0, 16)}`;
const ACCESS_HOURS = 24 * 7;
const accessSecret = () => process.env.ADMIN_SESSION_SECRET || (process.env.VERCEL ? "" : "local-dev-secret");

/** Access token bound to the current password: changing the password signs everyone out. */
export function accessToken(g: Pick<GalleryRecord, "id" | "passwordHash">, exp = Date.now() + ACCESS_HOURS * 3600_000) {
  const secret = accessSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is required for client galleries.");
  return `${exp}.${hmac(secret, `${g.id}:${exp}:${g.passwordHash.slice(-16)}`)}`;
}

export function hasAccess(g: Pick<GalleryRecord, "id" | "passwordHash">, token: string | undefined) {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now() || !sig) return false;
  const secret = accessSecret();
  if (!secret) return false;
  return safeEqual(sig, hmac(secret, `${g.id}:${exp}:${g.passwordHash.slice(-16)}`));
}

export const accessMaxAge = ACCESS_HOURS * 3600;

export function isAvailable(g: GalleryRecord) {
  return g.active && (!g.expiresAt || new Date(g.expiresAt).getTime() > Date.now());
}
