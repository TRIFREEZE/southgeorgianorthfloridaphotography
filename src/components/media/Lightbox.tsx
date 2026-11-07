"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Photo } from "@/lib/photo-types";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import { emitFlick } from "@/components/flick/bus";
import { PhotoFill } from "./Photo";

/**
 * Accessible lightbox on the native <dialog>: focus trap and Escape come from
 * the browser, arrow keys and swipe navigate, focus returns to the opening tile,
 * and the URL carries ?photo=<id> (replaceState, so Back never gets stuck).
 */
export function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
}: {
  photos: Photo[];
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const favorites = useFavorites();
  const [savedNote, setSavedNote] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const open = index !== null;
  const photo = open ? photos[index] : null;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = "hidden";
      emitFlick({ type: "pause", reason: "lightbox" });
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  useEffect(() => {
    if (!photo) return;
    const url = new URL(window.location.href);
    url.searchParams.set("photo", photo.id);
    window.history.replaceState(window.history.state, "", url);
  }, [photo]);

  const go = useCallback(
    (delta: number) => {
      if (index === null) return;
      onIndex((index + delta + photos.length) % photos.length);
    },
    [index, onIndex, photos.length],
  );

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onDialogClose = () => {
      document.documentElement.style.overflow = "";
      const url = new URL(window.location.href);
      url.searchParams.delete("photo");
      window.history.replaceState(window.history.state, "", url);
      emitFlick({ type: "resume", reason: "lightbox" });
      onClose();
    };
    d.addEventListener("close", onDialogClose);
    return () => d.removeEventListener("close", onDialogClose);
  }, [onClose]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  };

  const isFav = photo ? favorites.includes(photo.id) : false;

  return (
    <dialog
      ref={ref}
      onKeyDown={onKeyDown}
      aria-label={photo ? `Photo ${index! + 1} of ${photos.length}: ${photo.title}` : "Photo viewer"}
      className="on-dark m-0 h-dvh max-h-none w-full max-w-none bg-[#161714] p-0 text-gallery backdrop:bg-black/80"
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse") touch.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const t = touch.current;
        touch.current = null;
        if (!t) return;
        const dx = e.clientX - t.x;
        const dy = e.clientY - t.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
      }}
    >
      {photo && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="text-sm text-sand/80" aria-live="polite">
              {index! + 1} / {photos.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const on = toggleFavorite(photo.id);
                  setSavedNote(on);
                  if (on) emitFlick({ type: "photo-favorite" });
                }}
                aria-pressed={isFav}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-sand/30 px-4 text-sm font-semibold hover:border-sand"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill={isFav ? "#D4A28C" : "none"} stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" strokeLinejoin="round" />
                </svg>
                {isFav ? "Saved" : "Save as inspiration"}
              </button>
              <button
                type="button"
                onClick={() => ref.current?.close()}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-gallery px-4 text-sm font-semibold text-ink"
                autoFocus
              >
                Close<span className="sr-only"> photo viewer</span>
              </button>
            </div>
          </div>

          <div className="relative flex-1">
            <div className="absolute inset-x-2 inset-y-0 sm:inset-x-20">
              {photo.src ? (
                <PhotoFill key={photo.id} photo={photo} sizes="100vw" className="!object-contain" quality={85} />
              ) : (
                <div className="absolute inset-0 m-auto aspect-[var(--ar)] max-h-full max-w-full" style={{ ["--ar" as string]: `${photo.width}/${photo.height}` }}>
                  <PhotoFill photo={photo} sizes="100vw" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-2xl hover:bg-black/60 sm:flex"
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-2xl hover:bg-black/60 sm:flex"
              aria-label="Next photo"
            >
              ›
            </button>
          </div>

          <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div className="max-w-2xl">
              <p className="font-display text-xl">{photo.title}</p>
              <p className="text-sm text-sand/75">
                {[photo.subcategory, photo.location].filter(Boolean).join(" · ")}
                {photo.isSample ? " · Sample placeholder" : ""}
              </p>
              {photo.storyText && <p className="mt-2 text-sm text-sand/85">{photo.storyText}</p>}
              {savedNote && isFav && (
                <p className="mt-2 text-xs text-sand/70">Saved on this device only. You can attach saved photos when you book.</p>
              )}
            </div>
            <div className="flex gap-2 sm:hidden">
              <button type="button" onClick={() => go(-1)} className="min-h-11 flex-1 rounded-full border border-sand/30 px-4 text-sm font-semibold">
                Previous
              </button>
              <button type="button" onClick={() => go(1)} className="min-h-11 flex-1 rounded-full border border-sand/30 px-4 text-sm font-semibold">
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
