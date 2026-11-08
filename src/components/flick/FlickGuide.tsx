"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatPrice, pricedPackages } from "@/content/pricing";
import { FlickSVG } from "./FlickSVG";
import type { FlickMood } from "./types";
import { buildGuide, searchGuide, type GuideAnswer, type GuideData, type GuideLink } from "./guide";

/**
 * "Ask Flick": an accessible chat-style guide with answers assembled from the
 * site's own content. Explicitly not an AI chatbot: it never invents prices,
 * dates or availability, and says so when it doesn't know.
 */

type Msg =
  | { id: number; from: "you"; text: string }
  | { id: number; from: "flick"; kind: "hello" }
  | { id: number; from: "flick"; kind: "answer"; a: GuideAnswer; lead?: string }
  | { id: number; from: "flick"; kind: "unsure"; options: GuideAnswer[] }
  | { id: number; from: "flick"; kind: "miss" }
  | { id: number; from: "flick"; kind: "match" };

type DistOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type NewMsg = DistOmit<Msg, "id">;

const LEADS = ["Good question.", "Happy to help.", "Here's the short version.", "Glad you asked.", ""];
const STARTERS = ["cost", "where", "how", "time", "human"];

export function FlickGuide({ open, onClose, data }: { open: boolean; onClose: () => void; data: GuideData }) {
  const guide = useMemo(() => buildGuide(data), [data]);
  const ref = useRef<HTMLDialogElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);
  const timer = useRef<number | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, from: "flick", kind: "hello" }]);
  const [typing, setTyping] = useState(false);
  const [mood, setMood] = useState<FlickMood>("happy");
  const [q, setQ] = useState("");

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

  useEffect(() => () => void (timer.current && window.clearTimeout(timer.current)), []);

  // Keep the newest message in view.
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [msgs, typing]);

  const push = (m: NewMsg) => setMsgs((list) => [...list, { ...m, id: nextId.current++ } as Msg]);

  /** Flick "thinks" for a beat, then replies. Short and skippable: never more than about a second. */
  const reply = useCallback((m: NewMsg, thinkMs = 520) => {
    if (timer.current) window.clearTimeout(timer.current);
    setTyping(true);
    setMood("neutral");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer.current = window.setTimeout(
      () => {
        setTyping(false);
        setMood("kind" in m && (m.kind === "miss" || m.kind === "unsure") ? "surprised" : "happy");
        setMsgs((list) => [...list, { ...m, id: nextId.current++ } as Msg]);
      },
      reduce ? 0 : thinkMs + ((nextId.current * 97) % 260),
    );
  }, []);

  const ask = (text: string) => {
    const t = text.trim();
    if (!t) return;
    push({ from: "you", text: t });
    setQ("");
    if (/which session|what session|fits? me|help me (choose|pick)|not sure what/i.test(t)) return reply({ from: "flick", kind: "match" });
    const r = searchGuide(guide, t);
    if (r.best && r.confident) return reply({ from: "flick", kind: "answer", a: r.best, lead: LEADS[nextId.current % LEADS.length] }, 480 + Math.min(500, r.best.answer.length));
    if (r.best) return reply({ from: "flick", kind: "unsure", options: [r.best, ...r.also].slice(0, 3) });
    reply({ from: "flick", kind: "miss" });
  };

  const pick = (a: GuideAnswer) => {
    push({ from: "you", text: a.question });
    reply({ from: "flick", kind: "answer", a }, 420 + Math.min(500, a.answer.length));
  };

  const close = () => ref.current?.close();
  const restart = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setTyping(false);
    setMood("happy");
    setMsgs([{ id: nextId.current++, from: "flick", kind: "hello" }]);
    inputRef.current?.focus();
  };

  const starters = STARTERS.map((id) => guide.byId.get(id)).filter((a): a is GuideAnswer => Boolean(a));
  const lastId = msgs.at(-1)?.id;

  return (
    <dialog
      ref={ref}
      aria-labelledby="flick-guide-title"
      className="flick-guide m-auto w-[min(34rem,calc(100vw-1.5rem))] max-h-[min(46rem,calc(100dvh-1.5rem))] overflow-hidden rounded-[1.4rem] bg-gallery p-0 text-ink shadow-2xl backdrop:bg-ink/50"
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="flex h-[min(46rem,calc(100dvh-1.5rem))] max-h-[inherit] flex-col">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className={`relative inline-flex h-12 w-12 shrink-0 ${typing ? "flick-guide-thinking" : "flick-guide-idle"}`}>
            <FlickSVG className="h-12 w-12" mood={mood} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="flick-guide-title" className="font-display text-[1.4rem] leading-tight">
              Ask Flick
            </h2>
            <p className="text-xs text-muted">Answers from this website. I&apos;m a guide, not an AI chatbot.</p>
          </div>
          {msgs.length > 1 && (
            <button type="button" onClick={restart} className="hidden min-h-11 rounded-full px-3 text-sm font-semibold underline sm:inline-flex sm:items-center">
              Start over
            </button>
          )}
          <button type="button" onClick={close} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-ink/20 px-4 text-sm font-semibold">
            Close
          </button>
        </div>

        <div ref={logRef} role="log" aria-live="polite" aria-label="Conversation with Flick" className="flex-1 space-y-4 overflow-y-auto px-5 py-5" data-testid="flick-log">
          {msgs.map((m) =>
            m.from === "you" ? (
              <div key={m.id} className="flick-msg flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[0.96rem] text-gallery">{m.text}</p>
              </div>
            ) : (
              <FlickBubble key={m.id}>
                {m.kind === "hello" && (
                  <>
                    <p>Hi, I&apos;m Flick. Ask me about prices, sessions, where we work, or how it all goes. Or tap one of these:</p>
                    <Chips>
                      <Chip strong onClick={() => (push({ from: "you", text: "Which session fits me?" }), reply({ from: "flick", kind: "match" }))}>
                        Which session fits me?
                      </Chip>
                      {starters.map((a) => (
                        <Chip key={a.id} onClick={() => pick(a)}>
                          {a.question}
                        </Chip>
                      ))}
                    </Chips>
                  </>
                )}
                {m.kind === "answer" && (
                  <>
                    {m.lead && <p className="text-sm font-semibold text-clay-deep">{m.lead}</p>}
                    <p className="font-display text-[1.15rem] leading-snug">{m.a.question}</p>
                    <p className="mt-1.5 text-[0.96rem] text-ink-soft">{m.a.answer}</p>
                    {m.a.links && <Links links={m.a.links} onGo={close} />}
                    {m.id === lastId && (
                      <FollowUps
                        items={(m.a.followUps ?? []).map((id) => guide.byId.get(id)).filter((a): a is GuideAnswer => Boolean(a) && a!.id !== m.a.id)}
                        onPick={pick}
                        onMatch={() => (push({ from: "you", text: "Which session fits me?" }), reply({ from: "flick", kind: "match" }))}
                        matchFirst={m.a.followUps?.includes("match")}
                      />
                    )}
                  </>
                )}
                {m.kind === "unsure" && (
                  <>
                    <p>I want to get this right. Did you mean one of these?</p>
                    <Chips>
                      {m.options.map((a) => (
                        <Chip key={a.id} onClick={() => pick(a)}>
                          {a.question}
                        </Chip>
                      ))}
                    </Chips>
                    <p className="mt-3 text-sm text-muted">
                      Or{" "}
                      <Link href="/contact" onClick={close} className="font-semibold underline">
                        ask a real person
                      </Link>
                      .
                    </p>
                  </>
                )}
                {m.kind === "miss" && (
                  <>
                    <p>I don&apos;t know that one, and I&apos;d rather not guess. A real person can answer:</p>
                    <Links
                      links={[
                        { label: "Ask a human", href: "/contact" },
                        { label: "Browse FAQs", href: "/faq" },
                      ]}
                      onGo={close}
                      primaryFirst
                    />
                  </>
                )}
                {m.kind === "match" && <Matcher data={data} onGo={close} />}
              </FlickBubble>
            ),
          )}
          {typing && (
            <div className="flick-msg flex items-end gap-2" aria-label="Flick is typing">
              <span className="flick-typing inline-flex items-center gap-1 rounded-2xl rounded-bl-md bg-parchment px-4 py-3.5" data-testid="flick-typing">
                <i />
                <i />
                <i />
              </span>
            </div>
          )}
        </div>

        <form
          role="search"
          className="flex gap-2 border-t border-line bg-gallery px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
        >
          <label htmlFor="flick-q" className="sr-only">
            Ask a question
          </label>
          <input ref={inputRef} id="flick-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. how much for 20 photos?" className="field" autoComplete="off" maxLength={200} />
          <button className="min-h-12 shrink-0 rounded-full bg-ink px-5 text-sm font-semibold text-gallery transition-transform active:scale-95 disabled:opacity-50" disabled={!q.trim()}>
            Ask
          </button>
        </form>
      </div>
    </dialog>
  );
}

function FlickBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flick-msg flex items-start gap-2">
      <FlickSVG className="-ml-1 h-10 w-10 shrink-0" mood="neutral" />
      <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-parchment px-4 py-3 text-[0.96rem]">{children}</div>
    </div>
  );
}

const Chips = ({ children }: { children: React.ReactNode }) => <div className="mt-3 flex flex-wrap gap-2">{children}</div>;

function Chip({ children, onClick, strong = false }: { children: React.ReactNode; onClick: () => void; strong?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 text-left text-sm transition-colors ${strong ? "border-ink bg-ink font-semibold text-gallery hover:bg-clay-deep" : "border-ink/20 bg-gallery hover:border-ink/50"}`}
    >
      {children}
    </button>
  );
}

function Links({ links, onGo, primaryFirst = false }: { links: GuideLink[]; onGo: () => void; primaryFirst?: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map((l, i) => (
        <Link
          key={l.href}
          href={l.href}
          onClick={onGo}
          className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${primaryFirst && i === 0 ? "bg-ink text-gallery" : "border border-ink/25 hover:border-ink"}`}
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}

function FollowUps({ items, onPick, onMatch, matchFirst }: { items: GuideAnswer[]; onPick: (a: GuideAnswer) => void; onMatch: () => void; matchFirst?: boolean }) {
  if (!items.length && !matchFirst) return null;
  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">You might also ask</p>
      <Chips>
        {matchFirst && <Chip onClick={onMatch}>Which session fits me?</Chip>}
        {items.slice(0, 3).map((a) => (
          <Chip key={a.id} onClick={() => onPick(a)}>
            {a.question}
          </Chip>
        ))}
      </Chips>
    </div>
  );
}

