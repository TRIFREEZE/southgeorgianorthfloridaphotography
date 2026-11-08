"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveCategoriesAction } from "@/app/admin/cms-actions";
import type { Category } from "@/lib/cms/schema";
import { Btn, Field, useConfirm, useToast } from "./ui";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

/** Create, rename, reorder, hide and delete portfolio categories. */
export function CategoryManager({ initial, counts }: { initial: Category[]; counts: Record<string, number> }) {
  const router = useRouter();
  const toast = useToast();
  const { ask, ui } = useConfirm();
  const [busy, start] = useTransition();
  const [list, setList] = useState(initial);
  const [newLabel, setNewLabel] = useState("");
  const dirty = JSON.stringify(list) !== JSON.stringify(initial);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const update = (id: string, patch: Partial<Category>) => setList((l) => l.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const add = () => {
    const label = newLabel.trim();
    if (!label) return;
    let slug = slugify(label) || "category";
    while (list.some((c) => c.slug === slug)) slug = `${slug}-2`;
    let id = slug;
    while (list.some((c) => c.id === id)) id = `${id}-x`;
    setList((l) => [...l, { id, slug, label, description: "", visible: true }]);
    setNewLabel("");
  };

  const remove = async (c: Category) => {
    const n = counts[c.id] ?? 0;
    const ok = await ask({
      title: `Delete “${c.label}”?`,
      body: n ? <p>{n} photo{n === 1 ? "" : "s"} in this category will move to “No category”. No photos are deleted. Its web page will stop existing after you save and publish.</p> : <p>This category has no photos.</p>,
      action: "Delete category",
      danger: true,
    });
    if (ok) setList((l) => l.filter((x) => x.id !== c.id));
  };

  const save = () =>
    start(async () => {
      const r = await saveCategoriesAction(list.map((c) => ({ ...c, slug: slugify(c.slug) || c.id })));
      if (!r.ok) return toast(r.error, "error");
      toast(r.moved ? `Saved. ${r.moved} photo(s) moved to “No category”.` : "Categories saved as a draft.");
      router.refresh();
    });

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    setList((l) => arrayMove(l, l.findIndex((c) => c.id === e.active.id), l.findIndex((c) => c.id === e.over!.id)));
  };

  return (
    <div className="max-w-3xl space-y-6">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={list.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-3" data-testid="category-list">
            {list.map((c) => (
              <Row key={c.id} c={c} count={counts[c.id] ?? 0} onChange={(p) => update(c.id, p)} onDelete={() => remove(c)} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-ink/25 p-4">
        <Field label="New category" className="min-w-56 flex-1">
          <input className="field" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder="e.g. Maternity" data-testid="new-category" />
        </Field>
        <Btn variant="secondary" onClick={add}>
          Add
        </Btn>
      </div>

      <div className="flex gap-2">
        <Btn onClick={save} disabled={!dirty || busy} data-testid="save-categories">
          {busy ? "Saving…" : "Save categories"}
        </Btn>
        {dirty && (
          <Btn variant="ghost" onClick={() => setList(initial)}>
            Undo changes
          </Btn>
        )}
      </div>
      {ui}
    </div>
  );
}

function Row({ c, count, onChange, onDelete }: { c: Category; count: number; onChange: (p: Partial<Category>) => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`rounded-2xl border border-line bg-parchment p-4 ${isDragging ? "relative z-10 shadow-xl" : ""}`} data-testid="category-row">
      <div className="flex items-start gap-3">
        <button type="button" {...attributes} {...listeners} className="mt-7 cursor-grab touch-none rounded-lg px-2 py-2 text-muted hover:bg-sand/60" aria-label={`Reorder ${c.label}`}>
          ⠿
        </button>
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input className="field" value={c.label} maxLength={60} onChange={(e) => onChange({ label: e.target.value })} />
          </Field>
          <Field label="Web address" hint={`/portfolio/${c.slug || "…"}`}>
            <input className="field" value={c.slug} maxLength={60} onChange={(e) => onChange({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
          </Field>
          <Field label="Short description" className="sm:col-span-2">
            <input className="field" value={c.description} maxLength={300} onChange={(e) => onChange({ description: e.target.value })} />
          </Field>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-12 text-sm">
        <span className="text-muted">
          {count} photo{count === 1 ? "" : "s"}
        </span>
        <span className="flex items-center gap-3">
          <label className="flex min-h-10 items-center gap-2 font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-[var(--color-clay-deep)]" checked={c.visible} onChange={(e) => onChange({ visible: e.target.checked })} />
            Visible
          </label>
          <Btn size="sm" variant="ghost" onClick={onDelete} className="text-[#8f3226]">
            Delete
          </Btn>
        </span>
      </div>
    </li>
  );
}
