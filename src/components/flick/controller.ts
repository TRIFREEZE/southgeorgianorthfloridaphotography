/**
 * FlickController: Flick's brain. Owns the behavior machine, the motion engine,
 * the antic director, interaction signals, scheduling and speech. React only
 * renders what it is told (mood, prop, bubble, menu, intro) via `ui`.
 *
 * Flick is the star of the page: he introduces himself on a first visit,
 * chats often, comments on what you're looking at, and keeps busy tidying and
 * "fixing" the site. Guardrails stay: he goes quiet and tucks away while
 * someone types, pauses for menus and dialogs, honors reduced motion, never
 * catches clicks while he's flying around, and can be muted or hidden.
 *
 * Every listener and timer registered here is released in destroy().
 */
import { AnticDirector } from "./antics";
import { onFlick } from "./bus";
import { FlickEngine, type Vec } from "./engine";
import { ambient, anticLines, contextFor, pickLine, reactions, sectionComments, type LineEvent } from "./lines";
import { initialMachine, isPaused, transition, type FlickEvent, type FlickState, type Machine } from "./machine";
import { sessionFlag } from "./prefs";
import { randomFreeSpot, rectIsFree, setFlickRoot, tuckSpot, visiblePhotos, type Spot } from "./safeSpots";
import type { FlickMood, FlickProp } from "./types";
import { isLowPowerDevice } from "./useMediaFlags";

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const QUIET_MS = 1500;
const MIN_LINE_GAP = 6500;
const SLEEP_AFTER = 60_000;
const INTRO_KEY = "rcl:flick:introduced";

export interface Bubble {
  text: string;
  key: number;
  side: "left" | "right";
  below: boolean;
  announce: boolean;
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
}

export class FlickController {
  private engine: FlickEngine;
  private machine: Machine;
  private antics: AnticDirector;
  private home: Spot | null = null;
  private pointer: Vec | null = null;
  private lastActivity = 0;
  private lastScroll = 0;
  private lastLine = 0;
  private shownLines = new Set<string>();
  private lowPower = false;
  private clicks: number[] = [];
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private moodTimer: ReturnType<typeof setTimeout> | null = null;
  private bubbleTimer: ReturnType<typeof setTimeout> | null = null;
  private hoverPhoto: { el: HTMLElement; since: number } | null = null;
  private drag: { id: number; start: Vec; moved: boolean } | null = null;
  private suppressClick = false;
  private menuOpen = false;
  private introOpen = false;
  private hesitate: ReturnType<typeof setTimeout> | undefined;
  private cleanups: (() => void)[] = [];
  private path = "";
  private commented = new Set<string>();
  private saidBottom = false;
  private lastFastScroll = 0;

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
      say: (line) => this.say(anticLines[line], { interrupt: true }),
      setMood: (m, ms) => (ms ? this.moodFor(m, ms) : this.ui.setMood(m)),
      setProp: (p) => this.ui.setProp(p),
      setFeet: (on) => this.ui.setFeet(on),
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
          this.engine.setOptions({ trail: false });
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

    // Entrance: swoop in from the right edge, shedding echoes, into the corner.
    const first = this.homeSpot();
    this.home = first;
    if (this.opts.reducedMotion) this.engine.jumpTo(first);
    else {
      this.engine.jumpTo({ x: window.innerWidth + this.opts.size, y: first.y - 120 });
      this.engine.moveTo(first, 18, 7);
    }
    this.ui.setShown(true);

