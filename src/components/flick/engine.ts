/**
 * Flick's motion engine, a direct port of ECHO's EchoRing::tick:
 *   - critically-damped-ish spring toward a target (acc = (target − pos)·k − vel·d)
 *   - eyes follow the direction of travel, or a point of interest
 *   - an echo trail of expanding, fading rings shed while moving
 * plus web specifics: transform-only DOM writes, a rAF loop that runs only while
 * moving, and squash/stretch along the velocity vector.
 */

export interface EngineOptions {
  size: number;
  trail: boolean;
  onSettle?: () => void;
}

export interface Vec {
  x: number;
  y: number;
}

const MAX_ECHOES = 26;

export class FlickEngine {
  pos: Vec = { x: -200, y: -200 };
  vel: Vec = { x: 0, y: 0 };
  target: Vec = { x: -200, y: -200 };
  private k = 30;
  private d = 9;
  private raf = 0;
  private last = 0;
  private lastEmit: Vec = { x: -999, y: -999 };
  private echoes = 0;
  private lookOverride: Vec | null = null;
  private look: Vec = { x: 0, y: 0 };
  private destroyed = false;

  constructor(
    private body: HTMLElement,
    private squash: HTMLElement,
    private eyesHost: HTMLElement,
    private trailLayer: HTMLElement,
    private opts: EngineOptions,
  ) {}

  get size() {
    return this.opts.size;
  }

  /**
   * Flick's box is anchored to the BOTTOM of the viewport, so when a phone's
   * toolbar slides in or out while scrolling he rides along with the edge
   * instead of jumping afterwards. Coordinates stay top-based; `viewH` is the
   * viewport height they refer to.
   */
  viewH = typeof window === "undefined" ? 800 : window.innerHeight;

  /** The viewport height changed (phone toolbar): keep him the same distance from the bottom, with no visible move. */
  rebase(newH: number) {
    const dH = newH - this.viewH;
    if (!dH) return;
    this.viewH = newH;
    this.pos.y += dH;
    this.target.y += dH;
    this.write(0);
  }

  setOptions(o: Partial<EngineOptions>) {
    this.opts = { ...this.opts, ...o };
  }

  /** Teleport (used for first placement and reduced motion). */
  jumpTo(p: Vec) {
    this.pos = { ...p };
    this.target = { ...p };
    this.vel = { x: 0, y: 0 };
    this.write(0);
  }

  moveTo(p: Vec, stiffness = 30, damping = 9) {
    this.target = { ...p };
    this.k = stiffness;
    this.d = damping;
    this.start();
  }

  /** Point the eyes at a viewport point (or clear to follow travel direction). */
  lookAt(p: Vec | null) {
    this.lookOverride = p;
    if (!this.raf) this.updateLook(true);
  }

