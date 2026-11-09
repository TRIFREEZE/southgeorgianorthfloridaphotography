"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { previewComposed, sendComposed } from "@/app/admin/emails/actions";
import { formatPrice, packagePhotos } from "@/content/pricing";
import type { Pricing } from "@/lib/cms/schema";
import type { BookingOption } from "@/lib/cms/sessions";
import { estimate, isPackageEligible, packagesFor } from "@/lib/inquiry/estimate";
import { Btn, Field, useConfirm, useToast } from "./ui";

/* ------------------------------------------------------------------ shared */

function useLivePreview(kind: "booking" | "gallery", values: Record<string, unknown>) {
  const [mail, setMail] = useState<{ subject: string; html: string }>({ subject: "", html: "" });
  const key = JSON.stringify(values);
  useEffect(() => {
    let live = true;
    const t = window.setTimeout(() => {
      previewComposed(kind, JSON.parse(key) as Record<string, unknown>)
        .then((m) => live && m.html && setMail(m))
        .catch(() => {});
    }, 300);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [kind, key]);
  return mail;
}

function Preview({ subject, html }: { subject: string; html: string }) {
  const [phone, setPhone] = useState(false);
  return (
    <div className="lg:sticky lg:top-6 lg:self-start" data-testid="compose-preview">
      <div className="flex flex-wrap items-center gap-2">
        <p className="w-full text-sm">
          <span className="text-muted">Subject:</span> <strong data-testid="compose-subject">{subject || "…"}</strong>
        </p>
        <Btn size="sm" variant={!phone ? "primary" : "secondary"} onClick={() => setPhone(false)} aria-pressed={!phone}>
          Computer
        </Btn>
        <Btn size="sm" variant={phone ? "primary" : "secondary"} onClick={() => setPhone(true)} aria-pressed={phone}>
          Phone
        </Btn>
      </div>
      <div className="mt-3 rounded-2xl border border-line bg-parchment p-2">
        <iframe
          title="Email preview"
          srcDoc={html}
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          className="mx-auto block h-[78vh] w-full rounded-xl bg-[#F6F2EA]"
          style={{ maxWidth: phone ? 390 : 680 }}
          data-testid="compose-frame"
        />
      </div>
    </div>
  );
}

const err = (e: Record<string, string>, k: string) => (e[k] ? <span className="mt-1 block text-xs font-semibold text-[#a3392b]">{e[k]}</span> : null);

function SendBar({ kind, values, label, onSent, errors, setErrors }: { kind: "booking" | "gallery"; values: Record<string, unknown>; label: string; onSent: () => void; errors: Record<string, string>; setErrors: (e: Record<string, string>) => void }) {
  const [copyMe, setCopyMe] = useState(true);
  const [busy, start] = useTransition();
  const toast = useToast();
  const { ask, ui } = useConfirm();
  const to = String(values.email ?? "").trim();
  const send = async () => {
    // Ask first, outside the transition (a transition holds UI updates, so the question would never show).
    const ok = await ask({ title: "Send this email?", body: <>It goes to <strong>{to || "the client"}</strong> right away. Emails can&apos;t be unsent.</>, action: "Send it" });
    if (!ok) return;
    start(async () => {
      const r = await sendComposed(kind, values, copyMe);
      if (!r.ok) {
        setErrors(r.fields ?? {});
        toast(r.message, "error");
        return;
      }
      setErrors({});
      toast(r.message);
      onSent();
    });
  };
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-parchment p-4">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={copyMe} onChange={(e) => setCopyMe(e.target.checked)} className="h-4 w-4 accent-[var(--color-clay-deep)]" />
        Send me a copy
      </label>
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="text-sm font-semibold text-[#a3392b]">
          Fix the highlighted fields, then send again.
        </p>
      )}
      <Btn variant="clay" onClick={send} disabled={busy} data-testid="compose-send">
        {busy ? "Sending…" : label}
      </Btn>
      {ui}
    </div>
  );
}

/* ------------------------------------------------------------------ booking confirmed */

type BookingForm = {
  name: string;
  email: string;
  phone: string;
  social: string;
  category: string;
  packageId: string;
  extraPhotos: number;
  addOns: string[];
  date: string;
  time: string;
  place: string;
  city: string;
  groupDetails: string;
  animals: string;
  specialNeeds: string;
  price: string;
  note: string;
  saveLead: boolean;
};

const EMPTY_BOOKING: BookingForm = { name: "", email: "", phone: "", social: "", category: "", packageId: "", extraPhotos: 0, addOns: [], date: "", time: "", place: "", city: "", groupDetails: "", animals: "", specialNeeds: "", price: "", note: "", saveLead: true };

