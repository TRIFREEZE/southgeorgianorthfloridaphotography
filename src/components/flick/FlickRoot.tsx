"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { FlickController, type Bubble, type FlickUI, type Placement } from "./controller";
import { FilmStrip } from "./FilmStrip";
import { FlickGuide } from "./FlickGuide";
import { FlickSVG } from "./FlickSVG";
import { setFlickHidden, setFlickMuted, useFlickPrefs } from "./prefs";
import type { FilmStripPhoto, FlickMood, FlickProp } from "./types";
import { useCompactMode, useReducedMotion } from "./useMediaFlags";

/**
 * Flick's React shell: renders the character, speech bubble, menu, film strip and
 * guide. All behavior lives in FlickController. Mounted lazily (see FlickLoader).
 */
export default function FlickRoot({ filmStrip }: { filmStrip: FilmStripPhoto[] }) {
  const prefs = useFlickPrefs();
  const reducedMotion = useReducedMotion();
  const compact = useCompactMode();
  const size = compact ? 60 : 76;

  const [mood, setMood] = useState<FlickMood>("neutral");
  const [prop, setProp] = useState<FlickProp>(null);
  const [feet, setFeet] = useState(false);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [menu, setMenu] = useState<(Placement & { open: boolean }) | null>(null);
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
      setStrip,
      setGuide: setGuideOpen,
      setShown,
      dismiss: () => setFlickHidden(true),
    }),
    [],
  );

  useEffect(() => {
    if (prefs.hidden) return;
    const [root, body, squash, button, trail] = [rootRef.current, bodyRef.current, squashRef.current, buttonRef.current, trailRef.current];
    if (!root || !body || !squash || !button || !trail) return;
    const c = new FlickController({ root, body, squash, button, trail }, { size, compact, reducedMotion, muted: prefs.muted }, ui);
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

  if (prefs.hidden) return null;

  return (
    <>
      <div ref={rootRef} className="pointer-events-none fixed inset-0 z-30" style={{ visibility: shown ? "visible" : "hidden" }} data-flick-root>
        <div ref={trailRef} className="absolute inset-0 overflow-hidden" aria-hidden />
        <div ref={bodyRef} className="absolute left-0 top-0 will-change-transform" style={{ width: size, height: size }}>
          <div ref={squashRef} className="h-full w-full">
            <div className="h-full w-full" style={{ animation: reducedMotion ? "none" : `flick-breathe ${mood === "sleepy" ? 5.4 : 3.8}s ease-in-out infinite` }}>
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

          {bubble && !menu?.open && (
            <div
              key={bubble.key}
              className={`pointer-events-none absolute w-max max-w-[15rem] rounded-2xl bg-ink px-3.5 py-2 text-[0.88rem] leading-snug text-gallery shadow-lg ${bubble.side === "right" ? "right-1" : "left-1"} ${bubble.below ? "top-[calc(100%+6px)]" : "bottom-[calc(100%+4px)]"}`}
              style={{ animation: reducedMotion ? "none" : "flick-bubble 260ms var(--ease-out-soft) both" }}
              role={bubble.announce ? "status" : undefined}
              aria-hidden={bubble.announce ? undefined : true}
            >
              {bubble.text}
            </div>
          )}

          {menu?.open && (
            <div
              ref={menuRef}
              role="group"
              aria-label="Flick options"
              className={`pointer-events-auto absolute w-60 rounded-2xl border border-line bg-gallery p-2 text-sm text-ink shadow-xl ${menu.right ? "right-0" : "left-0"} ${menu.below ? "top-[calc(100%+6px)]" : "bottom-[calc(100%+6px)]"}`}
            >
              <p className="px-3 pb-1 pt-2 text-xs text-muted">Hi, I&apos;m Flick. I mostly look at photos.</p>
              <MenuButton
                onClick={() => {
                  ctrl.current?.closeMenu();
                  setGuideOpen(true);
                  track("flick_open");
                }}
              >
                Ask Flick a question
              </MenuButton>
              <MenuButton
                onClick={() => {
                  setFlickMuted(!prefs.muted);
                  ctrl.current?.closeMenu();
                }}
              >
                {prefs.muted ? "Let Flick talk again" : "Quiet please (mute chatter)"}
              </MenuButton>
              <MenuButton
                onClick={() => {
                  ctrl.current?.moveOtherSide();
                  ctrl.current?.closeMenu();
                }}
              >
                Move to the other side
              </MenuButton>
              <MenuButton onClick={() => ctrl.current?.dismiss()}>
                Hide Flick <span className="block text-xs text-muted">Bring him back from the footer anytime.</span>
              </MenuButton>
            </div>
          )}

          {strip && <FilmStrip photos={filmStrip} onClose={() => setStrip(null)} alignRight={strip.right} below={strip.below} />}
        </div>
      </div>
      <FlickGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
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