  private start() {
    if (this.raf || this.destroyed) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (t: number) => {
    this.raf = 0;
    const dt = Math.min(0.05, Math.max(0.001, (t - this.last) / 1000));
    this.last = t;

    const ax = (this.target.x - this.pos.x) * this.k - this.vel.x * this.d;
    const ay = (this.target.y - this.pos.y) * this.k - this.vel.y * this.d;
    this.vel.x += ax * dt;
    this.vel.y += ay * dt;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    const speed = Math.hypot(this.vel.x, this.vel.y);
    this.write(speed);
    this.updateLook(false);

    if (this.opts.trail && speed > 140 && Math.hypot(this.pos.x - this.lastEmit.x, this.pos.y - this.lastEmit.y) > 18) {
      this.emit(0.38, 0.75, 1);
    }

    const settled = Math.hypot(this.target.x - this.pos.x, this.target.y - this.pos.y) < 0.4 && speed < 4;
    if (settled) {
      this.pos = { ...this.target };
      this.vel = { x: 0, y: 0 };
      this.write(0);
      this.updateLook(true);
      this.opts.onSettle?.();
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private write(speed: number) {
    const s = this.opts.size;
    this.body.style.transform = `translate3d(${(this.pos.x - s / 2).toFixed(2)}px, ${(this.pos.y - this.viewH + s / 2).toFixed(2)}px, 0)`;
    if (speed > 30) {
      const ang = (Math.atan2(this.vel.y, this.vel.x) * 180) / Math.PI;
      const k = Math.min(speed / 2200, 0.16);
      this.squash.style.transform = `rotate(${ang.toFixed(1)}deg) scale(${(1 + k).toFixed(3)}, ${(1 - k * 0.6).toFixed(3)}) rotate(${(-ang).toFixed(1)}deg)`;
    } else {
      this.squash.style.transform = "";
    }
  }

  private updateLook(snap: boolean) {
    let want: Vec = { x: 0, y: 0 };
    if (this.lookOverride) {
      const dx = this.lookOverride.x - this.pos.x;
      const dy = this.lookOverride.y - this.pos.y;
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, dist / 160);
      want = { x: (dx / dist) * reach, y: (dy / dist) * reach };
    } else {
      const sp = Math.hypot(this.vel.x, this.vel.y);
      if (sp > 20) want = { x: this.vel.x / sp, y: this.vel.y / sp };
    }
    const f = snap ? 1 : 0.25;
    this.look = { x: this.look.x + (want.x - this.look.x) * f, y: this.look.y + (want.y - this.look.y) * f };
    // Eye travel is 0.16 r in ECHO; r = 20 in Flick's viewBox.
    const eyes = this.eyesHost.querySelector<SVGGElement>(".flick-eyes");
    if (eyes) eyes.style.transform = `translate(${(this.look.x * 3.2).toFixed(2)}px, ${(this.look.y * 3.2).toFixed(2)}px)`;
  }

  /** Expanding, fading copy of the ring (ECHO's echo trail). */
  emit(alpha = 0.45, life = 0.9, sizeMul = 1) {
    if (this.echoes >= MAX_ECHOES) return;
    const ringPx = this.opts.size * 0.5 * sizeMul;
    const el = document.createElement("span");
    el.className = "pointer-events-none absolute rounded-full";
    el.style.cssText = `left:${this.pos.x}px;top:${this.pos.y}px;width:${ringPx}px;height:${ringPx}px;border:${Math.max(1.2, this.opts.size / 34)}px solid #A46B55;--echo-alpha:${alpha};animation:flick-echo ${life}s cubic-bezier(.22,1,.36,1) forwards;`;
    this.echoes++;
    el.addEventListener("animationend", () => {
      el.remove();
      this.echoes--;
    });
    this.trailLayer.appendChild(el);
    this.lastEmit = { ...this.pos };
  }

  blink(double = false) {
    const eyes = this.eyesHost.querySelectorAll<SVGEllipseElement>(".flick-eye");
    eyes.forEach((e) => {
      const frames = double
        ? [{ transform: "scaleY(1)" }, { transform: "scaleY(0.35)" }, { transform: "scaleY(1)" }, { transform: "scaleY(0.35)" }, { transform: "scaleY(1)" }]
        : [{ transform: "scaleY(1)" }, { transform: "scaleY(0.35)" }, { transform: "scaleY(1)" }];
      e.animate(frames, { duration: double ? 360 : 150, easing: "ease-in-out" });
    });
  }

  flash() {
    const f = this.eyesHost.querySelector<SVGCircleElement>(".flick-flash");
    f?.animate([{ opacity: 0 }, { opacity: 0.9, offset: 0.12 }, { opacity: 0 }], { duration: 520, easing: "ease-out" });
  }

  hop(height = 16, times = 1) {
    const host = this.squash.firstElementChild as HTMLElement | null;
    if (!host) return;
    const frames: Keyframe[] = [];
    for (let i = 0; i < times; i++) {
      frames.push({ transform: "translateY(0) scale(1,1)", offset: i / times });
      frames.push({ transform: "translateY(0) scale(1.1,0.88)", offset: (i + 0.12) / times });
      frames.push({ transform: `translateY(${-height}px) scale(0.94,1.08)`, offset: (i + 0.5) / times });
      frames.push({ transform: "translateY(0) scale(1.08,0.9)", offset: (i + 0.86) / times });
    }
    frames.push({ transform: "translateY(0) scale(1,1)", offset: 1 });
    host.animate(frames, { duration: 520 * times, easing: "cubic-bezier(.34,1.3,.64,1)" });
  }

  shake() {
    this.squash.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "translateX(-2px)" }, { transform: "translateX(0)" }],
      { duration: 360 },
    );
  }

  /** Visual-only clip so Flick appears to peek from behind a photo edge. */
  clip(side: "left" | "right" | null, px = 0) {
    this.squash.style.clipPath = side === "left" ? `inset(-40% -40% -40% ${px}px)` : side === "right" ? `inset(-40% ${px}px -40% -40%)` : "";
  }

  destroy() {
    this.destroyed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.trailLayer.replaceChildren();
  }
}
