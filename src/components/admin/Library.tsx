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
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { removePhotos, saveOrder, savePhotos } from "@/app/admin/cms-actions";
import type { AdminPhoto } from "@/lib/cms/ops";
import type { Category } from "@/lib/cms/schema";
import { PhotoEditor } from "./PhotoEditor";
import { Badge, Btn, useConfirm, useToast } from "./ui";
import { Uploader } from "./Uploader";

type Filter = "all" | "none" | string;

export function Library({
  photos,
  categories,
}: {
  photos: AdminPhoto[];
  categories: Category[];
}) {
  const router = useRouter();
  const toast = useToast();
  const { ask, ui } = useConfirm();
  const [busy, start] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [status, setStatus] = useState<
    "any" | "unpublished" | "hidden" | "featured"
  >("any");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [order, setOrder] = useState<string[] | null>(null);

  const catLabel = (id: string | null) =>
    categories.find((c) => c.id === id)?.label ?? "No category";

  const visible = useMemo(() => {
    const base = photos.filter((p) => {
      if (filter === "none" && p.state.categoryId) return false;
      if (
        filter !== "all" &&
        filter !== "none" &&
        p.state.categoryId !== filter &&
        !(p.state.alsoIn ?? []).includes(filter)
      )
        return false;
      if (status === "unpublished" && !(p.isNew || p.changed)) return false;
      if (status === "hidden" && p.state.published) return false;
      if (status === "featured" && !p.state.featured) return false;
      if (
        q &&
        !`${p.state.title} ${p.state.alt} ${p.state.filename} ${p.state.location}`
          .toLowerCase()
          .includes(q.toLowerCase())
      )
        return false;
      return true;
    });
    if (!order) return base;
    const idx = new Map(order.map((id, i) => [id, i]));
    return [...base].sort(
      (a, b) => (idx.get(a.id) ?? 1e9) - (idx.get(b.id) ?? 1e9),
    );
  }, [photos, filter, status, q, order]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const canSort = filter !== "all" && status === "any" && !q;

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = visible.map((p) => p.id);
    const next = arrayMove(
      ids,
      ids.indexOf(String(e.active.id)),
      ids.indexOf(String(e.over.id)),
    );
    setOrder(next);
    start(async () => {
      const r = await saveOrder(next);
      if (!r.ok) toast(r.error, "error");
      else toast("New order saved as a draft.");
      router.refresh();
    });
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const bulk = (patch: Parameters<typeof savePhotos>[1], msg: string) =>
    start(async () => {
      const r = await savePhotos([...selected], patch);
      if (!r.ok) return toast(r.error, "error");
      toast(msg);
      setSelected(new Set());
      router.refresh();
    });

  const bulkDelete = async () => {
    const ids = [...selected];
    const used = photos.filter(
      (p) => selected.has(p.id) && p.usedIn.some((u) => !u.endsWith("gallery")),
    );
    const ok = await ask({
      title: `Delete ${ids.length} photo${ids.length === 1 ? "" : "s"}?`,
      body: (
        <div className="space-y-2">
          {used.length > 0 && (
            <p>
              {used.length} of them are placed on the site (homepage, covers…).
              Those spots will fall back automatically.
            </p>
          )}
          <p>
            New uploads are removed now. Published photos stay live until you
            Publish, and can be restored before that.
          </p>
        </div>
      ),
      action: "Delete",
      danger: true,
      typeToConfirm: ids.length >= 5 ? "DELETE" : undefined,
    });
    if (!ok) return;
    start(async () => {
      const r = await removePhotos(ids);
      if (!r.ok) return toast(r.error, "error");
      toast("Done.");
      setSelected(new Set());
      router.refresh();
    });
  };

  const editingPhoto = photos.find((p) => p.id === editing);
  const counts = (id: Filter) =>
    photos.filter((p) =>
      id === "all"
        ? true
        : id === "none"
          ? !p.state.categoryId
          : p.state.categoryId === id || (p.state.alsoIn ?? []).includes(id),
    ).length;

  return (
    <div className="space-y-8">
      <Uploader
        categories={categories}
        defaultCategory={filter !== "all" && filter !== "none" ? filter : null}
      />

      <section aria-labelledby="lib-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="lib-title" className="text-[1.6rem]">
            Library{" "}
            <span className="text-base font-normal text-muted">
              ({photos.length})
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <input
              className="field !min-h-10 w-48"
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search photos"
            />
            <select
              className="field !min-h-10 w-44"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              aria-label="Status filter"
            >
              <option value="any">Any status</option>
              <option value="unpublished">Unpublished changes</option>
              <option value="hidden">Hidden</option>
              <option value="featured">Featured</option>
            </select>
          </div>
        </div>
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Category"
        >
          {[
            { id: "all", label: "All" },
            ...categories.map((c) => ({ id: c.id, label: c.label })),
            { id: "none", label: "No category" },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={filter === c.id}
              onClick={() => {
                setFilter(c.id);
                setOrder(null);
              }}
              className={`min-h-10 rounded-full border px-4 text-sm ${filter === c.id ? "border-ink bg-ink text-gallery" : "border-ink/20 hover:border-ink/50"}`}
            >
              {c.label} <span className="opacity-60">{counts(c.id)}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">
          {canSort
            ? "Drag photos to set their order in this category (on touch screens, press and hold)."
            : "Pick a category above to drag photos into order. Click a photo to crop and edit it."}
        </p>

        {selected.size > 0 && (
          <div
            className="sticky top-14 z-30 mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-ink/20 bg-parchment p-3 shadow-md"
            data-testid="bulk-bar"
          >
            <strong className="mr-2 text-sm">{selected.size} selected</strong>
            <select
              className="field !min-h-9 w-48 text-sm"
              defaultValue=""
              onChange={(e) =>
                e.target.value &&
                bulk(
                  {
                    categoryId:
                      e.target.value === "__none" ? null : e.target.value,
                  },
                  "Category updated.",
                )
              }
              aria-label="Move to category"
            >
              <option value="">Move to category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
              <option value="__none">No category</option>
            </select>
            <select
              className="field !min-h-9 w-52 text-sm"
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                e.target.value = "";
                if (!v) return;
                const [op, id] = v.split(":");
                bulk(op === "add" ? { addTo: id } : { removeFrom: id }, op === "add" ? "Added to that category too." : "Taken out of that category.");
              }}
              aria-label="Also add to, or remove from, a category"
              data-testid="bulk-also"
            >
              <option value="">Also add to / remove from…</option>
              <optgroup label="Also add to (keeps others)">
                {categories.map((c) => (
                  <option key={c.id} value={`add:${c.id}`}>
                    + {c.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Remove from">
                {categories.map((c) => (
                  <option key={c.id} value={`remove:${c.id}`}>
                    − {c.label}
                  </option>
                ))}
              </optgroup>
            </select>
            <Btn
              size="sm"
              variant="secondary"
              onClick={() => bulk({ featured: true }, "Featured.")}
              disabled={busy}
            >
              Feature
            </Btn>
            <Btn
              size="sm"
              variant="secondary"
              onClick={() => bulk({ featured: false }, "Unfeatured.")}
              disabled={busy}
            >
              Unfeature
            </Btn>
            <Btn
              size="sm"
              variant="secondary"
              onClick={() =>
                bulk({ published: true }, "Will be visible after Publish.")
              }
              disabled={busy}
            >
              Show
            </Btn>
            <Btn
              size="sm"
              variant="secondary"
              onClick={() =>
                bulk({ published: false }, "Will be hidden after Publish.")
              }
              disabled={busy}
            >
              Hide
            </Btn>
            <Btn
              size="sm"
              variant="secondary"
              onClick={() =>
                bulk({ license: "owner_original" }, "Permission confirmed.")
              }
              disabled={busy}
            >
              Confirm permission
            </Btn>
            <Btn
              size="sm"
              variant="danger"
              onClick={bulkDelete}
              disabled={busy}
            >
              Delete
            </Btn>
            <Btn
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Btn>
          </div>
        )}

        {visible.length === 0 ? (
          <p className="mt-10 rounded-xl border border-dashed border-line p-10 text-center text-muted">
            No photos here yet. Drop some in above.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={visible.map((p) => p.id)}
              strategy={rectSortingStrategy}
              disabled={!canSort}
            >
              <ul
                className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                data-testid="library-grid"
              >
                {visible.map((p) => (
                  <Tile
                    key={p.id}
                    photo={p}
                    sortable={canSort}
                    selected={selected.has(p.id)}
                    onToggle={() => toggle(p.id)}
                    onOpen={() => setEditing(p.id)}
                    catLabel={[p.state.categoryId, ...(p.state.alsoIn ?? [])].filter(Boolean).length > 1 ? `${catLabel(p.state.categoryId)} +${(p.state.alsoIn ?? []).length}` : catLabel(p.state.categoryId)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {editingPhoto && (
        <PhotoEditor
          key={editingPhoto.id}
          photo={editingPhoto}
          categories={categories}
          onClose={() => setEditing(null)}
        />
      )}
      {ui}
    </div>
  );
}

function Tile({
  photo,
  sortable,
  selected,
  onToggle,
  onOpen,
  catLabel,
}: {
  photo: AdminPhoto;
  sortable: boolean;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  catLabel: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id, disabled: !sortable });
  const s = photo.state;
  const needs =
    (s.published && !s.alt.trim()) || (s.published && s.license === "pending");
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
      }}
      className={`group relative overflow-hidden rounded-xl border bg-parchment ${selected ? "border-clay-deep ring-2 ring-clay-deep" : "border-line"} ${isDragging ? "shadow-2xl" : ""} ${photo.pendingDelete ? "opacity-50" : ""}`}
      data-testid="library-tile"
      data-photo-id={photo.id}
    >
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left"
        {...(sortable ? { ...attributes, ...listeners } : {})}
        aria-label={`Edit ${s.title || s.filename || "photo"}`}
      >
        <span className="relative block aspect-square bg-sand">
          <Image
            src={photo.url}
            alt={s.alt}
            fill
            sizes="(min-width:1024px) 16vw, (min-width:640px) 33vw, 50vw"
            quality={60}
            className="object-cover"
            style={{ objectPosition: `${s.focal.dx}% ${s.focal.dy}%` }}
            placeholder={s.blur ? "blur" : "empty"}
            blurDataURL={s.blur ?? undefined}
          />
        </span>
        <span className="block truncate px-2.5 pt-2 text-sm font-semibold">
          {s.title || s.filename || "Untitled"}
        </span>
        <span className="block truncate px-2.5 pb-2.5 text-xs text-muted">
          {catLabel}
        </span>
      </button>
      <span className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
        {photo.pendingDelete ? (
          <Badge tone="danger">Deleting</Badge>
        ) : photo.isNew ? (
          <Badge tone="new">New</Badge>
        ) : photo.changed ? (
          <Badge tone="changed">Edited</Badge>
        ) : null}
        {!s.published && <Badge tone="muted">Hidden</Badge>}
        {s.featured && <Badge>★ Featured</Badge>}
        {needs && <Badge tone="danger">Needs info</Badge>}
      </span>
      <label className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gallery/90 shadow">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-4 w-4 accent-[var(--color-clay-deep)]"
          aria-label={`Select ${s.title || "photo"}`}
        />
      </label>
    </li>
  );
}
