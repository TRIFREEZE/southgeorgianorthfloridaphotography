"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { discardAction, publishAction } from "@/app/admin/cms-actions";
import type { Pending } from "@/lib/cms/ops";
import { Btn, useConfirm, useToast } from "./ui";

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const CONTENT_LABEL: Record<string, string> = {
  layout: "site photo placements",
  categories: "categories",
  pricing: "pricing",
  texts: "page text",
  faqs: "FAQs",
  testimonials: "testimonials",
};

export function describePending(p: Pending) {
  const parts = [
    p.newPhotos && plural(p.newPhotos, "new photo"),
    p.editedPhotos && plural(p.editedPhotos, "edited photo"),
    p.deletions && plural(p.deletions, "deletion"),
    ...p.content.map((k) => CONTENT_LABEL[k] ?? k),
  ].filter(Boolean);
  return parts.join(", ");
}

/** Always-visible status of unpublished work, with Preview / Publish / Discard. */
export function PublishBar({ pending }: { pending: Pending }) {
  const router = useRouter();
  const toast = useToast();
  const { ask, ui } = useConfirm();
  const [busy, start] = useTransition();
  const has = pending.total > 0;

  const publish = async () => {
    const ok = await ask({
      title: "Publish to the live site?",
      body: (
        <>
          <p>
            Visitors will see these changes right away:{" "}
            {describePending(pending)}.
          </p>
          {pending.deletions > 0 && (
            <p className="mt-2 font-semibold">
              {plural(pending.deletions, "photo")} will be permanently deleted.
            </p>
          )}
        </>
      ),
      action: "Publish now",
    });
    if (!ok) return;
    start(async () => {
      const r = await publishAction();
      if (r.ok) toast("Published. The live site is updated.");
      else toast(r.error, "error");
      router.refresh();
    });
  };

  const discard = async () => {
    const ok = await ask({
      title: "Discard all unpublished changes?",
      body: (
        <>
          <p>
            Everything goes back to what&apos;s live now:{" "}
            {describePending(pending)}.
          </p>
          {pending.newPhotos > 0 && (
            <p className="mt-2 font-semibold">
              {plural(pending.newPhotos, "new upload")} will be removed.
            </p>
          )}
        </>
      ),
      action: "Discard changes",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      const r = await discardAction();
      if (r.ok) toast("Changes discarded.");
      else toast(r.error, "error");
      router.refresh();
    });
  };

  return (
    <div
      className={`sticky top-0 z-40 border-b ${has ? "border-clay/40 bg-[#f3e4dc]" : "border-line bg-parchment/95"} backdrop-blur`}
      data-testid="publish-bar"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-2.5">
        <p className="text-sm" aria-live="polite">
          {has ? (
            <>
              <strong>Unpublished changes:</strong>{" "}
              <span data-testid="pending-summary">
                {describePending(pending)}
              </span>
            </>
          ) : (
            <span className="text-muted">
              Everything is published. The live site matches your dashboard.
            </span>
          )}
          {pending.blockers.length > 0 && (
            <span className="mt-1 block text-[#7d2a20]">
              {pending.blockers[0]}
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/preview"
            className="inline-flex min-h-9 items-center rounded-full border border-ink/25 bg-parchment px-3 text-sm font-semibold hover:border-ink/60"
          >
            Preview
          </Link>
          <Btn
            size="sm"
            variant="secondary"
            onClick={discard}
            disabled={!has || busy}
          >
            Discard
          </Btn>
          <Btn
            size="sm"
            variant="clay"
            onClick={publish}
            disabled={!has || busy || pending.blockers.length > 0}
            data-testid="publish"
          >
            {busy ? "Working…" : "Publish"}
          </Btn>
        </div>
      </div>
      {ui}
    </div>
  );
}
