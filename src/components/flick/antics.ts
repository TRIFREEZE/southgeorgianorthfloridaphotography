/**
 * Flick's antics: little performances with real things on the page.
 * Tidying a card, straightening a "crooked" heading, nudging a margin back,
 * snapping a photo, polishing a button, and the occasional hammer disaster
 * (crack! panic! wrench! fixed).
 *
 * Everything here is visual only: Web Animations on elements (cancelled
 * afterwards, which restores them exactly) plus temporary overlays in Flick's own
 * pointer-events:none layer. Nothing touches content, layout or form controls,
 * and every antic can be aborted instantly (scroll, typing, menus, navigation).
 */
import type { FlickEngine } from "./engine";
import type { AnticLine } from "./lines";
import type { FlickMood, FlickProp } from "./types";

export type AnticKind = "tidy" | "straighten" | "margin" | "hammer" | "shine" | "snap";

export interface AnticCtx {
  engine: FlickEngine;
  size: number;
  layer: HTMLElement;
  say(line: AnticLine): void;
  setMood(m: FlickMood, ms?: number): void;
  setProp(p: FlickProp): void;
  setFeet(on: boolean): void;
  done(): void;
}

const EXCLUDE = "form, dialog, header, nav, footer, [data-flick-avoid], [data-flick-root], [role=dialog]";
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

function visible(el: Element, opts: { minW?: number; maxH?: number; minH?: number } = {}) {
  if (el.closest(EXCLUDE)) return null;
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (r.width < (opts.minW ?? 60) || r.height < (opts.minH ?? 14) || r.height > (opts.maxH ?? 640)) return null;
  if (r.top < 86 || r.bottom > vh - 16 || r.left < 0 || r.right > vw) return null;
  return r;
}

function candidates(selector: string, opts?: Parameters<typeof visible>[1]) {
  const out: { el: HTMLElement; r: DOMRect }[] = [];
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const r = visible(el, opts);
    if (r) out.push({ el, r });
  });
  return out;
}

const targetsFor: Record<AnticKind, () => { el: HTMLElement; r: DOMRect }[]> = {
  tidy: () => [...candidates("main [data-flick-look]", { minW: 120 }), ...candidates("main article", { minW: 160 }), ...candidates("main li", { minW: 160, minH: 60, maxH: 420 })],
  straighten: () => [...candidates("main h2, main h3", { minW: 120, maxH: 220 }), ...candidates("main article", { minW: 160, maxH: 520 })],
  margin: () => [...candidates("main p", { minW: 180, maxH: 180 }), ...candidates("main .eyebrow", { minW: 80 })],
  hammer: () => [...candidates("main article", { minW: 160, maxH: 520 }), ...candidates("main [data-flick-look]", { minW: 140 }), ...candidates("main li", { minW: 160, minH: 60, maxH: 360 })],
  shine: () => candidates('main a[href^="/book"], main a[href^="/portfolio"], main a[href^="/services"]', { minW: 90, maxH: 80 }).filter((c) => c.el.className.includes("rounded-full")),
  snap: () => candidates("main [data-flick-look]", { minW: 120 }),
};

export class AnticDirector {
  private cleanups: (() => void)[] = [];
  private running = false;

  constructor(private ctx: AnticCtx) {}

  get isRunning() {
    return this.running;
  }

  /** Starts a random (or requested) antic. Returns false when nothing suitable is on screen. */
  run(kind?: AnticKind): boolean {
    const order: AnticKind[] = kind ? [kind] : this.shuffle(["tidy", "straighten", "margin", "hammer", "shine", "snap", "tidy", "hammer"]);
    for (const k of order) {
      const list = targetsFor[k]();
      if (!list.length) continue;
      const t = pick(list);
      this.running = true;
      this[k](t.el, t.r);
      return true;
    }
    return false;
  }

  /** Instantly undo everything (elements restored, overlays removed). */
  abort() {
    this.cleanups.splice(0).forEach((c) => {
      try {
        c();
      } catch {
        /* ignore */
      }
    });
    this.ctx.setProp(null);
    this.ctx.setFeet(false);
    this.running = false;
  }

  private finish() {
    this.abort();
    this.ctx.done();
  }

