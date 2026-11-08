"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { CONTENT_TAG, MEDIA_TAG } from "@/lib/cms/data";
import * as galleries from "@/lib/cms/galleries";
import * as ops from "@/lib/cms/ops";
import { requireRepo } from "@/lib/cms/repo";
import type { Category, ContentKey, PhotoPatch } from "@/lib/cms/schema";

/**
 * Dashboard server actions. Every one checks the admin session first, works on
 * drafts only, and returns a friendly error instead of throwing.
 */
export type Result<T = object> = ({ ok: true } & T) | { ok?: false; error: string };

async function run<T extends object>(fn: (repo: ReturnType<typeof requireRepo>) => Promise<T>): Promise<Result<T>> {
  await requireAdmin();
  try {
    const out = await fn(requireRepo());
    return { ok: true, ...out };
  } catch (e) {
    if (e instanceof ops.CmsError) return { error: e.message };
    if (e instanceof z.ZodError) return { error: e.issues[0]?.message ?? "Please check the fields." };
    console.error("[cms]", e);
    const msg = (e as { message?: string } | null)?.message ?? "";
    if (/check constraint/i.test(msg)) return { error: "Your database needs a one-time update for this: open Supabase → SQL Editor and run the file supabase/migrations/20261109000000_flexible.sql, then try again." };
    return { error: e instanceof Error && e.message.startsWith("The CMS needs") ? e.message : "Something went wrong saving that. Please try again." };
  }
}

const touched = () => {
  revalidatePath("/admin", "layout");
};

/* ------------------------------------------------------------------ uploads */

export async function requestUploads(files: ops.UploadRequest[], bucket: "portfolio-uploads" | "client-galleries" = "portfolio-uploads") {
  return run(async (repo) => ({ targets: await ops.createUploadTargets(repo, z.array(ops.uploadRequestSchema).parse(files), bucket), sortBase: await ops.nextSortBase(repo) }));
}

export async function finishUpload(input: { path: string; filename: string; categoryId?: string | null; consent: boolean; slot?: string | null; replaceId?: string | null; sortOrder?: number }) {
  return run(async (repo) => {
    if (input.replaceId) {
      await ops.replacePhotoFile(repo, input.replaceId, input.path, input.filename);
      touched();
      return { id: input.replaceId };
    }
    const sortOrder = input.sortOrder == null ? undefined : z.number().int().min(0).max(10_000_000).parse(input.sortOrder);
    const id = await ops.addPhoto(repo, { path: input.path, filename: input.filename, categoryId: input.categoryId ?? null, consent: input.consent, sortOrder });
    if (input.slot) await ops.setSlot(repo, input.slot, id);
    touched();
    return { id };
  });
}

/* ------------------------------------------------------------------ photos */

export async function savePhotos(ids: string[], patch: PhotoPatch) {
  return run(async (repo) => {
    await ops.patchPhotos(repo, z.array(z.uuid()).min(1).max(500).parse(ids), patch);
    touched();
    return {};
  });
}

export async function saveOrder(ids: string[]) {
  return run(async (repo) => {
    await ops.reorderPhotos(repo, ids);
    touched();
    return {};
  });
}

export async function removePhotos(ids: string[]) {
  return run(async (repo) => {
    let now = 0;
    for (const id of z.array(z.uuid()).min(1).max(500).parse(ids)) if ((await ops.deletePhoto(repo, id)).removedNow) now++;
    touched();
    return { removedNow: now, scheduled: ids.length - now };
  });
}

export async function restorePhotos(ids: string[]) {
  return run(async (repo) => {
    for (const id of z.array(z.uuid()).parse(ids)) await ops.restorePhoto(repo, id);
    touched();
    return {};
  });
}

/* ------------------------------------------------------------------ placements */

export async function assignSlot(slot: string, photoId: string | null) {
  return run(async (repo) => {
    await ops.setSlot(repo, slot, photoId ? z.uuid().parse(photoId) : null);
    touched();
    return {};
  });
}

export async function saveMosaic(ids: string[]) {
  return run(async (repo) => {
    await ops.setMosaic(repo, ids);
    touched();
    return {};
  });
}

/* ------------------------------------------------------------------ content */

export async function saveContentAction(key: Exclude<ContentKey, "layout" | "categories">, value: unknown) {
  return run(async (repo) => {
    await ops.saveContent(repo, z.enum(["pricing", "texts", "faqs", "testimonials", "story"]).parse(key), value);
    touched();
    return {};
  });
}

export async function saveCategoriesAction(list: Category[]) {
  return run(async (repo) => {
    const out = await ops.saveCategories(repo, list);
    touched();
    return out;
  });
}

/* ------------------------------------------------------------------ publish */

export async function publishAction() {
  return run(async (repo) => {
    const summary = await ops.publishAll(repo);
    updateTag(CONTENT_TAG);
    updateTag(MEDIA_TAG);
    revalidatePath("/", "layout");
    return { summary };
  });
}

export async function discardAction() {
  return run(async (repo) => {
    await ops.discardAll(repo);
    touched();
    return {};
  });
}

/* ------------------------------------------------------------------ client galleries */

type GalleryInput = z.input<typeof galleries.galleryInputSchema>;

export async function createGalleryAction(input: GalleryInput, password: string) {
  return run(async (repo) => {
    const id = await galleries.createGallery(repo, input, password);
    touched();
    return { id };
  });
}

export async function updateGalleryAction(id: string, input: GalleryInput, password?: string) {
  return run(async (repo) => {
    await galleries.updateGallery(repo, id, input, password || undefined);
    touched();
    return {};
  });
}

export async function deleteGalleryAction(id: string, confirm: string) {
  return run(async (repo) => {
    const g = await repo.getGallery(z.uuid().parse(id));
    if (!g) return {};
    if (confirm.trim() !== g.title.trim()) throw new ops.CmsError("Type the gallery title exactly to confirm.");
    await galleries.deleteGallery(repo, id);
    touched();
    return {};
  });
}

export async function addGalleryPhotoAction(galleryId: string, path: string, filename: string) {
  return run(async (repo) => {
    await galleries.addGalleryPhoto(repo, galleryId, path, filename);
    touched();
    return {};
  });
}

export async function removeGalleryPhotoAction(galleryId: string, photoId: string) {
  return run(async (repo) => {
    await galleries.removeGalleryPhoto(repo, z.uuid().parse(galleryId), z.uuid().parse(photoId));
    touched();
    return {};
  });
}

export async function reorderGalleryAction(galleryId: string, ids: string[]) {
  return run(async (repo) => {
    await galleries.reorderGalleryPhotos(repo, z.uuid().parse(galleryId), ids);
    touched();
    return {};
  });
}
