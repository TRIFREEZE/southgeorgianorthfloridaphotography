/**
 * FlickController: Flick's brain. Owns the behavior machine, the motion engine,
 * the antic director, interaction signals, scheduling and speech. React only
 * renders what it is told (mood, prop, bubble, menu, intro) via `ui`.
 *
 * Personality rules:
 *  - Flick lives in his corner. He never crosses the screen on his own; on desktop
 *    he only floats up and down his own side. On phones he stays put in the corner.
 *    Dragging him (desktop) moves his corner wherever you drop him.
 *  - He introduces himself once, then chats now and then, not constantly.
 *  - Antics are rare and tasteful: polishing or (carefully) breaking-then-fixing
 *    something right beside him. Desktop only.
 *  - Guardrails: quiet and tucked while someone types, paused for menus/dialogs,
 *    reduced motion honored, never catches clicks while moving, mute/hide anytime.
 *
 * Every listener and timer registered here is released in destroy().
 */
import { AnticDirector } from "./antics";
import { onFlick } from "./bus";
import { FlickEngine, type Vec } from "./engine";
import { ambient, anticLines, contextFor, pickLine, reactions, sectionComments, type LineEvent } from "./lines";
import { initialMachine, isPaused, transition, type FlickEvent, type FlickState, type Machine } from "./machine";
import { sessionFlag } from "./prefs";
import { rectIsFree, setFlickRoot, type Spot } from "./safeSpots";
import type { FlickMood, FlickProp } from "./types";
import { isLowPowerDevice } from "./useMediaFlags";

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const QUIET_MS = 1500;
const MIN_LINE_GAP = 18_000;
const SLEEP_AFTER = 45_000;
const INTRO_KEY = "rcl:flick:introduced";
const BUBBLE_EXIT_MS = 220;

export interface Bubble {
  text: string;
  key: number;
  side: "left" | "right";
  below: boolean;
  announce: boolean;
  leaving?: boolean;
}

export interface Placement {
  right: boolean;
  below: boolean;
}

export interface FlickUI {
  setMood(m: FlickMood): void;
  setProp(p: FlickProp): void;
  setFeet(on: boolean): void;
  setBubble(b: Bubble | null): void;
  setMenu(m: (Placement & { open: boolean }) | null): void;
  setStrip(p: Placement | null): void;
  setGuide(open: boolean): void;
  setIntro(p: Placement | null): void;
  setShown(on: boolean): void;
  setMuted(on: boolean): void;
  dismiss(): void;
}

export interface FlickDom {
  root: HTMLElement;
  body: HTMLElement;
  squash: HTMLElement;
  button: HTMLElement;
  trail: HTMLElement;
}

export interface FlickOptions {
  size: number;
  compact: boolean;
  reducedMotion: boolean;
  muted: boolean;
  /** Skip the first-visit introduction (the owner's preview frames). */
  skipIntro?: boolean;
}

export class FlickController {
  private engine: FlickEngine;
  private machine: Machine;
  private antics: AnticDirector;
  /** Where the visitor dropped him (desktop drag). null = default bottom-right corner. */
  private custom: { fx: number; fy: number } | null = null;
  private pointer: Vec | null = null;
  private lastActivity = 0;
  private lastScroll = 0;
  private lastLine = -Infinity;
  private shownLines = new Set<string>();
  private lowPower = false;
  private clicks: number[] = [];
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private moodTimer: ReturnType<typeof setTimeout> | null = null;
  private bubbleTimer: ReturnType<typeof setTimeout> | null = null;
  private drag: { id: number; start: Vec; moved: boolean } | null = null;
  private suppressClick = false;
  private menuOpen = false;
  private introOpen = false;
  private hesitate: ReturnType<typeof setTimeout> | undefined;
  private cleanups: (() => void)[] = [];
  private path = "";
  private commented = new Set<string>();
  private saidBottom = false;
  private bubble: Bubble | null = null;

