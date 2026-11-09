"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatPrice, packagePhotos } from "@/content/pricing";
import type { Pricing } from "@/lib/cms/schema";
import type { BookingOption, StoryContent } from "@/lib/cms/sessions";
import { site } from "@/content/site";
import { estimate, isPackageEligible, packagesFor } from "@/lib/inquiry/estimate";
import { useFavorites } from "@/lib/favorites";
import { track } from "@/lib/analytics";
import { emitFlick } from "@/components/flick/bus";
import { Button } from "@/components/ui/primitives";
import { captureAttribution } from "./attribution";
import { emailProblem, socialProblem } from "@/lib/inquiry/checks";
import { Checkbox, ConsentLabel, EmailField, ErrorSummary, focusField, Honeypot, SelectField, SocialField, TapHint, TextArea, TextField, Verb } from "./fields";
import { Turnstile } from "./Turnstile";
import { useInquirySubmit } from "./useInquirySubmit";

type Draft = {
  category: string;
  packageId: string;
  extraPhotos: number;
  addOns: string[];
  groupDetails: string;
  animals: string;
  specialNeeds: string;
  locationPreference: string;
  city: string;
  zip: string;
  dateFlexibility: "flexible" | "specific" | "range";
  preferredDate: string;
  preferredDateAlt: string;
  preferredTime: "" | "morning" | "midday" | "evening" | "any";
  travelNotes: string;
  name: string;
  email: string;
  social: string;
  phone: string;
  smsOptIn: boolean;
  message: string;
  consent: boolean;
  storySubject: string;
  storyFeeling: string;
};

const EMPTY: Draft = {
  category: "",
  packageId: "",
  extraPhotos: 0,
  addOns: [],
  groupDetails: "",
  animals: "",
  specialNeeds: "",
  locationPreference: "",
  city: "",
  zip: "",
  dateFlexibility: "flexible",
  preferredDate: "",
  preferredDateAlt: "",
  preferredTime: "",
  travelNotes: "",
  name: "",
  email: "",
  social: "",
  phone: "",
  smsOptIn: false,
  message: "",
  consent: false,
  storySubject: "",
  storyFeeling: "",
};

const DRAFT_KEY = "rcl:booking-draft";
/** Contact details are never written to storage. */
const PERSISTED: (keyof Draft)[] = ["category", "packageId", "extraPhotos", "addOns", "groupDetails", "animals", "locationPreference", "city", "zip", "dateFlexibility", "preferredDate", "preferredDateAlt", "preferredTime", "storySubject", "storyFeeling"];

const steps = ["What are we capturing?", "What would make this perfect?", "Where & when?", "Let's make it happen"] as const;

/** Which step each answer lives on, so "Take me there" can go back to it. */
const FIELD_STEP: Record<string, number> = { category: 0, packageId: 1, extraPhotos: 1, addOns: 1, groupDetails: 1, animals: 1, specialNeeds: 1, locationPreference: 1, city: 2, zip: 2, dateFlexibility: 2, preferredDate: 2, preferredDateAlt: 2, preferredTime: 2, travelNotes: 2 };
const FIELD_LABEL: Record<string, string> = {
  category: "What we're photographing",
  packageId: "Number of photos",
  zip: "ZIP code",
  preferredDate: "Date",
  preferredDateAlt: "Second date",
  name: "Your name",
  email: "Email",
  social: "Social media link",
  phone: "Phone",
  message: "Notes",
  consent: "Privacy agreement",
};
const FIELD_ID: Record<string, string> = { zip: "w-zip", preferredDate: "w-date", preferredDateAlt: "w-date2", name: "w-name", email: "w-email", social: "w-social", phone: "w-phone", message: "w-message", consent: "w-consent", city: "w-city" };
const FIELD_ORDER = ["category", "packageId", "zip", "preferredDate", "preferredDateAlt", "name", "email", "social", "phone", "message", "consent"];

const settings = ["Your home, yard or farm", "A park or outdoor spot", "Downtown or a business", "A venue", "Not sure yet: help me choose"];

