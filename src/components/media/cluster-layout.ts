/**
 * Lays photos out as a round, filled cluster: each keeps its own shape (no
 * cropping), the first is the biggest and sits in the middle, and the rest go
 * one by one into the free spot (touching the others) closest to the middle, so they
 * pack tightly into a circle. Pure and deterministic (same photos →
 * same layout), so it renders on the server with no measuring and no jump.
 * Positions come back as percentages of the cluster's own box.
 */
export interface ClusterInput {
  id: string;
  width: number;
  height: number;
}

export interface ClusterTile {
  index: number;
  /** Percent of the cluster box. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Unit vector from the centre (for the scroll-in "gather" motion). */
  dir: { x: number; y: number };
  /** 0 (centre) → 1 (outer edge). */
  ring: number;
  /** Photo shown whole (true), or its shape was clamped and it's cropped slightly. */
  whole: boolean;
}

export interface Cluster {
  tiles: ClusterTile[];
  /** width / height of the whole cluster. */
  aspect: number;
}

/** Relative sizes by position: one hero, a few large, then a spread of smaller ones. */
const SIZES = [1, 0.62, 0.52, 0.46, 0.4, 0.36, 0.33, 0.3, 0.28, 0.26, 0.24, 0.22, 0.21, 0.2, 0.19, 0.18];

