"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function FieldShell({
  id,
  label,
  hint,
  error,
  optional,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-3 text-[0.92rem] font-semibold">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-muted">Optional</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.82rem] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[0.85rem] font-medium text-[#a3392b]">
          {error}
        </p>
      )}
    </div>
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
  ...input
}: { id: string; label: ReactNode; hint?: ReactNode; error?: string; optional?: boolean } & ComponentProps<"input">) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <input id={id} className="field" aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} {...input} />
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
      <select id={id} className="field appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20d%3D%22M5%208l5%205%205-5%22%20fill%3D%22none%22%20stroke%3D%22%23252723%22%20stroke-width%3D%221.6%22/%3E%3C/svg%3E')] bg-[length:1.1rem] bg-[right_0.9rem_center] bg-no-repeat pr-10" aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} {...input}>
        {children}
      </select>
    </FieldShell>
  );
}

export function Checkbox({
  id,
  label,
  error,
  ...input
}: { id: string; label: ReactNode; error?: string } & ComponentProps<"input">) {
  return (
    <div>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 text-[0.92rem] leading-snug">
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--color-clay-deep)]"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...input}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="mt-1 pl-8 text-[0.85rem] font-medium text-[#a3392b]">
          {error}
        </p>
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
