"use client";

import { useCallback, useEffect, useState } from "react";
import type { Photo } from "@/lib/photo-types";
import { track } from "@/lib/analytics";
import { emitFlick } from "@/components/flick/bus";
import { PhotoFill } from "./Photo";
import { Lightbox } from "./Lightbox";
import { PhotoCluster } from "./PhotoCluster";
import { MOSAIC_MAX, MOSAIC_PHONE } from "@/lib/cms/mosaic-limits";

type Layout = "mosaic" | "masonry";

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
          {/* A round cluster of photos in different sizes that gathers as you scroll. Phones get a smaller set so each photo stays a good size. */}
          {/* Photos drifting in from the sides are clipped at the screen edge (not the column edge), so they never cause sideways scrolling. */}
          <div className="-mx-5 overflow-x-clip px-5 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
            <PhotoCluster photos={photos.slice(0, MOSAIC_PHONE)} label={label} onOpen={openAt} className="md:hidden" testId="cluster-phone" variant="phone" />
            <PhotoCluster photos={photos.slice(0, MOSAIC_MAX)} label={label} onOpen={openAt} className="hidden md:block" testId="cluster" />
          </div>
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

function Tile({ photo, onOpen, sizes }: { photo: Photo; onOpen: (e: React.MouseEvent) => void; sizes: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-flick-look
      className="group relative block h-full w-full overflow-hidden rounded-[var(--radius-card)] bg-sand text-left"
      aria-label={`Open photo: ${photo.title}${photo.isSample ? " (sample placeholder)" : ""}`}
    >
      <span className="absolute inset-0 transition-transform duration-[1200ms] ease-[var(--ease-out-soft)] group-hover:scale-[1.035]">
        <PhotoFill photo={photo} sizes={sizes} />
      </span>
      <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] translate-y-2 bg-gradient-to-t from-ink/70 to-transparent p-4 pt-10 text-sm text-gallery opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        {photo.title}
      </span>
    </button>
  );
}