    if (!this.introduced()) this.later(() => this.startIntro(), this.opts.reducedMotion ? 300 : 1300);
    else if (!sessionFlag("greeted")) this.later(() => this.sayEvent("welcome-back", { force: true }), 1800);
    else this.later(() => this.pageHello(), 1600);
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
    if (on) this.ui.setBubble(null);
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
    this.ui.setBubble(null);
    this.dispatch({ type: "pause", reason: "intro" });
    this.introOpen = true;
    const spot = this.homeSpot();
    this.home = spot;
    this.go(spot, 40, 10);
    this.later(() => {
      this.moodFor("happy", 2200);
      this.engine.hop(18, 2);
      this.engine.emit(0.5, 1.1, 1.8);
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
    if (action === "ok") this.later(() => this.say(["have fun looking around!", "i'll be right here. tidying.", "go on, explore. i'll keep it tidy."], { force: true }), 500);
    this.nextBehavior = performance.now() + rand(3500, 6000);
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

  private trailOn() {
    return !this.opts.reducedMotion && !this.lowPower;
  }

  private canMove() {
    return !this.opts.reducedMotion;
  }

  private go(spot: Spot, k = 34, d = 10) {
    if (this.opts.reducedMotion) this.engine.jumpTo(spot);
    else this.engine.moveTo(spot, k, d);
  }

  /** Home is always the bottom-right corner: visible, hovering, out of the reading flow. */
  private homeSpot(): Spot {
    const { size, compact } = this.opts;
    const m = compact ? 10 : 22;
    return { x: window.innerWidth - m - size / 2, y: window.innerHeight - m - size / 2 };
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
    this.home = spot;
    if (jump) this.engine.jumpTo(spot);
    else this.go(spot, 30, 9);
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
  say(pool: string[], opts: { force?: boolean; announce?: boolean; interrupt?: boolean } = {}) {
    const now = performance.now();
    if (this.opts.muted || this.menuOpen || this.introOpen) return false;
    if (isPaused(this.machine) && !opts.announce) return false;
    if (now < QUIET_MS) return false;
    // interrupt: part of a performance (antics), always speaks; force: events, short gap; otherwise ambient pacing.
    if (!opts.interrupt && !opts.force && now - this.lastLine < MIN_LINE_GAP) return false;
    if (!opts.interrupt && opts.force && now - this.lastLine < 1800) return false;
    const text = pickLine(pool, this.shownLines);
    if (!text) return false;
    const { size } = this.opts;
    const p = this.engine.pos;
    const vw = window.innerWidth;
    const side: Bubble["side"] = p.x > vw / 2 ? "right" : "left";
    const w = Math.min(260, vw - 24);
    const left = side === "right" ? p.x + size / 2 - w : p.x - size / 2;
    const roomAbove = p.y - size / 2 - 70 > 76;
    const freeBelow = p.y + size / 2 + 70 < window.innerHeight && rectIsFree(left, p.y + size / 2 + 6, w, 56);
    const below = !roomAbove || (freeBelow && !rectIsFree(left, p.y - size / 2 - 64, w, 56) && p.y < window.innerHeight * 0.4);
    this.lastLine = now;
    this.shownLines.add(text);
    this.persistLines();
    this.ui.setBubble({ text, key: now, side, below, announce: Boolean(opts.announce) });
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
    this.bubbleTimer = setTimeout(() => this.ui.setBubble(null), Math.max(3000, text.length * 75));
    return true;
  }

  private sayEvent(e: LineEvent, opts?: { force?: boolean; announce?: boolean }) {
    return this.say(reactions[e], opts);
  }

  private pageHello() {
    const ctx = contextFor(window.location.pathname);
    this.say(ambient[ctx], { force: true });
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
      this.sayEvent("wake", { force: true });
    }
    if (prev === "peek" || prev === "inspect" || prev === "hide") {
      e.clip(null);
      e.lookAt(this.pointer);
    }
    this.ui.setFeet(false);
    this.setInteractive(s === "rest" || s === "sleep" || s === "notice" || s === "react" || s === "celebrate" || s === "help" || s === "drag");

    switch (s) {
      case "rest":
        if (["wander", "peek", "inspect", "hide", "notice", "antic"].includes(prev) && !isPaused(this.machine)) this.placeHome();
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
        const p = this.pointer;
        if (p && this.home && this.canMove()) {
          const dx = p.x - this.home.x;
          const dy = p.y - this.home.y;
          const d = Math.hypot(dx, dy) || 1;
          e.moveTo({ x: this.home.x + (dx / d) * 22, y: this.home.y + (dy / d) * 22 }, 50, 10);
          this.later(this.done, 1000);
        }
        break;
      }
      case "wander": {
        const spot = this.home ? randomFreeSpot(size, this.opts.compact, this.home) : null;
        if (!spot) return this.later(this.done, 0);
        this.ui.setFeet(true);
        e.moveTo(spot, 22, 8);
        if (Math.random() < 0.4) this.later(() => this.say(ambient.general), 900);
        this.later(this.done, 2800);
        break;
      }
      case "peek": {
        const rects = visiblePhotos();
        const r = rects[Math.floor(Math.random() * rects.length)];
        if (!r) return this.later(this.done, 0);
        const cy = r.top + r.height * 0.32;
        const rightX = r.right + size * 0.1;
        const leftX = r.left - size * 0.1;
        let side: "left" | "right" | null = null;
        if (rightX + size / 2 < window.innerWidth - 4 && rectIsFree(r.right + 2, cy - size * 0.4, size * 0.55, size * 0.8)) side = "left";
        else if (leftX - size / 2 > 4 && rectIsFree(r.left - size * 0.55 - 2, cy - size * 0.4, size * 0.55, size * 0.8)) side = "right";
        if (!side) return this.later(this.done, 0);
        const hidden = size / 2 - size * 0.1;
        const clipSide = side;
        e.moveTo({ x: side === "left" ? rightX : leftX, y: cy }, 30, 10);
        this.later(() => {
          if (this.machine.state !== "peek") return;
          e.clip(clipSide, hidden);
          e.lookAt({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        }, 700);
        this.later(() => {
          if (this.machine.state !== "peek") return;
          e.lookAt(this.pointer);
          e.blink();
          this.sayEvent("found");
        }, 2200);
        this.later(this.done, 3400);
        break;
      }
      case "inspect": {
        const el = this.hoverPhoto?.el;
        if (!el) return this.later(this.done, 0);
        const r = el.getBoundingClientRect();
        const center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        const spot = { x: Math.min(window.innerWidth - size / 2 - 6, r.right + size * 0.3), y: Math.max(80 + size / 2, r.top + size * 0.2) };
        e.lookAt(center);
        this.ui.setMood("curious");
        e.moveTo(spot, 30, 10);
        this.later(() => this.sayEvent("inspect"), 600);
        this.later(() => {
          this.ui.setMood("neutral");
          this.done();
        }, 2800);
        break;
      }
      case "hide": {
        const y = e.pos.y;
        const vw = window.innerWidth;
        e.moveTo({ x: vw + size, y }, 24, 8);
        this.later(() => {
          if (this.machine.state !== "hide") return;
          e.jumpTo({ x: vw + size, y });
          e.moveTo({ x: vw - size * 0.16, y }, 40, 11);
          e.lookAt({ x: 0, y });
        }, 2000);
        this.later(() => {
          if (this.machine.state !== "hide") return;
          this.sayEvent("found", { force: true });
          this.done();
        }, 4200);
        break;
      }
      case "react":
        e.flash();
        e.hop(14);
        this.moodFor("happy", 1300);
        break;
      case "celebrate":
        this.moodFor("happy", 2600);
        e.hop(22, 2);
        e.emit(0.6, 1.1, 1.6);
        this.later(() => e.emit(0.5, 1.1, 2.2), 180);
        this.later(() => e.emit(0.4, 1.2, 2.9), 360);
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
    if (this.opts.reducedMotion) return;
    const colors = ["#A46B55", "#D4A28C", "#727F70", "#E6D3CC", "#DFD2C0"];
    for (let i = 0; i < 18; i++) {
      const s = document.createElement("span");
      const ang = (i / 18) * 360 + rand(-10, 10);
      s.className = "pointer-events-none absolute block rounded-[1px]";
      s.style.cssText = `left:${p.x}px;top:${p.y}px;width:${rand(5, 8)}px;height:${rand(8, 13)}px;background:${colors[i % colors.length]};--r:${ang}deg;--d:${-rand(60, 110)}px;animation:flick-confetti ${rand(0.8, 1.2)}s cubic-bezier(.22,1,.36,1) forwards;`;
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
      if (!p || this.opts.reducedMotion || this.hoverPhoto || this.machine.state === "antic") return;
      const e = this.engine;
      const d = Math.hypot(p.x - e.pos.x, p.y - e.pos.y);
      e.lookAt(d < 900 ? p : null);
      if (d < 170 && this.machine.state === "rest") this.dispatch({ type: "request", state: "notice" });
    });
  };

  private onOver = (ev: PointerEvent) => {
    const t = ev.target as Element | null;
    const photo = t?.closest?.<HTMLElement>("[data-flick-look]");
    if (photo && photo !== this.hoverPhoto?.el) {
      this.hoverPhoto = { el: photo, since: performance.now() };
      if (!this.opts.reducedMotion && this.machine.state !== "antic") {
        const r = photo.getBoundingClientRect();
        this.engine.lookAt({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }
      if (Math.random() < 0.3) this.sayEvent("photo-hover");
    } else if (!photo && this.hoverPhoto) {
      this.hoverPhoto = null;
      this.engine.lookAt(this.pointer);
    }
    const cta = t?.closest?.<HTMLElement>('a[href^="/book"]');
    if (cta && !cta.dataset.flickSeen && Math.random() < 0.5) {
      cta.dataset.flickSeen = "1";
      this.sayEvent("cta");
    }
  };

  private scrollEnd: ReturnType<typeof setTimeout> | undefined;
  private lastY = 0;
  private scrollBurst = { y: 0, t: 0 };
  private onScroll = () => {
    const now = performance.now();
    this.lastActivity = now;
    this.lastScroll = now;
    const dy = window.scrollY - this.lastY;
    this.lastY = window.scrollY;
    const e = this.engine;
    if (!this.opts.reducedMotion && this.machine.state !== "antic") e.lookAt({ x: e.pos.x, y: e.pos.y + (dy > 0 ? 200 : -200) });
    const st = this.machine.state;
    if (st === "peek" || st === "inspect" || st === "notice" || st === "antic") this.done();
    if (st === "sleep") this.dispatch({ type: "activity" });

    if (now - this.scrollBurst.t > 600) this.scrollBurst = { y: window.scrollY, t: now };
    else if (Math.abs(window.scrollY - this.scrollBurst.y) > 2200 && now - this.lastFastScroll > 45_000) {
      this.lastFastScroll = now;
      this.sayEvent("fast-scroll");
    }

    if (this.scrollEnd) clearTimeout(this.scrollEnd);
    this.scrollEnd = setTimeout(() => {
      e.lookAt(this.pointer);
      if (!isPaused(this.machine) && (this.machine.state === "rest" || this.machine.state === "sleep")) this.placeHome();
      this.commentOnSection();
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 60;
      if (atBottom && !this.saidBottom) {
        this.saidBottom = true;
        this.sayEvent("scroll-bottom");
      }
    }, 260);
  };

  /** When a new section heading settles into view, Flick has something to say about it. */
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
    if (hit && Math.random() < 0.8) {
      this.engine.lookAt({ x: h.getBoundingClientRect().left + 80, y: h.getBoundingClientRect().top + 20 });
      this.say(hit.lines);
    }
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
    this.ui.setBubble(null);
    // Forms are sacred: get completely out of the way while someone types.
    this.go(tuckSpot(this.opts.size, this.opts.compact), 40, 11);
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
      this.placeHome(true);
    }, 200);
  };

  private onSignal = (s: Parameters<Parameters<typeof onFlick>[0]>[0]) => {
    this.lastActivity = performance.now();
    switch (s.type) {
      case "photo-click":
        this.abortAntic();
        this.dispatch({ type: "request", state: "react" });
        this.sayEvent("photo-click", { force: true });
        break;
      case "photo-favorite":
        this.dispatch({ type: "request", state: "react" });
        this.sayEvent("photo-favorite", { force: true, announce: true });
        break;
      case "card-pick":
        this.engine.hop(12);
        this.moodFor("happy", 900);
        if (Math.random() < 0.6) this.sayEvent("card-pick", { force: true });
        break;
      case "booking-step":
        this.engine.blink();
        this.engine.hop(8);
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
        this.ui.setBubble(null);
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
  private nextBehavior = performance.now() + rand(5000, 8000);
  private nextBlink = performance.now() + rand(2600, 5200);
  private nextAmbient = performance.now() + rand(9000, 14000);
  private lastZ = 0;

  private heartbeat = () => {
    if (document.hidden) return;
    const now = performance.now();
    const e = this.engine;

    // Client-side navigation: new page, new things to talk about.
    if (window.location.pathname !== this.path) {
      this.path = window.location.pathname;
      this.commented.clear();
      this.saidBottom = false;
      this.abortAntic();
      this.later(() => this.pageHello(), 1200);
      this.nextBehavior = now + rand(4000, 7000);
    }

    this.dispatch({ type: "tick" });
    if (this.machine.state === "rest" && !isPaused(this.machine) && now - this.lastActivity > SLEEP_AFTER) this.dispatch({ type: "idle" });

    if (this.machine.state === "sleep") {
      if (now - this.lastZ > 1600 && !this.opts.reducedMotion) {
        this.lastZ = now;
        const { size } = this.opts;
        const z = document.createElement("span");
        z.textContent = "z";
        z.className = "pointer-events-none absolute font-display italic text-clay-deep";
        z.style.cssText = `left:${e.pos.x + size * 0.18}px;top:${e.pos.y - size * 0.42}px;font-size:${size * 0.22}px;animation:flick-z 1.8s ease-out forwards;`;
        z.addEventListener("animationend", () => z.remove());
        this.dom.trail.appendChild(z);
      }
      return;
    }
    if (isPaused(this.machine)) return;

    if (now > this.nextBlink) {
      this.nextBlink = now + rand(2400, 5600);
      e.blink(Math.random() < 0.18);
    }

    // Hovering one photo for a while → go have a closer look (once per hover).
    const hp = this.hoverPhoto;
    if (hp && now - hp.since > 1200 && this.canMove() && this.machine.state === "rest") {
      hp.since = now + 20_000;
      if (Math.random() < 0.6) this.dispatch({ type: "request", state: "inspect" });
    }

    // Stay busy: antics most of the time, plus wanders, peeks and hide-and-seek.
    const settledScroll = now - this.lastScroll > 1400;
    if (this.machine.state === "rest" && now > this.nextBehavior && settledScroll) {
      this.nextBehavior = now + (this.opts.compact ? rand(7000, 11000) : rand(5500, 9000));
      const r = Math.random();
      if (this.canMove()) {
        if (r < 0.55) this.dispatch({ type: "request", state: "antic" });
        else if (r < 0.68) this.dispatch({ type: "request", state: "wander" });
        else if (r < 0.8 && !this.opts.compact && visiblePhotos().length) this.dispatch({ type: "request", state: "peek" });
        else if (r < 0.86 && !this.opts.compact) this.dispatch({ type: "request", state: "hide" });
        else if (r < 0.94) {
          this.ui.setProp("cloth"); // cleans his own lens
          this.later(() => this.ui.setProp(null), 2900);
          if (Math.random() < 0.5) this.say(["just cleaning my lens.", "smudge. gone.", "a clean lens is a happy lens."]);
        } else {
          e.hop(12);
          e.blink(true);
        }
      } else if (r < 0.4) e.blink(true);
    }

    // Ambient chatter while you browse.
    if (now > this.nextAmbient && now - this.lastActivity < 30_000 && this.machine.state === "rest") {
      this.nextAmbient = now + rand(12_000, 20_000);
      const ctx = contextFor(window.location.pathname);
      const pool = [...ambient[ctx], ...(ctx === "general" ? [] : ambient.general)];
      if (this.say(pool)) e.hop(8);
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
      this.ui.setBubble(null);
    }
    if (d.moved) this.engine.moveTo({ x: ev.clientX, y: ev.clientY }, 220, 20);
  }

  onButtonPointerUp(ev: PointerEvent) {
    const d = this.drag;
    this.drag = null;
    if (!d || !d.moved) return;
    void ev;
    this.dispatch({ type: "drag-end" });
    this.ui.setFeet(false);
    this.moodFor("happy", 900);
    this.sayEvent("dragged", { force: true });
    // Floats back home to the corner after a moment.
    this.later(() => this.machine.state === "rest" && this.placeHome(), 2200);
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
      this.ui.setBubble(null);
      this.ui.setMenu({ open: true, ...this.placement() });
    }
  }

  /** Keyboard users tabbing to a tucked Flick bring him back into view. */
  onButtonFocus() {
    if (this.engine.pos.x > window.innerWidth - this.opts.size * 0.3) this.go(this.homeSpot(), 60, 12);
  }

  closeMenu() {
    if (!this.menuOpen) return;
    this.menuOpen = false;
    this.ui.setMenu(null);
  }

  /** Keyboard-accessible alternative to dragging: hop over and do a trick. */
  doTrick() {
    this.closeMenu();
    if (!this.canMove()) {
      this.engine.blink(true);
      return;
    }
    this.dispatch({ type: "request", state: "antic" });
  }

  dismiss() {
    this.closeMenu();
    this.abortAntic();
    this.dispatch({ type: "dismiss" });
    this.ui.dismiss();
  }
}
