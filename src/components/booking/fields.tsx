"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { emailProblem, emailSuggestion, SOCIAL_WHY } from "@/lib/inquiry/checks";

export function FieldShell({
  id,
  label,
  hint,
  error,
  optional,
  nudge,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  /** A "type here" guide shown beside the label when this is the next thing to fill in. */
  nudge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex flex-wrap items-end gap-x-3 gap-y-1.5 text-[0.92rem] font-semibold">
        <span>{label}</span>
        {/* Right after the label (not at the far edge, where Flick sits on phones). */}
        {nudge && <TapHint size="sm">{nudge}</TapHint>}
        {optional && <span className="ml-auto text-xs font-normal text-muted">Optional</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.82rem] text-muted">
          {hint}
        </p>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

function FieldError({ id, children, className = "" }: { id: string; children: ReactNode; className?: string }) {
  return (
    <p id={id} className={`mt-1.5 flex items-start gap-1.5 text-[0.9rem] font-semibold text-[#a3392b] ${className}`}>
      <WarnIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

const describedBy = (id: string, hint?: ReactNode, error?: string) =>
  [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;

export function TextField({
  id,
  label,
  hint,
  error,
  optional,
  nudge,
  ...input
}: { id: string; label: ReactNode; hint?: ReactNode; error?: string; optional?: boolean; nudge?: ReactNode } & ComponentProps<"input">) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} nudge={nudge}>
      <input id={id} className={`field ${nudge ? "attention" : ""}`} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} {...input} />
    </FieldShell>
  );
}

export function TextArea({
  id,
  label,
  hint,
  error,
  optional,
  ...input
}: { id: string; label: ReactNode; hint?: ReactNode; error?: string; optional?: boolean } & ComponentProps<"textarea">) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <textarea id={id} className="field min-h-32 resize-y" aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} {...input} />
    </FieldShell>
  );
}

export function SelectField({
  id,
  label,
  hint,
  error,
  optional,
  children,
  ...input
}: { id: string; label: ReactNode; hint?: ReactNode; error?: string; optional?: boolean; children: ReactNode } & ComponentProps<"select">) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <select id={id} className="field" aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} {...input}>
        {children}
      </select>
    </FieldShell>
  );
}

