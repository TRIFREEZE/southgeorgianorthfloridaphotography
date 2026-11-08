"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveCategoriesAction } from "@/app/admin/cms-actions";
import { packagePrice } from "@/content/pricing";
import type { Category, Pricing, ServiceConfig, Texts } from "@/lib/cms/schema";
import { sessionTypes, type SessionType } from "@/lib/cms/sessions";
import { Badge, Btn, Field, useConfirm, useToast } from "./ui";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const RESERVED_IDS = new Set(["other", "people", "animals", "weddings-events", "brands", "business-branding"]);

/** The full, saved form of a category's session settings (so the editor never depends on fallbacks). */
function materialize(s: SessionType, prev: ServiceConfig | undefined): ServiceConfig {
  return {
    enabled: prev?.enabled ?? true,
    slug: s.slug,
    name: s.name,
    navLabel: s.navLabel,
    headline: s.headline,
    intro: s.intro,
    idealFor: s.idealFor,
    steps: s.steps,
    timing: s.timing,
    cta: s.cta,
    seoTitle: s.seoTitle,
    seoDescription: s.seoDescription,
    pricingMode: s.pricingMode,
    packageIds: prev?.packageIds ?? [],
    quote: { ...s.quote },
    booking: { show: prev?.booking?.show ?? true, label: s.booking.label, hint: s.booking.hint, groupLabel: s.booking.groupLabel, groupHint: s.booking.groupHint, askAnimals: s.booking.askAnimals },
  };
}

/**
 * Categories are session types: each one is a portfolio filter and, unless you
 * switch it off, a service page, a session-finder option and a pricing entry.
 */