/** Same choices as the public booking form, plus the date, meeting spot and your own note. */
export function BookingComposer({ pricing, options }: { pricing: Pricing; options: BookingOption[] }) {
  const [f, setF] = useState<BookingForm>(EMPTY_BOOKING);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof BookingForm>(k: K, v: BookingForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const mail = useLivePreview("booking", f);
  const opt = options.find((o) => o.bookingId === f.category);
  const eligible = f.category ? isPackageEligible(f.category, options) : false;
  const packages = useMemo(() => (f.category ? packagesFor(f.category, pricing, options) : []), [f.category, pricing, options]);
  const chosen = packages.find((p) => p.id === f.packageId);
  const est = f.category ? estimate({ category: f.category, packageId: f.packageId || null, extraPhotos: f.extraPhotos, addOns: f.addOns }, pricing, options) : null;
  const top = useRef<HTMLDivElement>(null);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div ref={top} className="space-y-6" data-testid="booking-composer">
        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold">The client</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="off" data-testid="c-name" />
              {err(errors, "name")}
            </Field>
            <Field label="Email">
              <input className="field" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="off" data-testid="c-email" />
              {err(errors, "email")}
            </Field>
            <Field label="Phone (optional)">
              <input className="field" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Facebook or Instagram name (optional)">
              <input className="field" value={f.social} onChange={(e) => set("social", e.target.value)} />
            </Field>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-lg font-semibold">What are we capturing?</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {options.map((o) => (
              <label key={o.bookingId} className={`flex cursor-pointer flex-col rounded-xl border p-3 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 ${f.category === o.bookingId ? "border-ink bg-ink text-gallery" : "border-line bg-gallery hover:border-ink/40"}`}>
                <input type="radio" name="c-category" className="sr-only" checked={f.category === o.bookingId} onChange={() => setF((x) => ({ ...x, category: o.bookingId, packageId: "", extraPhotos: 0, addOns: [] }))} />
                <span className="font-semibold">{o.label}</span>
                <span className={f.category === o.bookingId ? "text-sand" : "text-muted"}>{o.hint}</span>
              </label>
            ))}
          </div>
          {err(errors, "category")}
        </fieldset>

        {eligible && (
          <fieldset>
            <legend className="text-lg font-semibold">How many photos?</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {packages.map((p) => (
                <label key={p.id} className={`flex cursor-pointer flex-col rounded-xl border p-3 text-sm ${f.packageId === p.id ? "border-ink bg-ink text-gallery" : "border-line bg-gallery hover:border-ink/40"}`}>
                  <input type="radio" name="c-package" className="sr-only" checked={f.packageId === p.id} onChange={() => set("packageId", p.id)} />
                  <span className="font-display text-2xl leading-none">{p.photos ?? p.name}</span>
                  <span>
                    {p.photos == null ? packagePhotos(p) : "photos"} · {p.priceCents == null ? "custom quote" : formatPrice(p.priceCents)}
                  </span>
                </label>
              ))}
            </div>
            {chosen && chosen.priceCents != null && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label={`Extra photos (${formatPrice(pricing.extraPhoto.priceCents)} each)`}>
                  <input className="field" type="number" min={0} max={60} value={f.extraPhotos} onChange={(e) => set("extraPhotos", Math.max(0, Math.min(60, Number(e.target.value) || 0)))} />
                </Field>
                <div className="space-y-1.5 text-sm">
                  {pricing.addOns
                    .filter((a) => a.id !== "extra-photos")
                    .map((a) => (
                      <label key={a.id} className="flex items-start gap-2">
                        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-clay-deep)]" checked={f.addOns.includes(a.id)} onChange={(e) => set("addOns", e.target.checked ? [...f.addOns, a.id] : f.addOns.filter((x) => x !== a.id))} />
                        <span>
                          {a.name} <span className="text-muted">{a.priceCents == null ? "(quoted)" : `+${formatPrice(a.priceCents)}`}</span>
                        </span>
                      </label>
                    ))}
                </div>
              </div>
            )}
          </fieldset>
        )}

        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold">When & where</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Session date">
              <input className="field" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} data-testid="c-date" />
              {err(errors, "date")}
            </Field>
            <Field label="Time" hint="Write it how you'd say it, e.g. 5:30 PM (golden hour).">
              <input className="field" value={f.time} onChange={(e) => set("time", e.target.value)} data-testid="c-time" />
            </Field>
            <Field label="Where we'll meet" hint="A park, venue or meeting spot.">
              <input className="field" value={f.place} onChange={(e) => set("place", e.target.value)} data-testid="c-place" />
            </Field>
            <Field label="Town">
              <input className="field" value={f.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold">The details</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={opt?.groupLabel ?? "Who's in the photos?"}>
              <input className="field" value={f.groupDetails} onChange={(e) => set("groupDetails", e.target.value)} />
            </Field>
            {opt?.askAnimals ? (
              <Field label="Who are the animals?">
                <input className="field" value={f.animals} onChange={(e) => set("animals", e.target.value)} />
              </Field>
            ) : null}
            <Field label="Price shown" hint={est && est.kind === "package" ? `Leave empty to show ${formatPrice(est.totalCents)}.` : "e.g. $450, $100 deposit paid"}>
              <input className="field" value={f.price} onChange={(e) => set("price", e.target.value)} data-testid="c-price" />
            </Field>
          </div>
          <Field label="Anything to plan around?">
            <textarea className="field min-h-20" value={f.specialNeeds} onChange={(e) => set("specialNeeds", e.target.value)} />
          </Field>
        </fieldset>

        <Field label="Your note to them" hint="In your own words. It appears near the top of the email, set apart. Line breaks are kept.">
          <textarea className="field min-h-40" value={f.note} onChange={(e) => set("note", e.target.value)} data-testid="c-note" />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.saveLead} onChange={(e) => set("saveLead", e.target.checked)} className="h-4 w-4 accent-[var(--color-clay-deep)]" />
          Also add it to Leads as <strong>Booked</strong>
        </label>

        <SendBar
          kind="booking"
          values={f}
          label="Send booking confirmation"
          errors={errors}
          setErrors={(e) => {
            setErrors(e);
            if (Object.keys(e).length) top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onSent={() => setF(EMPTY_BOOKING)}
        />
      </div>
      <Preview {...mail} />
    </div>
  );
}

