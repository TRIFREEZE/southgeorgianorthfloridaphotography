"use client";

import { useCallback, useEffect, useState } from "react";
import type { Photo } from "@/lib/photo-types";
import { track } from "@/lib/analytics";
import { emitFlick } from "@/components/flick/bus";
import { PhotoFill } from "./Photo";
import { Lightbox } from "./Lightbox";

type Layout = "mosaic" | "masonry";

/**
 * Collage: every photo shown whole (no cropping), packed into rows that each fill
 * the full width exactly, like a printed contact sheet. Photos keep their order;
 * the split into rows is chosen so every row ends up about the same height, so a
 * wide shot simply shares its row with fewer neighbors than tall ones do.
 */
const ratio = (p: Photo) => Math.min(3, Math.max(0.4, p.width / p.height || 1));

export function collageRows(photos: Photo[], width: number, rowHeight: number): Photo[][] {
  const ars = photos.map(ratio);
  const total = ars.reduce((s, a) => s + a, 0);
  const k = Math.max(1, Math.min(photos.length, Math.round((total * rowHeight) / width)));
  const ideal = total / k;
  // Best contiguous split into k rows: smallest squared difference from the ideal row width.
  const n = ars.length;
  const prefix = [0];
  for (const a of ars) prefix.push(prefix.at(-1)! + a);
  const cost = (i: number, j: number) => (prefix[j] - prefix[i] - ideal) ** 2;
  const best: number[][] = Array.from({ length: k + 1 }, () => Array(n + 1).fill(Infinity));
  const cut: number[][] = Array.from({ length: k + 1 }, () => Array(n + 1).fill(0));
  best[0][0] = 0;
  for (let r = 1; r <= k; r++)
    for (let j = r; j <= n; j++)
      for (let i = r - 1; i < j; i++) {
        const c = best[r - 1][i] + cost(i, j);
        if (c < best[r][j]) {
          best[r][j] = c;
          cut[r][j] = i;
        }
      }
  const rows: Photo[][] = [];
  for (let r = k, j = n; r > 0; r--) {
    const i = cut[r][j];
    rows.unshift(photos.slice(i, j));
    j = i;
  }
  return rows;
}

export function Gallery({
  photos,
  layout = "masonry",
  deepLink = false,
  label,
}: {
  photos: Photo[];
  layout?: Layout;
  /** Open ?photo=<id> on load (portfolio pages). */
  deepLink?: boolean;
  label: string;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const close = useCallback(() => setIndex(null), []);

  useEffect(() => {
    if (!deepLink) return;
    const id = new URL(window.location.href).searchParams.get("photo");
    if (!id) return;
    const i = photos.findIndex((p) => p.id === id);
    // Opening from the URL is an external-system sync (the address bar), so a state update here is intended.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (i >= 0) setIndex(i);
  }, [deepLink, photos]);

  const openAt = (i: number, e: React.MouseEvent) => {
    setIndex(i);
    track("portfolio_open", { category: photos[i].category, sample: photos[i].isSample });
    emitFlick({ type: "photo-click", x: e.clientX, y: e.clientY });
  };

  if (photos.length === 0) return null;

  return (
    <>
      {layout === "mosaic" ? (
        <>
          {/* Two arrangements (phone and wider screens) so the layout never jumps after loading; hidden images aren't downloaded. */}
          <Collage photos={photos.slice(0, 7)} rows={collageRows(photos.slice(0, 7), 350, 165)} className="flex md:hidden" label={label} onOpen={openAt} />
          <Collage photos={photos.slice(0, 7)} rows={collageRows(photos.slice(0, 7), 1248, 360)} className="hidden md:flex" label={label} onOpen={openAt} wide />
        </>
      ) : (
        <ul aria-label={label} className="columns-2 gap-2.5 sm:gap-4 lg:columns-3 [&>li]:mb-2.5 sm:[&>li]:mb-4">
          {photos.map((p, i) => (
            <li key={p.id} className="break-inside-avoid" data-reveal style={{ ["--reveal-delay" as string]: `${(i % 6) * 50}ms` }}>
              <div className="relative" style={{ aspectRatio: `${p.width} / ${p.height}` }}>
                <Tile photo={p} onOpen={(e) => openAt(i, e)} sizes="(min-width: 1024px) 31vw, 48vw" />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Lightbox photos={photos} index={index} onIndex={setIndex} onClose={close} />
    </>
  );
}

function Collage({ photos, rows, className, label, onOpen, wide = false }: { photos: Photo[]; rows: Photo[][]; className: string; label: string; onOpen: (i: number, e: React.MouseEvent) => void; wide?: boolean }) {
  return (
    <div role="group" aria-label={label} className={`flex-col gap-2.5 sm:gap-3 lg:gap-4 ${className}`} data-testid={wide ? "collage" : "collage-phone"}>
      {rows.map((row, r) => {
        const sum = row.reduce((s, p) => s + ratio(p), 0);
        return (
          <ul key={r} className="flex gap-2.5 sm:gap-3 lg:gap-4">
            {row.map((p) => {
              const i = photos.indexOf(p);
              const ar = ratio(p);
              const share = Math.round((ar / sum) * 100);
              return (
                // Same flex share as aspect ratio → every photo in the row is exactly the same height, uncropped.
                <li key={p.id} className="min-w-0" data-reveal="crop" data-collage-item style={{ flex: `${ar} 1 0%`, aspectRatio: String(ar), ["--reveal-delay" as string]: `${i * 70}ms` }}>
                  <Tile photo={p} onOpen={(e) => onOpen(i, e)} sizes={wide ? `(min-width: 768px) ${Math.max(20, share)}vw, 100vw` : `${Math.max(34, share)}vw`} whole />
                </li>
              );
            })}
          </ul>
        );
      })}
    </div>
  );
}

function Tile({ photo, onOpen, sizes, whole = false }: { photo: Photo; onOpen: (e: React.MouseEvent) => void; sizes: string; whole?: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-flick-look
      className="group relative block h-full w-full overflow-hidden rounded-[var(--radius-card)] bg-sand text-left"
      aria-label={`Open photo: ${photo.title}${photo.isSample ? " (sample placeholder)" : ""}`}
    >
      <span className="absolute inset-0 transition-transform duration-[1200ms] ease-[var(--ease-out-soft)] group-hover:scale-[1.035]">
        <PhotoFill photo={photo} sizes={sizes} crop={!whole} />
      </span>
      <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] translate-y-2 bg-gradient-to-t from-ink/70 to-transparent p-4 pt-10 text-sm text-gallery opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        {photo.title}
      </span>
    </button>
  );
}
