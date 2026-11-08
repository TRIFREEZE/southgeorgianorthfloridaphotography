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
