"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveContentAction } from "@/app/admin/cms-actions";
import type { Faq, Pricing, Testimonial, Texts } from "@/lib/cms/schema";
import { TEXT_FIELDS } from "@/lib/cms/texts";
import { Btn, dollars, Field, toCents, useConfirm, useToast } from "./ui";

type Tab = "pricing" | "texts" | "faqs" | "testimonials";
const TABS: { id: Tab; label: string }[] = [
  { id: "pricing", label: "Pricing" },
  { id: "texts", label: "All site text" },
  { id: "faqs", label: "FAQs" },
  { id: "testimonials", label: "Testimonials" },
];

export function ContentEditor({ pricing, texts, faqs, testimonials, services }: { pricing: Pricing; texts: Texts; faqs: Faq[]; testimonials: Testimonial[]; services: { slug: string; name: string }[] }) {
  const [tab, setTab] = useState<Tab>("pricing");
  return (
    <div>
      <div role="tablist" aria-label="Content" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`min-h-11 rounded-full border px-5 font-semibold ${tab === t.id ? "border-ink bg-ink text-gallery" : "border-ink/20 hover:border-ink/50"}`} data-testid={`tab-${t.id}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-8" role="tabpanel">
        {tab === "pricing" && <PricingEditor key={JSON.stringify(pricing)} initial={pricing} />}
        {tab === "texts" && <TextsEditor key={JSON.stringify([texts, pricing])} initial={texts} pricing={pricing} />}
        {tab === "faqs" && <FaqEditor key={JSON.stringify(faqs)} initial={faqs} services={services} />}
        {tab === "testimonials" && <TestimonialEditor key={JSON.stringify(testimonials)} initial={testimonials} />}
      </div>
    </div>
  );
}

function useSave<T>(key: Tab, value: T, initial: T) {
  const router = useRouter();
  const toast = useToast();
  const [busy, start] = useTransition();
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);
  const save = () =>
    start(async () => {
      const r = await saveContentAction(key, value);
      if (!r.ok) return toast(r.error, "error");
      toast("Saved as a draft. Preview, then Publish.");
      router.refresh();
    });
  const bar = (
    <div className="sticky bottom-3 z-20 mt-8 flex items-center gap-3 rounded-xl border border-line bg-parchment/95 p-3 shadow-md backdrop-blur">
      <Btn onClick={save} disabled={!dirty || busy} data-testid={`save-${key}`}>
        {busy ? "Saving…" : "Save draft"}
      </Btn>
      <span className="text-sm text-muted">{dirty ? "You have unsaved edits on this tab." : "No unsaved edits."}</span>
    </div>
  );
  return { bar };
}

const Lines = ({ value, onChange, rows = 4 }: { value: string[]; onChange: (v: string[]) => void; rows?: number }) => (
  <textarea className="field" rows={rows} value={value.join("\n")} onChange={(e) => onChange(e.target.value.split("\n"))} onBlur={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} />
);

const Money = ({ cents, onChange, allowEmpty = false }: { cents: number | null; onChange: (c: number | null) => void; allowEmpty?: boolean }) => (
  <span className="relative block">
    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
    <input className="field !pl-8" inputMode="decimal" value={dollars(cents)} onChange={(e) => onChange(allowEmpty && e.target.value.trim() === "" ? null : toCents(e.target.value))} placeholder={allowEmpty ? "Quote" : "0"} />
  </span>
);

/* ------------------------------------------------------------------ pricing */

function PricingEditor({ initial }: { initial: Pricing }) {
  const [p, setP] = useState(initial);
  const { bar } = useSave("pricing", p, initial);
  const pkg = (i: number, patch: Partial<Pricing["packages"][number]>) => setP((x) => ({ ...x, packages: x.packages.map((k, j) => (j === i ? { ...k, ...patch } : k)) }));
  const addOn = (i: number, patch: Partial<Pricing["addOns"][number]>) => setP((x) => ({ ...x, addOns: x.addOns.map((k, j) => (j === i ? { ...k, ...patch } : k)) }));
  const custom = (k: keyof Pricing["custom"], patch: Partial<Pricing["custom"]["weddings-events"]>) => setP((x) => ({ ...x, custom: { ...x.custom, [k]: { ...x.custom[k], ...patch } } }));

  return (
    <div className="max-w-4xl space-y-10">
      <label className="flex items-start gap-3 rounded-xl border border-line bg-parchment p-4">
        <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--color-clay-deep)]" checked={p.status === "confirmed"} onChange={(e) => setP({ ...p, status: e.target.checked ? "confirmed" : "draft" })} />
        <span>
          <strong>These prices are final</strong>
          <span className="block text-sm text-muted">Clears the “prices not confirmed” launch check. Booking estimates always use these numbers.</span>
        </span>
      </label>

      <section>
        <h2 className="text-[1.4rem]">Portrait packages</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {p.packages.map((k, i) => (
            <div key={k.id} className="space-y-3 rounded-2xl border border-line bg-parchment p-4">
              <Field label="Name">
                <input className="field" value={k.name} onChange={(e) => pkg(i, { name: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price">
                  <Money cents={k.priceCents} onChange={(c) => pkg(i, { priceCents: c ?? 0 })} />
                </Field>
                <Field label="Photos">
                  <input className="field" type="number" min={1} value={k.photos} onChange={(e) => pkg(i, { photos: Math.max(1, Number(e.target.value) || 1) })} data-testid={`pkg-photos-${i}`} />
                </Field>
              </div>
              <Field label="Summary">
                <textarea className="field" rows={2} value={k.summary} onChange={(e) => pkg(i, { summary: e.target.value })} />
              </Field>
              <Field label="Included (one per line)">
                <Lines value={k.features} onChange={(v) => pkg(i, { features: v })} />
              </Field>
              <Field label="Badge (optional)" hint="e.g. Most popular">
                <input className="field" value={k.highlightLabel ?? ""} onChange={(e) => pkg(i, { highlightLabel: e.target.value || undefined })} />
              </Field>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-[12rem_1fr]">
          <Field label="Extra photos, each">
            <Money cents={p.extraPhoto.priceCents} onChange={(c) => setP({ ...p, extraPhoto: { ...p.extraPhoto, priceCents: c ?? 0 } })} />
          </Field>
          <Field label="Extra photo note">
            <input className="field" value={p.extraPhoto.note} onChange={(e) => setP({ ...p, extraPhoto: { ...p.extraPhoto, note: e.target.value } })} />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="text-[1.4rem]">Add-ons</h2>
        <ul className="mt-4 space-y-3">
          {p.addOns.map((a, i) => (
            <li key={a.id} className="grid gap-3 rounded-xl border border-line bg-parchment p-4 sm:grid-cols-[1fr_2fr_9rem_7rem_auto]">
              <Field label="Name">
                <input className="field" value={a.name} onChange={(e) => addOn(i, { name: e.target.value })} />
              </Field>
              <Field label="Description">
                <input className="field" value={a.description} onChange={(e) => addOn(i, { description: e.target.value })} />
              </Field>
              <Field label="Price">
                <Money cents={a.priceCents} allowEmpty onChange={(c) => addOn(i, { priceCents: c })} />
              </Field>
              <Field label="Per">
                <select className="field" value={a.unit ?? "flat"} onChange={(e) => addOn(i, { unit: e.target.value as "each" | "flat" })}>
                  <option value="flat">flat</option>
                  <option value="each">each</option>
                </select>
              </Field>
              <Btn size="sm" variant="ghost" className="self-end text-[#8f3226]" onClick={() => setP({ ...p, addOns: p.addOns.filter((_, j) => j !== i) })}>
                Remove
              </Btn>
            </li>
          ))}
        </ul>
        {p.addOns.length < 8 && (
          <Btn className="mt-3" size="sm" variant="secondary" onClick={() => setP({ ...p, addOns: [...p.addOns, { id: `addon-${Date.now().toString(36)}`, name: "New add-on", description: "", priceCents: null, unit: "flat" }] })}>
            + Add-on
          </Btn>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {(["weddings-events", "business-branding"] as const).map((k) => (
          <div key={k} className="space-y-3 rounded-2xl border border-line bg-parchment p-4">
            <h2 className="text-[1.2rem]">{p.custom[k].label} (custom quotes)</h2>
            <Field label="Intro">
              <textarea className="field" rows={3} value={p.custom[k].intro} onChange={(e) => custom(k, { intro: e.target.value })} />
            </Field>
            <Field label="What affects the quote (one per line)">
              <Lines value={p.custom[k].factors} onChange={(v) => custom(k, { factors: v })} />
            </Field>
            <Field label="Example estimate (optional)">
              <input className="field" value={p.custom[k].exampleEstimate ?? ""} onChange={(e) => custom(k, { exampleEstimate: e.target.value || null })} />
            </Field>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-[1.2rem]">Travel</h2>
          <Field label="Miles included (leave empty if not set)">
            <input className="field" inputMode="numeric" value={p.travel.includedRadiusMiles ?? ""} onChange={(e) => setP({ ...p, travel: { ...p.travel, includedRadiusMiles: e.target.value ? Math.max(0, Number(e.target.value) || 0) : null } })} />
          </Field>
          <Field label="Travel wording">
            <textarea className="field" rows={3} value={p.travel.copy} onChange={(e) => setP({ ...p, travel: { ...p.travel, copy: e.target.value } })} />
          </Field>
        </div>
        <div className="space-y-3">
          <h2 className="text-[1.2rem]">Deposit</h2>
          <label className="flex min-h-11 items-center gap-2 font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-[var(--color-clay-deep)]" checked={p.deposit.enabled} onChange={(e) => setP({ ...p, deposit: { ...p.deposit, enabled: e.target.checked } })} />
            Ask for a deposit to hold a date
          </label>
          <Field label="Deposit amount">
            <Money cents={p.deposit.amountCents} allowEmpty onChange={(c) => setP({ ...p, deposit: { ...p.deposit, amountCents: c } })} />
          </Field>
          <Field label="Deposit wording">
            <textarea className="field" rows={2} value={p.deposit.copy} onChange={(e) => setP({ ...p, deposit: { ...p.deposit, copy: e.target.value } })} />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[1.2rem]">“No stopwatch” promise</h2>
        <Field label="Headline">
          <input className="field" value={p.noStopwatch.headline} onChange={(e) => setP({ ...p, noStopwatch: { ...p.noStopwatch, headline: e.target.value } })} />
        </Field>
        <Field label="Body">
          <textarea className="field" rows={3} value={p.noStopwatch.body} onChange={(e) => setP({ ...p, noStopwatch: { ...p.noStopwatch, body: e.target.value } })} />
        </Field>
        <Field label="Reasonable boundaries">
          <textarea className="field" rows={3} value={p.noStopwatch.boundaries} onChange={(e) => setP({ ...p, noStopwatch: { ...p.noStopwatch, boundaries: e.target.value } })} />
        </Field>
        <Field label="Editing & revision policy">
          <textarea className="field" rows={3} value={p.revisionPolicy} onChange={(e) => setP({ ...p, revisionPolicy: e.target.value })} />
        </Field>
        <Field label="Small print under prices">
          <textarea className="field" rows={2} value={p.legalNote} onChange={(e) => setP({ ...p, legalNote: e.target.value })} />
        </Field>
      </section>
      {bar}
    </div>
  );
}

/* ------------------------------------------------------------------ page text */

const GROUPS = [...new Set(TEXT_FIELDS.map((f) => f.group))];
const DEFAULTS = Object.fromEntries(TEXT_FIELDS.map((f) => [f.key, f.default]));

/**
 * Wording that belongs to your pricing (the "no stopwatch" promise, travel,
 * deposit, small print, custom quotes). It's stored once, with your pricing,
 * and shown here on every page where it appears, so it can be edited from
 * either tab. `after` places it next to the text around it on that page.
 */
type CustomKey = "weddings-events" | "business-branding";
interface PriceField {
  id: string;
  label: string;
  places: { group: string; after?: string }[];
  multiline?: boolean;
  list?: boolean;
  get: (p: Pricing) => string;
  set: (p: Pricing, v: string) => Pricing;
}
const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);
const customFields = (k: CustomKey, name: string): PriceField[] => [
  {
    id: `custom.${k}.intro`,
    label: `${name}: custom-quote intro`,
    places: [{ group: "Pricing page" }, { group: k === "weddings-events" ? "Service: Weddings & Events" : "Service: Business & Branding" }],
    multiline: true,
    get: (p) => p.custom[k].intro,
    set: (p, v) => ({ ...p, custom: { ...p.custom, [k]: { ...p.custom[k], intro: v } } }),
  },
  {
    id: `custom.${k}.factors`,
    label: `${name}: what the quote depends on (one per line)`,
    places: [{ group: "Pricing page" }, { group: k === "weddings-events" ? "Service: Weddings & Events" : "Service: Business & Branding" }],
    multiline: true,
    list: true,
    get: (p) => p.custom[k].factors.join("\n"),
    set: (p, v) => ({ ...p, custom: { ...p.custom, [k]: { ...p.custom[k], factors: lines(v) } } }),
  },
  {
    id: `custom.${k}.example`,
    label: `${name}: example estimate (optional)`,
    places: [{ group: "Pricing page" }],
    get: (p) => p.custom[k].exampleEstimate ?? "",
    set: (p, v) => ({ ...p, custom: { ...p.custom, [k]: { ...p.custom[k], exampleEstimate: v.trim() ? v : null } } }),
  },
];
const PRICE_FIELDS: PriceField[] = [
  {
    id: "noStopwatch.headline",
    label: "Pricing headline (homepage pricing section, pricing page, service pages)",
    places: [{ group: "Homepage", after: "home.pricing.eyebrow" }, { group: "Pricing page", after: "pricing.eyebrow" }, { group: "Every service page (shared wording)", after: "service.pricingEyebrow" }],
    get: (p) => p.noStopwatch.headline,
    set: (p, v) => ({ ...p, noStopwatch: { ...p.noStopwatch, headline: v } }),
  },
  {
    id: "noStopwatch.body",
    label: "“No stopwatch” promise: paragraph (homepage, pricing page, Our approach)",
    places: [{ group: "Homepage", after: "home.promise.accent" }, { group: "Pricing page", after: "pricing.unhurried.title" }, { group: "Our approach page", after: "experience.time.title" }],
    multiline: true,
    get: (p) => p.noStopwatch.body,
    set: (p, v) => ({ ...p, noStopwatch: { ...p.noStopwatch, body: v } }),
  },
  {
    id: "noStopwatch.boundaries",
    label: "“No stopwatch” promise: the fine print (homepage, pricing page, Our approach)",
    places: [{ group: "Homepage", after: "home.promise.accent" }, { group: "Pricing page", after: "pricing.unhurried.title" }, { group: "Our approach page", after: "experience.time.title" }],
    multiline: true,
    get: (p) => p.noStopwatch.boundaries,
    set: (p, v) => ({ ...p, noStopwatch: { ...p.noStopwatch, boundaries: v } }),
  },
  {
    id: "revisionPolicy",
    label: "Editing & revisions (pricing page dark panel)",
    places: [{ group: "Pricing page", after: "pricing.unhurried.title" }],
    multiline: true,
    get: (p) => p.revisionPolicy,
    set: (p, v) => ({ ...p, revisionPolicy: v }),
  },
  {
    id: "extraPhoto.note",
    label: "Extra photos box: note after the price",
    places: [{ group: "Pricing page", after: "pricing.extraTitle" }],
    get: (p) => p.extraPhoto.note,
    set: (p, v) => ({ ...p, extraPhoto: { ...p.extraPhoto, note: v } }),
  },
  {
    id: "travel.copy",
    label: "Travel paragraph (homepage, pricing page, service area page)",
    places: [{ group: "Homepage", after: "home.areas.nearby" }, { group: "Pricing page", after: "pricing.travelTitle" }, { group: "Service area page", after: "locations.travelTitle" }],
    multiline: true,
    get: (p) => p.travel.copy,
    set: (p, v) => ({ ...p, travel: { ...p.travel, copy: v } }),
  },
  {
    id: "legalNote",
    label: "Small print under the packages",
    places: [{ group: "Pricing page", after: "pricing.deliveryTitle" }],
    multiline: true,
    get: (p) => p.legalNote,
    set: (p, v) => ({ ...p, legalNote: v }),
  },
  {
    id: "deposit.copy",
    label: "Deposit line (shown when a deposit is turned on)",
    places: [{ group: "Pricing page", after: "pricing.custom.businessCta" }],
    get: (p) => p.deposit.copy,
    set: (p, v) => ({ ...p, deposit: { ...p.deposit, copy: v } }),
  },
  ...customFields("weddings-events", "Weddings & events"),
  ...customFields("business-branding", "Business & branding"),
];

type Row = { kind: "text"; key: string; group: string; label: string; hint?: string; multiline?: boolean } | { kind: "price"; key: string; group: string; label: string; hint?: string; multiline?: boolean; field: PriceField };

/** Every editable row for a page, in page order, with pricing wording slotted in beside its neighbours. */
function rowsFor(group: string): Row[] {
  const out: Row[] = [];
  const price = PRICE_FIELDS.flatMap((pf) => pf.places.filter((pl) => pl.group === group).map((pl) => ({ pf, after: pl.after })));
  const priceRow = (pf: PriceField): Row => ({ kind: "price", key: `pricing:${pf.id}`, group, label: pf.label, multiline: pf.multiline, field: pf, hint: `Shared with the Pricing tab${pf.list ? ". One per line." : "."}` });
  for (const f of TEXT_FIELDS.filter((x) => x.group === group)) {
    out.push({ kind: "text", key: f.key, group, label: f.label, hint: f.hint, multiline: f.multiline });
    for (const x of price.filter((x) => x.after === f.key)) out.push(priceRow(x.pf));
  }
  for (const x of price.filter((x) => !x.after || !TEXT_FIELDS.some((f) => f.key === x.after && f.group === group))) out.push(priceRow(x.pf));
  return out;
}
const ALL_ROWS: Row[] = (() => {
  const seen = new Set<string>();
  return GROUPS.flatMap(rowsFor).filter((r) => (seen.has(r.key) ? false : (seen.add(r.key), true)));
})();

/** Only store what differs from the original wording; an empty box means "use the original". */
function overridesOf(values: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const f of TEXT_FIELDS) {
    const v = (values[f.key] ?? "").trim();
    if (v && v !== f.default.trim()) out[f.key] = values[f.key];
  }
  return out;
}

function pricingFrom(base: Pricing, values: Record<string, string>) {
  return PRICE_FIELDS.reduce((p, pf) => {
    const v = values[`pricing:${pf.id}`];
    return v === undefined || v === pf.get(base) ? p : pf.set(p, v);
  }, base);
}

function TextsEditor({ initial, pricing }: { initial: Texts; pricing: Pricing }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, start] = useTransition();
  const startValues = {
    ...Object.fromEntries(TEXT_FIELDS.map((f) => [f.key, initial[f.key]?.trim() ? initial[f.key] : f.default])),
    ...Object.fromEntries(PRICE_FIELDS.map((pf) => [`pricing:${pf.id}`, pf.get(pricing)])),
  };
  const [values, setValues] = useState<Record<string, string>>(startValues);
  const [group, setGroup] = useState(GROUPS.includes("Homepage") ? "Homepage" : GROUPS[0]);
  const [q, setQ] = useState("");
  const overrides = overridesOf(values);
  const nextPricing = pricingFrom(pricing, values);
  const textsDirty = JSON.stringify(overrides) !== JSON.stringify(overridesOf(startValues));
  const pricingDirty = JSON.stringify(nextPricing) !== JSON.stringify(pricing);
  const dirty = textsDirty || pricingDirty;
  const isEdited = (r: Row) => (r.kind === "text" ? overrides[r.key] !== undefined : values[r.key] !== r.field.get(pricing));
  const original = (r: Row) => (r.kind === "text" ? DEFAULTS[r.key] : r.field.get(pricing));

  const query = q.trim().toLowerCase();
  const shown = query ? ALL_ROWS.filter((r) => `${r.group} ${r.label} ${values[r.key]}`.toLowerCase().includes(query)) : rowsFor(group);
  const editedIn = (g: string) => rowsFor(g).filter((r) => r.kind === "text" && overrides[r.key] !== undefined).length;

  const save = () =>
    start(async () => {
      if (pricingDirty) {
        const r = await saveContentAction("pricing", nextPricing);
        if (!r.ok) return toast(r.error, "error");
      }
      if (textsDirty) {
        const r = await saveContentAction("texts", overrides);
        if (!r.ok) return toast(r.error, "error");
      }
      toast("Saved as a draft. Preview, then Publish.");
      router.refresh();
    });

  return (
    <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-16 lg:self-start">
        <input className="field" type="search" placeholder="Search all text…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search all site text" data-testid="text-search" />
        <label className="mt-3 block lg:hidden">
          <span className="sr-only">Page</span>
          <select className="field" value={group} onChange={(e) => (setGroup(e.target.value), setQ(""))}>
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <nav aria-label="Pages" className="mt-3 hidden max-h-[70vh] overflow-y-auto pr-1 lg:block">
          <ul className="space-y-0.5 text-sm">
            {GROUPS.map((g) => {
              const n = editedIn(g);
              return (
                <li key={g}>
                  <button
                    type="button"
                    onClick={() => (setGroup(g), setQ(""))}
                    aria-current={!query && g === group ? "true" : undefined}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left ${!query && g === group ? "bg-ink text-gallery" : "hover:bg-sand/50"}`}
                  >
                    <span>{g}</span>
                    {n > 0 && <span className={`rounded-full px-1.5 text-[0.7rem] font-bold ${!query && g === group ? "bg-gallery text-ink" : "bg-clay-deep text-gallery"}`}>{n}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0 space-y-5">
        <div>
          <h2 className="text-[1.5rem]">{query ? `Results for “${q.trim()}”` : group}</h2>
          <p className="mt-1 text-sm text-muted">
            Edit any box and save. <strong>Reset</strong> puts back the wording you started with. In the homepage headline, the last word is set in italic clay. Category names and descriptions are edited under <em>Categories</em>; prices and photo counts under <em>Pricing</em>; questions under <em>FAQs</em>.
          </p>
        </div>
        {shown.length === 0 && <p className="text-muted">Nothing matches that search.</p>}
        {shown.map((r) => {
          const edited = isEdited(r);
          return (
            <div key={`${r.group}-${r.key}`} className="rounded-xl border border-line bg-parchment p-4" data-testid={`text-row-${r.key}`}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor={`tx-${r.group}-${r.key}`} className="text-sm font-semibold">
                  {query && <span className="font-normal text-muted">{r.group} · </span>}
                  {r.label}
                  {edited && <span className="ml-2 rounded-full bg-clay-deep px-1.5 py-0.5 text-[0.65rem] font-bold uppercase text-gallery">Edited</span>}
                </label>
                {edited && (
                  <button type="button" className="shrink-0 text-xs font-semibold underline" onClick={() => setValues((v) => ({ ...v, [r.key]: original(r) }))}>
                    Reset
                  </button>
                )}
              </div>
              {r.multiline ? (
                <textarea
                  id={`tx-${r.group}-${r.key}`}
                  className="field"
                  rows={Math.min(18, Math.max(3, Math.ceil((values[r.key] ?? "").length / 80) + (values[r.key] ?? "").split("\n").length))}
                  value={values[r.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [r.key]: e.target.value }))}
                  data-testid={`text-${r.key}`}
                />
              ) : (
                <input id={`tx-${r.group}-${r.key}`} className="field" value={values[r.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [r.key]: e.target.value }))} data-testid={`text-${r.key}`} />
              )}
              {r.hint && <p className="mt-1 text-xs text-muted">{r.hint}</p>}
            </div>
          );
        })}
        <div className="sticky bottom-3 z-20 mt-8 flex items-center gap-3 rounded-xl border border-line bg-parchment/95 p-3 shadow-md backdrop-blur">
          <Btn onClick={save} disabled={!dirty || busy} data-testid="save-texts">
            {busy ? "Saving…" : "Save draft"}
          </Btn>
          <span className="text-sm text-muted">{dirty ? "You have unsaved edits." : "No unsaved edits."}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ FAQs */

