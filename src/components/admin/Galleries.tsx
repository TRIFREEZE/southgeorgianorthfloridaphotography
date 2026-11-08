"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  createGalleryAction,
  deleteGalleryAction,
  removeGalleryPhotoAction,
  reorderGalleryAction,
  updateGalleryAction,
} from "@/app/admin/cms-actions";
import { Badge, Btn, Field, useConfirm, useToast } from "./ui";
import { useFileDrop, UploadProgress } from "./Uploader";
import { formatBytes, uploadFiles, type UploadItem } from "./upload";

export interface GallerySummary {
  id: string;
  slug: string;
  title: string;
  clientName: string | null;
  message: string | null;
  expiresAt: string | null;
  allowDownloads: boolean;
  active: boolean;
  createdAt: string;
  photoCount?: number;
}

const randomPassword = () => {
  const words = [
    "clay",
    "pecan",
    "sunset",
    "meadow",
    "willow",
    "magnolia",
    "creek",
    "golden",
    "pine",
    "honey",
    "river",
    "cedar",
  ];
  const pick = () =>
    words[crypto.getRandomValues(new Uint32Array(1))[0] % words.length];
  return `${pick()}-${pick()}-${(crypto.getRandomValues(new Uint32Array(1))[0] % 90) + 10}`;
};

type FormState = {
  title: string;
  clientName: string;
  message: string;
  expiresAt: string;
  allowDownloads: boolean;
  active: boolean;
};
const toForm = (g?: GallerySummary): FormState => ({
  title: g?.title ?? "",
  clientName: g?.clientName ?? "",
  message: g?.message ?? "",
  expiresAt: g?.expiresAt ? g.expiresAt.slice(0, 10) : "",
  allowDownloads: g?.allowDownloads ?? true,
  active: g?.active ?? true,
});