export function BookingWizard({ pricing, options, story }: { pricing: Pricing; options: BookingOption[]; story: StoryContent }) {
  const favorites = useFavorites();
  const { state, submit, tick: serverTick, clearField } = useInquirySubmit();
  const [localTick, setLocalTick] = useState(0);
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [token, setToken] = useState("");
  const startedAt = useRef(0);
  const started = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const hydrated = useRef(false);

  // Restore draft + URL prefill (from service pages, pricing cards, story cards).
  useEffect(() => {
    startedAt.current = Date.now();
    captureAttribution();
    // Read the URL directly (not useSearchParams) so the wizard prerenders without a Suspense swap (no layout shift).
    const params = new URLSearchParams(window.location.search);
    let next = { ...EMPTY };
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) ?? "null") as Partial<Draft> | null;
      if (saved) next = { ...next, ...Object.fromEntries(Object.entries(saved).filter(([k]) => PERSISTED.includes(k as keyof Draft))) };
    } catch {
      /* ignore */
    }
    const cat = params.get("category");
    if (cat && options.some((c) => c.bookingId === cat)) next.category = cat;
    // A saved draft for a category that no longer exists starts fresh.
    if (next.category && !options.some((c) => c.bookingId === next.category)) next.category = "";
    const pkg = params.get("package");
    if (pkg && pricing.packages.some((p) => p.id === pkg)) {
      next.packageId = pkg;
      // Arriving from a package card without a category: preselect the first one that offers it.
      if (!cat) next.category = options.find((o) => o.pricingMode === "package" && o.packageIds.includes(pkg))?.bookingId ?? next.category;
    }
    const subject = params.get("subject");
    if (subject && story.subjects.some((s) => s.id === subject)) next.storySubject = subject;
    const feeling = params.get("feeling");
    if (feeling && story.feelings.some((f) => f.id === feeling)) next.storyFeeling = feeling;
    const town = site.serviceArea.towns.find((t) => t.slug === params.get("town"));
    if (town) next.city = `${town.name}, ${town.state}`;
    hydrated.current = true;
    // Initializing from browser storage and the URL is a one-time sync with external state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setD(next);
  }, [pricing, options, story]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(Object.fromEntries(PERSISTED.map((k) => [k, d[k]]))));
    } catch {
      /* ignore */
    }
  }, [d]);

  const set = useCallback(<K extends keyof Draft>(k: K, v: Draft[K]) => {
    if (!started.current) {
      started.current = true;
      track("start_booking");
    }
    setD((x) => ({ ...x, [k]: v }));
    clearField(k as string);
    setErrors((e) => {
      if (!e[k as string]) return e;
      const n = { ...e };
      delete n[k as string];
      return n;
    });
  }, [clearField]);

  const opt = options.find((o) => o.bookingId === d.category);
  const eligible = d.category ? isPackageEligible(d.category, options) : false;
  const packages = useMemo(() => (d.category ? packagesFor(d.category, pricing, options) : []), [d.category, pricing, options]);
  const chosen = packages.find((p) => p.id === d.packageId);
  const priced = eligible && Boolean(chosen && chosen.priceCents != null);
  const est = useMemo(
    () => (d.category ? estimate({ category: d.category, packageId: d.packageId || null, extraPhotos: d.extraPhotos, addOns: d.addOns }, pricing, options) : null),
    [d.category, d.packageId, d.extraPhotos, d.addOns, pricing, options],
  );


  // Server-side field errors (from the final submit) are shown alongside local checks.
  const shownErrors: Record<string, string> = { ...(state.status === "error" ? state.fields : {}), ...errors };

  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0 && !d.category) e.category = "Choose what we're photographing.";
    if (s === 1 && eligible && !chosen) e.packageId = "Choose how many photos you'd like.";
    if (s === 2) {
      if (d.zip && !/^\d{5}$/.test(d.zip)) e.zip = "Use a 5-digit ZIP code.";
      if (d.dateFlexibility !== "flexible" && !d.preferredDate) e.preferredDate = "Add a date, or choose “I'm flexible”.";
    }
    if (s === 3) {
      if (!d.name.trim()) e.name = "Please type your name.";
      const em = emailProblem(d.email);
      if (em) e.email = em;
      const so = socialProblem(d.social);
      if (so) e.social = so;
      if (d.smsOptIn && !d.phone.trim()) e.phone = "Add a phone number to receive texts, or untick the text option.";
      if (!d.consent) e.consent = "Please tick the box to agree to the privacy policy, so we're allowed to reply.";
    }
    setErrors(e);
    if (Object.keys(e).length) {
      emitFlick({ type: "form-error" });
      setLocalTick((t) => t + 1);
      return false;
    }
    return true;
  };

  const errorItems = Object.entries(shownErrors)
    .filter(([, m]) => m)
    .sort(([a], [b]) => ((FIELD_ORDER.indexOf(a) + 99) % 99) - ((FIELD_ORDER.indexOf(b) + 99) % 99))
    .map(([key, message]) => ({ key, label: FIELD_LABEL[key] ?? "Form", message }));

  const fix = (key: string) => {
    const target = FIELD_STEP[key] ?? 3;
    const go = () => focusField(FIELD_ID[key] ?? "");
    if (target !== step) {
      goto(target);
      window.setTimeout(go, 120);
    } else go();
  };

  // The one next thing to do, so a "tap here" guide can point at it.
  const nextUp: string =
    step === 0
      ? d.category
        ? "continue"
        : "options"
      : step === 1
        ? eligible && !chosen
          ? "packages"
          : "continue"
        : step === 2
          ? "continue"
          : !d.name.trim()
            ? "name"
            : emailProblem(d.email)
              ? "email"
              : socialProblem(d.social)
                ? "social"
                : !d.consent
                  ? "consent"
                  : "send";
  const help = [
    <>
      <Verb /> the kind of photos you&apos;d like. Then <Verb lower /> the <strong>Continue</strong> button at the bottom.
    </>,
    eligible ? (
      <>
        <Verb /> how many photos you&apos;d like. Everything else on this page is optional. Then <Verb lower /> <strong>Continue</strong>.
      </>
    ) : (
      <>
        Everything on this page is optional. Fill in what you like, then <Verb lower /> <strong>Continue</strong>.
      </>
    ),
    <>
      Everything on this page is optional. Fill in what you know, then <Verb lower /> <strong>Continue</strong>.
    </>,
    <>
      Type your name, email and a social media link, <Verb lower /> the box to agree, then <Verb lower /> <strong>Send my inquiry</strong>. That&apos;s it.
    </>,
  ][step];

  const goto = (s: number) => {
    setStep(s);
    emitFlick({ type: "booking-step", step: s });
    requestAnimationFrame(() => {
      // Move focus for screen readers without letting the browser jump the page.
      headingRef.current?.focus({ preventScroll: true });
      // Only scroll if the top of the form has gone up under the header; then glide it back into view.
      const form = formRef.current;
      if (!form) return;
      const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
      const top = form.getBoundingClientRect().top;
      if (top < headerBottom + 8) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: window.scrollY + top - headerBottom - 16, behavior: reduce ? "auto" : "smooth" });
      }
    });
  };

  const next = () => {
    if (validate(step)) goto(step + 1);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) return next();
    if (!validate(3)) return;
    const company = (e.currentTarget as HTMLFormElement).elements.namedItem("company_website") as HTMLInputElement | null;
    void submit({
      kind: "wizard",
      ...d,
      packageId: eligible && chosen ? d.packageId : "",
      extraPhotos: priced ? d.extraPhotos : 0,
      addOns: priced ? d.addOns : [],
      preferredTime: d.preferredTime || undefined,
      inspirationIds: favorites,
      company_website: company?.value ?? "",
      startedAt: startedAt.current,
      turnstileToken: token,
    }).then((ok) => {
      if (ok) {
        try {
          window.sessionStorage.removeItem(DRAFT_KEY);
        } catch {
          /* ignore */
        }
      }
    });
  };

  const onToken = useCallback((t: string) => setToken(t), []);
  const catLabel = opt?.label;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="relative scroll-mt-24" data-flick-avoid aria-labelledby="wizard-step-title">
      <Honeypot />
      <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Booking steps">
        {steps.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined}>
            <button
              type="button"
              disabled={i > step}
              onClick={() => i < step && goto(i)}
              className="group block w-full text-left disabled:cursor-default"
              aria-label={`Step ${i + 1}: ${label}${i < step ? " (completed, edit)" : ""}`}
            >
              <span className={`block h-1 rounded-full transition-colors ${i <= step ? "bg-clay-deep" : "bg-line"}`} />
              <span className={`mt-2 hidden text-xs font-semibold sm:block ${i === step ? "text-ink" : "text-muted"}`}>
                {i + 1}. {label}
              </span>
            </button>
          </li>
        ))}
      </ol>

      {/* Heading in its own row, so the estimate box lines up with the first row of choices beside it. */}
      <div className="grid gap-x-8 gap-y-7 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="eyebrow" aria-hidden>
            Step {step + 1} of 4
          </p>
          <h2 id="wizard-step-title" ref={headingRef} tabIndex={-1} className="mt-2 text-display-sm outline-none">
            {steps[step]}
          </h2>
          <p className="mt-3 max-w-[38rem] text-[1.05rem] leading-relaxed text-ink-soft" data-testid="step-help">
            {help}
          </p>
        </div>

        <div className="lg:col-span-8 lg:row-start-2">
          <div className="space-y-7">
            <ErrorSummary tick={localTick + serverTick} message={state.status === "error" ? state.message : undefined} items={errorItems} onFix={fix} />
            {step === 0 && (
              <fieldset>
                <legend className="sr-only">Session type</legend>
                {nextUp === "options" && (
                  <TapHint point="down" className="mb-3">
                    <Verb /> the kind of photos you&apos;d like
                  </TapHint>
                )}
                <div className="grid gap-3 sm:grid-cols-2" data-error-anchor={shownErrors.category ? true : undefined} tabIndex={shownErrors.category ? -1 : undefined}>
                  {options.map((c) => (
                    <label
                      key={c.bookingId}
                      className={`flex min-h-20 cursor-pointer flex-col justify-center rounded-[var(--radius-card)] border p-5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-clay-deep ${
                        d.category === c.bookingId ? "border-ink bg-ink text-gallery" : "border-line bg-gallery hover:border-ink/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={c.bookingId}
                        className="sr-only"
                        checked={d.category === c.bookingId}
                        onChange={() => {
                          set("category", c.bookingId);
                          track("select_category", { category: c.bookingId });
                          emitFlick({ type: "card-pick" });
                        }}
                      />
                      <span className="font-display text-[1.35rem]">{c.label}</span>
                      <span className={`text-sm ${d.category === c.bookingId ? "text-sand" : "text-muted"}`}>{c.hint}</span>
                    </label>
                  ))}
                </div>
                {shownErrors.category && <p className="mt-3 text-sm font-semibold text-[#a3392b]">{shownErrors.category}</p>}
              </fieldset>
            )}

            {step === 1 && (
              <>
                {eligible ? (
                  <fieldset>
                    <legend className="mb-3 font-semibold">How many finished photos?</legend>
                    {nextUp === "packages" && (
                      <TapHint point="down" className="mb-3">
                        <Verb /> how many photos you&apos;d like
                      </TapHint>
                    )}
                    <div className={`grid gap-3 ${packages.length === 4 ? "sm:grid-cols-2 xl:grid-cols-4" : packages.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`} data-error-anchor={shownErrors.packageId ? true : undefined} tabIndex={shownErrors.packageId ? -1 : undefined}>
                      {packages.map((p) => (
                        <label
                          key={p.id}
                          className={`relative flex cursor-pointer flex-col rounded-[var(--radius-card)] border p-5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-clay-deep ${
                            d.packageId === p.id ? "border-ink bg-ink text-gallery" : "border-line bg-gallery hover:border-ink/40"
                          }`}
                        >
                          <input
                            type="radio"
                            name="packageId"
                            value={p.id}
                            className="sr-only"
                            checked={d.packageId === p.id}
                            onChange={() => {
                              set("packageId", p.id);
                              track("select_package", { package: p.id });
                              emitFlick({ type: "card-pick" });
                            }}
                          />
                          <span className="font-display text-[2.2rem] leading-none">{p.photos ?? p.name}</span>
                          <span className="text-sm">
                            {p.photos == null ? packagePhotos(p) : "photos"} · {p.priceCents == null ? "custom quote" : formatPrice(p.priceCents)}
                          </span>
                          {p.photos != null && <span className={`mt-2 text-xs ${d.packageId === p.id ? "text-sand" : "text-muted"}`}>{p.name}</span>}
                          {p.highlightLabel && <span className={`mt-2 text-xs font-semibold ${d.packageId === p.id ? "text-clay-light" : "text-clay-deep"}`}>{p.highlightLabel}</span>}
                        </label>
                      ))}
                    </div>
                    {shownErrors.packageId && <p className="mt-3 text-sm font-semibold text-[#a3392b]">{shownErrors.packageId}</p>}
                    {chosen && chosen.priceCents == null && (
                      <p className="mt-4 rounded-xl bg-gallery px-4 py-3 text-sm text-ink-soft" data-testid="custom-package-note">
                        <strong>{chosen.name} is quoted personally.</strong> Tell us what you have in mind below and we&apos;ll send a written quote.
                      </p>
                    )}
                    <div className={`mt-6 grid gap-5 sm:grid-cols-2 ${chosen && chosen.priceCents == null ? "hidden" : ""}`}>
                      <div>
                        <p className="mb-1.5 text-[0.92rem] font-semibold" id="extra-label">
                          Extra photos <span className="font-normal text-muted">({formatPrice(pricing.extraPhoto.priceCents)} each)</span>
                        </p>
                        <div className="flex items-center gap-2" role="group" aria-labelledby="extra-label">
                          <button type="button" className="h-12 w-12 rounded-full border border-ink/25 text-xl" onClick={() => set("extraPhotos", Math.max(0, d.extraPhotos - 1))} aria-label="One fewer extra photo">
                            −
                          </button>
                          <output className="min-w-12 text-center font-display text-2xl" aria-live="polite">
                            {d.extraPhotos}
                          </output>
                          <button type="button" className="h-12 w-12 rounded-full border border-ink/25 text-xl" onClick={() => set("extraPhotos", Math.min(60, d.extraPhotos + 1))} aria-label="One more extra photo">
                            +
                          </button>
                        </div>
                        <p className="mt-1.5 text-xs text-muted">You can also decide after you see your gallery.</p>
                      </div>
                      <div>
                        {pricing.addOns
                          .filter((a) => a.id !== "extra-photos")
                          .map((a) => (
                            <Checkbox
                              key={a.id}
                              id={`addon-${a.id}`}
                              checked={d.addOns.includes(a.id)}
                              onChange={(e) => set("addOns", e.target.checked ? [...d.addOns, a.id] : d.addOns.filter((x) => x !== a.id))}
                              label={
                                <>
                                  <span className="font-semibold">{a.name}</span>
                                  <span className="block text-muted">{a.description} {a.priceCents == null ? "Quoted personally." : `+${formatPrice(a.priceCents)}`}</span>
                                </>
                              }
                            />
                          ))}
                      </div>
                    </div>
                  </fieldset>
                ) : (
                  <div className="rounded-[var(--radius-card)] border border-line bg-gallery p-5">
                    <p className="font-semibold">{d.category === "other" ? "Tell us your idea" : "This one gets a custom quote"}</p>
                    <p className="mt-1 text-muted">{est && est.kind === "quote" ? est.reason : ""}</p>
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  {opt?.askAnimals ? (
                    <TextField id="w-animals" label="Who are the animals?" hint="e.g. two dogs and a very opinionated horse" value={d.animals} onChange={(e) => set("animals", e.target.value)} optional />
                  ) : null}
                  <TextField
                    id="w-group"
                    label={opt?.groupLabel ?? "Who's in the photos?"}
                    hint={opt?.groupHint}
                    value={d.groupDetails}
                    onChange={(e) => set("groupDetails", e.target.value)}
                    optional
                  />
                  <SelectField id="w-setting" label="Setting" optional value={d.locationPreference} onChange={(e) => set("locationPreference", e.target.value)}>
                    <option value="">Choose one</option>
                    {settings.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <TextArea id="w-special" label="Anything we should plan around?" hint="Mobility or sensory needs, an anxious pet, a horse that spooks, a surprise proposal…" rows={3} value={d.specialNeeds} onChange={(e) => set("specialNeeds", e.target.value)} optional />
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
                  <TextField id="w-city" label="City or area" autoComplete="address-level2" value={d.city} onChange={(e) => set("city", e.target.value)} optional hint={`We serve ${site.region}; farther is quoted.`} />
                  <TextField id="w-zip" label="ZIP" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={d.zip} onChange={(e) => set("zip", e.target.value.replace(/\D/g, ""))} optional error={shownErrors.zip} />
                </div>
                <fieldset>
                  <legend className="mb-3 font-semibold">Dates</legend>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["flexible", "I'm flexible"],
                        ["specific", "A specific date"],
                        ["range", "A couple of options"],
                      ] as const
                    ).map(([v, label]) => (
                      <label key={v} className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-clay-deep ${d.dateFlexibility === v ? "border-ink bg-ink text-gallery" : "border-ink/20 bg-gallery"}`}>
                        <input type="radio" name="dateFlexibility" className="sr-only" checked={d.dateFlexibility === v} onChange={() => set("dateFlexibility", v)} />
                        {label}
                      </label>
                    ))}
                  </div>
                  {d.dateFlexibility !== "flexible" && (
                    <div className="mt-4 grid gap-5 sm:grid-cols-2">
                      <TextField id="w-date" type="date" label={d.dateFlexibility === "range" ? "First choice" : "Date"} value={d.preferredDate} onChange={(e) => set("preferredDate", e.target.value)} error={shownErrors.preferredDate} />
                      {d.dateFlexibility === "range" && <TextField id="w-date2" type="date" label="Second choice" value={d.preferredDateAlt} onChange={(e) => set("preferredDateAlt", e.target.value)} optional />}
                    </div>
                  )}
                </fieldset>
                <SelectField id="w-time" label="Preferred time of day" optional value={d.preferredTime} onChange={(e) => set("preferredTime", e.target.value as Draft["preferredTime"])}>
                  <option value="">No preference</option>
                  <option value="morning">Morning (soft light, cooler)</option>
                  <option value="midday">Midday</option>
                  <option value="evening">Evening / golden hour</option>
                  <option value="any">Whatever works best</option>
                </SelectField>
                <TextArea id="w-travel" label="Travel or location notes" rows={2} value={d.travelNotes} onChange={(e) => set("travelNotes", e.target.value)} optional hint="Farm address comes later. Just the general area for now." />
                <p className="rounded-xl bg-gallery px-4 py-3 text-sm text-ink-soft">
                  <strong>We&apos;ll confirm availability personally.</strong> This form doesn&apos;t reserve a slot. Real availability is confirmed by a
                  real person.
                </p>
              </>
            )}

            {step === 3 && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField id="w-name" label="Your name" autoComplete="name" value={d.name} onChange={(e) => set("name", e.target.value)} error={shownErrors.name} required nudge={nextUp === "name" ? "Type here" : undefined} />
                  <EmailField id="w-email" value={d.email} onChange={(e) => set("email", e.target.value)} onUse={(v) => set("email", v)} error={shownErrors.email} required nudge={nextUp === "email" ? "Type here" : undefined} />
                </div>
                <SocialField id="w-social" value={d.social} onChange={(e) => set("social", e.target.value)} error={shownErrors.social} nudge={nextUp === "social" ? "Paste or type here" : undefined} />
                <TextField id="w-phone" type="tel" label="Phone" autoComplete="tel" inputMode="tel" value={d.phone} onChange={(e) => set("phone", e.target.value)} error={shownErrors.phone} optional />
                {d.phone.trim() && (
                  <Checkbox id="w-sms" checked={d.smsOptIn} onChange={(e) => set("smsOptIn", e.target.checked)} label="It's okay to text me about this inquiry. Message and data rates may apply. Reply STOP to opt out." />
                )}
                <TextArea id="w-message" label="Inspiration & notes" rows={4} value={d.message} onChange={(e) => set("message", e.target.value)} optional hint="Ideas, Pinterest-style descriptions, what matters most to you." error={shownErrors.message} />
                {favorites.length > 0 && <p className="text-sm text-muted">{favorites.length} saved inspiration photo{favorites.length === 1 ? "" : "s"} will be included.</p>}

                <section aria-labelledby="review-title" className="rounded-[var(--radius-card)] border border-line bg-gallery p-5">
                  <h3 id="review-title" className="font-sans text-sm font-bold uppercase tracking-[0.12em] text-clay-deep">
                    Your summary
                  </h3>
                  <dl className="mt-3 grid gap-x-6 gap-y-2 text-[0.95rem] sm:grid-cols-2">
                    <Row k="Session" v={catLabel} />
                    {eligible && <Row k="Package" v={chosen?.name} />}
                    {priced && d.extraPhotos > 0 && <Row k="Extra photos" v={String(d.extraPhotos)} />}
                    <Row k="Where" v={[d.city, d.zip].filter(Boolean).join(" ") || "To discuss"} />
                    <Row k="When" v={d.dateFlexibility === "flexible" ? "Flexible" : [d.preferredDate, d.preferredDateAlt].filter(Boolean).join(" or ")} />
                    <Row k="Estimate" v={est?.label} />
                  </dl>
                </section>

                <Checkbox
                  id="w-consent"
                  checked={d.consent}
                  onChange={(e) => set("consent", e.target.checked)}
                  label={<ConsentLabel />}
                  error={shownErrors.consent}
                  nudge={
                    nextUp === "consent" ? (
                      <>
                        <Verb /> the box to agree
                      </>
                    ) : undefined
                  }
                />
                <Turnstile onToken={onToken} />
              </>
            )}
          </div>

          {est && est.kind !== "incomplete" && (
            <p className="mt-8 rounded-xl bg-ink px-4 py-3 text-sm text-gallery lg:hidden" aria-hidden>
              {est.kind === "package" ? `${est.label} · travel quoted if needed` : "Custom quote: you'll get a written quote"}
            </p>
          )}
          <div className="mt-16 flex flex-wrap items-center gap-3">
            {step > 0 && (
              <Button type="button" variant="secondary" onClick={() => goto(step - 1)}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <span className="relative inline-flex">
                {nextUp === "continue" && (
                  <TapHint point="down" float className="absolute bottom-full left-0 mb-3">
                    <Verb /> Continue
                  </TapHint>
                )}
                <Button type="button" onClick={next} className={nextUp === "continue" ? "attention" : ""}>
                  Continue
                </Button>
              </span>
            ) : (
              <span className="relative inline-flex">
                {nextUp === "send" && state.status !== "submitting" && (
                  <TapHint point="down" float className="absolute bottom-full left-0 mb-3">
                    <Verb /> to send
                  </TapHint>
                )}
                <Button type="submit" disabled={state.status === "submitting"} className={nextUp === "send" && state.status !== "submitting" ? "attention" : ""}>
                  {state.status === "submitting" ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gallery/40 border-t-gallery" aria-hidden />
                      Sending…
                    </>
                  ) : (
                    "Send my inquiry"
                  )}
                </Button>
              </span>
            )}
            <p className="sr-only" aria-live="polite">
              {state.status === "submitting" ? "Sending your inquiry" : ""}
            </p>
          </div>
        </div>

        <aside className="lg:col-span-4 lg:col-start-9 lg:row-start-2" aria-label="Estimate">
          <div className="rounded-[var(--radius-card)] bg-ink p-6 text-gallery on-dark lg:sticky lg:top-28">
            <p className="eyebrow">Live estimate</p>
            {!est || est.kind === "incomplete" ? (
              <p className="mt-3 text-sand/90">{est?.label ?? "Choose a session type to see pricing."}</p>
            ) : est.kind === "quote" ? (
              <>
                <p className="mt-3 font-display text-[2rem] leading-none">Custom quote</p>
                <p className="mt-3 text-sm text-sand/85">No calculator guesses here. You&apos;ll get a written quote for exactly what you need.</p>
              </>
            ) : (
              <>
                <p className="mt-3 font-display text-[2.6rem] leading-none" aria-live="polite">
                  {formatPrice(est.totalCents)}
                </p>
                <ul className="mt-4 space-y-1.5 text-sm text-sand/90">
                  {est.lines.map((l) => (
                    <li key={l.label} className="flex justify-between gap-4">
                      <span>{l.label}</span>
                      <span>{formatPrice(l.cents)}</span>
                    </li>
                  ))}
                </ul>
                <ul className="mt-3 space-y-1 border-t border-sand/15 pt-3 text-xs text-sand/70">
                  {est.quotedItems.map((q) => (
                    <li key={q}>+ {q}</li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-5 text-xs text-sand/70">An estimate from our published rates, not a booking. We&apos;ll confirm everything with you personally.</p>
          </div>
        </aside>
      </div>
    </form>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/70 py-1 sm:block sm:border-0">
      <dt className="text-muted">{k}</dt>
      <dd className="font-medium">{v || "–"}</dd>
    </div>
  );
}
