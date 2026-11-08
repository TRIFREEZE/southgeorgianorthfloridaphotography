/**
 * Flick's antics, the tasteful edition: rare, small, and only with things right
 * beside him. He never crosses the screen for them; he just floats up or down his
 * own side of the page.
 *
 *  - polish: buffs a nearby card, photo or button with his cloth (soft shine sweep)
 *  - break:  a careful tap with a hammer, a hairline crack, a quiet "oops",
 *            a wrench, and it's fixed
 *
 * Visual only: Web Animations on the element (cancelled afterwards, which restores
 * it exactly) and temporary overlays in Flick's pointer-events:none layer. Nothing
 * touches content, layout or form controls; every antic can be aborted instantly.
 */
import type { FlickEngine } from "./engine";
import type { AnticLine } from "./lines";
import type { FlickMood, FlickProp } from "./types";

export type AnticKind = "polish" | "break";

export interface AnticCtx {
  engine: FlickEngine;
  size: number;
  layer: HTMLElement;
  /** Flick's side of the screen: the x he stays at. */
  homeX(): number;
  say(line: AnticLine, chance?: number): void;
  setMood(m: FlickMood, ms?: number): void;
  setProp(p: FlickProp): void;
  done(): void;
}

const EXCLUDE = "form, dialog, header, nav, footer, [data-flick-avoid], [data-flick-root], [role=dialog]";
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

export class AnticDirector {
  private cleanups: (() => void)[] = [];
  private running = false;

  constructor(private ctx: AnticCtx) {}

  get isRunning() {
    return this.running;
  }

