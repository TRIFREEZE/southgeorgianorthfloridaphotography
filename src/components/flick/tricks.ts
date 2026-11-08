import type { FlickMood } from "./types";

/**
 * Flick's five tricks for "Do a trick". Each one plays in place (no flying
 * across the page, so they work in his phone corner too), uses only
 * transform/opacity animations, and cleans up every element it adds.
 */
export type TrickId = "roll" | "backflip" | "cheese" | "juggle" | "zoom";

export const TRICK_ORDER: TrickId[] = ["backflip", "cheese", "juggle", "roll", "zoom"];

export const TRICK_LINES: Record<TrickId, string[]> = {
  roll: ["Barrel roll! Still got it.", "Do a barrel roll! (I did.)"],
  backflip: ["Backflip! Stuck the landing.", "Ten out of ten from the judges, I hope."],
  cheese: ["Say cheese! Developing…", "Instant classic. Literally."],
  juggle: ["Juggling lens caps. Don't tell the photographer.", "Three caps, zero drops. A personal best."],
  zoom: ["Zoom out… and ZOOM in!", "That's what an aperture does, roughly."],
};

export interface TrickContext {
  /** Positioned box that follows Flick (children are placed relative to him). */
  body: HTMLElement;
  /** A wrapper that only tricks animate: it sits outside the CSS hover bob, so neither snaps the other. */
  host: HTMLElement;
  size: number;
  setMood: (m: FlickMood) => void;
  blink: (double?: boolean) => void;
  flash: () => void;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function add(ctx: TrickContext, html: string, css: string, behind = false) {
  const el = document.createElement("span");
  el.setAttribute("aria-hidden", "true");
  el.className = "pointer-events-none absolute block";
  el.style.cssText = css;
  el.innerHTML = html;
  if (behind) ctx.body.insertBefore(el, ctx.body.firstChild);
  else ctx.body.appendChild(el);
  return el;
}

function sparkles(ctx: TrickContext, n = 4) {
  const s = ctx.size;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
    const r = s * (0.55 + Math.random() * 0.15);
    const px = 9 + Math.random() * 5;
    const el = add(
      ctx,
      `<svg viewBox="0 0 20 20" width="100%" height="100%"><path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="${["#D4A28C", "#FFFCF7", "#E9DCCB", "#A46B55"][i % 4]}"/></svg>`,
      `left:${s / 2 + Math.cos(a) * r}px;top:${s / 2 + Math.sin(a) * r}px;width:${px}px;height:${px}px;animation:flick-sparkle ${0.6 + Math.random() * 0.3}s ease-out ${i * 70}ms both;`,
    );
    el.addEventListener("animationend", () => el.remove());
    setTimeout(() => el.remove(), 1500);
  }
}

async function roll(ctx: TrickContext) {
  ctx.setMood("happy");
  await ctx.host.animate(
    [
      { transform: "rotate(0deg) scale(1)" },
      { transform: "rotate(-12deg) scale(1.06, 0.94)", offset: 0.12 },
      { transform: "rotate(200deg) scale(0.9, 1.08)", offset: 0.55 },
      { transform: "rotate(372deg) scale(1.04, 0.96)", offset: 0.88 },
      { transform: "rotate(360deg) scale(1)" },
    ],
    { duration: 1000, easing: "cubic-bezier(.45,0,.2,1)" },
  ).finished;
  sparkles(ctx, 4);
}

async function backflip(ctx: TrickContext) {
  const h = Math.round(ctx.size * 0.55);
  ctx.setMood("curious");
  const a = ctx.host.animate(
    [
      { transform: "translateY(0) rotate(0deg) scale(1)" },
      { transform: "translateY(4px) rotate(0deg) scale(1.14, 0.84)", offset: 0.18 },
      { transform: `translateY(${-h}px) rotate(-150deg) scale(0.94, 1.06)`, offset: 0.5 },
      { transform: `translateY(${-h * 0.45}px) rotate(-320deg) scale(1)`, offset: 0.76 },
      { transform: "translateY(2px) rotate(-360deg) scale(1.14, 0.86)", offset: 0.9 },
      { transform: "translateY(0) rotate(-360deg) scale(1)" },
    ],
    { duration: 1150, easing: "cubic-bezier(.3,.7,.4,1)" },
  );
  await wait(520);
  ctx.setMood("happy");
  await a.finished;
  sparkles(ctx, 3);
}

