"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { site } from "@/content/site";
import { publicEnv } from "@/lib/env";
import { emitFlick } from "@/components/flick/bus";
import { Lockup } from "@/components/ui/Logo";
import type { NavItem } from "./NavLinks";

/**
 * Full-height mobile menu built on the native <dialog>: focus is trapped by the
 * browser, Escape closes it, focus returns to the trigger, and the page behind
 * is inert.
 */
export function MobileNav({ items, bookLabel }: { items: NavItem[]; bookLabel: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => ref.current?.close(), []);

  const open = () => {
    const d = ref.current;
    if (!d) return;
    d.showModal();
    document.documentElement.style.overflow = "hidden";
    emitFlick({ type: "pause", reason: "menu" });
  };

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onClose = () => {
      document.documentElement.style.overflow = "";
      emitFlick({ type: "resume", reason: "menu" });
      triggerRef.current?.focus();
    };
    d.addEventListener("close", onClose);
    return () => d.removeEventListener("close", onClose);
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-ink/20 text-sm font-semibold sm:px-4 lg:hidden"
        aria-haspopup="dialog"
      >
        <span className="flex w-4 flex-col gap-[5px]" aria-hidden>
          <span className="h-[1.5px] w-full bg-ink" />
          <span className="h-[1.5px] w-full bg-ink" />
        </span>
        <span className="max-sm:sr-only">Menu</span>
      </button>
      <dialog
        ref={ref}
        aria-label="Site menu"
        className="m-0 h-dvh max-h-none w-full max-w-none bg-parchment p-0 text-ink backdrop:bg-ink/60 open:flex open:flex-col"
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
      >
        <div className="flex h-[4.25rem] items-center justify-between border-b border-line px-5">
          <Link href="/" onClick={close} className="-m-2 rounded-lg p-2">
            <Lockup />
          </Link>
          <button
            type="button"
            onClick={close}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-ink/20 px-4 text-sm font-semibold"
          >
            Close<span className="sr-only"> menu</span>
          </button>
        </div>
        <nav aria-label="Mobile" className="flex flex-1 flex-col overflow-y-auto px-5 pb-8 pt-6">
          <ul className="space-y-1">
            {[{ label: "Home", href: "/" }, ...items, { label: "Journal", href: "/journal" }, { label: "Contact", href: "/contact" }].map(
              (item, i) => (
                <li key={item.href} style={{ animationDelay: `${i * 35}ms` }} className="animate-[flick-bubble_420ms_var(--ease-out-soft)_both]">
                  <Link
                    href={item.href}
                    onClick={close}
                    className="flex min-h-14 items-center justify-between border-b border-line/80 font-display text-[1.9rem] leading-none"
                  >
                    {item.label}
                    <span aria-hidden className="text-clay">→</span>
                  </Link>
                </li>
              ),
            )}
          </ul>
          <div className="mt-auto space-y-4 pt-10">
            <Link
              href={site.bookCta.href}
              onClick={close}
              className="flex min-h-14 w-full items-center justify-center rounded-full bg-ink text-base font-semibold text-gallery"
            >
              {bookLabel}
            </Link>
            <p className="text-center text-sm text-muted">
              {publicEnv.contactEmail ? (
                <a href={`mailto:${publicEnv.contactEmail}`} className="underline">
                  {publicEnv.contactEmail}
                </a>
              ) : (
                site.region
              )}
            </p>
          </div>
        </nav>
      </dialog>
    </>
  );
}
