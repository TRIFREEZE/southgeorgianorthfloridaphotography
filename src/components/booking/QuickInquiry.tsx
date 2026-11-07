"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { bookingCategories, type BookingCategory } from "@/content/services";
import { useFavorites } from "@/lib/favorites";
import { Button } from "@/components/ui/primitives";
import { captureAttribution } from "./attribution";
import { Checkbox, ConsentLabel, FormAlert, Honeypot, SelectField, TextArea, TextField } from "./fields";
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
}: {
  kind?: "quick" | "contact";
  defaultCategory?: BookingCategory;
  idPrefix?: string;
  submitLabel?: string;
  compact?: boolean;
}) {
  const { state, submit } = useInquirySubmit();
  const [token, setToken] = useState("");
  const [phone, setPhone] = useState("");
  const favorites = useFavorites();
  const startedAt = useRef(0);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    captureAttribution();
  }, []);

  useEffect(() => {
    if (state.status === "error") errorRef.current?.focus();
  }, [state]);

  const onToken = useCallback((t: string) => setToken(t), []);
  const errors = state.status === "error" ? state.fields : {};
  const id = (n: string) => `${idPrefix}-${n}`;

  return (
    <form
      action="/api/inquiry"
      method="post"
      noValidate
      className="relative space-y-5"
      data-flick-avoid
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        void submit({
          kind,
          category: fd.get("category"),
          name: fd.get("name"),
          email: fd.get("email"),
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

      <div ref={errorRef} tabIndex={-1} className="outline-none">
        {state.status === "error" && <FormAlert message={state.message} />}
      </div>

      <div className={`grid gap-5 ${compact ? "" : "sm:grid-cols-2"}`}>
        <TextField id={id("name")} name="name" label="Your name" autoComplete="name" required error={errors.name} />
        <TextField id={id("email")} name="email" type="email" label="Email" autoComplete="email" inputMode="email" required error={errors.email} />
      </div>
      <div className={`grid gap-5 ${compact ? "" : "sm:grid-cols-2"}`}>
        <SelectField id={id("category")} name="category" label="What are we photographing?" defaultValue={defaultCategory ?? "people"} error={errors.category}>
          {bookingCategories.map((c) => (
            <option key={c.id} value={c.id}>
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