async function cheese(ctx: TrickContext) {
  const s = ctx.size;
  ctx.setMood("happy");
  ctx.blink();
  await ctx.host.animate([{ transform: "scale(1)" }, { transform: "scale(0.92, 1.06)" }, { transform: "scale(1)" }], { duration: 260, easing: "ease-out" }).finished;
  ctx.flash();
  const burst = add(ctx, "", `left:50%;top:50%;width:${s}px;height:${s}px;margin:${-s / 2}px 0 0 ${-s / 2}px;border-radius:50%;background:radial-gradient(circle,#FFFCF7 0%,rgba(255,252,247,.6) 35%,rgba(255,252,247,0) 70%);`);
  burst.animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "scale(1.2)", offset: 0.25 }, { opacity: 0, transform: "scale(1.8)" }], { duration: 520, easing: "ease-out" }).finished.then(() => burst.remove());
  // A tiny instant photo prints out from underneath him, then floats away.
  const w = Math.round(s * 0.46);
  const photo = add(
    ctx,
    `<span style="display:block;width:100%;height:78%;border-radius:2px;background:linear-gradient(180deg,#E9DCCB 0%,#D4A28C 62%,#8E5A46 100%);position:relative;overflow:hidden">
       <span style="position:absolute;left:50%;top:44%;width:42%;height:42%;margin-left:-21%;border-radius:50% 50% 0 0;background:#A46B55"></span>
       <span style="position:absolute;left:0;right:0;top:64%;height:2px;background:#252723;opacity:.55"></span>
     </span>`,
    `left:50%;top:52%;width:${w}px;height:${Math.round(w * 1.18)}px;margin-left:${-w / 2}px;padding:${Math.max(3, w * 0.07)}px;background:#FFFCF7;border-radius:3px;box-shadow:0 6px 14px -6px rgba(37,39,35,.45);`,
    true,
  );
  await photo.animate(
    [
      { transform: "translateY(-30%) rotate(0deg)", opacity: 0 },
      { transform: "translateY(-10%) rotate(0deg)", opacity: 1, offset: 0.15 },
      { transform: `translateY(${s * 0.52}px) rotate(-8deg)`, opacity: 1, offset: 0.45 },
      { transform: `translateY(${s * 0.52}px) rotate(-6deg)`, opacity: 1, offset: 0.8 },
      { transform: `translate(${s * 0.25}px, ${s * 0.1}px) rotate(14deg)`, opacity: 0 },
    ],
    { duration: 2300, easing: "cubic-bezier(.22,1,.36,1)" },
  ).finished;
  photo.remove();
}