/** "Which session fits me?": every bookable category, priced from its own settings. */
function Matcher({ data, onGo }: { data: GuideData; onGo: () => void }) {
  const { pricing, sessions } = data;
  return (
    <>
      <p>Pick what you&apos;re photographing:</p>
      <ul className="mt-3 space-y-2">
        {[...sessions, null].map((s) => {
          const pkgs = s ? pricing.packages.filter((p) => s.packageIds.includes(p.id)) : [];
          const cheap = pricedPackages(pkgs)[0];
          const rec = pkgs.find((p) => p.highlightLabel && p.priceCents != null);
          return (
            <li key={s?.bookingId ?? "other"} className="rounded-lg border border-line bg-gallery p-3">
              <p className="font-semibold">{s ? s.label : "Something else"}</p>
              <p className="text-sm text-muted">
                {!s
                  ? "Tell us your idea and we'll suggest the right setup."
                  : s.pricingMode === "package"
                    ? cheap
                      ? `Priced by photos: from ${formatPrice(cheap.priceCents)}${cheap.photos ? ` for ${cheap.photos}` : ""}.${rec && rec.id !== cheap.id ? ` ${rec.name} (${rec.photos} photos, ${formatPrice(rec.priceCents!)}) is our recommended start.` : ""}`
                      : "Priced by finished photos."
                    : "Custom quote with clear coverage and deliverables."}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {s?.href && (
                  <Link href={s.href} onClick={onGo} className="inline-flex min-h-11 items-center rounded-full border border-ink/25 px-3 text-sm font-semibold">
                    Learn more
                  </Link>
                )}
                <Link href={`/book?category=${s?.bookingId ?? "other"}`} onClick={onGo} className="inline-flex min-h-11 items-center rounded-full bg-ink px-3 text-sm font-semibold text-gallery">
                  Start booking
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
