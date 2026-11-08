"use client";

import { useActionState } from "react";
import { unlockGallery } from "./actions";

export function UnlockForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(unlockGallery, undefined);
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <label className="block text-sm font-semibold">
        Gallery password
        <input name="password" type="password" required autoComplete="current-password" className="field mt-1.5" aria-describedby={state?.error ? "unlock-error" : undefined} data-testid="gallery-unlock-password" />
      </label>
      {state?.error && (
        <p id="unlock-error" role="alert" className="text-sm font-semibold text-[#7d2a20]">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-6 font-semibold text-gallery hover:bg-ink-soft disabled:opacity-60">
        {pending ? "Checking…" : "Open gallery"}
      </button>
    </form>
  );
}