export function Checkbox({
  id,
  label,
  error,
  nudge,
  ...input
}: { id: string; label: ReactNode; error?: string; nudge?: ReactNode } & ComponentProps<"input">) {
  return (
    <div>
      {nudge && (
        <TapHint point="down" className="mb-2">
          {nudge}
        </TapHint>
      )}
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 text-[0.92rem] leading-snug">
        <input
          id={id}
          type="checkbox"
          className={`mt-0.5 h-6 w-6 shrink-0 cursor-pointer rounded accent-[var(--color-clay-deep)] ${nudge ? "attention" : ""}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...input}
        />
        <span>{label}</span>
      </label>
      {error && (
        <FieldError id={`${id}-error`} className="pl-9">
          {error}
        </FieldError>
      )}
    </div>
  );
}

export function ConsentLabel() {
  return (
    <>
      I agree to the{" "}
      <Link href="/privacy" className="underline" target="_blank">
        privacy policy
      </Link>{" "}
      and understand this is an inquiry, not a confirmed booking.
    </>
  );
}

/** Off-screen honeypot. Real people never see or fill it. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor="company_website">Company website (leave blank)</label>
      <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
}

export function FormAlert({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-[#a3392b]/30 bg-[#a3392b]/[0.06] px-4 py-3 text-[0.92rem] text-[#7d2a20]">
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ guidance */

/** "Tap" on phones and tablets, "Click" with a mouse. */
export function Verb({ lower = false }: { lower?: boolean }) {
  return (
    <>
      <span className="tap-touch">{lower ? "tap" : "Tap"}</span>
      <span className="tap-mouse">{lower ? "click" : "Click"}</span>
    </>
  );
}

function HandIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 13V4.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M11 11.5v-2a1.5 1.5 0 1 1 3 0V12" />
      <path d="M14 10.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M17 11.5a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-2 .21a6 6 0 0 1-5.01-2.7l-.2-.3c-.31-.48-1.4-2.39-3.29-5.73a1.5 1.5 0 0 1 .54-2.02 1.87 1.87 0 0 1 2.28.28L8 13" />
    </svg>
  );
}

/**
 * A gently bobbing "tap here" bubble with a pressing finger, pointing at the next thing to do.
 * Decorative (the step instructions say the same in words), and never blocks a tap.
 */
export function TapHint({ children, point = "down", size = "md", float = false, className = "" }: { children: ReactNode; point?: "down" | "up" | "left"; size?: "sm" | "md"; /** Hovering over a button: never wraps. */ float?: boolean; className?: string }) {
  const turn = point === "down" ? "rotate-180" : point === "left" ? "-rotate-90" : "";
  return (
    <span
      aria-hidden
      data-testid="tap-hint"
      className={`tap-hint pointer-events-none inline-flex w-max items-center ${float ? "whitespace-nowrap" : "max-w-full"} rounded-full bg-clay-deep font-sans font-semibold text-gallery shadow-[0_6px_18px_-6px_rgb(37_39_35/0.45)] ${size === "sm" ? "gap-1.5 px-2.5 py-1 text-[0.78rem]" : "gap-2 px-3.5 py-1.5 text-[0.9rem]"} ${className}`}
    >
      <span className={`relative inline-grid shrink-0 place-items-center ${size === "sm" ? "h-5 w-5" : "h-6 w-6"}`}>
        <span className="tap-ripple absolute inset-0 rounded-full bg-gallery/45" />
        <span className={`relative ${turn}`}>
          <HandIcon className={`tap-hand ${size === "sm" ? "h-4 w-4" : "h-5 w-5"}`} />
        </span>
      </span>
      <span>{children}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ errors */

function WarnIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M8.48 2.9a1.75 1.75 0 0 1 3.04 0l6.25 11.1A1.75 1.75 0 0 1 16.25 16.6H3.75a1.75 1.75 0 0 1-1.52-2.6L8.48 2.9ZM10 6.5a.9.9 0 0 0-.9.9v3.7a.9.9 0 1 0 1.8 0V7.4a.9.9 0 0 0-.9-.9Zm0 8.1a1.05 1.05 0 1 0 0-2.1 1.05 1.05 0 0 0 0 2.1Z" clipRule="evenodd" />
    </svg>
  );
}

/** Scrolls an element to just under the sticky header and moves focus to it. */
export function jumpTo(el: HTMLElement | null, block: "start" | "center" = "start") {
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const r = el.getBoundingClientRect();
  const header = Math.max(0, document.querySelector("header")?.getBoundingClientRect().bottom ?? 0);
  const top = block === "center" ? window.scrollY + r.top - (window.innerHeight - r.height) / 2 : window.scrollY + r.top - header - 20;
  window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
  el.focus({ preventScroll: true });
}

export interface ErrorItem {
  key: string;
  label: string;
  message: string;
}

/**
 * A clear box listing everything that needs fixing, in plain words. Each time `tick` changes
 * (a failed Continue or Send) the page glides up to it so nobody misses it.
 */
export function ErrorSummary({ tick, message, items, onFix }: { tick: number; message?: string; items: ErrorItem[]; onFix?: (key: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const show = Boolean(message) || items.length > 0;
  useEffect(() => {
    if (tick && show) requestAnimationFrame(() => jumpTo(ref.current));
    // Only on a new failed attempt, not while the visitor is fixing things.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
  return (
    <div ref={ref} tabIndex={-1} className="scroll-mt-28 outline-none" data-testid={show ? "error-summary" : undefined}>
      {show && (
        <div key={tick} role="alert" className="error-summary rounded-2xl border-2 border-[#a3392b]/45 bg-[#fbeeea] p-5 text-[#7d2a20]">
          <p className="flex items-start gap-2 text-[1.08rem] font-bold leading-snug">
            <WarnIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <span>
              {items.length === 0
                ? "We couldn't send this yet."
                : items.length === 1
                  ? "One thing needs fixing before we can continue:"
                  : `${items.length} things need fixing before we can continue:`}
            </span>
          </p>
          {message && <p className="mt-2 text-[0.98rem]">{message}</p>}
          {items.length > 0 && (
            <ul className="mt-3 space-y-3">
              {items.map((i) => (
                <li key={i.key} className="rounded-xl bg-white/70 p-3.5 text-[0.98rem] leading-snug">
                  <p>
                    <strong>{i.label}:</strong> {i.message}
                  </p>
                  {onFix && (
                    <button
                      type="button"
                      onClick={() => onFix(i.key)}
                      className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#a3392b] px-4 text-[0.92rem] font-semibold text-white hover:bg-[#8a2f23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3392b]"
                      data-testid="error-fix"
                    >
                      Take me there to fix it
                      <span aria-hidden>↓</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Puts a field on screen and the cursor in it. */
export function focusField(id: string) {
  const el = document.getElementById(id) ?? document.querySelector<HTMLElement>("[data-error-anchor]");
  if (el) jumpTo(el, "center");
}

/* ------------------------------------------------------------------ email + social */

/**
 * Email with friendly checks as soon as the visitor leaves the box: what's wrong in
 * plain words ("missing the @ sign"), and a one-tap fix for typos like "gmial.com".
 */
export function EmailField({
  id,
  error,
  nudge,
  onUse,
  ...input
}: { id: string; error?: string; nudge?: ReactNode; /** Called with the corrected address when the visitor accepts a suggestion. */ onUse?: (v: string) => void } & ComponentProps<"input">) {
  const [early, setEarly] = useState<string | null>(null);
  const [suggest, setSuggest] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const shown = error ?? early ?? undefined;
  const use = () => {
    if (!suggest) return;
    if (ref.current) ref.current.value = suggest;
    onUse?.(suggest);
    setSuggest(null);
    setEarly(null);
    ref.current?.focus();
  };
  return (
    <div>
      <TextField
        ref={ref}
        id={id}
        type="email"
        label="Email"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="name@example.com"
        hint="We'll reply here, so please double-check it."
        error={shown}
        nudge={nudge}
        {...input}
        onBlur={(e) => {
          const v = e.target.value;
          setEarly(v.trim() ? emailProblem(v) : null);
          setSuggest(emailSuggestion(v));
          input.onBlur?.(e);
        }}
        onChange={(e) => {
          if (early && !emailProblem(e.target.value)) setEarly(null);
          if (suggest) setSuggest(null);
          input.onChange?.(e);
        }}
      />
      {suggest && !shown && (
        <p className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-[#fff6dd] px-3 py-2 text-[0.92rem] text-ink" role="status" data-testid="email-suggestion">
          <span>
            Did you mean <strong className="break-all">{suggest}</strong>?
          </span>
          <button type="button" onClick={use} className="min-h-10 rounded-full bg-ink px-3.5 text-sm font-semibold text-gallery">
            Yes, use that
          </button>
          <button type="button" onClick={() => setSuggest(null)} className="min-h-10 px-2 text-sm underline">
            No, mine is right
          </button>
        </p>
      )}
    </div>
  );
}

/** Facebook, Instagram or other profile link, with why we ask and how to find it. */
export function SocialField({ id, error, nudge, ...input }: { id: string; error?: string; nudge?: ReactNode } & ComponentProps<"input">) {
  return (
    <div>
      <TextField
        id={id}
        name="social"
        label="Facebook, Instagram or other social media link"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="facebook.com/yourname or @yourname"
        error={error}
        nudge={nudge}
        required
        {...input}
      />
      <p className="mt-2 rounded-xl bg-gallery px-3.5 py-2.5 text-[0.88rem] leading-snug text-ink-soft" data-testid="social-why">
        {SOCIAL_WHY}
      </p>
      <details className="mt-2 text-[0.88rem]">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-clay-deep underline underline-offset-4">How do I find my link?</summary>
        <ul className="mt-1 list-disc space-y-1.5 pl-5 text-ink-soft">
          <li>
            <strong>Facebook on a phone:</strong> open your profile, <Verb lower /> the <strong>⋯</strong> button, then <strong>Copy profile link</strong>, and paste it here.
          </li>
          <li>
            <strong>On a computer:</strong> open your profile and copy the web address from the bar at the very top of the window.
          </li>
          <li>
            <strong>Instagram, TikTok and others:</strong> just type your username with an @ in front, like <strong>@janesmith</strong>.
          </li>
          <li>Any page that shows it&apos;s you works too, like LinkedIn or a business page.</li>
        </ul>
      </details>
    </div>
  );
}