/** Small stable hash, so sizes vary a little per photo but never between renders. */
function jitter(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

type Rect = { x: number; y: number; w: number; h: number };
const SQUASH = 1.12; // a touch wider than tall suits most screens

/** One packing attempt: photos in order, each into the free spot (touching the others) closest to the middle. */
function pack(photos: ClusterInput[], sizes: number[], gap: number, cornerWeight: number): Rect[] {
  const placed: Rect[] = [];
  const hits = (x: number, y: number, w: number, h: number) =>
    placed.some((r) => Math.abs(r.x - x) * 2 < r.w + w + gap * 2 - 1e-9 && Math.abs(r.y - y) * 2 < r.h + h + gap * 2 - 1e-9);
  // How far a spot sits from the middle, weighing its farthest corner so the outline stays round.
  const score = (x: number, y: number, w: number, h: number) =>
    Math.hypot((Math.abs(x) + w / 2) / SQUASH, Math.abs(y) + h / 2) * cornerWeight + Math.hypot(x / SQUASH, y) * (1 - cornerWeight);
  const along = (span: number, size: number) => {
    const out = [0, (span - size) / 2, -(span - size) / 2];
    for (let k = 0; k <= 10; k++) out.push(-span / 2 + (span * k) / 10);
    return out;
  };
  photos.forEach((p, i) => {
    const a = Math.min(1.9, Math.max(0.55, p.width / p.height || 1));
    const w = Math.sqrt(sizes[i] * a);
    const h = Math.sqrt(sizes[i] / a);
    if (i === 0) return void placed.push({ x: 0, y: 0, w, h });
    // Every spot touching a placed photo (each side, slid along it, incl. flush with its edges for neat lines).
    let best: { x: number; y: number; s: number } | null = null;
    for (const r of placed) {
      const cands: [number, number][] = [];
      for (const o of along(r.h, h)) cands.push([r.x + r.w / 2 + gap + w / 2, r.y + o], [r.x - r.w / 2 - gap - w / 2, r.y + o]);
      for (const o of along(r.w, w)) cands.push([r.x + o, r.y + r.h / 2 + gap + h / 2], [r.x + o, r.y - r.h / 2 - gap - h / 2]);
      for (const [x, y] of cands) {
        const sc = score(x, y, w, h);
        if ((!best || sc < best.s) && !hits(x, y, w, h)) best = { x, y, s: sc };
      }
    }
    placed.push({ x: best!.x, y: best!.y, w, h });
  });
  return placed;
}

/** How fully the photos fill the smallest (slightly oval) circle around them: higher is rounder and fuller. */
function fullness(rects: Rect[]) {
  const cx = (Math.min(...rects.map((r) => r.x - r.w / 2)) + Math.max(...rects.map((r) => r.x + r.w / 2))) / 2;
  const cy = (Math.min(...rects.map((r) => r.y - r.h / 2)) + Math.max(...rects.map((r) => r.y + r.h / 2))) / 2;
  const R = Math.max(...rects.map((r) => Math.hypot((Math.abs(r.x - cx) + r.w / 2) / SQUASH, Math.abs(r.y - cy) + r.h / 2)));
  return rects.reduce((s, r) => s + r.w * r.h, 0) / (Math.PI * R * R * SQUASH);
}

export function clusterLayout(photos: ClusterInput[], gap = 0.03): Cluster {
  if (!photos.length) return { tiles: [], aspect: 1 };
  // The first photo is always the biggest; the others' sizes are shuffled a few (repeatable) ways
  // and the arrangement that fills a circle best wins.
  let placed: Rect[] = [];
  let bestFill = -1;
  for (let seed = 0; seed < 10; seed++) {
    const rest = SIZES.slice(1, photos.length).map((v, i) => ({ v, k: jitter(`${photos[i + 1]?.id ?? i}:${seed}`) }));
    if (seed > 0) rest.sort((a, b) => a.k - b.k);
    const sizes = [SIZES[0], ...rest.map((r) => r.v)].map((v, i) => v * (0.92 + jitter(photos[i]?.id ?? String(i)) * 0.16));
    while (sizes.length < photos.length) sizes.push(0.18);
    for (const cw of [0.65, 0.9]) {
      const rects = pack(photos, sizes, gap, cw);
      const f = fullness(rects);
      if (f > bestFill) {
        bestFill = f;
        placed = rects;
      }
    }
  }

  const minX = Math.min(...placed.map((r) => r.x - r.w / 2));
  const maxX = Math.max(...placed.map((r) => r.x + r.w / 2));
  const minY = Math.min(...placed.map((r) => r.y - r.h / 2));
  const maxY = Math.max(...placed.map((r) => r.y + r.h / 2));
  const W = maxX - minX || 1;
  const H = maxY - minY || 1;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const far = Math.max(...placed.map((r) => Math.hypot(r.x - cx, r.y - cy))) || 1;

  return {
    aspect: W / H,
    tiles: placed.map((r, index) => {
      const dx = r.x - cx;
      const dy = r.y - cy;
      const d = Math.hypot(dx, dy);
      const raw = photos[index].width / photos[index].height || 1;
      return {
        index,
        left: ((r.x - r.w / 2 - minX) / W) * 100,
        top: ((r.y - r.h / 2 - minY) / H) * 100,
        width: (r.w / W) * 100,
        height: (r.h / H) * 100,
        dir: d ? { x: dx / d, y: dy / d } : { x: 0, y: 0 },
        ring: d / far,
        whole: raw >= 0.55 && raw <= 1.9,
      };
    }),
  };
}

/* ------------------------------------------------------------------ phones */

type Block =
  | { kind: "single"; n: 1; cost: number; h: number; rects: Rect[] }
  | { kind: "pair"; n: 2; cost: number; h: number; rects: Rect[] }
  | { kind: "trio"; n: 3; cost: number; h: number; rects: Rect[]; mirror: boolean };

const aspectOf = (p: ClusterInput) => Math.min(1.9, Math.max(0.55, p.width / p.height || 1));

/**
 * Phones: a full-width mosaic, about two photos across, that scrolls. Rows are
 * edge to edge with even gaps and every photo keeps its own shape (uncropped).
 * Three kinds of row keep it interesting: two side by side, one wide photo
 * across, or one big photo beside two stacked (alternating sides). Photo #1 is
 * always in the first row and the biggest in it. The mix of rows that keeps
 * everything largest and most varied wins (checked exhaustively, it's tiny).
 */
export function phoneMosaicLayout(photos: ClusterInput[], gap = 0.03): Cluster {
  if (!photos.length) return { tiles: [], aspect: 1 };
  const W = 1;
  const a = photos.map(aspectOf);
  const IDEAL_PAIR_H = 0.72; // two portraits side by side
  const ln = (x: number) => Math.abs(Math.log(x));

  const blocksAt = (i: number, mirrorTrio: boolean): Block[] => {
    const out: Block[] = [];
    // One photo across: only for wide ones (a tall one alone would fill the screen).
    if (a[i] >= 1.15 || i === photos.length - 1) {
      const w = a[i] >= 1.15 ? W : Math.min(W, 0.62 * W * Math.max(1, a[i] / 0.67));
      const h = w / a[i];
      out.push({ kind: "single", n: 1, h, cost: a[i] >= 1.15 ? 0.35 : 1.6, rects: [{ x: (W - w) / 2, y: 0, w, h }] });
    }
    if (i + 1 < photos.length) {
      const h = (W - gap) / (a[i] + a[i + 1]);
      const w1 = h * a[i];
      out.push({ kind: "pair", n: 2, h, cost: ln(h / IDEAL_PAIR_H) * 2.2 + (h < 0.4 ? 2 : 0), rects: [{ x: 0, y: 0, w: w1, h }, { x: w1 + gap, y: 0, w: W - w1 - gap, h }] });
    }
    if (i + 2 < photos.length) {
      // Big photo i on one side, i+1 and i+2 stacked on the other, both columns the same height.
      const k = 1 / a[i + 1] + 1 / a[i + 2];
      const wR = (W - gap - a[i] * gap) / (a[i] * k + 1);
      const wL = W - gap - wR;
      const H = wR * k + gap;
      if (wR >= 0.3 && wL >= 0.42) {
        const big = { x: mirrorTrio ? wR + gap : 0, y: 0, w: wL, h: H };
        const cx = mirrorTrio ? 0 : wL + gap;
        const h1 = wR / a[i + 1];
        out.push({
          kind: "trio",
          n: 3,
          h: H,
          mirror: mirrorTrio,
          cost: ln(wR / 0.4) * 1.2 + ln(H / 1.0) * 0.8 - 0.25,
          rects: [big, { x: cx, y: 0, w: wR, h: h1 }, { x: cx, y: h1 + gap, w: wR, h: H - h1 - gap }],
        });
      }
    }
    return out;
  };

  // Best sequence of rows (dynamic programming over position and the previous row's kind).
  type Plan = { cost: number; blocks: Block[] };
  const memo = new Map<string, Plan>();
  const solve = (i: number, prev: string, trios: number): Plan => {
    if (i >= photos.length) return { cost: 0, blocks: [] };
    const key = `${i}|${prev}|${trios % 2}`;
    const hit = memo.get(key);
    if (hit) return hit;
    let best: Plan = { cost: Infinity, blocks: [] };
    for (const b of blocksAt(i, trios % 2 === 1)) {
      // Photo #1 opens the mosaic as its biggest photo.
      let c = b.cost + (b.kind === prev ? 0.45 : 0);
      if (i === 0 && b.kind === "pair" && a[0] < a[1] * 0.95) c += 4; // side by side, #1 would be the smaller one
      const rest = solve(i + b.n, b.kind, trios + (b.kind === "trio" ? 1 : 0));
      if (c + rest.cost < best.cost) best = { cost: c + rest.cost, blocks: [b, ...rest.blocks] };
    }
    memo.set(key, best);
    return best;
  };
  const plan = solve(0, "", 0).blocks;

  const placed: Rect[] = [];
  let y = 0;
  for (const b of plan) {
    for (const r of b.rects) placed.push({ x: r.x, y: y + r.y, w: r.w, h: r.h });
    y += b.h + gap;
  }
  const H = y - gap;

  return {
    aspect: W / H,
    tiles: placed.map((r, index) => {
      const cx = r.x + r.w / 2 - W / 2;
      return {
        index,
        left: (r.x / W) * 100,
        top: (r.y / H) * 100,
        width: (r.w / W) * 100,
        height: (r.h / H) * 100,
        // Each photo drifts in from its own side as it scrolls into view.
        dir: { x: cx === 0 ? 0 : Math.sign(cx), y: 1 },
        ring: Math.min(1, Math.abs(cx) * 2),
        whole: true,
      };
    }),
  };
}