  constructor(
    private dom: FlickDom,
    private opts: FlickOptions,
    private ui: FlickUI,
  ) {
    this.lowPower = isLowPowerDevice();
    this.engine = new FlickEngine(dom.body, dom.squash, dom.button, dom.trail, { size: opts.size, trail: this.trailOn() });
    this.machine = initialMachine(performance.now(), this.canMove());
    this.antics = new AnticDirector({
      engine: this.engine,
      size: opts.size,
      layer: dom.trail,
      homeX: () => this.homeSpot().x,
      say: (line, chance = 1) => Math.random() < chance && this.say(anticLines[line], { interrupt: true }),
      setMood: (m, ms) => (ms ? this.moodFor(m, ms) : this.ui.setMood(m)),
      setProp: (p) => this.ui.setProp(p),
      done: () => {
        if (this.machine.state === "antic") this.dispatch({ type: "done" });
      },
    });
  }

  /* ------------------------------------------------------------- setup */
  start() {
    setFlickRoot(this.dom.root);
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean }> };
    nav.getBattery?.()
      .then((b) => {
        if (!b.charging && b.level < 0.2) {
          this.lowPower = true;
        }
      })
      .catch(() => {});
    try {
      const raw = window.sessionStorage.getItem("rcl:flick:lines");
      if (raw) this.shownLines = new Set(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
    this.lastActivity = performance.now();
    this.path = window.location.pathname;

    // Entrance: rise up into his corner from just below it.
    const first = this.homeSpot();
    if (this.opts.reducedMotion) this.engine.jumpTo(first);
    else {
      this.engine.jumpTo({ x: first.x, y: window.innerHeight + this.opts.size });
      this.engine.moveTo(first, 22, 8);
    }
    this.ui.setShown(true);

    if (!this.opts.skipIntro && !this.introduced()) this.later(() => this.startIntro(), this.opts.reducedMotion ? 300 : 1300);
    else if (!sessionFlag("greeted")) this.later(() => this.sayEvent("welcome-back", { force: true }), 2200);
    sessionFlag("greeted", true);

    this.listen(window, "pointermove", this.onPointerMove, { passive: true });
    this.listen(document, "pointerover", this.onOver, { passive: true });
    this.listen(window, "scroll", this.onScroll, { passive: true });
    this.listen(document, "focusin", this.onFocusIn);
    this.listen(document, "focusout", this.onFocusOut);
    this.listen(document, "input", this.onInput, { passive: true });
    this.listen(window, "keydown", this.onKey, { passive: true });
    this.listen(document, "visibilitychange", this.onVisibility);
    this.listen(window, "resize", this.onResize, { passive: true });
    this.cleanups.push(onFlick(this.onSignal));

    const hb = setInterval(this.heartbeat, 1000);
    this.cleanups.push(() => clearInterval(hb));
  }

  destroy() {
    this.antics.abort();
    this.cleanups.forEach((c) => c());
    this.cleanups = [];
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    if (this.moodTimer) clearTimeout(this.moodTimer);
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
    if (this.hesitate) clearTimeout(this.hesitate);
    if (this.rafLook) cancelAnimationFrame(this.rafLook);
    if (this.scrollEnd) clearTimeout(this.scrollEnd);
    if (this.resizeT) clearTimeout(this.resizeT);
    this.persistLines();
    this.engine.destroy();
    setFlickRoot(null);
  }

  setReducedMotion(on: boolean) {
    this.opts.reducedMotion = on;
    this.engine.setOptions({ trail: this.trailOn() });
    this.machine = { ...this.machine, allowMotion: this.canMove() };
    if (on) this.abortAntic();
  }

  setMuted(on: boolean) {
    this.opts.muted = on;
    if (on) this.clearBubble(true);
  }

  /* ------------------------------------------------------------- intro */
  private introduced() {
    try {
      return window.localStorage.getItem(INTRO_KEY) === "1";
    } catch {
      return sessionFlag("introduced");
    }
  }

  private startIntro() {
    if (this.introOpen) return;
    this.abortAntic();
    this.closeMenu();
    this.clearBubble(true);
    this.dispatch({ type: "pause", reason: "intro" });
    this.introOpen = true;
    this.placeHome();
    this.later(() => {
      this.moodFor("happy", 2200);
      this.engine.hop(16, 2);
      this.ui.setIntro(this.placement());
    }, this.opts.reducedMotion ? 0 : 500);
    this.later(() => this.introOpen && this.endIntro("timeout"), 45_000);
  }

  /** Called by the intro card's buttons. */
  endIntro(action: "ok" | "ask" | "mute" | "timeout") {
    if (!this.introOpen) return;
    this.introOpen = false;
    try {
      window.localStorage.setItem(INTRO_KEY, "1");
    } catch {
      sessionFlag("introduced", true);
    }
    this.ui.setIntro(null);
    this.dispatch({ type: "resume", reason: "intro" });
    this.lastActivity = performance.now();
    if (action === "ask") this.ui.setGuide(true);
    if (action === "mute") {
      this.ui.setMuted(true);
      this.engine.blink(true);
      this.moodFor("sleepy", 1200);
    }
    if (action === "ok") this.later(() => this.say(["have fun looking around!", "i'll be right here."], { force: true }), 500);
    this.nextAntic = performance.now() + rand(40_000, 70_000);
  }

  replayIntro() {
    this.closeMenu();
    this.startIntro();
  }

  /* ------------------------------------------------------------- helpers */
  private listen<K extends string>(target: Window | Document, type: K, fn: (e: never) => void, opts?: AddEventListenerOptions) {
    const handler = fn as unknown as EventListener;
    target.addEventListener(type, handler, opts);
    this.cleanups.push(() => target.removeEventListener(type, handler, opts));
  }

  private later(fn: () => void, ms: number) {
    const t = setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, ms);
    this.timers.add(t);
  }

  /** The echo-ring trail is retired: Flick moves cleanly, with no rings behind him. */
  private trailOn() {
    return false;
  }

  /** Desktop floats up and down his side; phones stay put; reduced motion stays put. */
  private canMove() {
    return !this.opts.reducedMotion && !this.opts.compact;
  }

  private go(spot: Spot, k = 30, d = 9) {
    if (this.opts.reducedMotion) this.engine.jumpTo(spot);
    else this.engine.moveTo(spot, k, d);
  }

  private clampSpot(x: number, y: number): Spot {
    const s = this.opts.size;
    return {
      x: Math.min(window.innerWidth - s / 2 - 6, Math.max(s / 2 + 6, x)),
      y: Math.min(window.innerHeight - s / 2 - 6, Math.max(80 + s / 2, y)),
    };
  }

  /** His corner: bottom-right by default, or wherever he was dropped (kept proportional on resize). */
  private homeSpot(): Spot {
    if (this.custom) return this.clampSpot(this.custom.fx * window.innerWidth, this.custom.fy * window.innerHeight);
    const { size, compact } = this.opts;
    const m = compact ? 10 : 22;
    return { x: window.innerWidth - m - size / 2, y: window.innerHeight - m - size / 2 };
  }

  private onRightSide() {
    return this.homeSpot().x > window.innerWidth / 2;
  }

  /** Off the edge of his own side (used while someone types). */
  private tuckSpot(): Spot {
    const h = this.homeSpot();
    const s = this.opts.size;
    return { x: this.onRightSide() ? window.innerWidth + s * 0.2 : -s * 0.2, y: h.y };
  }

  /** Flick only catches clicks while resting; in flight he's a ghost to the pointer. */
  private setInteractive(on: boolean) {
    this.dom.button.style.pointerEvents = on ? "auto" : "none";
  }

  private moodFor(m: FlickMood, ms: number) {
    this.ui.setMood(m);
    if (this.moodTimer) clearTimeout(this.moodTimer);
    this.moodTimer = setTimeout(() => this.ui.setMood(this.machine.state === "sleep" ? "sleepy" : "neutral"), ms);
  }

  private placeHome(jump = false) {
    const spot = this.homeSpot();
    if (jump) this.engine.jumpTo(spot);
    else this.go(spot, 26, 9);
  }

  private placement(): Placement {
    const p = this.engine.pos;
    return { right: p.x > window.innerWidth / 2, below: p.y < 300 };
  }

  private persistLines() {
    try {
      window.sessionStorage.setItem("rcl:flick:lines", JSON.stringify([...this.shownLines]));
    } catch {
      /* ignore */
    }
  }

  private abortAntic() {
    if (this.antics.isRunning) this.antics.abort();
    if (this.machine.state === "antic") this.dispatch({ type: "done" });
  }

  /* ------------------------------------------------------------- speech */
  /** Plays the bubble's exit animation, then removes it. */
  private clearBubble(instant = false) {
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
    const b = this.bubble;
    if (!b) return;
    if (instant || this.opts.reducedMotion) {
      this.bubble = null;
      this.ui.setBubble(null);
      return;
    }
    this.ui.setBubble({ ...b, leaving: true });
    this.bubbleTimer = setTimeout(() => {
      this.bubble = null;
      this.ui.setBubble(null);
    }, BUBBLE_EXIT_MS);
  }

  say(pool: string[], opts: { force?: boolean; announce?: boolean; interrupt?: boolean } = {}) {
    const now = performance.now();
    if (this.opts.muted || this.menuOpen || this.introOpen) return false;
    if (isPaused(this.machine) && !opts.announce) return false;
    if (now < QUIET_MS) return false;
    // interrupt: part of an antic; force: a reaction to something you did; otherwise relaxed pacing.
    if (!opts.interrupt && !opts.force && now - this.lastLine < MIN_LINE_GAP) return false;
    if (!opts.interrupt && opts.force && now - this.lastLine < 4000) return false;
    const text = pickLine(pool, this.shownLines);
    if (!text) return false;
    const { size } = this.opts;
    const p = this.engine.pos;
    const side: Bubble["side"] = p.x > window.innerWidth / 2 ? "right" : "left";
    const w = Math.min(210, window.innerWidth - 24);
    const left = side === "right" ? p.x + size / 2 - w : p.x - size / 2;
    const roomAbove = p.y - size / 2 - 56 > 76;
    const below = !roomAbove || (p.y < window.innerHeight * 0.4 && rectIsFree(left, p.y + size / 2, w, 44));
    this.lastLine = now;
    this.shownLines.add(text);
    this.persistLines();
    this.bubble = { text, key: now, side, below, announce: Boolean(opts.announce) };
    this.ui.setBubble(this.bubble);
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
    this.bubbleTimer = setTimeout(() => this.clearBubble(), Math.max(2800, text.length * 70));
    return true;
  }

  private sayEvent(e: LineEvent, opts?: { force?: boolean; announce?: boolean }) {
    return this.say(reactions[e], opts);
  }

  /* ------------------------------------------------------------- machine */
  private dispatch(ev: FlickEvent) {
    const before = this.machine.state;
    this.machine = transition(this.machine, ev, performance.now());
    if (this.machine.state !== before) this.enter(this.machine.state, before);
  }

  private done = () => this.dispatch({ type: "done" });

  private enter(s: FlickState, prev: FlickState) {
    const e = this.engine;
    const { size } = this.opts;
    if (prev === "antic") this.antics.abort();
    if (prev === "sleep") {
      this.ui.setMood("surprised");
      e.blink(true);
      this.later(() => this.ui.setMood("neutral"), 700);
      if (Math.random() < 0.4) this.sayEvent("wake", { force: true });
    }
    this.ui.setFeet(false);
    this.setInteractive(!(s === "wander" || s === "antic"));

    switch (s) {
      case "rest":
        if ((prev === "wander" || prev === "antic" || prev === "notice") && !isPaused(this.machine)) this.placeHome();
        break;
      case "sleep":
        this.ui.setMood("sleepy");
        break;
      case "antic":
        if (!this.antics.run()) this.later(this.done, 0);
        break;
      case "notice": {
        if (prev !== "sleep") this.moodFor("surprised", 500);
        e.blink();
        break;
      }
      case "wander": {
        // Up and down his own side only. Never across the screen.
        const h = this.homeSpot();
        const top = 96 + size / 2;
        const bottom = window.innerHeight - size / 2 - 10;
        const y = Math.abs(h.y - top) > Math.abs(h.y - bottom) ? rand(top, Math.max(top, h.y - 140)) : rand(Math.min(bottom, h.y + 140), bottom);
        e.moveTo(this.clampSpot(h.x, y), 16, 7);
        this.later(this.done, rand(4200, 6500));
        break;
      }
      case "react":
        e.flash();
        e.hop(12);
        this.moodFor("happy", 1300);
        break;
      case "celebrate":
        this.moodFor("happy", 2600);
        e.hop(20, 2);
        this.confetti(e.pos);
        break;
      case "help":
        this.moodFor("curious", 2400);
        e.blink();
        break;
      default:
        break;
    }
  }

  private confetti(p: Vec) {
    if (this.opts.reducedMotion || this.lowPower) return;
    const colors = ["#A46B55", "#D4A28C", "#727F70", "#E6D3CC", "#DFD2C0"];
    for (let i = 0; i < 14; i++) {
      const s = document.createElement("span");
      const ang = (i / 14) * 360 + rand(-10, 10);
      s.className = "pointer-events-none absolute block rounded-[1px]";
      s.style.cssText = `left:${p.x}px;top:${p.y}px;width:${rand(5, 8)}px;height:${rand(8, 12)}px;background:${colors[i % colors.length]};--r:${ang}deg;--d:${-rand(50, 90)}px;animation:flick-confetti ${rand(0.8, 1.1)}s cubic-bezier(.22,1,.36,1) forwards;`;
      s.addEventListener("animationend", () => s.remove());
      this.dom.trail.appendChild(s);
    }
  }

  /* ------------------------------------------------------------- signals */
  private rafLook = 0;
  private onPointerMove = (ev: PointerEvent) => {
    if (ev.pointerType !== "mouse") return;
    this.pointer = { x: ev.clientX, y: ev.clientY };
    this.lastActivity = performance.now();
    if (this.rafLook) return;
    this.rafLook = requestAnimationFrame(() => {
      this.rafLook = 0;
      if (this.machine.state === "sleep") this.dispatch({ type: "activity" });
      const p = this.pointer;
      if (!p || this.opts.reducedMotion || this.machine.state === "antic") return;
      const e = this.engine;
      const d = Math.hypot(p.x - e.pos.x, p.y - e.pos.y);
      e.lookAt(d < 900 ? p : null);
      if (d < 150 && this.machine.state === "rest") this.dispatch({ type: "request", state: "notice" });
    });
  };

  private hovering: HTMLElement | null = null;
  private onOver = (ev: PointerEvent) => {
    const t = ev.target as Element | null;
    const photo = t?.closest?.<HTMLElement>("[data-flick-look]");
    if (photo && photo !== this.hovering) {
      this.hovering = photo;
      if (!this.opts.reducedMotion && this.machine.state !== "antic") {
        const r = photo.getBoundingClientRect();
        this.engine.lookAt({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }
      if (Math.random() < 0.1) this.sayEvent("photo-hover");
    } else if (!photo && this.hovering) {
      this.hovering = null;
      this.engine.lookAt(this.pointer);
    }
    const cta = t?.closest?.<HTMLElement>('a[href^="/book"]');
    if (cta && !sessionFlag("cta-line") && Math.random() < 0.3) {
      if (this.sayEvent("cta")) sessionFlag("cta-line", true);
    }
  };

  private scrollEnd: ReturnType<typeof setTimeout> | undefined;
  private lastY = 0;
  private onScroll = () => {
    const now = performance.now();
    this.lastActivity = now;
    this.lastScroll = now;
    const dy = window.scrollY - this.lastY;
    this.lastY = window.scrollY;
    const e = this.engine;
    if (!this.opts.reducedMotion && this.machine.state !== "antic") e.lookAt({ x: e.pos.x - 60, y: e.pos.y + (dy > 0 ? 200 : -200) });
    if (this.machine.state === "antic" || this.machine.state === "notice") this.done();
    if (this.machine.state === "sleep") this.dispatch({ type: "activity" });

    if (this.scrollEnd) clearTimeout(this.scrollEnd);
    this.scrollEnd = setTimeout(() => {
      e.lookAt(this.pointer);
      this.commentOnSection();
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 60;
      if (atBottom && !this.saidBottom && !sessionFlag("bottom-line")) {
        this.saidBottom = true;
        if (this.sayEvent("scroll-bottom")) sessionFlag("bottom-line", true);
      }
    }, 300);
  };

  /** Occasionally comments when a new section heading settles into view. */
  private commentOnSection() {
    const vh = window.innerHeight;
    const h = Array.from(document.querySelectorAll<HTMLElement>("main h2")).find((el) => {
      const r = el.getBoundingClientRect();
      return r.top > 70 && r.top < vh * 0.6;
    });
    if (!h) return;
    const key = h.textContent?.trim().slice(0, 60) ?? "";
    if (!key || this.commented.has(key)) return;
    this.commented.add(key);
    const hit = sectionComments.find((c) => c.match.test(key));
    if (hit && Math.random() < 0.3) this.say(hit.lines);
  }

  private isField = (el: EventTarget | null) => el instanceof HTMLElement && (el.matches("input, textarea, select") || el.isContentEditable);

  private armHesitation() {
    if (this.hesitate) clearTimeout(this.hesitate);
    this.hesitate = setTimeout(() => {
      if (!sessionFlag("hesitate-help") && this.sayEvent("help-hesitate", { force: true, announce: true })) sessionFlag("hesitate-help", true);
    }, 25_000);
  }

  private onFocusIn = (ev: FocusEvent) => {
    if (!this.isField(ev.target) || (ev.target instanceof Node && this.dom.root.contains(ev.target))) return;
    this.abortAntic();
    this.dispatch({ type: "pause", reason: "typing" });
    this.clearBubble(true);
    // Forms are sacred: slide off the edge of his side while someone types.
    this.go(this.tuckSpot(), 40, 11);
    if ((ev.target as HTMLElement).closest("form")) this.armHesitation();
  };

  private onInput = () => {
    this.lastActivity = performance.now();
    if (this.hesitate) this.armHesitation();
  };

  private onFocusOut = (ev: FocusEvent) => {
    if (!this.isField(ev.target)) return;
    this.later(() => {
      if (this.isField(document.activeElement)) return;
      if (this.hesitate) clearTimeout(this.hesitate);
      this.hesitate = undefined;
      this.dispatch({ type: "resume", reason: "typing" });
      this.placeHome();
    }, 1500);
  };

  private onKey = () => {
    this.lastActivity = performance.now();
    if (this.machine.state === "sleep") this.dispatch({ type: "activity" });
  };

  private onVisibility = () => {
    if (document.hidden) {
      this.abortAntic();
      this.dispatch({ type: "pause", reason: "hidden" });
    } else {
      this.dispatch({ type: "resume", reason: "hidden" });
      this.lastActivity = performance.now();
    }
  };

  private resizeT: ReturnType<typeof setTimeout> | undefined;
  private onResize = () => {
    if (this.resizeT) clearTimeout(this.resizeT);
    this.resizeT = setTimeout(() => {
      this.abortAntic();
      if (this.machine.state === "wander") this.done();
      this.placeHome(true);
    }, 200);
  };

  private onSignal = (s: Parameters<Parameters<typeof onFlick>[0]>[0]) => {
    this.lastActivity = performance.now();
    switch (s.type) {
      case "photo-click":
        this.abortAntic();
        this.dispatch({ type: "request", state: "react" });
        if (Math.random() < 0.4) this.sayEvent("photo-click", { force: true });
        break;
      case "photo-favorite":
        this.dispatch({ type: "request", state: "react" });
        this.sayEvent("photo-favorite", { force: true, announce: true });
        break;
      case "card-pick":
        this.engine.hop(10);
        this.moodFor("happy", 900);
        if (Math.random() < 0.3) this.sayEvent("card-pick", { force: true });
        break;
      case "booking-step":
        this.engine.blink();
        break;
      case "booking-complete":
        this.dispatch({ type: "request", state: "celebrate" });
        this.sayEvent("celebrate-booking", { force: true, announce: true });
        break;
      case "story-complete":
        this.dispatch({ type: "request", state: "celebrate" });
        this.sayEvent("celebrate-story", { force: true, announce: true });
        break;
      case "form-error":
        if ((this.machine.cooldownUntil.help ?? 0) > performance.now()) break;
        this.dispatch({ type: "request", state: "help" });
        this.sayEvent("help-error", { force: true, announce: true });
        break;
      case "pause":
        this.abortAntic();
        this.dispatch({ type: "pause", reason: s.reason });
        this.clearBubble(true);
        this.closeMenu();
        break;
      case "resume":
        this.dispatch({ type: "resume", reason: s.reason });
        break;
      case "open-guide":
        this.ui.setGuide(true);
        break;
      case "show":
        break;
    }
  };

  /* ------------------------------------------------------------- heartbeat (1 Hz) */
  private nextBehavior = performance.now() + rand(9000, 15000);
  private nextBlink = performance.now() + rand(2600, 5200);
  private nextAmbient = performance.now() + rand(25_000, 40_000);
  private nextAntic = performance.now() + rand(45_000, 75_000);
  private lastZ = 0;

  private heartbeat = () => {
    if (document.hidden) return;
    const now = performance.now();
    const e = this.engine;

    if (window.location.pathname !== this.path) {
      this.path = window.location.pathname;
      this.commented.clear();
      this.saidBottom = false;
      this.abortAntic();
      if (Math.random() < 0.35) this.later(() => this.say(ambient[contextFor(this.path)]), 2000);
    }

    this.dispatch({ type: "tick" });
    if (this.machine.state === "rest" && !isPaused(this.machine) && now - this.lastActivity > SLEEP_AFTER) this.dispatch({ type: "idle" });

    if (this.machine.state === "sleep") {
      if (now - this.lastZ > 1800 && !this.opts.reducedMotion) {
        this.lastZ = now;
        const { size } = this.opts;
        const z = document.createElement("span");
        z.textContent = "z";
        z.className = "pointer-events-none absolute font-display italic text-clay-deep";
        z.style.cssText = `left:${e.pos.x + size * (this.onRightSide() ? -0.3 : 0.18)}px;top:${e.pos.y - size * 0.42}px;font-size:${size * 0.2}px;animation:flick-z 1.8s ease-out forwards;`;
        z.addEventListener("animationend", () => z.remove());
        this.dom.trail.appendChild(z);
      }
      return;
    }
    if (isPaused(this.machine)) return;

    if (now > this.nextBlink) {
      this.nextBlink = now + rand(2600, 6000);
      e.blink(Math.random() < 0.15);
    }

    const settledScroll = now - this.lastScroll > 2000;

    // Tasteful antics, rarely, desktop only, and only when the page is still.
    if (this.machine.state === "rest" && this.canMove() && now > this.nextAntic && settledScroll) {
      this.nextAntic = now + rand(70_000, 130_000);
      this.dispatch({ type: "request", state: "antic" });
      return;
    }

    // Idle life in the corner: drift up/down his side (desktop), clean his lens, look around, hop.
    if (this.machine.state === "rest" && now > this.nextBehavior) {
      this.nextBehavior = now + rand(10_000, 18_000);
      const r = Math.random();
      if (this.canMove() && settledScroll && r < 0.3) this.dispatch({ type: "request", state: "wander" });
      else if (r < 0.5 && !this.opts.reducedMotion) {
        this.ui.setProp("cloth");
        this.later(() => this.ui.setProp(null), 2900);
      } else if (r < 0.75) {
        const h = this.homeSpot();
        e.lookAt({ x: h.x + (this.onRightSide() ? -300 : 300), y: h.y - rand(-200, 300) });
        this.later(() => e.lookAt(this.pointer), 1600);
      } else if (!this.opts.reducedMotion) {
        e.hop(10);
        e.blink(true);
      }
    }

    // Now and then, a line.
    if (now > this.nextAmbient && now - this.lastActivity < 30_000 && this.machine.state === "rest") {
      this.nextAmbient = now + rand(40_000, 70_000);
      const ctx = contextFor(window.location.pathname);
      this.say(Math.random() < 0.6 ? ambient[ctx] : ambient.general);
    }
  };

  /* ------------------------------------------------------------- the button: click, triple-click, drag, focus */
  onButtonPointerDown(ev: PointerEvent, el: HTMLElement) {
    if (ev.pointerType !== "mouse" || ev.button !== 0) return;
    this.drag = { id: ev.pointerId, start: { x: ev.clientX, y: ev.clientY }, moved: false };
    el.setPointerCapture(ev.pointerId);
  }

  onButtonPointerMove(ev: PointerEvent) {
    const d = this.drag;
    if (!d || d.id !== ev.pointerId) return;
    if (!d.moved && Math.hypot(ev.clientX - d.start.x, ev.clientY - d.start.y) > 6) {
      d.moved = true;
      this.abortAntic();
      this.dispatch({ type: "drag-start" });
      this.ui.setMood("surprised");
      this.ui.setFeet(true);
      this.closeMenu();
      this.clearBubble(true);
    }
    if (d.moved) this.engine.moveTo({ x: ev.clientX, y: ev.clientY }, 220, 20);
  }

  onButtonPointerUp(ev: PointerEvent) {
    const d = this.drag;
    this.drag = null;
    if (!d || !d.moved) return;
    // Wherever he's dropped becomes his corner (kept proportional if the window resizes).
    const spot = this.clampSpot(ev.clientX, ev.clientY);
    this.custom = { fx: spot.x / window.innerWidth, fy: spot.y / window.innerHeight };
    this.engine.moveTo(spot, 30, 9);
    this.dispatch({ type: "drag-end" });
    this.ui.setFeet(false);
    this.moodFor("happy", 900);
    this.sayEvent("dragged", { force: true });
    this.suppressClick = true;
  }

  onButtonClick() {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    const now = performance.now();
    this.clicks = [...this.clicks.filter((t) => now - t < 900), now];
    this.engine.blink();
    this.moodFor("surprised", 450);
    if (this.clicks.length >= 3) {
      this.clicks = [];
      this.closeMenu();
      this.engine.flash();
      this.ui.setStrip(this.placement());
      return;
    }
    if (this.introOpen) return;
    if (this.menuOpen) this.closeMenu();
    else {
      this.abortAntic();
      this.menuOpen = true;
      this.clearBubble(true);
      this.ui.setMenu({ open: true, ...this.placement() });
    }
  }

  /** Keyboard users tabbing to a tucked Flick bring him back into view. */
  onButtonFocus() {
    const p = this.engine.pos;
    if (p.x > window.innerWidth - this.opts.size * 0.3 || p.x < this.opts.size * 0.3) this.placeHome();
  }

  closeMenu() {
    if (!this.menuOpen) return;
    this.menuOpen = false;
    this.ui.setMenu(null);
  }

  /** "Do a trick" from his menu: an antic if something's within reach, else a happy float. */
  doTrick() {
    this.closeMenu();
    if (!this.canMove()) {
      this.engine.hop(14);
      this.moodFor("happy", 1000);
      return;
    }
    this.dispatch({ type: "request", state: this.antics.available() ? "antic" : "wander" });
  }

  dismiss() {
    this.closeMenu();
    this.abortAntic();
    this.dispatch({ type: "dismiss" });
    this.ui.dismiss();
  }
}
