"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import sharp, { type OutputInfo } from "sharp";
import { z } from "zod";
import { adminConfig, checkPassword, endSession, requireAdmin, startSession } from "@/lib/admin-auth";
import { STATUSES } from "@/lib/admin-data";
import { serverEnv } from "@/lib/server-env";
import { PHOTOS_TAG } from "@/lib/photos";
import { clientIp, hashIp } from "@/lib/security";
import { getServiceClient, PORTFOLIO_BUCKET, UPLOADS_BUCKET } from "@/lib/supabase/server";

export type ActionState = { ok?: boolean; error?: string; message?: string };

/* ------------------------------------------------------------------ auth */

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const cfg = adminConfig();
  if (!cfg.ok) return { error: `Admin is not configured: ${cfg.problem}` };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const db = getServiceClient();
  const ipHash = hashIp(clientIp(await headers()));
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count } = await db.from("submission_events").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).eq("outcome", "login-fail").gte("created_at", since);
  if ((count ?? 0) >= 8) return { error: "Too many attempts. Please wait 15 minutes." };

  const allowed = serverEnv().adminEmails.includes(email);
  const valid = allowed && (await checkPassword(email, password));
  if (!valid) {
    await db.from("submission_events").insert({ ip_hash: ipHash, outcome: "login-fail" });
    return { error: "That email and password didn't match an admin account." };
  }
  await startSession(email);
  redirect("/admin");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

/* ------------------------------------------------------------------ leads */

export async function updateLeadStatus(formData: FormData) {
  const admin = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const to = z.enum(STATUSES).parse(formData.get("status"));
  const db = getServiceClient();
  const { data: before } = await db.from("inquiries").select("status").eq("id", id).single();
  const { error } = await db.from("inquiries").update({ status: to }).eq("id", id);
  if (error) throw new Error(error.message);
  await db.from("inquiry_events").insert({ inquiry_id: id, type: "status", from_status: before?.status ?? null, to_status: to, actor: admin.email });
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin/leads");
}

export async function addLeadNote(formData: FormData) {
  const admin = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const note = z.string().trim().min(1).max(4000).parse(formData.get("note"));
  const db = getServiceClient();
  const { data } = await db.from("inquiries").select("admin_notes").eq("id", id).single();
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const notes = `${data?.admin_notes ? `${data.admin_notes}\n\n` : ""}[${stamp}] ${note}`;
  await db.from("inquiries").update({ admin_notes: notes }).eq("id", id);
  await db.from("inquiry_events").insert({ inquiry_id: id, type: "note", note, actor: admin.email });
  revalidatePath(`/admin/leads/${id}`);
}

export async function deleteLead(formData: FormData) {
  await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  if (formData.get("confirm") !== "DELETE") throw new Error("Type DELETE to confirm.");
  await getServiceClient().from("inquiries").delete().eq("id", id);
  revalidatePath("/admin/leads");
  redirect("/admin/leads");
}

/* ------------------------------------------------------------------ photos */

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/tiff"];
const MAX_UPLOAD = 50 * 1024 * 1024;

/** Step 1: a short-lived signed URL so the browser uploads the original straight to private storage (no 4.5 MB function limit). */
export async function createUploadUrl(input: { filename: string; type: string; size: number }) {
  await requireAdmin();
  const parsed = z.object({ filename: z.string().max(200), type: z.string(), size: z.number().int().positive() }).parse(input);
  if (!ALLOWED.includes(parsed.type)) return { error: "Use JPEG, PNG, WebP, AVIF or TIFF." };
  if (parsed.size > MAX_UPLOAD) return { error: "Files must be under 50 MB." };
  const ext = parsed.type.split("/")[1].replace("jpeg", "jpg");
  const path = `incoming/${randomUUID()}.${ext}`;
  const { data, error } = await getServiceClient().storage.from(UPLOADS_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: error?.message ?? "Could not create upload URL." };
  return { path, signedUrl: data.signedUrl };
}

/**
 * Step 2: process the original on the server: auto-rotate, cap at 3000px, strip
 * EXIF/GPS metadata, sRGB JPEG master, tiny blur placeholder. Then store the
 * derivative publicly, delete the original, and create an UNPUBLISHED photo row.
 */
