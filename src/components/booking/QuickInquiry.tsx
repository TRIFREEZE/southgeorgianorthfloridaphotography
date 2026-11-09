"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OTHER_BOOKING, type BookingOption } from "@/lib/cms/sessions";
import { useFavorites } from "@/lib/favorites";
import { Button } from "@/components/ui/primitives";
import { captureAttribution } from "./attribution";
import { emailProblem, socialProblem } from "@/lib/inquiry/checks";
import { emitFlick } from "@/components/flick/bus";
import { Checkbox, ConsentLabel, EmailField, ErrorSummary, focusField, Honeypot, SelectField, SocialField, TextArea, TextField } from "./fields";
import { Turnstile } from "./Turnstile";
import { useInquirySubmit } from "./useInquirySubmit";

/**
 * Short inquiry form. Works without JavaScript (plain POST to /api/inquiry,
 * which redirects to the thank-you page); with JS it submits in place with
 * inline, announced errors.
 */
export function QuickInquiry({
  kind = "quick",
  defaultCategory,
  idPrefix = "qi",
  submitLabel = "Send my inquiry",
  compact = false,
  options = [OTHER_BOOKING],
}: {
  kind?: "quick" | "contact";
  defaultCategory?: string;
  /** Session types from the owner's categories (server: `bookingOptions(content)`). */
  options?: Pick<BookingOption, "bookingId" | "label">[];
  idPrefix?: string;
  submitLabel?: string;
  compact?: boolean;
}) {
  const { state, submit, tick: serverTick, clearField } = useInquirySubmit();
  const [local, setLocal] = useState<Record<string, string>>({});
  const [localTick, setLocalTick] = useState(0);
  const [token, setToken] = useState("");
  const [phone, setPhone] = useState("");
  const favorites = useFavorites();
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
    captureAttribution();
  }, []);

  const onToken = useCallback((t: string) => setToken(t), []);
  const errors: Record<string, string> = { ...(state.status === "error" ? state.fields : {}), ...local };
  const id = (n: string) => `${idPrefix}-${n}`;
  const labels: Record<string, string> = { name: "Your name", email: "Email", social: "Facebook or Instagram name", phone: "Phone", category: "What we're photographing", message: "Your idea", consent: "Privacy agreement", form: "Form" };
  const order = ["name", "email", "social", "category", "phone", "smsOptIn", "message", "consent"];
  const items = Object.entries(errors)
    .filter(([, m]) => m)
    .sort(([a], [b]) => (order.indexOf(a) + 99) % 99 - (order.indexOf(b) + 99) % 99)
    .map(([key, message]) => ({ key, label: labels[key] ?? "Form", message }));
  const fieldIds: Record<string, string> = { smsOptIn: id("sms") };
  const forget = (name: string) => {
    clearField(name);
    setLocal((e) => {
      if (!e[name]) return e;
      const n = { ...e };
      delete n[name];
      return n;
    });
  };

  return (
    <form
      action="/api/inquiry"
      method="post"
      noValidate
      className="relative space-y-5"
      data-flick-avoid
      onChange={(e) => {
        const name = (e.target as unknown as { name?: string }).name;
        if (name) forget(name);
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const str = (k: string) => String(fd.get(k) ?? "");
        // Check in the browser first, so problems are explained right away in plain words.
        const problems: Record<string, string> = {};
        if (!str("name").trim()) problems.name = "Please type your name.";
        const em = emailProblem(str("email"));
        if (em) problems.email = em;
        const so = socialProblem(str("social"));
        if (so) problems.social = so;
        if (fd.get("smsOptIn") === "on" && !str("phone").trim()) problems.phone = "Add a phone number to receive texts, or untick the text option.";
        if (!str("message").trim()) problems.message = "Tell us a little about what you have in mind. A sentence is plenty.";
        if (fd.get("consent") !== "on") problems.consent = "Please tick the box to agree to the privacy policy, so we're allowed to reply.";
        setLocal(problems);
        if (Object.keys(problems).length) {
          emitFlick({ type: "form-error" });
          setLocalTick((t) => t + 1);
          return;
        }
        void submit({
          kind,
          category: fd.get("category"),
          name: fd.get("name"),
          email: fd.get("email"),
          social: fd.get("social"),
          phone: fd.get("phone"),
          smsOptIn: fd.get("smsOptIn") === "on",
          message: fd.get("message"),
          consent: fd.get("consent") === "on",
          company_website: fd.get("company_website"),
          startedAt: startedAt.current,
          turnstileToken: token,
          inspirationIds: favorites,
        });
      }}
    >
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="source" value="form" />
      <Honeypot />

      <ErrorSummary tick={localTick + serverTick} message={state.status === "error" && !Object.keys(local).length ? state.message : undefined} items={items} onFix={(k) => focusField(fieldIds[k] ?? id(k))} />

      <div className={`grid gap-5 ${compact ? "" : "sm:grid-cols-2"}`}>
        <TextField id={id("name")} name="name" label="Your name" autoComplete="name" required error={errors.name} />
        <EmailField id={id("email")} name="email" required error={errors.email} onUse={() => forget("email")} />
      </div>
      <SocialField id={id("social")} error={errors.social} />
      <div className={`grid gap-5 ${compact ? "" : "sm:grid-cols-2"}`}>
        <SelectField id={id("category")} name="category" label="What are we photographing?" defaultValue={defaultCategory ?? options[0]?.bookingId ?? "other"} error={errors.category}>
          {options.map((c) => (
            <option key={c.bookingId} value={c.bookingId}>
              {c.label}
            </option>
          ))}
        </SelectField>
        <TextField
          id={id("phone")}
          name="phone"
          type="tel"
          label="Phone"
          optional
          autoComplete="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
        />
      </div>
      {phone.trim() && (
        <Checkbox
          id={id("sms")}
          name="smsOptIn"
          label="It's okay to text me about this inquiry. Message and data rates may apply. Reply STOP to opt out."
          error={errors.smsOptIn}
        />
      )}
      <TextArea
        id={id("message")}
        name="message"
        label="Tell us your idea"
        hint="Who's in the photo, where you're thinking, any date in mind. A sentence or two is plenty."
        required
        rows={compact ? 4 : 5}
        error={errors.message}
      />
      {favorites.length > 0 && (
        <p className="text-sm text-muted">
          {favorites.length} saved inspiration photo{favorites.length === 1 ? "" : "s"} will be attached.
        </p>
      )}
      <Checkbox id={id("consent")} name="consent" label={<ConsentLabel />} required error={errors.consent} />
      <input type="hidden" name="startedAt" value="0" />
      <Turnstile onToken={onToken} />
      <Button type="submit" disabled={state.status === "submitting"} aria-disabled={state.status === "submitting"} className="w-full sm:w-auto">
        {state.status === "submitting" ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gallery/40 border-t-gallery" aria-hidden />
            Sending…
          </>
        ) : (
          submitLabel
        )}
      </Button>
      <p className="sr-only" aria-live="polite">
        {state.status === "submitting" ? "Sending your inquiry" : ""}
      </p>
    </form>
  );
}
