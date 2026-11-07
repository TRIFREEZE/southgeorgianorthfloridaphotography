/**
 * Where Flick may sit. Instead of guessing from layout, we sample what is
 * actually under a candidate spot (document.elementsFromPoint) and reject
 * anything that carries content: text, photos, buttons, links, form fields,
 * navigation, dialogs and anything marked data-flick-avoid. Measurements run only
 * when a decision is made, never in an animation loop.
 */

const CONTENT =
  "p,h1,h2,h3,h4,h5,h6,a,button,input,select,textarea,label,img,picture,video,canvas,li,figure,blockquote,dt,dd,td,th,summary,[role=img],[role=dialog],[data-flick-avoid],form,dialog,nav,header,svg,output,pre,code";

let flickRoot: HTMLElement | null = null;
export const setFlickRoot = (el: HTMLElement | null) => {
  flickRoot = el;
};

export function pointIsFree(x: number, y: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (x < 4 || y < 4 || x > vw - 4 || y > vh - 4) return false;
  const stack = document.elementsFromPoint(x, y);
  const top = stack.find((el) => !flickRoot?.contains(el));
  if (!top) return true;
  return !top.closest(CONTENT);
}

/** Samples the centre and four inner points of a square spot. */
export function spotIsFree(cx: number, cy: number, size: number) {
  const r = size * 0.34;
  return [
    [cx, cy],
    [cx - r, cy - r],
    [cx + r, cy - r],
    [cx - r, cy + r],
    [cx + r, cy + r],
  ].every(([x, y]) => pointIsFree(x, y));
}

export function rectIsFree(left: number, top: number, width: number, height: number) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 2; i++) for (let j = 0; j <= 1; j++) pts.push([left + (width * i) / 2, top + height * (0.15 + j * 0.7)]);
  return pts.every(([x, y]) => pointIsFree(x, y));
}

export interface Spot {
  x: number;
  y: number;
}

/** Candidate resting spots along the viewport margins, most preferred first. */
export function marginCandidates(size: number, mobile: boolean): Spot[] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const m = mobile ? 12 : 22;
  const half = size / 2;
  const right = vw - m - half;
  const left = m + half;
  const out: Spot[] = [];
  const top = mobile ? vh * 0.55 : 130;
  for (let y = vh - m - half - (mobile ? 64 : 0); y >= top; y -= mobile ? 56 : 46) {
    out.push({ x: right, y });
    out.push({ x: left, y });
  }
  return out;
}

export function findFreeSpot(size: number, mobile: boolean, exclude?: Spot, minDistance = 0): Spot | null {
  for (const c of marginCandidates(size, mobile)) {
    if (exclude && Math.hypot(c.x - exclude.x, c.y - exclude.y) < minDistance) continue;
    if (spotIsFree(c.x, c.y, size)) return c;
  }
  return null;
}

export function randomFreeSpot(size: number, mobile: boolean, from: Spot, rand: () => number = Math.random): Spot | null {
  const free = marginCandidates(size, mobile).filter((c) => Math.hypot(c.x - from.x, c.y - from.y) > 120 && spotIsFree(c.x, c.y, size));
  return free.length ? free[Math.floor(rand() * free.length)] : null;
}

/** A tucked spot: mostly off the right edge so only a sliver (and the eyes) show. */
export function tuckSpot(size: number, mobile: boolean): Spot {
  return { x: window.innerWidth + size * 0.2, y: window.innerHeight - (mobile ? 96 : 120) };
}

/** Photo tiles currently fully visible, used for peek/inspect behaviors. */
export function visiblePhotos(): DOMRect[] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return Array.from(document.querySelectorAll<HTMLElement>("[data-flick-look]"))
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 140 && r.top > 90 && r.bottom < vh - 20 && r.left >= 0 && r.right <= vw);
}
