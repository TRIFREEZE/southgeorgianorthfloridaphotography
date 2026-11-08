"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Category } from "@/lib/cms/schema";
import { Btn } from "./ui";
import { formatBytes, uploadFiles, type UploadItem, type UploadTarget } from "./upload";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/tiff";

export function useFileDrop(onFiles: (files: File[]) => void) {
  const [over, setOver] = useState(false);
  return {
    over,
    props: {
      onDragOver: (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setOver(true);
      },
      onDragLeave: () => setOver(false),
      onDrop: (e: React.DragEvent) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      },
    },
  };
}

export function UploadProgress({ items }: { items: UploadItem[] }) {
  if (!items.length) return null;
  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error").length;
  const total = items.reduce((s, i) => s + i.size, 0);
  const sent = items.reduce((s, i) => s + i.size * (i.status === "done" || i.status === "processing" ? 1 : i.progress), 0);
  return (
    <div className="mt-4 rounded-xl border border-line bg-gallery p-4" data-testid="upload-progress">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <strong role="status">
          {done} of {items.length} uploaded{failed ? `, ${failed} failed` : ""}
        </strong>
        <span className="text-muted">
          {formatBytes(sent)} / {formatBytes(total)}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-sand" aria-hidden>
        <div className="h-full rounded-full bg-clay-deep transition-[width]" style={{ width: `${total ? (sent / total) * 100 : 0}%` }} />
      </div>
      <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm">
        {items.map((i) => (
          <li key={i.key} className="flex items-center justify-between gap-3">
            <span className="truncate">{i.name}</span>
            <span className={`shrink-0 text-xs ${i.status === "error" ? "text-[#7d2a20]" : "text-muted"}`}>
              {i.status === "uploading" ? `${Math.round(i.progress * 100)}%` : i.status === "processing" ? "optimizing…" : i.status === "done" ? "✓ done" : i.status === "error" ? i.error : "waiting"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Bulk drag-and-drop upload into the library (and optionally straight into a category). */
export function Uploader({ categories, defaultCategory }: { categories: Category[]; defaultCategory?: string | null }) {
  const router = useRouter();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [categoryId, setCategoryId] = useState<string>(defaultCategory ?? "");
  const [consent, setConsent] = useState(true);
  const [running, setRunning] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const start = async (files: File[]) => {
    // File-name order (IMG_2 before IMG_10), so a batch lands in the order it was shot.
    const images = files
      .filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (!images.length || running) return;
    setRunning(true);
    const target: UploadTarget = { kind: "portfolio", categoryId: categoryId || null, consent };
    let tick = 0;
    await uploadFiles(images, target, (next) => {
      setItems(next);
      // refresh the grid every few finished files so new photos appear as they land
      const done = next.filter((x) => x.status === "done").length;
      if (done >= tick + 5) {
        tick = done;
        router.refresh();
      }
    });
    setRunning(false);
    router.refresh();
  };
  const drop = useFileDrop(start);

  return (
    <section aria-labelledby="upload-title" className="rounded-2xl border border-line bg-parchment p-5">
      <h2 id="upload-title" className="text-[1.4rem]">
        Upload photos
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Put them in
          <select className="field mt-1.5" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} data-testid="upload-category">
            <option value="">No category yet (sort later)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-start gap-3 self-end rounded-xl border border-line bg-gallery p-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-clay-deep)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} data-testid="upload-consent" />
          <span>I took these photos (or have permission to share them) and the people shown are OK with them being online.</span>
        </label>
      </div>
      <div
        {...drop.props}
        className={`mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${drop.over ? "border-clay-deep bg-[#f3e4dc]" : "border-ink/25 bg-gallery"}`}
        data-testid="dropzone"
      >
        <p className="font-display text-[1.5rem]">Drop photos here</p>
        <p className="mt-1 text-sm text-muted">JPEG, PNG, WebP, AVIF or TIFF · up to 100 MB each · as many as you like</p>
        <input ref={input} type="file" multiple accept={ACCEPT} className="sr-only" tabIndex={-1} onChange={(e) => e.target.files && start(Array.from(e.target.files))} data-testid="upload-input" />
        <Btn className="mt-4" onClick={() => input.current?.click()} disabled={running}>
          {running ? "Uploading…" : "Choose files"}
        </Btn>
        <p className="mt-3 max-w-md text-xs text-muted">Originals are kept untouched in private storage. The site gets an optimized copy (rotated, location data removed) served in modern formats at every screen size.</p>
      </div>
      <UploadProgress items={items} />
    </section>
  );
}