function GalleryFields({
  f,
  set,
}: {
  f: FormState;
  set: (p: Partial<FormState>) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Gallery title">
        <input
          className="field"
          value={f.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="The Carter Family · Fall 2026"
          data-testid="gallery-title"
        />
      </Field>
      <Field label="Client name (private)">
        <input
          className="field"
          value={f.clientName}
          onChange={(e) => set({ clientName: e.target.value })}
        />
      </Field>
      <Field label="Welcome message (optional)" className="sm:col-span-2">
        <textarea
          className="field"
          rows={2}
          value={f.message}
          onChange={(e) => set({ message: e.target.value })}
        />
      </Field>
      <Field label="Available until (optional)">
        <input
          className="field"
          type="date"
          value={f.expiresAt}
          onChange={(e) => set({ expiresAt: e.target.value })}
        />
      </Field>
      <div className="flex flex-col justify-end gap-1">
        <label className="flex min-h-10 items-center gap-2 font-semibold">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[var(--color-clay-deep)]"
            checked={f.allowDownloads}
            onChange={(e) => set({ allowDownloads: e.target.checked })}
          />
          Allow full-resolution downloads
        </label>
        <label className="flex min-h-10 items-center gap-2 font-semibold">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[var(--color-clay-deep)]"
            checked={f.active}
            onChange={(e) => set({ active: e.target.checked })}
          />
          Gallery is open
        </label>
      </div>
    </div>
  );
}

export function GalleryList({
  galleries,
  siteUrl,
}: {
  galleries: GallerySummary[];
  siteUrl: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, start] = useTransition();
  const [f, setF] = useState(toForm());
  const [password, setPassword] = useState(randomPassword);
  const create = () =>
    start(async () => {
      const r = await createGalleryAction(f, password);
      if (!r.ok) return toast(r.error, "error");
      toast("Gallery created. Add photos next.");
      router.push(`/admin/galleries/${r.id}`);
    });
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section aria-label="Galleries">
        {galleries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-10 text-center text-muted">
            No client galleries yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {galleries.map((g) => {
              const expired = g.expiresAt && new Date(g.expiresAt) < new Date();
              return (
                <li
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-parchment p-4"
                >
                  <div>
                    <Link
                      href={`/admin/galleries/${g.id}`}
                      className="font-semibold underline-offset-2 hover:underline"
                    >
                      {g.title}
                    </Link>
                    <p className="text-sm text-muted">
                      {g.clientName ? `${g.clientName} · ` : ""}
                      {g.photoCount ?? 0} photos
                      {g.expiresAt
                        ? ` · until ${g.expiresAt.slice(0, 10)}`
                        : ""}
                    </p>
                  </div>
                  <span className="flex items-center gap-2">
                    {!g.active ? (
                      <Badge tone="muted">Closed</Badge>
                    ) : expired ? (
                      <Badge tone="danger">Expired</Badge>
                    ) : (
                      <Badge tone="ok">Open</Badge>
                    )}
                    <code className="hidden text-xs text-muted md:inline">{`${siteUrl}/client-gallery/${g.slug}`}</code>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section
        aria-labelledby="new-g"
        className="space-y-4 rounded-2xl border border-line bg-parchment p-5"
      >
        <h2 id="new-g" className="text-[1.3rem]">
          New client gallery
        </h2>
        <GalleryFields f={f} set={(p) => setF((x) => ({ ...x, ...p }))} />
        <Field
          label="Gallery password"
          hint="Share it with your client separately from the link."
        >
          <span className="flex gap-2">
            <input
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="gallery-password"
            />
            <Btn
              size="sm"
              variant="secondary"
              onClick={() => setPassword(randomPassword())}
            >
              New
            </Btn>
          </span>
        </Field>
        <Btn
          onClick={create}
          disabled={busy || !f.title.trim()}
          data-testid="create-gallery"
        >
          Create gallery
        </Btn>
      </section>
    </div>
  );
}

export interface GalleryPhotoView {
  id: string;
  url: string;
  filename: string | null;
  bytes: number | null;
  originalBytes: number | null;
}

export function GalleryDetail({
  gallery,
  photos,
  shareUrl,
}: {
  gallery: GallerySummary;
  photos: GalleryPhotoView[];
  shareUrl: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const { ask, ui } = useConfirm();
  const [busy, start] = useTransition();
  const [f, setF] = useState(toForm(gallery));
  const [password, setPassword] = useState("");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [order, setOrder] = useState(photos.map((p) => p.id));
  const input = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const sorted = order
    .map((id) => photos.find((p) => p.id === id))
    .filter((p): p is GalleryPhotoView => Boolean(p));
  const missing = photos.filter((p) => !order.includes(p.id));
  const list = [...sorted, ...missing];

  const upload = async (files: File[]) => {
    await uploadFiles(
      files,
      { kind: "gallery", galleryId: gallery.id },
      setItems,
    );
    router.refresh();
  };
  const drop = useFileDrop(upload);

  const save = () =>
    start(async () => {
      const r = await updateGalleryAction(gallery.id, f, password || undefined);
      if (!r.ok) return toast(r.error, "error");
      setPassword("");
      toast(
        password
          ? "Saved. The new password is active and old sign-ins were ended."
          : "Saved.",
      );
      router.refresh();
    });

  const del = async () => {
    const ok = await ask({
      title: "Delete this whole gallery?",
      body: (
        <p>
          All {photos.length} photos and their originals are permanently
          deleted, and the link stops working. This can&apos;t be undone.
        </p>
      ),
      action: "Delete gallery",
      danger: true,
      typeToConfirm: gallery.title,
    });
    if (!ok) return;
    start(async () => {
      const r = await deleteGalleryAction(gallery.id, gallery.title);
      if (!r.ok) return toast(r.error, "error");
      router.push("/admin/galleries");
    });
  };

  const removeOne = async (p: GalleryPhotoView) => {
    if (
      !(await ask({
        title: "Remove this photo from the gallery?",
        body: <p>{p.filename}</p>,
        action: "Remove",
        danger: true,
      }))
    )
      return;
    start(async () => {
      const r = await removeGalleryPhotoAction(gallery.id, p.id);
      if (!r.ok) return toast(r.error, "error");
      router.refresh();
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = list.map((p) => p.id);
    const next = arrayMove(
      ids,
      ids.indexOf(String(e.active.id)),
      ids.indexOf(String(e.over.id)),
    );
    setOrder(next);
    start(async () => {
      const r = await reorderGalleryAction(gallery.id, next);
      if (!r.ok) toast(r.error, "error");
    });
  };

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-line bg-parchment p-5">
        <p className="text-sm font-semibold">Share link</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <code
            className="flex-1 break-all rounded-lg bg-gallery px-3 py-2 text-sm"
            data-testid="share-url"
          >
            {shareUrl}
          </code>
          <Btn
            size="sm"
            variant="secondary"
            onClick={() =>
              navigator.clipboard
                .writeText(shareUrl)
                .then(() => toast("Link copied."))
            }
          >
            Copy link
          </Btn>
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center rounded-full border border-ink/25 px-3 text-sm font-semibold"
          >
            Open ↗
          </a>
        </div>
        <p className="mt-2 text-xs text-muted">
          Visitors need the password too. Gallery pages are never indexed by
          search engines, and photos are served through links that expire after
          an hour.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-[1.4rem]">Settings</h2>
        <GalleryFields f={f} set={(p) => setF((x) => ({ ...x, ...p }))} />
        <Field label="Change password (leave empty to keep the current one)">
          <input
            className="field max-w-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={save} disabled={busy}>
            Save settings
          </Btn>
          <Btn variant="danger" onClick={del} disabled={busy}>
            Delete gallery
          </Btn>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-[1.4rem]">Photos ({photos.length})</h2>
        <div
          {...drop.props}
          className={`rounded-2xl border-2 border-dashed p-8 text-center ${drop.over ? "border-clay-deep bg-[#f3e4dc]" : "border-ink/25 bg-gallery"}`}
          data-testid="gallery-dropzone"
        >
          <p className="font-display text-[1.3rem]">
            Drop the client&apos;s photos here
          </p>
          <p className="text-sm text-muted">
            Stored privately. Separate from your public portfolio.
          </p>
          <input
            ref={input}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif,image/tiff"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) =>
              e.target.files && upload(Array.from(e.target.files))
            }
            data-testid="gallery-input"
          />
          <Btn className="mt-3" onClick={() => input.current?.click()}>
            Choose files
          </Btn>
        </div>
        <UploadProgress items={items} />
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={list.map((p) => p.id)}
            strategy={rectSortingStrategy}
          >
            <ul
              className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6"
              data-testid="gallery-grid"
            >
              {list.map((p) => (
                <GTile key={p.id} p={p} onRemove={() => removeOne(p)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </section>
      {ui}
    </div>
  );
}

function GTile({ p, onRemove }: { p: GalleryPhotoView; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: p.id });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className="overflow-hidden rounded-xl border border-line bg-parchment"
    >
      <div
        {...attributes}
        {...listeners}
        className="relative aspect-square cursor-grab touch-none bg-sand"
        aria-label={`Reorder ${p.filename ?? "photo"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- private signed URL, not for the public optimizer */}
        <img
          src={p.url}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="flex items-center justify-between gap-2 p-2 text-xs">
        <span className="truncate text-muted">
          {p.originalBytes ? formatBytes(p.originalBytes) : p.filename}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="font-semibold text-[#8f3226]"
        >
          Remove
        </button>
      </div>
    </li>
  );
}