export async function finalizeUpload(input: { path: string; filename: string }) {
  await requireAdmin();
  const { path, filename } = z.object({ path: z.string().regex(/^incoming\/[0-9a-f-]{36}\.\w{3,4}$/), filename: z.string().max(200) }).parse(input);
  const db = getServiceClient();
  const dl = await db.storage.from(UPLOADS_BUCKET).download(path);
  if (dl.error || !dl.data) return { error: dl.error?.message ?? "Upload not found." };
  const input0 = Buffer.from(await dl.data.arrayBuffer());

  let master: Buffer;
  let info: OutputInfo;
  let blur: string;
  try {
    const pipeline = sharp(input0, { failOn: "error", limitInputPixels: 160_000_000 }).rotate().resize({ width: 3000, height: 3000, fit: "inside", withoutEnlargement: true }).toColorspace("srgb");
    const out = await pipeline.jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: "4:4:4" }).toBuffer({ resolveWithObject: true });
    master = out.data;
    info = out.info;
    const tiny = await sharp(master).resize(24, 24, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
    blur = `data:image/webp;base64,${tiny.toString("base64")}`;
  } catch {
    await db.storage.from(UPLOADS_BUCKET).remove([path]);
    return { error: "That file couldn't be read as an image." };
  }

  const year = new Date().getUTCFullYear();
  const slug = filename
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "photo";
  const finalPath = `${year}/${slug}-${randomUUID().slice(0, 8)}.jpg`;
  const up = await db.storage.from(PORTFOLIO_BUCKET).upload(finalPath, master, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
  if (up.error) return { error: up.error.message };
  await db.storage.from(UPLOADS_BUCKET).remove([path]);

  const { error } = await db.from("photos").insert({
    storage_path: finalPath,
    width: info.width,
    height: info.height,
    bytes: info.size,
    blur_data_url: blur,
    original_filename: filename,
    title: slug.replace(/-/g, " "),
    published: false,
    license_status: "pending",
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/photos");
  return { ok: true };
}

const photoSchema = z.object({
  id: z.uuid(),
  category: z.enum(["people", "animals", "weddings-events", "brands", "about"]),
  subcategory: z.string().trim().max(60).optional(),
  title: z.string().trim().max(120).optional(),
  alt: z.string().trim().max(300),
  location: z.string().trim().max(120).optional(),
  capture_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  story_text: z.string().trim().max(600).optional(),
  focal_x: z.coerce.number().int().min(0).max(100),
  focal_y: z.coerce.number().int().min(0).max(100),
  sort_order: z.coerce.number().int().min(0).max(100000),
  license_status: z.enum(["owner_original", "client_release", "model_release", "licensed", "pending"]),
  permission_note: z.string().trim().max(400).optional(),
  featured: z.boolean(),
  hero: z.boolean(),
  published: z.boolean(),
});

export async function updatePhoto(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const raw = Object.fromEntries(formData.entries());
  const parsed = photoSchema.safeParse({ ...raw, featured: raw.featured === "on", hero: raw.hero === "on", published: raw.published === "on" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  const p = parsed.data;
  if (p.published && !p.alt) return { error: "Add alt text (a short description of the photo) before publishing." };
  if (p.published && p.license_status === "pending") return { error: "Confirm the license/permission before publishing." };
  const db = getServiceClient();
  if (p.hero) await db.from("photos").update({ hero: false }).neq("id", p.id).eq("hero", true);
  const { error } = await db
    .from("photos")
    .update({ ...p, capture_date: p.capture_date || null, subcategory: p.subcategory || null, title: p.title || null, location: p.location || null, story_text: p.story_text || null, permission_note: p.permission_note || null })
    .eq("id", p.id);
  if (error) return { error: error.message };
  updateTag(PHOTOS_TAG);
  revalidatePath("/", "layout");
  return { ok: true, message: p.published ? "Saved and live on the site." : "Saved (not published)." };
}

export async function deletePhoto(formData: FormData) {
  await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const db = getServiceClient();
  const { data } = await db.from("photos").select("storage_path").eq("id", id).single();
  if (data?.storage_path) await db.storage.from(PORTFOLIO_BUCKET).remove([data.storage_path]);
  await db.from("photos").delete().eq("id", id);
  updateTag(PHOTOS_TAG);
  revalidatePath("/", "layout");
}
