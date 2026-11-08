"use client";

import { finishUpload, requestUploads, addGalleryPhotoAction } from "@/app/admin/cms-actions";

/**
 * Browser side of uploads: ask the server for signed URLs, PUT each original
 * straight to storage with real progress (XHR), then ask the server to process it.
 * Runs 3 at a time so a 30-photo batch finishes quickly without choking the connection.
 */
export type UploadStatus = "waiting" | "uploading" | "processing" | "done" | "error";
export interface UploadItem {
  key: string;
  name: string;
  size: number;
  progress: number;
  status: UploadStatus;
  error?: string;
  id?: string;
}

export type UploadTarget =
  | { kind: "portfolio"; categoryId?: string | null; consent: boolean; slot?: string | null; replaceId?: string | null }
  | { kind: "gallery"; galleryId: string };

function put(url: string, file: File, headers: Record<string, string>, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(xhr.status === 413 ? "File too large." : `Upload failed (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error("Network problem. Check your connection and retry."));
    xhr.send(file);
  });
}

export async function uploadFiles(files: File[], target: UploadTarget, onUpdate: (items: UploadItem[]) => void, concurrency = 3): Promise<UploadItem[]> {
  const items: UploadItem[] = files.map((f, i) => ({ key: `${Date.now()}-${i}-${f.name}`, name: f.name, size: f.size, progress: 0, status: "waiting" }));
  const emit = () => onUpdate(items.map((x) => ({ ...x })));
  emit();

  const bucket = target.kind === "gallery" ? "client-galleries" : "portfolio-uploads";
  const res = await requestUploads(
    files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
    bucket,
  );
  if (!res.ok) {
    items.forEach((x) => Object.assign(x, { status: "error", error: res.error }));
    emit();
    return items;
  }

  let next = 0;
  const worker = async () => {
    while (next < files.length) {
      const i = next++;
      const t = res.targets[i];
      const item = items[i];
      if ("error" in t && t.error) {
        Object.assign(item, { status: "error", error: t.error });
        emit();
        continue;
      }
      const { path, url, headers } = t as { path: string; url: string; headers: Record<string, string> };
      try {
        item.status = "uploading";
        emit();
        await put(url, files[i], headers, (p) => {
          item.progress = p;
          emit();
        });
        item.status = "processing";
        item.progress = 1;
        emit();
        const done =
          target.kind === "gallery"
            ? await addGalleryPhotoAction(target.galleryId, path, files[i].name)
            : await finishUpload({ path, filename: files[i].name, categoryId: target.categoryId, consent: target.consent, slot: target.slot, replaceId: target.replaceId, sortOrder: res.sortBase + i * 10 });
        if (!done.ok) throw new Error(done.error);
        Object.assign(item, { status: "done", id: "id" in done ? (done.id as string) : undefined });
      } catch (e) {
        Object.assign(item, { status: "error", error: e instanceof Error ? e.message : "Upload failed." });
      }
      emit();
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, worker));
  return items;
}

export { formatBytes } from "@/lib/format-bytes";