  private shuffle<T>(xs: T[]) {
    return [...xs].sort(() => Math.random() - 0.5);
  }

  /* ---------------------------------------------------------- helpers */
  /** Antic-scoped timer: cancelled by abort(), so nothing fires after an interruption. */
  private later(fn: () => void, ms: number) {
    const t = setTimeout(fn, ms);
    this.cleanups.push(() => clearTimeout(t));
  }

  private spot(x: number, y: number) {
    const s = this.ctx.size;
    return {
      x: Math.min(window.innerWidth - s / 2 - 6, Math.max(s / 2 + 6, x)),
      y: Math.min(window.innerHeight - s / 2 - 6, Math.max(78 + s / 2, y)),
    };
  }

  private fly(x: number, y: number, k = 34, d = 10) {
    this.ctx.setFeet(false);
    this.ctx.engine.moveTo(this.spot(x, y), k, d);
  }

  private animate(el: HTMLElement, frames: Keyframe[], opts: KeyframeAnimationOptions) {
    const a = el.animate(frames, opts);
    this.cleanups.push(() => a.cancel());
    return a;
  }

  private overlay(html: string, r: DOMRect, extra = "") {
    const box = document.createElement("div");
    box.className = "pointer-events-none absolute";
    box.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;${extra}`;
    box.innerHTML = html;
    this.ctx.layer.appendChild(box);
    this.cleanups.push(() => box.remove());
    return box;
  }

  private sparkle(x: number, y: number) {
    const s = document.createElement("span");
    const size = rand(10, 18);
    s.className = "pointer-events-none absolute";
    s.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;animation:flick-sparkle ${rand(0.6, 0.9)}s ease-out forwards;`;
    s.innerHTML = `<svg viewBox="0 0 20 20" width="100%" height="100%"><path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="${pick(["#D4A28C", "#FFFCF7", "#E9DCCB", "#A46B55"])}"/></svg>`;
    s.addEventListener("animationend", () => s.remove());
    this.ctx.layer.appendChild(s);
    this.cleanups.push(() => s.remove());
  }

  private shineSweep(r: DOMRect, radius: string) {
    this.overlay(
      `<span style="position:absolute;inset:0;overflow:hidden;border-radius:${radius}"><span style="position:absolute;top:-10%;bottom:-10%;left:0;width:38%;background:linear-gradient(90deg,transparent,rgba(255,252,247,.75),transparent);animation:flick-shine 1.1s cubic-bezier(.22,1,.36,1) forwards"></span></span>`,
      r,
    );
  }

  /* ---------------------------------------------------------- antics */

  /** Wipes a card or photo with a little cloth, sparkles, and a shine sweep. */
  private tidy(_el: HTMLElement, r: DOMRect) {
    const c = this.ctx;
    const s = c.size;
    const y = r.top + Math.min(r.height * 0.3, 90);
    this.fly(r.left + s * 0.4, y);
    this.later(() => {
      c.setProp("cloth");
      c.say("tidy-start");
      c.engine.moveTo(this.spot(r.right - s * 0.4, y + 10), 9, 6);
      for (let i = 0; i < 9; i++) this.later(() => this.sparkle(r.left + (r.width * (i + 1)) / 10, y + rand(-24, 34)), i * 170);
      this.later(() => this.shineSweep(r, "1.1rem"), 500);
    }, 900);
    this.later(() => {
      c.setProp(null);
      c.setMood("happy", 1400);
      c.engine.hop(12);
      c.say("tidy-done");
    }, 3000);
    this.later(() => this.finish(), 4300);
  }

