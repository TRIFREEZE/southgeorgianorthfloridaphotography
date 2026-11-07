"use client";

import { useActionState } from "react";
import { loginAction, type ActionState } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      {state.error && (
        <p role="alert" className="rounded-lg bg-[#a3392b]/10 px-4 py-3 text-sm text-[#7d2a20]">
          {state.error}
        </p>
      )}
      <label className="block text-sm font-semibold">
        Email
        <input name="email" type="email" autoComplete="username" required className="field mt-1.5" />
      </label>
      <label className="block text-sm font-semibold">
        Password
        <input name="password" type="password" autoComplete="current-password" required className="field mt-1.5" />
      </label>
      <button disabled={pending} className="min-h-12 w-full rounded-full bg-ink font-semibold text-gallery disabled:opacity-60">
        {pending ? "Checking…" : "Log in"}
      </button>
      <p className="text-xs text-muted">Accounts are managed in Supabase → Authentication → Users. Only emails listed in ADMIN_EMAILS can sign in.</p>
    </form>
  );
}