/* ------------------------------------------------------------------ gallery ready */

type GalleryForm = { name: string; email: string; link: string; password: string; expires: string; note: string };
const EMPTY_GALLERY: GalleryForm = { name: "", email: "", link: "", password: "", expires: "", note: "" };

export function GalleryComposer({ galleries }: { galleries: { id: string; title: string; clientName: string | null; link: string; expiresAt: string | null }[] }) {
  const [f, setF] = useState<GalleryForm>(EMPTY_GALLERY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof GalleryForm>(k: K, v: GalleryForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const mail = useLivePreview("gallery", f);
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="space-y-6" data-testid="gallery-composer">
        {galleries.length > 0 && (
          <Field label="Fill in from a client gallery (optional)" hint="Fills in the link, name and expiry. You still type the password: it's stored scrambled, so it can't be shown.">
            <select
              className="field"
              defaultValue=""
              onChange={(e) => {
                const g = galleries.find((x) => x.id === e.target.value);
                if (g) setF((x) => ({ ...x, link: g.link, name: x.name || g.clientName || "", expires: g.expiresAt ? g.expiresAt.slice(0, 10) : x.expires }));
              }}
              data-testid="g-pick"
            >
              <option value="">Choose a gallery…</option>
              {galleries.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                  {g.clientName ? ` (${g.clientName})` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client name">
            <input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} data-testid="g-name" />
            {err(errors, "name")}
          </Field>
          <Field label="Client email">
            <input className="field" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} data-testid="g-email" />
            {err(errors, "email")}
          </Field>
        </div>
        <Field label="Gallery link">
          <input className="field" type="url" value={f.link} onChange={(e) => set("link", e.target.value)} placeholder="https://…" data-testid="g-link" />
          {err(errors, "link")}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password">
            <input className="field" value={f.password} onChange={(e) => set("password", e.target.value)} autoComplete="off" spellCheck={false} data-testid="g-password" />
            {err(errors, "password")}
          </Field>
          <Field label="Available until (optional)">
            <input className="field" type="date" value={f.expires} onChange={(e) => set("expires", e.target.value)} />
          </Field>
        </div>
        <Field label="Your note to them (optional)" hint="In your own words. Line breaks are kept.">
          <textarea className="field min-h-32" value={f.note} onChange={(e) => set("note", e.target.value)} />
        </Field>
        <SendBar kind="gallery" values={f} label="Send gallery email" errors={errors} setErrors={setErrors} onSent={() => setF(EMPTY_GALLERY)} />
      </div>
      <Preview {...mail} />
    </div>
  );
}
