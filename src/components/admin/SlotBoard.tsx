"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { assignSlot } from "@/app/admin/cms-actions";
import { PhotoFill } from "@/components/media/Photo";
import type { AdminPhoto } from "@/lib/cms/ops";
import type { Category } from "@/lib/cms/schema";
import type { Photo } from "@/lib/photo-types";
import { LibraryPicker } from "./LibraryPicker";
import { PhotoEditor } from "./PhotoEditor";
import { useFileDrop } from "./Uploader";
import { Badge, Btn, useToast } from "./ui";
import { uploadFiles, type UploadItem } from "./upload";

export interface SlotView {
  key: string;
  group: string;
  label: string;
  hint: string;
  ratio: string;
  current: Photo | null;
  explicitId: string | null;
  /** New uploads for this spot go into this category. */
  categoryId: string | null;
  href: string;
}

/**
 * Every photo position on the public site, as a card. Drop a file on a card to
 * replace that photo in one step, or pick one from the library.
 */
export function SlotBoard({ slots, photos, categories }: { slots: SlotView[]; photos: AdminPhoto[]; categories: Category[] }) {
  const groups = [...new Set(slots.map((s) => s.group))];
  const samples = slots.filter((s) => !s.current?.src).length;
  return (
    <div className="space-y-12">
      <p className="rounded-xl border border-line bg-parchment p-4 text-sm">
        {samples > 0 ? (
          <>
            <strong>{samples} spots still show labeled sample placeholders.</strong> Drag a photo from your computer straight onto any card to replace it. Changes stay private until you press <strong>Publish</strong>.
          </>
        ) : (
          <>Every spot uses your own photography. Drop a new file onto any card to swap it.</>
        )}
      </p>
      {groups.map((g) => (
        <section key={g} aria-labelledby={`g-${g}`}>
          <h2 id={`g-${g}`} className="text-[1.5rem]">
            {g}
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {slots
              .filter((s) => s.group === g)
              .map((s) => (
                <SlotCard key={s.key} slot={s} photos={photos} categories={categories} />
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SlotCard({ slot, photos, categories }: { slot: SlotView; photos: AdminPhoto[]; categories: Category[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, start] = useTransition();
  const [upload, setUpload] = useState<UploadItem | null>(null);
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const send = async (files: File[]) => {
    const file = files.find((f) => f.type.startsWith("image/"));
    if (!file) return;
    const [res] = await uploadFiles([file], { kind: "portfolio", consent: true, slot: slot.key, categoryId: slot.categoryId }, (i) => setUpload(i[0]));
    if (res.status === "done") {
      toast(`${slot.label} updated. Publish to make it live.`);
      setUpload(null);
    }
    router.refresh();
  };
  const drop = useFileDrop(send);

  const pick = (id: string) =>
    start(async () => {
      setPicking(false);
      const r = await assignSlot(slot.key, id);
      if (!r.ok) return toast(r.error, "error");
      toast(`${slot.label} updated.`);
      router.refresh();
    });
  const reset = () =>
    start(async () => {
      const r = await assignSlot(slot.key, null);
      if (!r.ok) return toast(r.error, "error");
      router.refresh();
    });

  const real = slot.current?.src ? photos.find((p) => p.id === slot.current!.id) : undefined;
  const explicit = slot.explicitId ? photos.find((p) => p.id === slot.explicitId) : undefined;
  const hiddenPick = explicit && (!explicit.state.published || explicit.pendingDelete);

  return (
    <li
      {...drop.props}
      className={`flex flex-col overflow-hidden rounded-2xl border bg-parchment transition-colors ${drop.over ? "border-clay-deep ring-2 ring-clay-deep" : "border-line"}`}
      data-testid="slot"
      data-slot={slot.key}
    >
      <div className="relative overflow-hidden bg-sand" style={{ aspectRatio: slot.ratio }}>
        {slot.current ? <PhotoFill photo={slot.current} sizes="(min-width:1280px) 25vw, (min-width:640px) 45vw, 100vw" quality={60} /> : <div className="absolute inset-0 grid place-items-center text-sm text-muted">Empty</div>}
        {drop.over && <div className="absolute inset-0 grid place-items-center bg-ink/55 font-display text-xl text-gallery">Drop to replace</div>}
        {upload && upload.status !== "done" && (
          <div className="absolute inset-0 grid place-items-center bg-ink/60 p-4 text-center text-sm font-semibold text-gallery" role="status">
            {upload.status === "error" ? upload.error : upload.status === "processing" ? "Optimizing…" : `Uploading ${Math.round(upload.progress * 100)}%`}
          </div>
        )}
        <span className="absolute left-2 top-2 flex gap-1">
          {!slot.current?.src ? <Badge tone="danger">Sample</Badge> : slot.explicitId ? <Badge tone="ok">Chosen</Badge> : <Badge tone="muted">Automatic</Badge>}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="font-semibold">{slot.label}</p>
        <p className="mt-0.5 text-xs text-muted">{slot.hint}</p>
        {hiddenPick && <p className="mt-1 text-xs font-semibold text-[#7d2a20]">The chosen photo is hidden or being deleted, so an automatic one shows instead.</p>}
        <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/tiff" className="sr-only" tabIndex={-1} onChange={(e) => e.target.files && send(Array.from(e.target.files))} data-testid="slot-input" />
          <Btn size="sm" onClick={() => input.current?.click()} disabled={busy || (upload !== null && upload.status !== "error")}>
            Upload
          </Btn>
          <Btn size="sm" variant="secondary" onClick={() => setPicking(true)} disabled={busy}>
            Library
          </Btn>
          {real && (
            <Btn size="sm" variant="secondary" onClick={() => setEditing(true)} data-testid="slot-crop">
              Crop & text
            </Btn>
          )}
          {slot.explicitId && (
            <Btn size="sm" variant="ghost" onClick={reset} disabled={busy} title="Let the site choose a featured photo automatically">
              Automatic
            </Btn>
          )}
          <a href={slot.href} target="_blank" rel="noreferrer" className="ml-auto self-center text-xs underline">
            View ↗
          </a>
        </div>
      </div>
      {picking && <LibraryPicker open onClose={() => setPicking(false)} onPick={pick} photos={photos} categories={categories} title={`Choose: ${slot.label}`} preferCategory={slot.categoryId} />}
      {editing && real && <PhotoEditor photo={real} categories={categories} onClose={() => setEditing(false)} />}
    </li>
  );
}
