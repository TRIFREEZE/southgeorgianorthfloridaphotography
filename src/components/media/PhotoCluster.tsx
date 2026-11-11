"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Photo } from "@/lib/photo-types";
import { PhotoFill } from "./Photo";
import { clusterLayout, phoneMosaicLayout } from "./cluster-layout";

/**
 * Homepage "selected work": a round cluster of photos in different sizes.
 * As it scrolls into view the photos drift in from around the edges and
 * settle into the circle. That motion is a scroll-driven CSS animation (see
 * globals.css), so it runs on the compositor with no JavaScript per frame:
 * smooth on phones. On desktop the cluster also leans gently toward the
 * pointer (bigger photos move less, like depth). Reduced motion: it simply
 * shows the finished circle.
 */
export function PhotoCluster({
  photos,
  label,
  onOpen,
  className = "",
  testId,
  variant = "cluster",
}: {
  photos: Photo[];
  label: string;
  onOpen: (i: number, e: React.MouseEvent) => void;
  className?: string;
  testId?: string;
  /** "cluster": the round desktop cluster. "phone": a big, full-width mosaic that scrolls, each photo gliding in as it appears. */
  variant?: "cluster" | "phone";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const phone = variant === "phone";
  const layout = useMemo(() => (phone ? phoneMosaicLayout(photos) : clusterLayout(photos)), [photos, phone]);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cleanups: (() => void)[] = [];

    // Browsers without scroll-driven animations: gather once, when the cluster comes into view
    // (on phones, each photo as it comes into view, since the mosaic is taller than the screen).
    if (!CSS.supports("animation-timeline: view()") && phone) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        },
        { threshold: 0.12 },
      );
      el.querySelectorAll("[data-cluster-tile]").forEach((t) => io.observe(t));
      cleanups.push(() => io.disconnect());
    } else if (!CSS.supports("animation-timeline: view()")) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            el.classList.add("is-in");
            io.disconnect();
          }
        },
        { threshold: 0.15 },
      );
      io.observe(el);
      cleanups.push(() => io.disconnect());
    }

    // Desktop: lean gently toward the pointer. Only a mouse triggers it, so phones do no work at all.
    if (window.matchMedia("(pointer: fine)").matches) {
      let raf = 0;
      let mx = 0;
      let my = 0;
      const apply = () => {
        raf = 0;
        el.style.setProperty("--mx", mx.toFixed(3));
        el.style.setProperty("--my", my.toFixed(3));
      };
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        const r = el.getBoundingClientRect();
        mx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
        my = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
        if (!raf) raf = requestAnimationFrame(apply);
      };
      const onLeave = () => {
        mx = 0;
        my = 0;
        if (!raf) raf = requestAnimationFrame(apply);
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        if (raf) cancelAnimationFrame(raf);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      });
    }
    return () => cleanups.forEach((c) => c());
  }, [phone]);

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      data-testid={testId}
      data-variant={variant}
      className={`photo-cluster relative mx-auto w-full ${className}`}
      // The desktop cluster fits the screen; the phone mosaic is meant to scroll.
      style={{ aspectRatio: String(layout.aspect), maxWidth: phone ? "36rem" : `min(100%, calc(88svh * ${layout.aspect.toFixed(3)}))` }}
    >
      {layout.tiles.map((t) => {
        const p = photos[t.index];
        // Outer photos travel further and turn a little; the big centre photo barely moves.
        const travel = phone ? 5 : 6 + t.ring * 16;
        const turn = (t.index % 2 ? 1 : -1) * (phone ? 1.5 : 2 + t.ring * 6);
        const depth = 14 - Math.min(10, t.width / 4);
        return (
          <div
            key={p.id}
            className="photo-cluster-tile absolute rounded-[clamp(0.6rem,1.4cqw,1.25rem)] shadow-[0_18px_40px_-28px_rgba(37,39,35,0.55)]"
            data-cluster-tile
            style={{
              left: `${t.left}%`,
              top: `${t.top}%`,
              width: `${t.width}%`,
              height: `${t.height}%`,
              ["--ex" as string]: (t.dir.x * travel).toFixed(2),
              ["--ey" as string]: (t.dir.y * travel).toFixed(2),
              ["--rot" as string]: turn.toFixed(2),
              ["--d" as string]: depth.toFixed(2),
              ["--delay" as string]: (phone ? 0 : t.ring * 0.35).toFixed(3),
              ...(phone
                ? // Phones: each photo glides in on its own as it scrolls onto the screen.
                  { animationTimeline: "view()", animationRange: `entry ${Math.round(t.ring * 8)}% entry ${Math.round(85 + t.ring * 10)}%` }
                : // Scroll range for the gather-in: the centre settles first, the outer photos a moment later.
                  { animationRange: `cover ${Math.round(t.ring * 8)}% cover ${Math.round(36 + t.ring * 14)}%` }),
            }}
          >
            <button
              type="button"
              onClick={(e) => onOpen(t.index, e)}
              data-flick-look
              className="group relative block h-full w-full overflow-hidden rounded-[clamp(0.6rem,1.4cqw,1.25rem)] bg-sand text-left"
              aria-label={`Open photo: ${p.title}${p.isSample ? " (sample placeholder)" : ""}`}
            >
              <span className="absolute inset-0 transition-transform duration-[1200ms] ease-[var(--ease-out-soft)] group-hover:scale-[1.04]">
                <PhotoFill photo={p} sizes={phone ? `${Math.max(40, Math.round(t.width))}vw` : `(min-width: 768px) ${Math.max(14, Math.round(t.width * 0.9))}vw, ${Math.max(30, Math.round(t.width * 1.1))}vw`} crop={!t.whole} showSampleLabel={false} />
              </span>
              <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] translate-y-2 bg-gradient-to-t from-ink/70 to-transparent p-3 pt-8 text-xs text-gallery opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 sm:text-sm">
                {p.title}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
