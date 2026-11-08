"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  removePhotos,
  restorePhotos,
  savePhotos,
} from "@/app/admin/cms-actions";
import type { AdminPhoto } from "@/lib/cms/ops";
import type { Category, PhotoPatch } from "@/lib/cms/schema";
import { FocalEditor } from "./FocalEditor";
import { Badge, Btn, Field, Modal, useConfirm, useToast } from "./ui";
import { formatBytes, uploadFiles, type UploadItem } from "./upload";

export const LICENSES = [
  { id: "owner_original", label: "My own photo" },
  { id: "client_release", label: "Client gave permission" },
  { id: "model_release", label: "Signed model release" },
  { id: "licensed", label: "Licensed from someone else" },
  { id: "pending", label: "Not confirmed yet (can't go live)" },
] as const;

/** Edit one photo: crop for desktop and mobile, words, category, visibility, replace or delete. */
export function PhotoEditor({
  photo,
  categories,
  onClose,
}: {
  photo: AdminPhoto;
  categories: Category[];
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { ask, ui } = useConfirm();
  const [busy, start] = useTransition();
  const s = photo.state;
  const [f, setF] = useState({
    title: s.title,
    alt: s.alt,
    description: s.description,
    location: s.location,
    categoryId: s.categoryId,
    alsoIn: s.alsoIn ?? [],
    featured: s.featured,
    published: s.published,
    license: s.license,
    permissionNote: s.permissionNote,
    focal: s.focal,
    zoom: s.zoom,
  });
  const [replacing, setReplacing] = useState<UploadItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((x) => ({ ...x, [k]: v }));

  const save = (close = true) =>
    start(async () => {
      const patch: PhotoPatch = {
        ...f,
        alsoIn: f.categoryId ? f.alsoIn.filter((x) => x !== f.categoryId) : [],
        title: f.title.trim(),
        alt: f.alt.trim(),
      };
      const r = await savePhotos([photo.id], patch);
      if (!r.ok) return toast(r.error, "error");
      toast("Saved as a draft. Publish when you're ready.");
      router.refresh();
      if (close) onClose();
    });

  const replace = async (file: File) => {
    await uploadFiles(
      [file],
      { kind: "portfolio", consent: true, replaceId: photo.id },
      (items) => setReplacing(items[0]),
    );
    router.refresh();
    toast("Photo replaced. Its text, category and placements were kept.");
    onClose();
  };

  const del = async () => {
    const ok = await ask({
      title: "Delete this photo?",
      body: (
        <div className="space-y-2">
          {photo.usedIn.length > 0 ? (
            <>
              <p>It&apos;s currently used in:</p>
              <ul className="list-disc pl-5">
                {photo.usedIn.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
              <p>Those spots will fall back to another photo automatically.</p>
            </>
          ) : (
            <p>It isn&apos;t placed anywhere on the site.</p>
          )}
          <p className="font-semibold">
            {photo.isNew
              ? "It has never been published, so it's removed right away."
              : "It stays live until you Publish, and you can restore it before then."}
          </p>
        </div>
      ),
      action: "Delete photo",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      const r = await removePhotos([photo.id]);
      if (!r.ok) return toast(r.error, "error");
      toast(
        photo.isNew
          ? "Deleted."
          : "Marked for deletion. It's removed when you Publish.",
      );
      router.refresh();
      onClose();
    });
  };

  const restore = () =>
    start(async () => {
      const r = await restorePhotos([photo.id]);
      if (!r.ok) return toast(r.error, "error");
      router.refresh();
      onClose();
    });

  const altMissing = f.published && !f.alt.trim();

  return (
    <Modal open onClose={onClose} title={f.title || s.filename || "Photo"} wide>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section aria-label="Crop">
          <FocalEditor
            src={photo.url}
            focal={f.focal}
            zoom={f.zoom}
            onChange={(focal, zoom) => setF((x) => ({ ...x, focal, zoom }))}
          />
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>
              {s.width}×{s.height}px · web file{" "}
              {s.bytes ? formatBytes(s.bytes) : "?"}
              {s.originalBytes
                ? ` · original ${formatBytes(s.originalBytes)} kept safely`
                : ""}
            </span>
            {Math.max(s.width, s.height) < 1800 && (
              <span className="w-full rounded-lg bg-sand/70 px-3 py-2 text-ink-soft" data-testid="low-res">
                This file is only {Math.max(s.width, s.height)}px on its long side, so it will look soft in big spots (the hero, journal covers, full screen). Upload the full-size export if you have it.
              </span>
            )}
            {Math.max(f.zoom.d, f.zoom.m) > 1.6 && Math.max(s.width, s.height) < 2400 && (
              <span className="w-full rounded-lg bg-sand/70 px-3 py-2 text-ink-soft">Zoomed in this far, a photo this size can look soft in large spots. A smaller zoom keeps it crisp.</span>
            )}
            {photo.isNew && <Badge tone="new">New</Badge>}
            {!photo.isNew && photo.changed && (
              <Badge tone="changed">Unpublished edits</Badge>
            )}
            {photo.pendingDelete && (
              <Badge tone="danger">Will be deleted</Badge>
            )}
          </div>
          {photo.usedIn.length > 0 && (
            <p className="mt-2 text-sm">
              <strong>Used in:</strong> {photo.usedIn.join(" · ")}
            </p>
          )}
        </section>

        <section aria-label="Details" className="space-y-4">
          <Field
            label="Alt text (describes the photo for Google and screen readers)"
            hint={
              altMissing ? (
                <span className="text-[#7d2a20]">
                  Required before this photo can go live.
                </span>
              ) : (
                `${f.alt.length}/400 · e.g. “Mother and daughter laughing in a pecan grove at sunset”`
              )
            }
          >
            <textarea
              className="field min-h-20"
              maxLength={400}
              value={f.alt}
              onChange={(e) => set("alt", e.target.value)}
              data-testid="alt"
            />
          </Field>
          <Field label="Title">
            <input
              className="field"
              maxLength={160}
              value={f.title}
              onChange={(e) => set("title", e.target.value)}
              data-testid="title"
            />
          </Field>
          <Field label="Description / story (optional)">
            <textarea
              className="field min-h-20"
              maxLength={1200}
              value={f.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Portfolio category">
              <select
                className="field"
                value={f.categoryId ?? ""}
                onChange={(e) => set("categoryId", e.target.value || null)}
                data-testid="category"
              >
                <option value="">None (site photo only)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                    {c.visible ? "" : " (hidden)"}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Location (optional)"
              hint="Shown on city pages that match."
            >
              <input
                className="field"
                maxLength={160}
                value={f.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </Field>
          </div>
          {f.categoryId && categories.length > 1 && (
            <fieldset data-testid="also-in">
              <legend className="text-sm font-semibold">Also show in</legend>
              <p className="text-xs text-muted">The photo appears in each ticked gallery too (and can be picked for those covers and story choices).</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories
                  .filter((c) => c.id !== f.categoryId)
                  .map((c) => {
                    const on = f.alsoIn.includes(c.id);
                    return (
                      <label key={c.id} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm ${on ? "border-ink bg-ink text-gallery" : "border-ink/20 bg-gallery"}`}>
                        <input type="checkbox" className="sr-only" checked={on} onChange={(e) => set("alsoIn", e.target.checked ? [...f.alsoIn, c.id] : f.alsoIn.filter((x) => x !== c.id))} data-testid={`also-${c.id}`} />
                        {on ? "✓ " : "+ "}
                        {c.label}
                      </label>
                    );
                  })}
              </div>
            </fieldset>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex min-h-11 items-center gap-2 font-semibold">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--color-clay-deep)]"
                checked={f.published}
                onChange={(e) => set("published", e.target.checked)}
                data-testid="visible"
              />
              Visible on the site
            </label>
            <label className="flex min-h-11 items-center gap-2 font-semibold">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--color-clay-deep)]"
                checked={f.featured}
                onChange={(e) => set("featured", e.target.checked)}
                data-testid="featured"
              />
              Featured (preferred for covers & homepage)
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Permission">
              <select
                className="field"
                value={f.license}
                onChange={(e) =>
                  set("license", e.target.value as typeof f.license)
                }
              >
                {LICENSES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Permission note (private)">
              <input
                className="field"
                maxLength={400}
                value={f.permissionNote}
                onChange={(e) => set("permissionNote", e.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-line pt-5">
            <Btn
              onClick={() => save()}
              disabled={busy}
              data-testid="save-photo"
            >
              Save
            </Btn>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/tiff"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) =>
                e.target.files?.[0] && replace(e.target.files[0])
              }
              data-testid="replace-input"
            />
            <Btn
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={busy || Boolean(replacing)}
            >
              Replace file…
            </Btn>
            {photo.pendingDelete ? (
              <Btn variant="secondary" onClick={restore} disabled={busy}>
                Restore
              </Btn>
            ) : (
              <Btn
                variant="danger"
                onClick={del}
                disabled={busy}
                data-testid="delete-photo"
              >
                Delete
              </Btn>
            )}
          </div>
          {replacing && (
            <p className="text-sm" role="status">
              {replacing.status === "error" ? (
                <span className="text-[#7d2a20]">{replacing.error}</span>
              ) : (
                `Replacing… ${replacing.status === "processing" ? "optimizing" : `${Math.round(replacing.progress * 100)}%`}`
              )}
            </p>
          )}
        </section>
      </div>
      {ui}
    </Modal>
  );
}
