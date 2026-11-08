import { describe, expect, it } from "vitest";
import { collageRows } from "@/components/media/Gallery";
import { zoomedSizes } from "@/components/media/Photo";
import type { Photo } from "@/lib/photo-types";

const ph = (id: string, w: number, h: number) => ({ id, width: w, height: h, category: null, title: id, alt: id, src: null }) as unknown as Photo;

describe("homepage collage", () => {
  it("keeps every photo, in order, and splits into evenly filled rows", () => {
    const photos = [ph("a", 3, 2), ph("b", 2, 3), ph("c", 2, 3), ph("d", 3, 2), ph("e", 16, 9), ph("f", 4, 5), ph("g", 1, 1)];
    const rows = collageRows(photos, 1248, 360);
    expect(rows.flat().map((p) => p.id)).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
    expect(rows.length).toBe(2);
    const sums = rows.map((r) => r.reduce((s, p) => s + p.width / p.height, 0));
    expect(Math.abs(sums[0] - sums[1])).toBeLessThan(1.5);
    expect(collageRows(photos, 350, 165).length).toBeGreaterThan(rows.length);
  });
});

describe("zoomed crops", () => {
  it("asks for a bigger file in proportion to the zoom, leaving media conditions alone", () => {
    expect(zoomedSizes("(min-width: 1280px) 1200px, 100vw", 1.5)).toBe("(min-width: 1280px) 1800px, 150vw");
    expect(zoomedSizes("(min-width: 768px) 40vw, 100vw", 1)).toBe("(min-width: 768px) 40vw, 100vw");
  });
});
