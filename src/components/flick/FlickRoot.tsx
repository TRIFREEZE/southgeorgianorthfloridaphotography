"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { FlickController, type Bubble, type FlickUI, type Placement } from "./controller";
import { FilmStrip } from "./FilmStrip";
import { FlickGuide } from "./FlickGuide";
import type { GuideData } from "./guide";
import { FlickSVG } from "./FlickSVG";
import { setFlickHidden, setFlickMuted, useFlickPrefs } from "./prefs";
import type { FilmStripPhoto, FlickMood, FlickProp } from "./types";
import { useCompactMode, useReducedMotion } from "./useMediaFlags";

/** Flick's size (the SVG box; the lens itself is half of this). */
export const FLICK_SIZE = { desktop: 124, compact: 96 } as const;

/**
 * Flick's React shell: renders the character, speech bubble, intro card, menu,
 * film strip and guide. All behavior lives in FlickController.
 */
export default function FlickRoot({ filmStrip, guide, preview = false }: { filmStrip: FilmStripPhoto[]; guide: GuideData; preview?: boolean }) {
  const prefs = useFlickPrefs();
  const reducedMotion = useReducedMotion();
  const compact = useCompactMode();
  const size = compact ? FLICK_SIZE.compact : FLICK_SIZE.desktop;

  const [mood, setMood] = useState<FlickMood>("neutral");
  const [prop, setProp] = useState<FlickProp>(null);
  const [feet, setFeet] = useState(false);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [menu, setMenu] = useState<(Placement & { open: boolean }) | null>(null);
  const [intro, setIntro] = useState<Placement | null>(null);
  const [strip, setStrip] = useState<Placement | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [shown, setShown] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const squashRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const ctrl = useRef<FlickController | null>(null);

  const ui = useMemo<FlickUI>(
    () => ({
      setMood,
      setProp,
      setFeet,
      setBubble,
      setMenu,
      setIntro,
      setStrip,
      setGuide: setGuideOpen,
      setShown,
      setMuted: (on) => setFlickMuted(on),
      dismiss: () => setFlickHidden(true),
    }),
    [],
  );

  useEffect(() => {
    if (prefs.hidden) return;
    const [root, body, squash, button, trail] = [rootRef.current, bodyRef.current, squashRef.current, buttonRef.current, trailRef.current];
    if (!root || !body || !squash || !button || !trail) return;
    const c = new FlickController({ root, body, squash, button, trail }, { size, compact, reducedMotion, muted: prefs.muted, skipIntro: preview }, ui);
    ctrl.current = c;
    c.start();
    return () => {
      c.destroy();
      ctrl.current = null;
    };
    // Muted/reduced-motion changes are applied live below without a remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.hidden, compact, size, ui]);

  useEffect(() => ctrl.current?.setReducedMotion(reducedMotion), [reducedMotion]);
  useEffect(() => ctrl.current?.setMuted(prefs.muted), [prefs.muted]);

  // Menu a11y: focus first item, Escape/outside click closes, focus returns to Flick.
  useEffect(() => {
    if (!menu?.open) return;
    menuRef.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ctrl.current?.closeMenu();
        buttonRef.current?.focus();
      }
    };
    const onDown = (ev: PointerEvent) => {
      if (!rootRef.current?.contains(ev.target as Node)) ctrl.current?.closeMenu();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [menu]);

  // Intro: Escape dismisses it like "Got it".
  useEffect(() => {
    if (!intro) return;
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && ctrl.current?.endIntro("ok");
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [intro]);

  if (prefs.hidden) return null;

  const hoverAnim = reducedMotion ? "none" : `flick-hover ${mood === "sleepy" ? 5.2 : 3.2}s ease-in-out infinite`;
  const panelPos = (p: Placement) => `${p.right ? "right-0" : "left-0"} ${p.below ? "top-[calc(100%+8px)]" : "bottom-[calc(100%+8px)]"}`;

  return (
    <>
      <div ref={rootRef} className="pointer-events-none fixed inset-0 z-[45]" style={{ visibility: shown ? "visible" : "hidden" }} data-flick-root>
        <div ref={trailRef} className="absolute inset-0 overflow-hidden" aria-hidden />
        <div ref={bodyRef} className="absolute bottom-0 left-0 will-change-transform" style={{ width: size, height: size }}>
          {/* soft hover shadow, breathing with the float */}
          <span
            aria-hidden
            className="absolute left-1/2 block rounded-[50%] bg-ink/40 blur-[3px]"
            style={{ bottom: -size * 0.04, width: size * 0.36, height: size * 0.07, animation: reducedMotion ? "none" : `flick-hover-shadow ${mood === "sleepy" ? 5.2 : 3.2}s ease-in-out infinite`, transform: "translateX(-50%)" }}
          />
          <div ref={squashRef} className="h-full w-full">
            {/* Tricks and hops animate this layer; the hover bob lives on the one inside, so they never fight (no snapping). */}
            <div className="h-full w-full" data-flick-anim>
            <div className="h-full w-full" style={{ animation: hoverAnim }}>
              <button
                ref={buttonRef}
                type="button"
                onClick={() => ctrl.current?.onButtonClick()}
                onPointerDown={(e) => ctrl.current?.onButtonPointerDown(e.nativeEvent, e.currentTarget)}
                onPointerMove={(e) => ctrl.current?.onButtonPointerMove(e.nativeEvent)}
                onPointerUp={(e) => ctrl.current?.onButtonPointerUp(e.nativeEvent)}
                onFocus={() => ctrl.current?.onButtonFocus()}
                aria-label="Flick, the site helper. Open Flick's menu"
                aria-haspopup="true"
                aria-expanded={Boolean(menu?.open)}
                className="pointer-events-auto block h-full w-full cursor-grab touch-manipulation rounded-full active:cursor-grabbing"
              >
                <FlickSVG mood={mood} prop={prop} feet={feet} className="h-full w-full" />
              </button>
            </div>
            </div>
          </div>

          {bubble && !menu?.open && !intro && <SpeechBubble bubble={bubble} reducedMotion={reducedMotion} />}

          {intro && (
            <section
              role="dialog"
              aria-modal="false"
              aria-labelledby="flick-intro-title"
              className={`pointer-events-auto absolute w-[min(22rem,calc(100vw-1.5rem))] rounded-[1.4rem] border border-line bg-gallery p-5 text-ink shadow-2xl ${panelPos(intro)}`}
              style={{ animation: reducedMotion ? "none" : "flick-intro 420ms var(--ease-out-soft) both" }}
            >
              <h2 id="flick-intro-title" className="font-display text-[1.6rem] leading-tight">
                Hi! I&apos;m Flick.
              </h2>
              <p className="mt-1.5 text-[0.95rem] text-ink-soft">The little lens who lives here. I keep the photos tidy (mostly) and know my way around.</p>
              <ul className="mt-3 space-y-1.5 text-[0.92rem] text-ink-soft">
                <li className="flex gap-2">
                  <span aria-hidden className="text-clay">●</span>
                  <span>
                    <strong>Tap me anytime</strong> to ask about sessions, prices or where we work.
                  </span>
                </li>
                {!compact && (
                  <li className="flex gap-2">
                    <span aria-hidden className="text-clay">●</span>
                    <span>You can drag me around, too. I don&apos;t mind.</span>
                  </li>
                )}
                <li className="flex gap-2">
                  <span aria-hidden className="text-clay">●</span>
                  <span>
                    <strong>Too chatty?</strong> Tap me and choose <em>Quiet please</em>, or hide me from the footer.
                  </span>
                </li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => ctrl.current?.endIntro("ask")} className="min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-gallery hover:bg-clay-deep">
                  Ask me something
                </button>
                <button type="button" onClick={() => ctrl.current?.endIntro("ok")} className="min-h-11 rounded-full border border-ink/25 px-4 text-sm font-semibold hover:border-ink">
                  Got it
                </button>
                <button type="button" onClick={() => ctrl.current?.endIntro("mute")} className="min-h-11 rounded-full px-3 text-sm font-semibold text-muted underline">
                  Quiet please
                </button>
              </div>
            </section>
          )}

          {menu?.open && (
            <div ref={menuRef} role="group" aria-label="Flick options" className={`pointer-events-auto absolute w-64 rounded-2xl border border-line bg-gallery p-2 text-sm text-ink shadow-xl ${panelPos(menu)}`}>
              <p className="px-3 pb-1 pt-2 text-xs text-muted">Hi, I&apos;m Flick. What can I do for you?</p>
              <MenuButton
                onClick={() => {
                  ctrl.current?.closeMenu();
                  setGuideOpen(true);
                  track("flick_open");
                }}
              >
                Ask Flick a question
              </MenuButton>
              <MenuButton onClick={() => ctrl.current?.doTrick()}>Do a trick</MenuButton>
              <MenuButton
                onClick={() => {
                  setFlickMuted(!prefs.muted);
                  ctrl.current?.closeMenu();
                }}
              >
                {prefs.muted ? "Let Flick talk again" : "Quiet please (mute chatter)"}
              </MenuButton>
              <MenuButton onClick={() => ctrl.current?.replayIntro()}>Introduce yourself again</MenuButton>
              <MenuButton onClick={() => ctrl.current?.dismiss()}>
                Hide Flick <span className="block text-xs text-muted">Bring him back from the footer anytime.</span>
              </MenuButton>
            </div>
          )}

          {strip && <FilmStrip photos={filmStrip} onClose={() => setStrip(null)} alignRight={strip.right} below={strip.below} />}
        </div>
      </div>
      <FlickGuide open={guideOpen} onClose={() => setGuideOpen(false)} data={guide} />
    </>
  );
}

function MenuButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="block min-h-11 w-full rounded-xl px-3 py-2 text-left font-medium hover:bg-parchment focus-visible:bg-parchment">
      {children}
    </button>
  );
}

