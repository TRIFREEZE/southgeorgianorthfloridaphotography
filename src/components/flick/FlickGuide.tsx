"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { bookingCategories, services } from "@/content/services";
import { formatPrice, pricing } from "@/content/pricing";
import { isPackageEligible } from "@/lib/inquiry/estimate";
import { FlickSVG } from "./FlickSVG";
import { guideTopics, searchGuide, type GuideAnswer } from "./guide";

/**
 * "Ask Flick": an accessible modal guide with structured answers from the
 * site's own content. Explicitly not an AI chatbot.
 */
export function FlickGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [answer, setAnswer] = useState<GuideAnswer | null>(null);
  const [matching, setMatching] = useState(false);
  const [q, setQ] = useState("");
  const [miss, setMiss] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const h = () => onClose();
    d.addEventListener("close", h);
    return () => d.removeEventListener("close", h);
  }, [onClose]);

  const reset = () => {
    setAnswer(null);
    setMatching(false);
    setMiss(false);
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="flick-guide-title"
      className="m-auto w-[min(34rem,calc(100vw-1.5rem))] max-h-[min(44rem,calc(100dvh-1.5rem))] overflow-hidden rounded-[1.4rem] bg-gallery p-0 text-ink shadow-2xl backdrop:bg-ink/50"
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
    >
      <div className="flex max-h-[inherit] flex-col">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <FlickSVG className="h-12 w-12 shrink-0" mood="happy" />
          <div className="min-w-0 flex-1">
            <h2 id="flick-guide-title" className="font-display text-[1.4rem] leading-tight">
              Ask Flick
            </h2>
            <p className="text-xs text-muted">Quick answers from this website. I&apos;m a guide, not an AI chatbot.</p>
          </div>
          <button type="button" onClick={() => ref.current?.close()} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-ink/20 px-4 text-sm font-semibold">
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <form
            role="search"
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const hit = searchGuide(q);
              setMatching(false);
              setAnswer(hit);
              setMiss(!hit);
            }}
          >
            <label htmlFor="flick-q" className="sr-only">
              Ask a question
            </label>
            <input id="flick-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. how much for 20 photos?" className="field" autoComplete="off" />
            <button className="min-h-12 shrink-0 rounded-full bg-ink px-5 text-sm font-semibold text-gallery">Ask</button>
          </form>

          <div aria-live="polite" className="mt-5">
            {miss && (
              <div className="rounded-xl bg-parchment p-4">
                <p>I don&apos;t know that one, and I&apos;d rather not guess. A real person can answer:</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/contact" onClick={() => ref.current?.close()} className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-semibold text-gallery">
                    Ask a human
                  </Link>
                  <Link href="/faq" onClick={() => ref.current?.close()} className="inline-flex min-h-11 items-center rounded-full border border-ink/25 px-4 text-sm font-semibold">
                    Browse FAQs
                  </Link>
                </div>
              </div>
            )}
            {answer && (
              <div className="rounded-xl bg-parchment p-4">
                <p className="font-display text-[1.2rem]">{answer.question}</p>
                <p className="mt-2 text-[0.96rem] text-ink-soft">{answer.answer}</p>
                {answer.links && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {answer.links.map((l) => (
                      <Link key={l.href} href={l.href} onClick={() => ref.current?.close()} className="inline-flex min-h-11 items-center rounded-full border border-ink/25 px-4 text-sm font-semibold hover:border-ink">
                        {l.label}
                      </Link>
                    ))}
                  </div>
                )}
                <button type="button" onClick={reset} className="mt-3 min-h-11 text-sm underline">
                  Ask something else
                </button>
              </div>
            )}
            {matching && (
              <div className="rounded-xl bg-parchment p-4">
                <p className="font-display text-[1.2rem]">Which session fits me?</p>
                <p className="mt-1 text-sm text-muted">Pick what you&apos;re photographing:</p>
                <ul className="mt-3 space-y-2">
                  {bookingCategories.map((c) => {
                    const svc = services.find((s) => s.bookingCategory === c.id);
                    return (
                      <li key={c.id} className="rounded-lg border border-line bg-gallery p-3">
                        <p className="font-semibold">{c.label}</p>
                        <p className="text-sm text-muted">
                          {isPackageEligible(c.id)
                            ? `Priced by photos: from ${formatPrice(pricing.packages[0].priceCents)} for ${pricing.packages[0].photos}. ${pricing.packages[1].name} (${pricing.packages[1].photos} photos, ${formatPrice(pricing.packages[1].priceCents)}) is our recommended start.`
                            : c.id === "other"
                              ? "Tell us your idea and we'll suggest the right setup."
                              : "Custom quote with clear coverage and deliverables."}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {svc && (
                            <Link href={`/services/${svc.slug}`} onClick={() => ref.current?.close()} className="inline-flex min-h-11 items-center rounded-full border border-ink/25 px-3 text-sm font-semibold">
                              Learn more
                            </Link>
                          )}
                          <Link href={`/book?category=${c.id}`} onClick={() => ref.current?.close()} className="inline-flex min-h-11 items-center rounded-full bg-ink px-3 text-sm font-semibold text-gallery">
                            Start booking
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <button type="button" onClick={reset} className="mt-3 min-h-11 text-sm underline">
                  Back to topics
                </button>
              </div>
            )}
          </div>

          {!answer && !matching && !miss && (
            <ul className="mt-1 flex flex-wrap gap-2" aria-label="Popular questions">
              <li>
                <button type="button" onClick={() => setMatching(true)} className="min-h-11 rounded-full border border-ink bg-ink px-4 text-sm font-semibold text-gallery">
                  Which session fits me?
                </button>
              </li>
              {guideTopics.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => setAnswer(t)} className="min-h-11 rounded-full border border-ink/20 bg-parchment px-4 text-sm hover:border-ink/50">
                    {t.question}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </dialog>
  );
}
