"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveContentAction } from "@/app/admin/cms-actions";
import { packagePrice } from "@/content/pricing";
import type { AdminPhoto } from "@/lib/cms/ops";
import type { Category, Pricing, StoryConfig } from "@/lib/cms/schema";
import { LibraryPicker } from "./LibraryPicker";
import { Btn, Field, useConfirm, useToast } from "./ui";

type Subject = StoryConfig["subjects"][number];
type Feeling = StoryConfig["feelings"][number];

const idFrom = (label: string, taken: string[]) => {
  let id =
    label
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 36) || "choice";
  for (let n = 2; taken.includes(id); n++) id = `${id.replace(/-\d+$/, "")}-${n}`;
  return id;
};

function move<T>(list: T[], i: number, d: -1 | 1) {
  const out = [...list];
  [out[i], out[i + d]] = [out[i + d], out[i]];
  return out;
}

/**
 * Build your story: the buttons visitors tap, what each one leads to (category,
 * suggested package) and the photos it shows. Choices keep their id once made, so
 * shared story links keep working after you rename them.
 */
export function StoryEditor({ initial, defaults, categories, pricing, photos }: { initial: StoryConfig; defaults: StoryConfig; categories: Category[]; pricing: Pricing; photos: AdminPhoto[] }) {
  const router = useRouter();
  const toast = useToast();
  const { ask, ui } = useConfirm();
  const [busy, start] = useTransition();
  const [s, setS] = useState(initial);
  const [picking, setPicking] = useState<{ kind: "subjects" | "feelings"; i: number } | null>(null);
  const dirty = JSON.stringify(s) !== JSON.stringify(initial);

  const setSubject = (i: number, patch: Partial<Subject>) => setS((x) => ({ ...x, subjects: x.subjects.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));
  const setFeeling = (i: number, patch: Partial<Feeling>) => setS((x) => ({ ...x, feelings: x.feelings.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));

  const save = () =>
    start(async () => {
      const clean: StoryConfig = {
        subjects: s.subjects.map((x) => ({ ...x, label: x.label.trim() || "Untitled" })),
        feelings: s.feelings.map((x) => ({ ...x, label: x.label.trim() || "Untitled" })),
        seasons: s.seasons.filter((x) => x.label.trim()),
      };
      const r = await saveContentAction("story", clean);
      if (!r.ok) return toast(r.error, "error");
      toast("Saved as a draft. Preview, then Publish.");
      router.refresh();
    });

  const reset = async () => {
    if (await ask({ title: "Go back to the original choices?", body: <p>This replaces the editor with the site&apos;s original story choices. Nothing is saved until you press Save.</p>, action: "Load originals" })) setS(defaults);
  };

  const photoById = (id: string) => photos.find((p) => p.id === id);
  const PhotoRow = ({ ids, onChange, onAdd, hint }: { ids: string[]; onChange: (ids: string[]) => void; onAdd: () => void; hint: string }) => (
    <div>
      <p className="text-sm font-semibold">Photos</p>
      <p className="text-xs text-muted">{hint}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {ids.map((id) => {
          const p = photoById(id);
          return (
            <li key={id} className="relative h-16 w-16 overflow-hidden rounded-lg bg-sand">
              {p ? <Image src={p.url} alt="" fill sizes="64px" quality={55} className="object-cover" style={{ objectPosition: `${p.state.focal.dx}% ${p.state.focal.dy}%` }} /> : <span className="grid h-full place-items-center text-[0.6rem] text-muted">Deleted</span>}
              <button type="button" onClick={() => onChange(ids.filter((x) => x !== id))} className="absolute right-0.5 top-0.5 grid h-6 w-6 place-items-center rounded-full bg-ink/80 text-xs text-gallery" aria-label="Remove photo">
                ×
              </button>
            </li>
          );
        })}
        {ids.length < 12 && (
          <li>
            <button type="button" onClick={onAdd} className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-ink/30 text-2xl text-muted hover:border-ink" aria-label="Add a photo" data-testid="story-add-photo">
              +
            </button>
          </li>
        )}
      </ul>
    </div>
  );

  const Controls = ({ i, n, onMove, onRemove, label }: { i: number; n: number; onMove: (d: -1 | 1) => void; onRemove: () => void; label: string }) => (
    <div className="flex gap-1">
      <Btn size="sm" variant="ghost" disabled={i === 0} onClick={() => onMove(-1)} aria-label={`Move ${label} up`}>
        ↑
      </Btn>
      <Btn size="sm" variant="ghost" disabled={i === n - 1} onClick={() => onMove(1)} aria-label={`Move ${label} down`}>
        ↓
      </Btn>
      <Btn size="sm" variant="ghost" className="text-[#8f3226]" disabled={n <= 1} onClick={onRemove}>
        Remove
      </Btn>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-12">
      <section>
        <h2 className="text-[1.4rem]">Question 1 buttons: who or what</h2>
        <p className="mt-1 text-sm text-muted">Each button leads to a category (its booking path and photos) and can suggest a package.</p>
        <ul className="mt-4 space-y-3" data-testid="story-subjects">
          {s.subjects.map((x, i) => {
            const cat = categories.find((c) => c.id === x.categoryId);
            return (
              <li key={x.id} className="space-y-3 rounded-2xl border border-line bg-parchment p-4" data-testid="story-subject">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-xs text-muted">Button {i + 1}</p>
                  <Controls i={i} n={s.subjects.length} label={x.label} onMove={(d) => setS((v) => ({ ...v, subjects: move(v.subjects, i, d) }))} onRemove={() => setS((v) => ({ ...v, subjects: v.subjects.filter((_, j) => j !== i) }))} />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Button text">
                    <input className="field" value={x.label} maxLength={60} onChange={(e) => setSubject(i, { label: e.target.value })} data-testid="story-subject-label" />
                  </Field>
                  <Field label="Leads to category">
                    <select className="field" value={x.categoryId ?? ""} onChange={(e) => setSubject(i, { categoryId: e.target.value || null })} data-testid="story-subject-category">
                      <option value="">Something else (custom quote)</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                          {c.visible ? "" : " (hidden)"}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Suggested package" hint={cat && cat.service?.pricingMode === "quote" ? "This category is custom-quoted, so no package is shown." : undefined}>
                    <select className="field" value={x.pkg ?? ""} onChange={(e) => setSubject(i, { pkg: e.target.value || null })}>
                      <option value="">None (custom quote)</option>
                      {pricing.packages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({packagePrice(p)})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Card title words" hint="“Golden hour ___”, e.g. family portraits">
                    <input className="field" value={x.noun} maxLength={60} onChange={(e) => setSubject(i, { noun: e.target.value })} />
                  </Field>
                  <Field label="Prep tip" className="sm:col-span-2">
                    <textarea className="field" rows={2} value={x.tip} maxLength={400} onChange={(e) => setSubject(i, { tip: e.target.value })} />
                  </Field>
                </div>
                <PhotoRow ids={x.photoIds} onChange={(ids) => setSubject(i, { photoIds: ids })} onAdd={() => setPicking({ kind: "subjects", i })} hint="Shown when this button is picked. Leave empty to use the category's photos." />
              </li>
            );
          })}
        </ul>
        {s.subjects.length < 16 && (
          <Btn
            className="mt-3"
            size="sm"
            variant="secondary"
            data-testid="story-add-subject"
            onClick={() => setS((v) => ({ ...v, subjects: [...v.subjects, { id: idFrom("new choice", v.subjects.map((x) => x.id)), label: "New choice", categoryId: categories[0]?.id ?? null, pkg: null, noun: "", tip: "", photoIds: [] }] }))}
          >
            + Button
          </Btn>
        )}
      </section>

      <section>
        <h2 className="text-[1.4rem]">Question 2 buttons: the feel</h2>
        <ul className="mt-4 space-y-3">
          {s.feelings.map((x, i) => (
            <li key={x.id} className="space-y-3 rounded-2xl border border-line bg-parchment p-4" data-testid="story-feeling">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-xs text-muted">Button {i + 1}</p>
                <Controls i={i} n={s.feelings.length} label={x.label} onMove={(d) => setS((v) => ({ ...v, feelings: move(v.feelings, i, d) }))} onRemove={() => setS((v) => ({ ...v, feelings: v.feelings.filter((_, j) => j !== i) }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Button text">
                  <input className="field" value={x.label} maxLength={60} onChange={(e) => setFeeling(i, { label: e.target.value })} />
                </Field>
                <Field label="Describes the session as…" hint="“A ___ session”" className="sm:col-span-2">
                  <input className="field" value={x.line} maxLength={160} onChange={(e) => setFeeling(i, { line: e.target.value })} />
                </Field>
                <Field label="Prep tip" className="sm:col-span-3">
                  <textarea className="field" rows={2} value={x.tip} maxLength={400} onChange={(e) => setFeeling(i, { tip: e.target.value })} />
                </Field>
              </div>
              <PhotoRow ids={x.photoIds} onChange={(ids) => setFeeling(i, { photoIds: ids })} onAdd={() => setPicking({ kind: "feelings", i })} hint="Shown first when this feel is picked (optional)." />
            </li>
          ))}
        </ul>
        {s.feelings.length < 12 && (
          <Btn className="mt-3" size="sm" variant="secondary" onClick={() => setS((v) => ({ ...v, feelings: [...v.feelings, { id: idFrom("new feel", v.feelings.map((x) => x.id)), label: "New feel", line: "", tip: "", photoIds: [] }] }))}>
            + Button
          </Btn>
        )}
      </section>

      <section>
        <h2 className="text-[1.4rem]">Timing choices</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {s.seasons.map((x, i) => (
            <li key={x.id} className="flex items-center gap-2">
              <input className="field" aria-label={`Timing choice ${i + 1}`} value={x.label} maxLength={60} onChange={(e) => setS((v) => ({ ...v, seasons: v.seasons.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)) }))} />
              <Btn size="sm" variant="ghost" className="text-[#8f3226]" onClick={() => setS((v) => ({ ...v, seasons: v.seasons.filter((_, j) => j !== i) }))}>
                Remove
              </Btn>
            </li>
          ))}
        </ul>
        {s.seasons.length < 12 && (
          <Btn className="mt-3" size="sm" variant="secondary" onClick={() => setS((v) => ({ ...v, seasons: [...v.seasons, { id: idFrom("timing", v.seasons.map((x) => x.id)), label: "New timing" }] }))}>
            + Timing
          </Btn>
        )}
      </section>

      <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-parchment/95 p-3 shadow-md backdrop-blur">
        <Btn onClick={save} disabled={!dirty || busy} data-testid="save-story">
          {busy ? "Saving…" : "Save draft"}
        </Btn>
        {dirty && (
          <Btn variant="ghost" onClick={() => setS(initial)}>
            Undo changes
          </Btn>
        )}
        <Btn variant="ghost" onClick={reset}>
          Load original choices
        </Btn>
        <span className="text-sm text-muted">The questions and button wording around them are in Pricing &amp; text → Page text → Build your story.</span>
      </div>

      <LibraryPicker
        key={picking ? `${picking.kind}-${picking.i}` : "closed"}
        open={Boolean(picking)}
        onClose={() => setPicking(null)}
        photos={photos}
        categories={categories}
        preferCategory={picking?.kind === "subjects" ? (s.subjects[picking.i]?.categoryId ?? null) : null}
        title="Add a photo to this choice"
        onPick={(id) => {
          if (!picking) return;
          if (picking.kind === "subjects") {
            const cur = s.subjects[picking.i].photoIds;
            if (!cur.includes(id)) setSubject(picking.i, { photoIds: [...cur, id].slice(0, 12) });
          } else {
            const cur = s.feelings[picking.i].photoIds;
            if (!cur.includes(id)) setFeeling(picking.i, { photoIds: [...cur, id].slice(0, 12) });
          }
          setPicking(null);
        }}
      />
      {ui}
    </div>
  );
}
