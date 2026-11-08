import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname } from "node:path";
import { isLocalBackendAllowed } from "./repo";
import { localFile, signLocal } from "./repo/local";
import { safeEqual } from "@/lib/security";
import { isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Stand-in for Supabase Storage URLs in local development and tests only.
 * Every handler 404s on Vercel or whenever Supabase is configured.
 */
export const devStorageEnabled = () => !isSupabaseConfigured() && isLocalBackendAllowed();

const BUCKETS = new Set(["portfolio", "portfolio-uploads", "client-galleries"]);
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".tif": "image/tiff", ".tiff": "image/tiff", ".heic": "image/heic", ".heif": "image/heif" };

export const notFound = () => new Response("Not found", { status: 404 });

export function verifySigned(url: URL) {
  const b = url.searchParams.get("b") ?? "";
  const p = url.searchParams.get("p") ?? "";
  const e = Number(url.searchParams.get("e"));
  const s = url.searchParams.get("s") ?? "";
  if (!BUCKETS.has(b) || !p || !Number.isFinite(e) || e < Date.now()) return null;
  if (!safeEqual(s, signLocal(b, p, e))) return null;
  return { bucket: b, path: p };
}

export function serveFile(bucket: string, path: string, opts: { immutable?: boolean; download?: string } = {}) {
  let file: string;
  try {
    file = localFile(bucket, path);
  } catch {
    return notFound();
  }
  if (!existsSync(file)) return notFound();
  const headers: Record<string, string> = {
    "Content-Type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
    "Cache-Control": opts.immutable ? "public, max-age=31536000, immutable" : "private, no-store",
  };
  if (opts.download) headers["Content-Disposition"] = `attachment; filename="${opts.download.replace(/[^\w.\- ]/g, "_")}"`;
  return new Response(readFileSync(file), { headers });
}

export async function storeUpload(bucket: string, path: string, body: ArrayBuffer) {
  const file = localFile(bucket, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(body));
}