  /** Elements within arm's reach of Flick's side of the screen. */
  private nearby(selector: string, opts: { minW: number; maxH: number }) {
    const { size } = this.ctx;
    const x = this.ctx.homeX();
    const onRight = x > window.innerWidth / 2;
    const vh = window.innerHeight;
    const out: { el: HTMLElement; r: DOMRect }[] = [];
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      if (el.closest(EXCLUDE)) return;
      const r = el.getBoundingClientRect();
      if (r.width < opts.minW || r.height < 30 || r.height > opts.maxH) return;
      if (r.top < 96 || r.bottom > vh - 20) return;
      const reach = onRight ? r.right >= x - size * 0.95 && r.right <= x + size * 0.2 : r.left <= x + size * 0.95 && r.left >= x - size * 0.2;
      if (reach) out.push({ el, r });
    });
    return out;
  }

  private targets(k: AnticKind) {
    return k === "polish"
          ? [
              ...this.nearby("main [data-flick-look]", { minW: 120, maxH: 640 }),
              ...this.nearby("main article", { minW: 140, maxH: 560 }),
              // real buttons only (filled or outlined), not text links
              ...this.nearby('main a[class*="rounded-full"]', { minW: 90, maxH: 80 }).filter((t) => /\bbg-ink\b|\bborder-ink/.test(t.el.className)),
            ]
      : [...this.nearby("main article", { minW: 160, maxH: 560 }), ...this.nearby("main [data-flick-look]", { minW: 160, maxH: 640 })];
  }

  /** Is anything within reach right now? */
  available() {
    return this.targets("polish").length > 0 || this.targets("break").length > 0;
  }

  run(kind?: AnticKind): boolean {
    const kinds: AnticKind[] = kind ? [kind] : Math.random() < 0.65 ? ["polish", "break"] : ["break", "polish"];
    for (const k of kinds) {
      const list = this.targets(k);
      if (!list.length) continue;
      const t = pick(list);
      this.running = true;
      if (k === "polish") this.polish(t.el, t.r);
      else this.break(t.el, t.r);
      return true;
    }
    return false;
  }

  abort() {
    this.cleanups.splice(0).forEach((c) => {
      try {
        c();
      } catch {
        /* ignore */
      }
    });
    this.ctx.setProp(null);
    this.running = false;
  }

  private finish() {
    this.abort();
    this.ctx.done();
  }

  /* ---------------------------------------------------------- helpers */
  private later(fn: () => void, ms: number) {
    const t = setTimeout(fn, ms);
    this.cleanups.push(() => clearTimeout(t));
  }

  /** Vertical-only flight along Flick's own side. */
  private floatTo(y: number) {
    const s = this.ctx.size;
    const cy = Math.min(window.innerHeight - s / 2 - 8, Math.max(84 + s / 2, y));
    this.ctx.engine.moveTo({ x: this.ctx.homeX(), y: cy }, 26, 9);
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
    const size = rand(8, 13);
    s.className = "pointer-events-none absolute";
    s.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;animation:flick-sparkle ${rand(0.6, 0.85)}s ease-out forwards;`;
    s.innerHTML = `<svg viewBox="0 0 20 20" width="100%" height="100%"><path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="${pick(["#D4A28C", "#FFFCF7", "#E9DCCB"])}"/></svg>`;
    s.addEventListener("animationend", () => s.remove());
    this.ctx.layer.appendChild(s);
    this.cleanups.push(() => s.remove());
  }

  /* ---------------------------------------------------------- antics */

  private polish(el: HTMLElement, r: DOMRect) {
    const c = this.ctx;
    const isButton = r.height < 90;
    const y = isButton ? r.top + r.height / 2 : r.top + Math.min(r.height * 0.35, 120);
    this.floatTo(y - c.size * 0.15);
    this.later(() => {
      c.engine.lookAt({ x: r.left + r.width * 0.7, y });
      c.setProp("cloth");
      c.say("tidy-start", 0.35);
    }, 900);
    this.later(() => {
      this.overlay(
        `<span style="position:absolute;inset:0;overflow:hidden;border-radius:${isButton ? "999px" : "1.1rem"}"><span style="position:absolute;top:-10%;bottom:-10%;left:0;width:30%;background:linear-gradient(90deg,transparent,rgba(255,252,247,.55),transparent);animation:flick-shine 1.4s cubic-bezier(.22,1,.36,1) forwards"></span></span>`,
        r,
      );
      for (let i = 0; i < 3; i++) this.later(() => this.sparkle(r.right - rand(20, Math.min(160, r.width * 0.5)), r.top + rand(8, Math.min(r.height - 8, 120))), 300 + i * 220);
      if (isButton) this.animate(el, [{ transform: "scale(1)" }, { transform: "scale(1.025)" }, { transform: "scale(1)" }], { duration: 520, easing: "ease-out" });
    }, 1500);
    this.later(() => {
      c.setProp(null);
      c.setMood("happy", 1100);
      c.engine.lookAt(null);
      c.say(isButton ? "shine" : "tidy-done", 0.5);
    }, 3100);
    this.later(() => this.finish(), 3900);
  }

  private break(el: HTMLElement, r: DOMRect) {
    const c = this.ctx;
    const onRight = c.homeX() > window.innerWidth / 2;
    const impact = { x: onRight ? r.width - Math.min(70, r.width * 0.18) : Math.min(70, r.width * 0.18), y: Math.min(r.height * 0.3, 110) };
    this.floatTo(r.top + impact.y);
    this.later(() => {
      c.engine.lookAt({ x: r.left + impact.x, y: r.top + impact.y });
      c.setProp("hammer");
      c.say("hammer-start", 0.4);
    }, 900);

    let tilt: Animation | null = null;
    let crack: HTMLElement | null = null;
    this.later(() => {
      c.setProp(null);
      c.setMood("surprised");
      c.engine.shake();
      const rays = Array.from({ length: 4 }, (_, i) => {
        const ang = (i / 4) * Math.PI * 2 + rand(-0.4, 0.4);
        let x = impact.x;
        let y = impact.y;
        let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
        const len = rand(22, 46);
        for (let k = 1; k <= 3; k++) {
          x += Math.cos(ang + rand(-0.5, 0.5)) * (len / 3);
          y += Math.sin(ang + rand(-0.5, 0.5)) * (len / 3);
          d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
        }
        return `<path d="${d}" fill="none" stroke="rgba(37,39,35,.5)" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="120" style="animation:flick-crack .25s ease-out both"/>`;
      }).join("");
      crack = this.overlay(`<svg width="${r.width}" height="${r.height}" style="overflow:visible;position:absolute;inset:0">${rays}</svg>`, r, "transition:opacity .6s ease;");
      tilt = this.animate(el, [{ transform: "translate(0,0) rotate(0deg)" }, { transform: `translate(0,2px) rotate(${onRight ? 0.7 : -0.7}deg)` }], { duration: 260, easing: "ease-out", fill: "forwards" });
      c.say("hammer-oops", 0.85);
    }, 1800);

    this.later(() => {
      c.setMood("curious");
      c.setProp("wrench");
    }, 2700);
    this.later(() => {
      if (crack) crack.style.opacity = "0";
      (tilt as Animation | null)?.cancel();
      this.animate(el, [{ transform: `translate(0,2px) rotate(${onRight ? 0.7 : -0.7}deg)` }, { transform: "translate(0,0) rotate(0deg)" }], { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" });
      this.sparkle(r.left + impact.x, r.top + impact.y);
    }, 3700);
    this.later(() => {
      c.setProp(null);
      c.setMood("happy", 1300);
      c.engine.lookAt(null);
      c.say("hammer-fixed", 0.85);
    }, 4300);
    this.later(() => this.finish(), 5200);
  }
}