export function CategoryManager({ initial, counts, pricing, texts }: { initial: Category[]; counts: Record<string, number>; pricing: Pricing; texts: Texts }) {
  const router = useRouter();
  const toast = useToast();
  const { ask, ui } = useConfirm();
  const [busy, start] = useTransition();
  const [list, setList] = useState(initial);
  const [newLabel, setNewLabel] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const dirty = JSON.stringify(list) !== JSON.stringify(initial);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const sessions = useMemo(() => sessionTypes({ categories: list, texts, pricing }, { includeHidden: true }), [list, texts, pricing]);
  const sessionOf = (id: string) => sessions.find((s) => s.categoryId === id)!;

  const update = (id: string, patch: Partial<Category>) => setList((l) => l.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const updateService = (c: Category, patch: Partial<ServiceConfig>) => update(c.id, { service: { ...materialize(sessionOf(c.id), c.service), ...c.service, ...patch } });

  const add = () => {
    const label = newLabel.trim();
    if (!label) return;
    let slug = slugify(label) || "category";
    while (list.some((c) => c.slug === slug)) slug = `${slug}-2`;
    let id = slug;
    while (list.some((c) => c.id === id) || RESERVED_IDS.has(id)) id = `${id}-x`;
    setList((l) => [...l, { id, slug, label, description: "", visible: true }]);
    setNewLabel("");
    setOpenId(id);
  };

  const remove = async (c: Category) => {
    const n = counts[c.id] ?? 0;
    const ok = await ask({
      title: `Delete “${c.label}”?`,
      body: n ? (
        <p>
          {n} photo{n === 1 ? "" : "s"} in this category will leave it (photos that are also in another category stay there). No photos are deleted. Its gallery, service page and booking option stop existing after you save and publish.
        </p>
      ) : (
        <p>This category has no photos. Its service page and booking option stop existing after you save and publish.</p>
      ),
      action: "Delete category",
      danger: true,
    });
    if (ok) setList((l) => l.filter((x) => x.id !== c.id));
  };

  const save = () =>
    start(async () => {
      const r = await saveCategoriesAction(list.map((c) => ({ ...c, slug: slugify(c.slug) || c.id, service: c.service ? { ...c.service, slug: c.service.slug ? slugify(c.service.slug) || undefined : undefined } : undefined })));
      if (!r.ok) return toast(r.error, "error");
      toast(r.moved ? `Saved. ${r.moved} photo(s) moved to “No category”.` : "Categories saved as a draft. Preview, then Publish.");
      router.refresh();
    });

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    setList((l) => arrayMove(l, l.findIndex((c) => c.id === e.active.id), l.findIndex((c) => c.id === e.over!.id)));
  };

  return (
    <div className="max-w-4xl space-y-6">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={list.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-3" data-testid="category-list">
            {list.map((c) => (
              <Row
                key={c.id}
                c={c}
                s={sessionOf(c.id)}
                pricing={pricing}
                count={counts[c.id] ?? 0}
                open={openId === c.id}
                onToggle={() => setOpenId((o) => (o === c.id ? null : c.id))}
                onChange={(p) => update(c.id, p)}
                onService={(p) => updateService(c, p)}
                onDelete={() => remove(c)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-ink/25 p-4">
        <Field label="New category" className="min-w-56 flex-1" hint="It gets its own gallery, service page and session-finder option. You can switch any of those off.">
          <input className="field" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder="e.g. Cars, trucks & bikes" data-testid="new-category" />
        </Field>
        <Btn variant="secondary" onClick={add} className="mb-6">
          Add
        </Btn>
      </div>

      <div className="sticky bottom-3 z-20 flex items-center gap-2 rounded-xl border border-line bg-parchment/95 p-3 shadow-md backdrop-blur">
        <Btn onClick={save} disabled={!dirty || busy} data-testid="save-categories">
          {busy ? "Saving…" : "Save categories"}
        </Btn>
        {dirty && (
          <Btn variant="ghost" onClick={() => setList(initial)}>
            Undo changes
          </Btn>
        )}
        <span className="text-sm text-muted">{dirty ? "Unsaved changes." : "Saved changes go live when you Publish."}</span>
      </div>
      {ui}
    </div>
  );
}

function Row({
  c,
  s,
  pricing,
  count,
  open,
  onToggle,
  onChange,
  onService,
  onDelete,
}: {
  c: Category;
  s: SessionType;
  pricing: Pricing;
  count: number;
  open: boolean;
  onToggle: () => void;
  onChange: (p: Partial<Category>) => void;
  onService: (p: Partial<ServiceConfig>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });
  const page = c.service?.enabled !== false;
  const book = c.service?.booking?.show !== false;
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`rounded-2xl border border-line bg-parchment p-4 ${isDragging ? "relative z-10 shadow-xl" : ""}`} data-testid="category-row" data-category={c.id}>
      <div className="flex items-start gap-3">
        <button type="button" {...attributes} {...listeners} className="mt-7 cursor-grab touch-none rounded-lg px-2 py-2 text-muted hover:bg-sand/60" aria-label={`Reorder ${c.label}`}>
          ⠿
        </button>
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input className="field" value={c.label} maxLength={80} onChange={(e) => onChange({ label: e.target.value })} data-testid="category-name" />
          </Field>
          <Field label="Gallery address" hint={`/portfolio/${c.slug || "…"}`}>
            <input className="field" value={c.slug} maxLength={60} onChange={(e) => onChange({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
          </Field>
          <Field label="Short description" className="sm:col-span-2">
            <input className="field" value={c.description} maxLength={300} onChange={(e) => onChange({ description: e.target.value })} />
          </Field>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-12 text-sm">
        <span className="flex flex-wrap items-center gap-2 text-muted">
          {count} photo{count === 1 ? "" : "s"}
          {c.visible && page && <Badge tone="ok">Service page</Badge>}
          {c.visible && book && <Badge tone="ok">Bookable</Badge>}
          <Badge tone="muted">{s.pricingMode === "package" ? "Packages" : "Custom quote"}</Badge>
        </span>
        <span className="flex items-center gap-3">
          <label className="flex min-h-10 items-center gap-2 font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-[var(--color-clay-deep)]" checked={c.visible} onChange={(e) => onChange({ visible: e.target.checked })} />
            Visible
          </label>
          <Btn size="sm" variant="secondary" onClick={onToggle} aria-expanded={open} data-testid="category-setup">
            {open ? "Close setup" : "Service & booking setup"}
          </Btn>
          <Btn size="sm" variant="ghost" onClick={onDelete} className="text-[#8f3226]">
            Delete
          </Btn>
        </span>
      </div>
      {open && <Setup c={c} s={s} pricing={pricing} onService={onService} />}
    </li>
  );
}

const Lines = ({ value, onChange, rows = 4, testId }: { value: string[]; onChange: (v: string[]) => void; rows?: number; testId?: string }) => (
  <textarea className="field" rows={rows} value={value.join("\n")} onChange={(e) => onChange(e.target.value.split("\n"))} onBlur={(e) => onChange(e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))} data-testid={testId} />
);

function Toggle({ checked, onChange, children, testId }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; testId?: string }) {
  return (
    <label className="flex min-h-11 items-start gap-3 rounded-xl border border-line bg-gallery p-3">
      <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-clay-deep)]" checked={checked} onChange={(e) => onChange(e.target.checked)} data-testid={testId} />
      <span className="text-sm">{children}</span>
    </label>
  );
}

/** Everything that makes a category a bookable session: its service page, pricing and session-finder option. */
function Setup({ c, s, pricing, onService }: { c: Category; s: SessionType; pricing: Pricing; onService: (p: Partial<ServiceConfig>) => void }) {
  const page = c.service?.enabled !== false;
  const book = c.service?.booking?.show !== false;
  const chosen = c.service?.packageIds ?? [];
  const quote = { ...s.quote, ...c.service?.quote };
  // Show what's saved (even an empty box while typing); fall back to the resolved value only when nothing is saved.
  const v = <K extends "name" | "navLabel" | "cta" | "headline" | "intro" | "timing" | "seoTitle" | "seoDescription">(k: K) => c.service?.[k] ?? s[k];
  const idealFor = c.service?.idealFor ?? s.idealFor;
  const steps = c.service?.steps ?? s.steps;
  const booking = { ...s.booking, ...c.service?.booking };
  return (
    <div className="mt-5 space-y-8 border-t border-line pt-5 sm:pl-12" data-testid="category-setup-panel">
      {!c.visible && <p className="rounded-lg bg-sand/60 px-3 py-2 text-sm">This category is hidden, so its service page and booking option are hidden too.</p>}

      <section className="grid gap-3 sm:grid-cols-2">
        <Toggle checked={page} onChange={(v) => onService({ enabled: v })} testId="svc-enabled">
          <strong>Has its own service page</strong>
          <span className="block text-muted">Listed on Services, in the footer and the sitemap.</span>
        </Toggle>
        <Toggle checked={book} onChange={(v) => onService({ booking: { ...booking, show: v } })} testId="svc-bookable">
          <strong>Show in the session finder</strong>
          <span className="block text-muted">A choice on the Book page, quick forms and Ask Flick.</span>
        </Toggle>
      </section>

      <section>
        <h3 className="text-[1.15rem]">Pricing</h3>
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="How this category is priced">
          {(
            [
              ["package", "Packages (priced by photos)"],
              ["quote", "Custom quote"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold ${s.pricingMode === v ? "border-ink bg-ink text-gallery" : "border-ink/20 bg-gallery"}`}>
              <input type="radio" className="sr-only" name={`mode-${c.id}`} checked={s.pricingMode === v} onChange={() => onService({ pricingMode: v })} data-testid={`svc-mode-${v}`} />
              {label}
            </label>
          ))}
        </div>
        {s.pricingMode === "package" ? (
          <fieldset className="mt-4">
            <legend className="text-sm font-semibold">Packages offered</legend>
            <p className="text-xs text-muted">None ticked = all packages. Prices are edited in Pricing &amp; text → Pricing.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pricing.packages.map((p) => (
                <label key={p.id} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/20 bg-gallery px-4 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--color-clay-deep)]"
                    checked={chosen.includes(p.id)}
                    onChange={(e) => onService({ packageIds: e.target.checked ? [...chosen, p.id] : chosen.filter((x) => x !== p.id) })}
                  />
                  {p.name} <span className="text-muted">({packagePrice(p)})</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Card heading (pricing page)">
              <input className="field" value={quote.title ?? ""} maxLength={80} onChange={(e) => onService({ quote: { ...quote, title: e.target.value } })} />
            </Field>
            <Field label="Button">
              <input className="field" value={quote.cta ?? ""} maxLength={60} onChange={(e) => onService({ quote: { ...quote, cta: e.target.value } })} />
            </Field>
            <Field label="Custom-quote intro" className="sm:col-span-2" hint="Shown on the pricing page, the service page and in the session finder.">
              <textarea className="field" rows={3} value={quote.intro ?? ""} maxLength={600} onChange={(e) => onService({ quote: { ...quote, intro: e.target.value } })} data-testid="svc-quote-intro" />
            </Field>
            <Field label="What the quote depends on (one per line)">
              <Lines value={quote.factors ?? []} onChange={(v) => onService({ quote: { ...quote, factors: v } })} />
            </Field>
            <Field label="Example estimate (optional)" hint="e.g. “Most car shoots start around $X.” Leave empty to hide.">
              <input className="field" value={quote.exampleEstimate ?? ""} maxLength={160} onChange={(e) => onService({ quote: { ...quote, exampleEstimate: e.target.value || null } })} />
            </Field>
          </div>
        )}
      </section>

      <section>
        <h3 className="text-[1.15rem]">Session finder</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Choice label">
            <input className="field" value={booking.label} maxLength={60} onChange={(e) => onService({ booking: { ...booking, label: e.target.value } })} data-testid="svc-book-label" />
          </Field>
          <Field label="Choice hint">
            <input className="field" value={booking.hint} maxLength={120} onChange={(e) => onService({ booking: { ...booking, hint: e.target.value } })} />
          </Field>
          <Field label="Question in step 2">
            <input className="field" value={booking.groupLabel} maxLength={80} onChange={(e) => onService({ booking: { ...booking, groupLabel: e.target.value } })} />
          </Field>
          <Field label="Example under that question">
            <input className="field" value={booking.groupHint} maxLength={120} onChange={(e) => onService({ booking: { ...booking, groupHint: e.target.value } })} />
          </Field>
        </div>
        <label className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-5 w-5 accent-[var(--color-clay-deep)]" checked={booking.askAnimals} onChange={(e) => onService({ booking: { ...booking, askAnimals: e.target.checked } })} />
          Also ask “Who are the animals?”
        </label>
      </section>

      {page && (
        <section>
          <h3 className="text-[1.15rem]">Service page</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Page address" hint={`/services/${s.slug}`}>
              <input className="field" value={c.service?.slug ?? s.slug} maxLength={60} onChange={(e) => onService({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} data-testid="svc-slug" />
            </Field>
            <Field label="Service name">
              <input className="field" value={v("name")} maxLength={80} onChange={(e) => onService({ name: e.target.value })} data-testid="svc-name" />
            </Field>
            <Field label="Menu label" hint="Used in “Explore …” and “Questions about …”.">
              <input className="field" value={v("navLabel")} maxLength={60} onChange={(e) => onService({ navLabel: e.target.value })} />
            </Field>
            <Field label="Main button">
              <input className="field" value={v("cta")} maxLength={60} onChange={(e) => onService({ cta: e.target.value })} />
            </Field>
            <Field label="Headline" className="sm:col-span-2">
              <input className="field" value={v("headline")} maxLength={200} onChange={(e) => onService({ headline: e.target.value })} data-testid="svc-headline" />
            </Field>
            <Field label="Intro" className="sm:col-span-2">
              <textarea className="field" rows={3} value={v("intro")} maxLength={1200} onChange={(e) => onService({ intro: e.target.value })} data-testid="svc-intro" />
            </Field>
            <Field label="Great for (one per line)">
              <Lines value={idealFor} onChange={(x) => onService({ idealFor: x })} />
            </Field>
            <Field label="Time & pace">
              <textarea className="field" rows={4} value={v("timing")} maxLength={1200} onChange={(e) => onService({ timing: e.target.value })} />
            </Field>
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold">How it works (steps)</legend>
            <ol className="mt-2 space-y-2">
              {steps.map((st, i) => (
                <li key={i} className="grid gap-2 rounded-xl border border-line bg-gallery p-3 sm:grid-cols-[2.2rem_1fr_2fr_auto] sm:items-start">
                  <span className="pt-3 font-display text-clay">{String(i + 1).padStart(2, "0")}</span>
                  <input className="field" aria-label={`Step ${i + 1} title`} value={st.title} maxLength={120} onChange={(e) => onService({ steps: steps.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                  <textarea className="field" aria-label={`Step ${i + 1} text`} rows={2} value={st.body} maxLength={600} onChange={(e) => onService({ steps: steps.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) })} />
                  <Btn size="sm" variant="ghost" className="text-[#8f3226]" disabled={steps.length <= 1} onClick={() => onService({ steps: steps.filter((_, j) => j !== i) })}>
                    Remove
                  </Btn>
                </li>
              ))}
            </ol>
            {steps.length < 8 && (
              <Btn size="sm" variant="secondary" className="mt-2" onClick={() => onService({ steps: [...steps, { title: "New step", body: "" }] })}>
                + Step
              </Btn>
            )}
          </fieldset>

          <details className="mt-5 rounded-xl border border-line bg-gallery p-3">
            <summary className="cursor-pointer text-sm font-semibold">Search engines</summary>
            <div className="mt-3 grid gap-3">
              <Field label="Search engine title">
                <input className="field" value={v("seoTitle")} maxLength={120} onChange={(e) => onService({ seoTitle: e.target.value })} />
              </Field>
              <Field label="Search engine description">
                <textarea className="field" rows={2} value={v("seoDescription")} maxLength={320} onChange={(e) => onService({ seoDescription: e.target.value })} />
              </Field>
            </div>
          </details>
          <p className="mt-3 text-xs text-muted">Questions for this page are added in Pricing &amp; text → FAQs (tick “{s.name}”). Its cover photo is in Site photos.</p>
        </section>
      )}
    </div>
  );
}