  /** A heading or card goes slightly crooked; Flick notices and pushes it level. */
  private straighten(el: HTMLElement, r: DOMRect) {
    const c = this.ctx;
    const s = c.size;
    this.fly(r.right + s * 0.2, r.top - s * 0.1);
    let tilt: Animation | null = null;
    this.later(() => {
      c.engine.lookAt({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      tilt = this.animate(el, [{ transform: "rotate(0deg)" }, { transform: `rotate(${rand(1.6, 2.6).toFixed(2)}deg)` }], { duration: 380, easing: "cubic-bezier(.34,1.56,.64,1)", fill: "forwards" });
      c.setMood("curious");
      c.say("crooked");
    }, 900);
    this.later(() => {
      c.engine.moveTo(this.spot(r.right - s * 0.1, r.top + s * 0.1), 80, 12);
      c.engine.hop(10);
    }, 2300);
    this.later(() => {
      tilt?.cancel();
      this.animate(el, [{ transform: "rotate(2deg)" }, { transform: "rotate(-0.8deg)" }, { transform: "rotate(0.3deg)" }, { transform: "rotate(0deg)" }], { duration: 600, easing: "ease-out" });
      c.setMood("happy", 1400);
      c.say("straightened");
      c.engine.lookAt(null);
    }, 2600);
    this.later(() => this.finish(), 3900);
  }

  /** A paragraph drifts off its margin; Flick shoves it back into alignment. */
  private margin(el: HTMLElement, r: DOMRect) {
    const c = this.ctx;
    const s = c.size;
    const off = rand(10, 16);
    const drift = this.animate(el, [{ transform: "translateX(0)" }, { transform: `translateX(${off}px)` }], { duration: 500, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" });
    this.fly(r.left - s * 0.5, r.top + r.height / 2);
    this.later(() => {
      c.engine.lookAt({ x: r.left + 40, y: r.top + r.height / 2 });
      c.setMood("curious");
      c.say("margin");
    }, 900);
    this.later(() => {
      c.engine.moveTo(this.spot(r.right + s * 0.55 + off, r.top + r.height / 2), 30, 9);
    }, 2000);
    this.later(() => {
      c.engine.moveTo(this.spot(r.right + s * 0.45, r.top + r.height / 2), 120, 14);
      drift.cancel();
      this.animate(el, [{ transform: `translateX(${off}px)` }, { transform: "translateX(-3px)" }, { transform: "translateX(0)" }], { duration: 420, easing: "ease-out" });
      c.setMood("happy", 1200);
      c.say("margin-fixed");
      c.engine.lookAt(null);
    }, 3100);
    this.later(() => this.finish(), 4300);
  }

  /** The big one: a tiny tap with a hammer, a crack, panic, a wrench, and a cover-up. */
  private hammer(el: HTMLElement, r: DOMRect) {
    const c = this.ctx;
    const s = c.size;
    const impact = { x: r.width * rand(0.55, 0.8), y: r.height * rand(0.2, 0.4) };
    this.fly(r.right - s * 0.05, r.top + impact.y - s * 0.2);
    this.later(() => {
      c.setProp("hammer");
      c.say("hammer-start");
    }, 850);

    let broken: Animation | null = null;
    let crack: HTMLElement | null = null;
    this.later(() => {
      // CRACK
      c.setProp(null);
      c.engine.shake();
      c.setMood("surprised");
      const rays = Array.from({ length: 6 }, (_, i) => {
        const ang = (i / 6) * Math.PI * 2 + rand(-0.3, 0.3);
        let x = impact.x;
        let y = impact.y;
        let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
        const len = rand(40, Math.min(150, r.width * 0.4));
        for (let k = 1; k <= 4; k++) {
          const step = len / 4;
          x += Math.cos(ang + rand(-0.5, 0.5)) * step;
          y += Math.sin(ang + rand(-0.5, 0.5)) * step;
          d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
        }
        return `<path d="${d}" fill="none" stroke="rgba(37,39,35,.78)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="120" style="animation:flick-crack .28s ease-out both"/>`;
      }).join("");
      crack = this.overlay(
        `<svg width="${r.width}" height="${r.height}" style="overflow:visible;position:absolute;inset:0"><circle cx="${impact.x}" cy="${impact.y}" r="5" fill="rgba(37,39,35,.6)"/>${rays}</svg>`,
        r,
        "transition:opacity .5s ease;",
      );
      broken = this.animate(
        el,
        [
          { transform: "translate(0,0) rotate(0deg)" },
          { transform: "translate(-4px,2px) rotate(-1deg)", offset: 0.2 },
          { transform: "translate(4px,3px) rotate(1.4deg)", offset: 0.45 },
          { transform: "translate(0,5px) rotate(2.6deg)" },
        ],
        { duration: 420, easing: "ease-out", fill: "forwards" },
      );
      for (let i = 0; i < 6; i++) {
        const chip = document.createElement("span");
        chip.className = "pointer-events-none absolute block";
        chip.style.cssText = `left:${r.left + impact.x}px;top:${r.top + impact.y}px;width:5px;height:5px;background:#5d5c55;clip-path:polygon(50% 0,100% 100%,0 80%);--r:${rand(90, 270)}deg;--d:${rand(30, 70)}px;animation:flick-confetti .8s ease-in forwards;`;
        c.layer.appendChild(chip);
        this.cleanups.push(() => chip.remove());
      }
      c.say("hammer-oops");
    }, 1900);

    // Panic: frantic zipping back and forth.
    const base = { x: r.right - s * 0.05, y: r.top + impact.y - s * 0.2 };
    [2500, 2800, 3100, 3400].forEach((t, i) =>
      this.later(() => {
        c.setFeet(true);
        c.engine.moveTo(this.spot(base.x + (i % 2 ? 70 : -70), base.y + rand(-30, 30)), 160, 14);
        if (i === 1) c.say("hammer-panic");
      }, t),
    );

    this.later(() => {
      c.setFeet(false);
      c.engine.moveTo(this.spot(base.x, base.y), 60, 12);
      c.setMood("curious");
      c.setProp("wrench");
    }, 3800);
    this.later(() => {
      if (crack) crack.style.opacity = "0";
      (broken as Animation | null)?.cancel();
      this.animate(el, [{ transform: "translate(0,5px) rotate(2.6deg)" }, { transform: "translate(0,-3px) rotate(-0.6deg)" }, { transform: "translate(0,0) rotate(0deg)" }], { duration: 650, easing: "cubic-bezier(.34,1.56,.64,1)" });
      for (let i = 0; i < 6; i++) this.later(() => this.sparkle(r.left + impact.x + rand(-60, 60), r.top + impact.y + rand(-40, 40)), i * 90);
    }, 5100);
    this.later(() => {
      c.setProp(null);
      c.setMood("happy", 1600);
      c.engine.hop(14);
      c.say("hammer-fixed");
    }, 5800);
    this.later(() => this.finish(), 7300);
  }

  /** Buffs a button until it gleams. */
  private shine(el: HTMLElement, r: DOMRect) {
    const c = this.ctx;
    const s = c.size;
    this.fly(r.right + s * 0.35, r.top + r.height / 2 - s * 0.25);
    this.later(() => {
      c.setProp("cloth");
      c.engine.lookAt({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }, 900);
    this.later(() => {
      this.shineSweep(r, "999px");
      this.animate(el, [{ transform: "scale(1)" }, { transform: "scale(1.04)" }, { transform: "scale(1)" }], { duration: 500, easing: "ease-out" });
      for (let i = 0; i < 5; i++) this.later(() => this.sparkle(r.left + rand(0, r.width), r.top + rand(-8, r.height + 8)), i * 110);
      c.say("shine");
    }, 1900);
    this.later(() => {
      c.setProp(null);
      c.setMood("happy", 1000);
      c.engine.lookAt(null);
    }, 2900);
    this.later(() => this.finish(), 3500);
  }

  /** Lines up a photo and snaps it, with a flash on the photo itself. */
  private snap(_el: HTMLElement, r: DOMRect) {
    const c = this.ctx;
    const s = c.size;
    this.fly(r.right + s * 0.1, r.bottom - s * 0.2);
    this.later(() => c.engine.lookAt({ x: r.left + r.width / 2, y: r.top + r.height / 2 }), 800);
    this.later(() => {
      c.engine.flash();
      const f = this.overlay("", r, "background:#FFFCF7;border-radius:1.1rem;opacity:0;");
      f.animate([{ opacity: 0 }, { opacity: 0.8, offset: 0.1 }, { opacity: 0 }], { duration: 600, easing: "ease-out" });
      c.setMood("happy", 1200);
      c.say("snap");
    }, 1700);
    this.later(() => {
      c.engine.lookAt(null);
      this.finish();
    }, 3000);
  }
}