async function juggle(ctx: TrickContext) {
  const s = ctx.size;
  const ball = Math.max(10, Math.round(s * 0.12));
  // Three colors that read on both the light page and Flick's dark lens (each ball also gets a light rim).
  const colors = ["#A46B55", "#727F70", "#D9A441"];
  ctx.setMood("curious");
  const rx = s * 0.36;
  const ry = s * 0.62;
  const cx = s / 2 - ball / 2;
  const cy = s * 0.1;
  // One loop of a juggling cascade: a high arc over the top, a quick low pass underneath.
  const at = (t: number) => {
    if (t <= 0.7) {
      const th = Math.PI - (t / 0.7) * Math.PI;
      return { x: cx + Math.cos(th) * rx, y: cy - Math.sin(th) * ry };
    }
    const u = (t - 0.7) / 0.3;
    return { x: cx + rx - u * 2 * rx, y: cy + Math.sin(u * Math.PI) * s * 0.06 };
  };
  // Each ball gets its own keyframes, a third of a loop apart, so all three are always in the air.
  // (Explicit phase offsets instead of iterationStart, which some mobile browsers ignore.)
  const steps = 24;
  const framesFor = (phase: number): Keyframe[] =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps;
      const p = at((t + phase) % 1);
      return { transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`, offset: t };
    });
  const loop = 760;
  const rim = Math.max(1.5, s / 40);
  const balls = colors.map((c) => add(ctx, "", `left:0;top:0;width:${ball}px;height:${ball}px;border-radius:50%;background:${c};border:${rim}px solid #FFFCF7;box-shadow:0 2px 5px rgba(37,39,35,.35);z-index:2;`));
  const bob = ctx.host.animate(
    [{ transform: "translateY(0) rotate(0deg)" }, { transform: "translateY(2px) rotate(-3deg)" }, { transform: "translateY(0) rotate(0deg)" }, { transform: "translateY(2px) rotate(3deg)" }, { transform: "translateY(0) rotate(0deg)" }],
    { duration: loop, iterations: 3, easing: "ease-in-out" },
  );
  const anims = balls.map((b, i) => b.animate(framesFor(i / 3), { duration: loop, iterations: 3, easing: "linear", fill: "forwards" }));
  await Promise.all(anims.map((a) => a.finished));
  await bob.finished;
  await Promise.all(balls.map((b) => b.animate([{ opacity: 1, transform: getComputedStyle(b).transform }, { opacity: 0, transform: `translate(${cx}px, ${s * 0.45}px) scale(.4)` }], { duration: 260, fill: "forwards" }).finished));
  balls.forEach((b) => b.remove());
  ctx.setMood("happy");
  sparkles(ctx, 3);
}

async function zoom(ctx: TrickContext) {
  const s = ctx.size;
  ctx.setMood("curious");
  await ctx.host.animate(
    [
      { transform: "scale(1) rotate(0deg)" },
      { transform: "scale(1.08) rotate(-8deg)", offset: 0.25 },
      { transform: "scale(0.18) rotate(160deg)" },
    ],
    { duration: 520, easing: "cubic-bezier(.6,0,.8,.4)", fill: "forwards" },
  ).finished;
  await wait(180);
  ctx.setMood("surprised");
  const ring = add(ctx, "", `left:50%;top:50%;width:${s}px;height:${s}px;margin:${-s / 2}px 0 0 ${-s / 2}px;border-radius:50%;border:${Math.max(2, s / 30)}px solid #A46B55;`);
  ring.animate([{ opacity: 0.9, transform: "scale(.3)" }, { opacity: 0, transform: "scale(1.7)" }], { duration: 650, easing: "ease-out" }).finished.then(() => ring.remove());
  const pop = ctx.host.animate(
    [
      { transform: "scale(0.18) rotate(160deg)" },
      { transform: "scale(1.32) rotate(-10deg)", offset: 0.45 },
      { transform: "scale(0.92) rotate(4deg)", offset: 0.7 },
      { transform: "scale(1.04) rotate(-1deg)", offset: 0.86 },
      { transform: "scale(1) rotate(0deg)" },
    ],
    { duration: 820, easing: "cubic-bezier(.34,1.3,.64,1)" },
  );
  ctx.host.getAnimations().forEach((a) => a !== pop && a.effect && (a as Animation).playState === "finished" && a.cancel());
  await pop.finished;
  ctx.setMood("happy");
  ctx.blink(true);
}

const PLAY: Record<TrickId, (ctx: TrickContext) => Promise<void>> = { roll, backflip, cheese, juggle, zoom };

/** Plays one trick; never throws (a cancelled animation just ends the trick). */
export async function playTrick(id: TrickId, ctx: TrickContext) {
  try {
    await PLAY[id](ctx);
  } catch {
    /* animation cancelled (e.g. he was dragged) */
  } finally {
    ctx.host.getAnimations().forEach((a) => a.playState !== "running" && a.cancel());
  }
}

/** Next trick in the rotation, so each ask shows a different one until all five are seen. */
export function nextTrick(): TrickId {
  let i = 0;
  try {
    i = Number(window.sessionStorage.getItem("rcl:flick:trick") ?? "0") || 0;
    window.sessionStorage.setItem("rcl:flick:trick", String((i + 1) % TRICK_ORDER.length));
  } catch {
    i = Math.floor(Math.random() * TRICK_ORDER.length);
  }
  return TRICK_ORDER[i % TRICK_ORDER.length];
}
