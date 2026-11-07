/**
 * FlickController: Flick's brain. Owns the behavior machine, the motion engine,
 * interaction signals, scheduling and speech rules. React only renders what it is
 * told (mood, prop, bubble, menu) through the `ui` callbacks.
 *
 * Every listener and timer registered here is released in destroy().
 */
import { onFlick } from "./bus";
import { FlickEngine, type Vec } from "./engine";
import { ambient, contextFor, pickLine, reactions, type LineEvent } from "./lines";
import { initialMachine, isPaused, transition, type FlickEvent, type FlickState, type Machine } from "./machine";
import { sessionFlag } from "./prefs";
import { findFreeSpot, randomFreeSpot, rectIsFree, setFlickRoot, spotIsFree, tuckSpot, visiblePhotos, type Spot } from "./safeSpots";
import type { FlickMood, FlickProp } from "./types";
import { isLowPowerDevice } from "./useMediaFlags";

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const QUIET_MS = 10_000; // never speak during the first 10 seconds
const MIN_LINE_GAP = 15_000;
const SLEEP_AFTER = 45_000;

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
  setShown(on: boolean): void;
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
  private home: Spot | null = null;
  private pointer: Vec | null = null;
  private lastActivity = 0;
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
  private hesitate: ReturnType<typeof setTimeout> | undefined;
  private cleanups: (() => void)[] = [];
  private mood: FlickMood = "neutral";

  constructor(
    private dom: FlickDom,
    private opts: FlickOptions,
    private ui: FlickUI,
  ) {
    this.lowPower = isLowPowerDevice();
    this.engine = new FlickEngine(dom.body, dom.squash, dom.button, dom.trail, { size: opts.size, trail: this.trailOn() });
    this.machine = initialMachine(performance.now(), this.canMove());
  }

  /* ------------------------------------------------------------- setup */
  start() {
    setFlickRoot(this.dom.root);
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean }> };
    nav.getBattery?.()
      .then((b) => {
        if (!b.charging && b.level < 0.2) {
          this.lowPower = true;
          this.syncMotion();
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

    // Entrance: glide in from the right edge shedding echoes (or simply appear).
    const first = this.defaultHome();
    this.home = first;
    if (this.opts.reducedMotion) this.engine.jumpTo(first);
    else {
      this.engine.jumpTo({ x: window.innerWidth + this.opts.size, y: first.y });
      this.engine.moveTo(first, 22, 8);
    }
    this.ui.setShown(true);

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
    this.cleanups.forEach((c) => c());
    this.cleanups = [];
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    if (this.moodTimer) clearTimeout(this.moodTimer);
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
    if (this.hesitate) clearTimeout(this.hesitate);
    if (this.rafLook) cancelAnimationFrame(this.rafLook);
    this.persistLines();
    this.engine.destroy();
    setFlickRoot(null);
  }

  setReducedMotion(on: boolean) {
    this.opts.reducedMotion = on;
    this.syncMotion();
  }

  setMuted(on: boolean) {
    this.opts.muted = on;
    if (on) this.ui.setBubble(null);
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
    return !this.opts.reducedMotion && !this.lowPower && !this.opts.compact;
  }

  private syncMotion() {
    this.engine.setOptions({ trail: this.trailOn() });
    this.machine = { ...this.machine, allowMotion: this.canMove() };
  }

  private go(spot: Spot, k = 34, d = 10) {
    if (this.opts.reducedMotion) this.engine.jumpTo(spot);
    else this.engine.moveTo(spot, k, d);
  }

  private defaultHome(): Spot {
    const { size, compact } = this.opts;
    // On phones Flick lives tucked at the edge and pops in only briefly.
    if (compact) return tuckSpot(size, true);
    return findFreeSpot(size, false) ?? tuckSpot(size, false);
  }

  private setMood(m: FlickMood) {
    this.mood = m;
    this.ui.setMood(m);
  }

  private moodFor(m: FlickMood, ms: number) {
    this.setMood(m);
    if (this.moodTimer) clearTimeout(this.moodTimer);
    this.moodTimer = setTimeout(() => this.setMood(this.machine.state === "sleep" ? "sleepy" : "neutral"), ms);
  }

  private placeHome(jump = false) {
    const { size, compact } = this.opts;
    const prev = this.home;
    const keep = prev && !compact && spotIsFree(prev.x, prev.y, size) ? prev : null;
    const spot = keep ?? this.defaultHome();
    this.home = spot;
    if (jump) this.engine.jumpTo(spot);
    else this.go(spot);
  }

  /** Phone pop-in: come out to a free corner for a moment, then tuck again. */
  private popIn(ms = 2800) {
    if (!this.opts.compact) return;
    const spot = findFreeSpot(this.opts.size, true);
    if (!spot) return;
    this.go(spot, 60, 12);
    this.later(() => this.placeHome(), ms);
  }

  private placement(): Placement {
    const p = this.engine.pos;
    return { right: p.x > window.innerWidth / 2, below: p.y < 260 };
  }

  private persistLines() {
    try {
      window.sessionStorage.setItem("rcl:flick:lines", JSON.stringify([...this.shownLines]));
    } catch {
      /* ignore */
    }
  }

  /* ------------------------------------------------------------- speech */
  say(pool: string[], opts: { force?: boolean; announce?: boolean } = {}) {
    const now = performance.now();
    if (this.opts.muted || this.menuOpen) return false;
    if (now < QUIET_MS) return false;
    if (!opts.force && now - this.lastLine < MIN_LINE_GAP) return false;
    const text = pickLine(pool, this.shownLines);
    if (!text) return false;
    const { size } = this.opts;
    const p = this.engine.pos;
    const vw = window.innerWidth;
    const side: Bubble["side"] = p.x > vw / 2 ? "right" : "left";
    const w = Math.min(240, vw - 24);
    const left = side === "right" ? p.x + size / 2 - w : p.x - size / 2;
    const aboveOk = p.y - size / 2 - 64 > 80 && rectIsFree(left, p.y - size / 2 - 60, w, 52);
    const belowOk = !aboveOk && p.y + size / 2 + 64 < window.innerHeight && rectIsFree(left, p.y + size / 2 + 6, w, 52);
    // A bubble must never cover content: skip the line rather than intrude.
    if (!aboveOk && !belowOk && !opts.force) return false;
    this.lastLine = now;
    this.shownLines.add(text);
    this.persistLines();
    this.ui.setBubble({ text, key: now, side, below: !aboveOk && belowOk, announce: Boolean(opts.announce) });
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
    this.bubbleTimer = setTimeout(() => this.ui.setBubble(null), Math.max(2800, text.length * 70));
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
    if (prev === "sleep") {
      this.setMood("surprised");
      e.blink(true);
      this.later(() => this.setMood("neutral"), 700);
      this.sayEvent("wake");
    }
    if (prev === "peek" || prev === "inspect" || prev === "hide") {
      e.clip(null);
      e.lookAt(this.pointer);
    }
    this.ui.setFeet(false);

    switch (s) {
      case "rest":
        if (["wander", "peek", "inspect", "hide", "notice"].includes(prev)) this.placeHome();
        break;
      case "sleep":
        this.setMood("sleepy");
        break;
      case "notice": {
        if (prev !== "sleep") this.moodFor("surprised", 500);
        e.blink();
        const p = this.pointer;
        if (p && this.home && this.canMove()) {
          // Curious lean toward the cursor, then back.
          const dx = p.x - this.home.x;
          const dy = p.y - this.home.y;
          const d = Math.hypot(dx, dy) || 1;
          e.moveTo({ x: this.home.x + (dx / d) * 16, y: this.home.y + (dy / d) * 16 }, 50, 10);
          this.later(this.done, 1000);
        }
        break;
      }
      case "wander": {
        const spot = this.home ? randomFreeSpot(size, false, this.home) : null;
        if (!spot) return this.later(this.done, 0);
        this.ui.setFeet(true);
        this.home = spot;
        e.moveTo(spot, 26, 9);
        this.later(this.done, 2600);
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
        // Visual-only trick: clip the half that overlaps the photo, so Flick seems to peek from behind it.
        this.later(() => {
          if (this.machine.state !== "peek") return;
          e.clip(clipSide, hidden);
          e.lookAt({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        }, 700);
        this.later(() => {
          if (this.machine.state !== "peek") return;
          e.lookAt(this.pointer);
          e.blink();
        }, 2200);
        this.later(this.done, 3400);
        break;
      }
      case "inspect": {
        const el = this.hoverPhoto?.el;
        if (!el) return this.later(this.done, 0);
        const r = el.getBoundingClientRect();
        const center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        const cands = [
          { x: r.right + size * 0.5 + 6, y: r.bottom - size * 0.5 },
          { x: r.left - size * 0.5 - 6, y: r.bottom - size * 0.5 },
          { x: r.right + size * 0.5 + 6, y: r.top + size * 0.5 },
        ];
        const spot = cands.find((c) => c.x > size / 2 && c.x < window.innerWidth - size / 2 && spotIsFree(c.x, c.y, size));
        e.lookAt(center);
        this.setMood("curious");
        if (spot) e.moveTo(spot, 30, 10);
        if (Math.random() < 0.45) this.later(() => this.sayEvent("inspect"), 600);
        this.later(() => {
          this.setMood("neutral");
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
          const p = this.pointer;
          if (p && Math.hypot(p.x - e.pos.x, p.y - e.pos.y) < 260) this.sayEvent("found");
          this.done();
        }, 4200);
        break;
      }
      case "react":
        e.flash();
        e.hop(12);
        this.moodFor("happy", 1300);
        this.popIn();
        break;
      case "celebrate":
        this.moodFor("happy", 2600);
        e.hop(20, 2);
        e.emit(0.6, 1.1, 1.6);
        this.later(() => e.emit(0.5, 1.1, 2.2), 180);
        this.later(() => e.emit(0.4, 1.2, 2.9), 360);
        this.confetti(e.pos);
        this.popIn(3200);
        break;
      case "help":
        this.moodFor("curious", 2400);
        e.blink();
        this.popIn(4200);
        break;
      default:
        break;
    }
  }

  private confetti(p: Vec) {
    if (this.opts.reducedMotion) return;
    const colors = ["#A46B55", "#D4A28C", "#727F70", "#E6D3CC", "#DFD2C0"];
    for (let i = 0; i < 14; i++) {
      const s = document.createElement("span");
      const ang = (i / 14) * 360 + rand(-10, 10);
      s.className = "pointer-events-none absolute block rounded-[1px]";
      s.style.cssText = `left:${p.x}px;top:${p.y}px;width:${rand(4, 7)}px;height:${rand(7, 11)}px;background:${colors[i % colors.length]};--r:${ang}deg;--d:${-rand(40, 78)}px;animation:flick-confetti ${rand(0.7, 1.1)}s cubic-bezier(.22,1,.36,1) forwards;`;
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
      if (!p || this.opts.compact || this.opts.reducedMotion || this.hoverPhoto) return;
      const e = this.engine;
      const d = Math.hypot(p.x - e.pos.x, p.y - e.pos.y);
      e.lookAt(d < 520 ? p : null);
      if (d < 150 && this.machine.state === "rest") this.dispatch({ type: "request", state: "notice" });
    });
  };

  private onOver = (ev: PointerEvent) => {
    const t = ev.target as Element | null;
    const photo = t?.closest?.<HTMLElement>("[data-flick-look]");
    if (photo && photo !== this.hoverPhoto?.el) {
      this.hoverPhoto = { el: photo, since: performance.now() };
      if (!this.opts.compact && !this.opts.reducedMotion) {
        const r = photo.getBoundingClientRect();
        this.engine.lookAt({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }
    } else if (!photo && this.hoverPhoto) {
      this.hoverPhoto = null;
      this.engine.lookAt(this.pointer);
    }
    if (t?.closest?.('a[href^="/book"]') && !sessionFlag("cta-line") && Math.random() < 0.3) {
      if (this.sayEvent("cta")) sessionFlag("cta-line", true);
    }
  };

  private scrollEnd: ReturnType<typeof setTimeout> | undefined;
  private lastY = 0;
  private onScroll = () => {
    this.lastActivity = performance.now();
    const dy = window.scrollY - this.lastY;
    this.lastY = window.scrollY;
    const e = this.engine;
    if (!this.opts.reducedMotion) e.lookAt({ x: e.pos.x, y: e.pos.y + (dy > 0 ? 200 : -200) });
    const st = this.machine.state;
    if (st === "peek" || st === "inspect" || st === "notice") this.done();
    if (st === "sleep") this.dispatch({ type: "activity" });
    if (this.scrollEnd) clearTimeout(this.scrollEnd);
    this.scrollEnd = setTimeout(() => {
      e.lookAt(this.pointer);
      if (!isPaused(this.machine) && (this.machine.state === "rest" || this.machine.state === "sleep")) this.placeHome();
    }, 220);
  };

  private isField = (el: EventTarget | null) => el instanceof HTMLElement && (el.matches("input, textarea, select") || el.isContentEditable);

  private armHesitation() {
    if (this.hesitate) clearTimeout(this.hesitate);
    this.hesitate = setTimeout(() => {
      if (!sessionFlag("hesitate-help") && this.sayEvent("help-hesitate", { force: true, announce: true })) sessionFlag("hesitate-help", true);
    }, 25_000);
  }

  private onFocusIn = (ev: FocusEvent) => {
    if (!this.isField(ev.target) || (ev.target instanceof Node && this.dom.root.contains(ev.target))) return;
    this.dispatch({ type: "pause", reason: "typing" });
    this.ui.setBubble(null);
    // Get completely out of the way of forms while someone types.
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
    if (document.hidden) this.dispatch({ type: "pause", reason: "hidden" });
    else {
      this.dispatch({ type: "resume", reason: "hidden" });
      this.lastActivity = performance.now();
    }
  };

  private resizeT: ReturnType<typeof setTimeout> | undefined;
  private onResize = () => {
    if (this.resizeT) clearTimeout(this.resizeT);
    this.resizeT = setTimeout(() => this.placeHome(true), 200);
  };

  private onSignal = (s: Parameters<Parameters<typeof onFlick>[0]>[0]) => {
    this.lastActivity = performance.now();
    switch (s.type) {
      case "photo-click":
        this.dispatch({ type: "request", state: "react" });
        if (Math.random() < 0.55) this.sayEvent("photo-click");
        break;
      case "photo-favorite":
        this.dispatch({ type: "request", state: "react" });
        this.sayEvent("photo-favorite", { force: !sessionFlag("fav-line") });
        sessionFlag("fav-line", true);
        break;
      case "card-pick":
        this.engine.hop(10);
        this.moodFor("happy", 900);
        if (Math.random() < 0.3) this.sayEvent("card-pick");
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
        this.sayEvent("celebrate-story", { force: true });
        break;
      case "form-error":
        if ((this.machine.cooldownUntil.help ?? 0) > performance.now()) break;
        this.dispatch({ type: "request", state: "help" });
        this.sayEvent("help-error", { force: true, announce: true });
        break;
      case "pause":
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
      default:
        break;
    }
  };

  /* ------------------------------------------------------------- heartbeat (1 Hz, no animation loop) */
  private nextBehavior = performance.now() + rand(9000, 14000);
  private nextBlink = performance.now() + rand(2600, 5200);
  private nextAmbient = Math.max(QUIET_MS + 8000, performance.now() + rand(18_000, 30_000));
  private lastZ = 0;

  private heartbeat = () => {
    if (document.hidden) return;
    const now = performance.now();
    const e = this.engine;
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
      this.nextBlink = now + rand(2600, 6200);
      e.blink(Math.random() < 0.14);
    }

    // Hovering one photo for a while → go have a closer look (once per hover).
    const hp = this.hoverPhoto;
    if (hp && now - hp.since > 1200 && this.canMove() && this.machine.state === "rest") {
      hp.since = now + 20_000;
      if (Math.random() < 0.5) this.dispatch({ type: "request", state: "inspect" });
    }

    if (this.machine.state === "rest" && now > this.nextBehavior) {
      this.nextBehavior = now + rand(6000, 12000);
      const r = Math.random();
      if (this.canMove()) {
        if (r < 0.34) this.dispatch({ type: "request", state: "wander" });
        else if (r < 0.52 && visiblePhotos().length) this.dispatch({ type: "request", state: "peek" });
        else if (r < 0.58) this.dispatch({ type: "request", state: "hide" });
        else if (r < 0.66) {
          this.ui.setProp("cloth"); // pretends to clean the lens
          this.later(() => this.ui.setProp(null), 2900);
        } else e.blink(true);
      } else if (r < 0.3) e.blink(true);
    }

    // Ambient line: only during active browsing, roughly every 35–60s.
    if (now > this.nextAmbient && now - this.lastActivity < 20_000 && this.machine.state === "rest") {
      this.nextAmbient = now + rand(35_000, 60_000);
      const ctx = contextFor(window.location.pathname);
      const pool = [...ambient[ctx], ...(ctx === "general" ? [] : ambient.general.slice(0, 2))];
      if (this.opts.compact) {
        this.popIn(3600);
        this.later(() => this.say(pool), 500);
      } else this.say(pool);
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
      this.dispatch({ type: "drag-start" });
      this.setMood("surprised");
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
    const { size } = this.opts;
    const drop = { x: ev.clientX, y: ev.clientY };
    const cands = [drop, { x: drop.x, y: drop.y - 60 }, { x: drop.x, y: drop.y + 60 }, { x: drop.x - 70, y: drop.y }, { x: drop.x + 70, y: drop.y }];
    const spot =
      cands.find((c) => c.x > size / 2 && c.x < window.innerWidth - size / 2 && c.y > 90 && spotIsFree(c.x, c.y, size)) ??
      findFreeSpot(size, false) ??
      tuckSpot(size, false);
    this.home = spot;
    this.dispatch({ type: "drag-end" });
    this.engine.moveTo(spot, 30, 9);
    this.ui.setFeet(false);
    this.moodFor("happy", 900);
    if (Math.random() < 0.6) this.sayEvent("dragged", { force: true });
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
    if (this.opts.compact && this.engine.pos.x > window.innerWidth - this.opts.size * 0.3) this.popIn(6000);
    if (this.menuOpen) this.closeMenu();
    else {
      this.menuOpen = true;
      this.ui.setBubble(null);
      this.ui.setMenu({ open: true, ...this.placement() });
    }
  }

  /** Keyboard users tabbing to a tucked Flick bring him fully into view. */
  onButtonFocus() {
    const { size, compact } = this.opts;
    const e = this.engine;
    if (e.pos.x > window.innerWidth - size * 0.3) {
      const spot = findFreeSpot(size, compact) ?? { x: window.innerWidth - size / 2 - 12, y: e.pos.y };
      this.go(spot, 60, 12);
    }
  }

  closeMenu() {
    if (!this.menuOpen) return;
    this.menuOpen = false;
    this.ui.setMenu(null);
  }

  moveOtherSide() {
    const { size, compact } = this.opts;
    const e = this.engine;
    const vw = window.innerWidth;
    const target = { x: e.pos.x > vw / 2 ? 22 + size / 2 : vw - 22 - size / 2, y: e.pos.y };
    const spot = spotIsFree(target.x, target.y, size) ? target : findFreeSpot(size, compact, e.pos, vw / 3) ?? target;
    this.home = spot;
    this.go(spot, 26, 9);
  }

  dismiss() {
    this.closeMenu();
    this.dispatch({ type: "dismiss" });
    this.ui.dismiss();
  }

  get currentMood() {
    return this.mood;
  }
}