/**
 * Flick's speech bubble: soft rose (never mistaken for a button), small, with a
 * tail pointing at him. Pops in with a spring, words arrive one by one, floats
 * gently, and shrinks away when done. Purely decorative to the pointer.
 */
function SpeechBubble({ bubble, reducedMotion }: { bubble: Bubble; reducedMotion: boolean }) {
  const right = bubble.side === "right";
  const words = bubble.text.split(" ");
  const enter = "flick-bubble-pop 460ms cubic-bezier(.34,1.56,.64,1) both, flick-bubble-float 3s ease-in-out 460ms infinite";
  return (
    <div
      key={bubble.key}
      className={`pointer-events-none absolute w-max max-w-[11.5rem] rounded-[14px] border border-clay-light/60 bg-[#F6E9E3] px-3 py-1.5 text-[0.8rem] font-medium leading-snug text-ink shadow-[0_10px_24px_-14px_rgba(37,39,35,0.55)] sm:max-w-[13rem] ${right ? "right-5" : "left-5"} ${bubble.below ? "top-[calc(100%+2px)]" : "bottom-[calc(100%-4px)]"}`}
      style={{
        transformOrigin: `${bubble.below ? "top" : "bottom"} ${right ? "right" : "left"}`,
        animation: reducedMotion ? "none" : bubble.leaving ? "flick-bubble-out 220ms ease-in forwards" : enter,
      }}
      role={bubble.announce ? "status" : undefined}
      aria-hidden={bubble.announce ? undefined : true}
    >
      <span className="sr-only">{bubble.text}</span>
      <span aria-hidden>
        {words.map((w, i) => (
          <span key={i} className="inline-block" style={{ animation: reducedMotion ? "none" : `flick-word 280ms ease-out ${140 + i * 55}ms both` }}>
            {w}
            {i < words.length - 1 ? "\u00a0" : ""}
          </span>
        ))}
      </span>
      <span
        aria-hidden
        className={`absolute h-2.5 w-2.5 rotate-45 border-clay-light/60 bg-[#F6E9E3] ${right ? "right-6" : "left-6"} ${bubble.below ? "-top-[6px] border-l border-t" : "-bottom-[6px] border-b border-r"}`}
      />
    </div>
  );
}
