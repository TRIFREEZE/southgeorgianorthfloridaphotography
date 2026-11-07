"use client";

import Image from "next/image";
import { useEffect } from "react";
import { SamplePlate } from "@/components/media/SamplePlate";
import type { FilmStripPhoto } from "./types";

/** Easter egg (click Flick three times): a tiny film strip of real portfolio thumbnails. */
export function FilmStrip({ photos, onClose, alignRight, below }: { photos: FilmStripPhoto[]; onClose: () => void; alignRight: boolean; below: boolean }) {
  useEffect(() => {
    const t = setTimeout(onClose, 7000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!photos.length) return null;
  return (
    <figure
      className={`pointer-events-auto absolute w-[min(22rem,calc(100vw-2rem))] rounded-lg bg-ink p-2 shadow-2xl ${alignRight ? "right-0" : "left-0"} ${below ? "top-[calc(100%+8px)]" : "bottom-[calc(100%+8px)]"}`}
      style={{ animation: "flick-bubble 320ms var(--ease-out-soft) both" }}
      aria-label="Film strip of portfolio thumbnails"
    >
      <div aria-hidden className="flex justify-between px-1 pb-1.5">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="h-1.5 w-2 rounded-[1px] bg-parchment/80" />
        ))}
      </div>
      <ul className="grid grid-cols-6 gap-1">
        {photos.slice(0, 6).map((p) => (
          <li key={p.id} className="relative aspect-[3/4] overflow-hidden rounded-[2px] bg-sand">
            {p.src ? (
              <Image src={p.src} alt={p.alt} fill sizes="60px" className="object-cover" />
            ) : (
              <SamplePlate photo={{ id: `fs-${p.id}`, category: p.category, title: p.title, tone: p.tone, width: p.width, height: p.height }} showLabel={false} />
            )}
          </li>
        ))}
      </ul>
      <div aria-hidden className="flex justify-between px-1 pt-1.5">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="h-1.5 w-2 rounded-[1px] bg-parchment/80" />
        ))}
      </div>
      <figcaption className="flex items-center justify-between px-1 pt-2 text-xs text-sand">
        <span>you found my film roll.</span>
        <button type="button" onClick={onClose} className="min-h-9 rounded-full px-3 font-semibold text-gallery underline">
          Close
        </button>
      </figcaption>
    </figure>
  );
}
