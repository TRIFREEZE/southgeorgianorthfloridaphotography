import { describe, expect, it } from "vitest";
import { clusterLayout } from "@/components/media/cluster-layout";
import { zoomedSizes } from "@/components/media/Photo";


describe("homepage photo cluster", () => {
  const photos = [
    { id: "a", width: 2, height: 3 },
    { id: "b", width: 3, height: 2 },
    { id: "c", width: 2, height: 3 },
    { id: "d", width: 1, height: 1 },
    { id: "e", width: 16, height: 9 },
    { id: "f", width: 4, height: 5 },
    { id: "g", width: 2, height: 3 },
    { id: "h", width: 3, height: 2 },
    { id: "i", width: 2, height: 3 },
    { id: "j", width: 2, height: 3 },
    { id: "k", width: 3, height: 2 },
    { id: "l", width: 2, height: 3 },
    { id: "m", width: 1, height: 1 },
  ];
  const { tiles, aspect } = clusterLayout(photos);
  const boxes = tiles.map((t) => ({ l: t.left, t: t.top, r: t.left + t.width, b: t.top + t.height }));

  it("keeps every photo, uncropped, inside the box, with the first one biggest", () => {
    expect(tiles).toHaveLength(13);
    for (const [i, t] of tiles.entries()) {
      expect(t.whole).toBe(true);
      // shape preserved: width/height in real units matches the photo
      expect((t.width * aspect) / t.height).toBeCloseTo(photos[i].width / photos[i].height, 1);
      expect(boxes[i].l).toBeGreaterThanOrEqual(-0.01);
      expect(boxes[i].r).toBeLessThanOrEqual(100.01);
    }
    const areas = tiles.map((t) => t.width * t.height);
    expect(Math.max(...areas)).toBe(areas[0]);
  });

  it("never overlaps and packs into a roughly round shape", () => {
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        expect(a.r <= b.l + 0.01 || b.r <= a.l + 0.01 || a.b <= b.t + 0.01 || b.b <= a.t + 0.01).toBe(true);
      }
    expect(aspect).toBeGreaterThan(0.75);
    expect(aspect).toBeLessThan(1.6);
    expect(clusterLayout(photos)).toEqual(clusterLayout(photos)); // deterministic
  });
});

describe("zoomed crops", () => {
  it("asks for a bigger file in proportion to the zoom, leaving media conditions alone", () => {
    expect(zoomedSizes("(min-width: 1280px) 1200px, 100vw", 1.5)).toBe("(min-width: 1280px) 1800px, 150vw");
    expect(zoomedSizes("(min-width: 768px) 40vw, 100vw", 1)).toBe("(min-width: 768px) 40vw, 100vw");
  });
});

describe("phone mosaic", async () => {
  const { phoneMosaicLayout } = await import("@/components/media/cluster-layout");
  const mixes: Record<string, number[][]> = {
    mixed: [[2, 3], [3, 2], [2, 3], [2, 3], [3, 2], [2, 3], [4, 5], [2, 3], [3, 2]],
    portraits: [[2, 3], [2, 3], [4, 5], [2, 3], [2, 3], [2, 3], [2, 3], [4, 5], [2, 3]],
    landscapes: [[3, 2], [3, 2], [2, 3], [3, 2], [16, 9], [3, 2], [2, 3], [3, 2], [3, 2]],
    wideFirst: [[2, 3], [16, 9], [2, 3], [3, 2]],
    few: [[2, 3], [3, 2]],
    one: [[2, 3]],
  };
  for (const [name, shapes] of Object.entries(mixes)) {
    it(`${name}: whole photos, no overlaps, full-width rows, #1 biggest up front`, () => {
      const photos = shapes.map(([w, h], i) => ({ id: `${name}-${i}`, width: w * 1000, height: h * 1000 }));
      const c = phoneMosaicLayout(photos);
      expect(c.tiles).toHaveLength(photos.length);
      expect(phoneMosaicLayout(photos)).toEqual(c); // same photos, same layout
      const W = 100;
      const H = 100 / c.aspect;
      const px = c.tiles.map((t) => ({ ...t, x: t.left, y: (t.top / 100) * H, w: t.width, h: (t.height / 100) * H }));
      for (const t of px) {
        expect(t.x).toBeGreaterThanOrEqual(-1e-6);
        expect(t.x + t.w).toBeLessThanOrEqual(W + 1e-6);
        // Uncropped: each tile keeps its photo's shape.
        const [w, h] = shapes[t.index];
        expect(t.w / t.h).toBeCloseTo(w / h, 2);
      }
      for (let i = 0; i < px.length; i++)
        for (let j = i + 1; j < px.length; j++) {
          const a = px[i];
          const b = px[j];
          const overlap = a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6;
          expect(overlap, `${i} overlaps ${j}`).toBe(false);
        }
      // #1 is in the first row and (with 3 or more photos) the biggest photo in it.
      const first = px[0];
      expect(first.y).toBeCloseTo(0, 6);
      if (photos.length >= 3) for (const t of px.filter((t) => t.y < first.h - 1e-6)) expect(first.w * first.h).toBeGreaterThanOrEqual(t.w * t.h - 1e-6);
      // Big enough to see on a phone: every photo at least ~a third of the width.
      if (photos.length > 1) for (const t of px) expect(t.w).toBeGreaterThan(28);
    });
  }
});