const TOPICS: Faq["topic"][] = ["session", "pricing", "animals", "events", "delivery", "rights"];

function FaqEditor({ initial, services }: { initial: Faq[]; services: { slug: string; name: string }[] }) {
  const [list, setList] = useState(initial);
  const { bar } = useSave("faqs", list, initial);
  const { ask, ui } = useConfirm();
  const up = (i: number, patch: Partial<Faq>) => setList((l) => l.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i: number, d: -1 | 1) =>
    setList((l) => {
      const n = [...l];
      const j = i + d;
      if (j < 0 || j >= n.length) return l;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  return (
    <div className="max-w-4xl space-y-4">
      {list.map((f, i) => (
        <div key={f.id} className="rounded-2xl border border-line bg-parchment p-4" data-testid="faq-row">
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
            <Field label="Question">
              <input className="field" value={f.q} onChange={(e) => up(i, { q: e.target.value })} />
            </Field>
            <Field label="Topic">
              <select className="field" value={f.topic} onChange={(e) => up(i, { topic: e.target.value as Faq["topic"] })}>
                {TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Answer" className="mt-3">
            <textarea className="field" rows={3} value={f.a} onChange={(e) => up(i, { a: e.target.value })} />
          </Field>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <span className="font-semibold">Show on:</span>
            <label className="flex min-h-10 items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-[var(--color-clay-deep)]" checked={f.faqPage} onChange={(e) => up(i, { faqPage: e.target.checked })} />
              FAQ page
            </label>
            <label className="flex min-h-10 items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-[var(--color-clay-deep)]" checked={f.home} onChange={(e) => up(i, { home: e.target.checked })} />
              Homepage
            </label>
            {services.map((s) => (
              <label key={s.slug} className="flex min-h-10 items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-[var(--color-clay-deep)]" checked={f.services.includes(s.slug)} onChange={(e) => up(i, { services: e.target.checked ? [...f.services, s.slug] : f.services.filter((x) => x !== s.slug) })} />
                {s.name}
              </label>
            ))}
            <span className="ml-auto flex gap-1">
              <Btn size="sm" variant="ghost" onClick={() => move(i, -1)} aria-label="Move up">
                ↑
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => move(i, 1)} aria-label="Move down">
                ↓
              </Btn>
              <Btn size="sm" variant="ghost" className="text-[#8f3226]" onClick={async () => (await ask({ title: "Remove this question?", body: <p>{f.q}</p>, action: "Remove", danger: true })) && setList((l) => l.filter((_, j) => j !== i))}>
                Remove
              </Btn>
            </span>
          </div>
        </div>
      ))}
      <Btn variant="secondary" onClick={() => setList((l) => [...l, { id: `faq-${Date.now().toString(36)}`, q: "New question", a: "Answer", topic: "session", home: false, faqPage: true, services: [] }])}>
        + Add question
      </Btn>
      {bar}
      {ui}
    </div>
  );
}

/* ------------------------------------------------------------------ testimonials */

function TestimonialEditor({ initial }: { initial: Testimonial[] }) {
  const [list, setList] = useState(initial);
  const { bar } = useSave("testimonials", list, initial);
  const { ask, ui } = useConfirm();
  const up = (i: number, patch: Partial<Testimonial>) => setList((l) => l.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  return (
    <div className="max-w-3xl space-y-4">
      <p className="rounded-xl border border-line bg-parchment p-4 text-sm">Only add real words from real clients, with their permission. A testimonial appears on the site only when both <strong>Client gave permission</strong> and <strong>Show on site</strong> are ticked.</p>
      {list.map((t, i) => (
        <div key={t.id} className="space-y-3 rounded-2xl border border-line bg-parchment p-4" data-testid="testimonial-row">
          <Field label="What they said">
            <textarea className="field" rows={3} value={t.quote} onChange={(e) => up(i, { quote: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Name (as they approved)">
              <input className="field" value={t.name} onChange={(e) => up(i, { name: e.target.value })} />
            </Field>
            <Field label="Session (optional)">
              <input className="field" value={t.context} placeholder="Family session" onChange={(e) => up(i, { context: e.target.value })} />
            </Field>
            <Field label="Date (optional)">
              <input className="field" value={t.date} placeholder="2026-10" onChange={(e) => up(i, { date: e.target.value })} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-sm">
            <label className="flex min-h-10 items-center gap-2 font-semibold">
              <input type="checkbox" className="h-4 w-4 accent-[var(--color-clay-deep)]" checked={t.consent} onChange={(e) => up(i, { consent: e.target.checked, published: e.target.checked ? t.published : false })} />
              Client gave permission
            </label>
            <label className="flex min-h-10 items-center gap-2 font-semibold">
              <input type="checkbox" className="h-4 w-4 accent-[var(--color-clay-deep)]" disabled={!t.consent} checked={t.published} onChange={(e) => up(i, { published: e.target.checked })} />
              Show on site
            </label>
            <Btn size="sm" variant="ghost" className="ml-auto text-[#8f3226]" onClick={async () => (await ask({ title: "Remove this testimonial?", body: <p>“{t.quote.slice(0, 120)}”</p>, action: "Remove", danger: true })) && setList((l) => l.filter((_, j) => j !== i))}>
              Remove
            </Btn>
          </div>
        </div>
      ))}
      <Btn variant="secondary" onClick={() => setList((l) => [...l, { id: `t-${Date.now().toString(36)}`, quote: "", name: "", context: "", date: "", consent: false, published: false }])}>
        + Add testimonial
      </Btn>
      {bar}
      {ui}
    </div>
  );
}
