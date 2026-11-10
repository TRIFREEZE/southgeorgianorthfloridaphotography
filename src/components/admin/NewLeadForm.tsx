"use client";

import { useActionState, useState } from "react";
import { createLead, type NewLeadState } from "@/app/admin/actions";
import { formatPrice } from "@/content/pricing";
import type { Pricing } from "@/lib/cms/schema";
import type { BookingOption } from "@/lib/cms/sessions";
import { isPackageEligible, packagesFor } from "@/lib/inquiry/estimate";
import { Field } from "./ui";

const STAGES = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["quoted", "Quoted"],
  ["accepted", "Accepted"],
  ["booked", "Booked"],
  ["shot", "Shot"],
  ["edited", "Edited"],
  ["delivered", "Delivered"],
] as const;

/** Add a lead that came in by phone, text, Instagram, word of mouth… */
export function NewLeadForm({ pricing, options }: { pricing: Pricing; options: BookingOption[] }) {
  const [state, action, pending] = useActionState<NewLeadState, FormData>(createLead, {});
  const v = state.values ?? {};
  const e = state.fields ?? {};
  const [category, setCategory] = useState(v.category ?? "");
  const [stage, setStage] = useState(v.status ?? "new");
  const packages = category && isPackageEligible(category, options) ? packagesFor(category, pricing, options) : [];
  const err = (k: string) => (e[k] ? <span className="mt-1 block text-xs font-semibold text-[#a3392b]">{e[k]}</span> : null);

  return (
    <form action={action} className="max-w-3xl space-y-6" data-testid="new-lead-form">
      {state.error && (
        <p role="alert" className="rounded-xl border border-[#a3392b]/40 bg-[#fbeeea] px-4 py-3 text-sm font-semibold text-[#7d2a20]">
          {state.error}
        </p>
      )}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Who</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input name="name" className="field" defaultValue={v.name} required data-testid="nl-name" />
            {err("name")}
          </Field>
          <Field label="Email" hint="Optional if you have a phone or social name.">
            <input name="email" type="email" className="field" defaultValue={v.email} data-testid="nl-email" />
            {err("email")}
          </Field>
          <Field label="Phone">
            <input name="phone" type="tel" className="field" defaultValue={v.phone} />
          </Field>
          <Field label="Facebook or Instagram name">
            <input name="social" className="field" defaultValue={v.social} />
          </Field>
          <Field label="How they found you" hint="e.g. Instagram DM, referral from the Smiths, market booth">
            <input name="source" className="field" defaultValue={v.source} maxLength={80} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">What</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Session type">
            <select name="category" className="field" value={category} onChange={(x) => setCategory(x.target.value)} required data-testid="nl-category">
              <option value="">Choose…</option>
              {options.map((o) => (
                <option key={o.bookingId} value={o.bookingId}>
                  {o.label}
                </option>
              ))}
            </select>
            {err("category")}
          </Field>
          <Field label="Photo package (optional)">
            <select name="packageId" className="field" defaultValue={v.packageId ?? ""} disabled={!packages.length}>
              <option value="">{packages.length ? "Not decided" : "Not for this session type"}</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.photos ? ` · ${p.photos} photos` : ""}
                  {p.priceCents != null ? ` · ${formatPrice(p.priceCents)}` : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Where things stand</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Stage">
            <select name="status" className="field" value={stage} onChange={(x) => setStage(x.target.value)} data-testid="nl-status">
              {STAGES.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={stage === "new" || stage === "contacted" || stage === "quoted" ? "Date they'd like" : "Session date"} hint="Booked with a date = shows in Coming up.">
            <input name="sessionDate" type="date" className="field" defaultValue={v.sessionDate} data-testid="nl-date" />
            {err("sessionDate")}
          </Field>
          <Field label="Time">
            <input name="sessionTime" className="field" defaultValue={v.sessionTime} placeholder="5:30 PM" maxLength={60} />
          </Field>
        </div>
        <Field label="Town / area">
          <input name="city" className="field" defaultValue={v.city} />
        </Field>
        <Field label="Notes" hint="What they're after, anything to remember.">
          <textarea name="message" className="field min-h-28" defaultValue={v.message} maxLength={4000} />
        </Field>
      </fieldset>

      <button className="min-h-12 rounded-full bg-ink px-6 font-semibold text-gallery disabled:opacity-60" disabled={pending} data-testid="nl-save">
        {pending ? "Saving…" : "Add lead"}
      </button>
    </form>
  );
}
