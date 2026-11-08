"use client";

import { useRef, useState } from "react";

export type Focal = { dx: number; dy: number; mx: number; my: number };
export type Zoom = { d: number; m: number };

const clamp = (n: number, a = 0, b = 100) => Math.min(b, Math.max(a, n));

/** Same math as the public site's CROP_CLASS, for one device. */
export function cropCss(x: number, y: number, z: number): React.CSSProperties {
  return { objectFit: "cover", objectPosition: `${x}% ${y}%`, transformOrigin: `${x}% ${y}%`, transform: `scale(${z})` };
}

const PREVIEWS = {
  desktop: [
    { label: "Wide banner", ratio: "16 / 9", w: "w-44" },
    { label: "Hero / tall card", ratio: "3 / 4", w: "w-24" },
    { label: "Square", ratio: "1 / 1", w: "w-28" },
  ],
  mobile: [
    { label: "Phone card", ratio: "4 / 5", w: "w-28" },
    { label: "Phone full screen", ratio: "9 / 16", w: "w-[5.5rem]" },
    { label: "Phone banner", ratio: "3 / 2", w: "w-36" },
  ],
} as const;

/**
 * Click or drag on the photo to choose what stays in frame, separately for
 * desktop and mobile, with live previews of the real crops.
 */
export function FocalEditor({ src, focal, zoom, onChange }: { src: string; focal: Focal; zoom: Zoom; onChange: (f: Focal, z: Zoom) => void }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const x = device === "desktop" ? focal.dx : focal.mx;
  const y = device === "desktop" ? focal.dy : focal.my;
  const z = device === "desktop" ? zoom.d : zoom.m;

  const setPoint = (nx: number, ny: number) => {
    const r = { x: Math.round(clamp(nx)), y: Math.round(clamp(ny)) };
    onChange(device === "desktop" ? { ...focal, dx: r.x, dy: r.y } : { ...focal, mx: r.x, my: r.y }, zoom);
  };
  const fromEvent = (e: React.PointerEvent) => {
    const el = box.current?.querySelector("img");
    if (!el) return;
    const b = el.getBoundingClientRect();
    setPoint(((e.clientX - b.left) / b.width) * 100, ((e.clientY - b.top) / b.height) * 100);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    setPoint(x + m[0], y + m[1]);
  };

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Crop for" className="inline-flex rounded-full border border-ink/20 bg-gallery p-1 text-sm font-semibold">
        {(["desktop", "mobile"] as const).map((d) => (
          <button
            key={d}
            role="tab"
            type="button"
            aria-selected={device === d}
            onClick={() => setDevice(d)}
            className={`min-h-9 rounded-full px-4 capitalize ${device === d ? "bg-ink text-gallery" : ""}`}
            data-testid={`crop-tab-${d}`}
          >
            {d === "desktop" ? "Desktop & tablet" : "Mobile"}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <div
            ref={box}
            className="relative mx-auto w-fit cursor-crosshair touch-none select-none overflow-hidden rounded-xl bg-ink/5"
            onPointerDown={(e) => {
              dragging.current = true;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              fromEvent(e);
            }}
            onPointerMove={(e) => dragging.current && fromEvent(e)}
            onPointerUp={() => (dragging.current = false)}
            data-testid="focal-area"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- editor needs the raw image box */}
            <img src={src} alt="" draggable={false} className="block max-h-[46vh] w-auto max-w-full" />
            <button
              type="button"
              aria-label={`Focal point for ${device}: ${x}% across, ${y}% down. Use arrow keys to move.`}
              onKeyDown={onKey}
              className="absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-gallery bg-clay-deep/40 shadow-[0_0_0_2px_rgba(37,39,35,0.6)] focus-visible:outline-2"
              style={{ left: `${x}%`, top: `${y}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-muted">Click or drag to set what matters most. Arrow keys nudge it.</p>
          <label className="mx-auto mt-3 flex max-w-sm items-center gap-3 text-sm font-semibold">
            Zoom
            <input
              type="range"
              min={1}
              max={2.5}
              step={0.05}
              value={z}
              onChange={(e) => onChange(focal, device === "desktop" ? { ...zoom, d: Number(e.target.value) } : { ...zoom, m: Number(e.target.value) })}
              className="flex-1 accent-[var(--color-clay-deep)]"
              data-testid="zoom"
            />
            <span className="w-10 text-right tabular-nums">{z.toFixed(2)}×</span>
          </label>
          <div className="mt-2 flex justify-center gap-2">
            <button type="button" className="text-xs underline" onClick={() => onChange(device === "desktop" ? { ...focal, dx: 50, dy: 50 } : { ...focal, mx: 50, my: 50 }, device === "desktop" ? { ...zoom, d: 1 } : { ...zoom, m: 1 })}>
              Reset {device}
            </button>
            {device === "mobile" && (
              <button type="button" className="text-xs underline" onClick={() => onChange({ ...focal, mx: focal.dx, my: focal.dy }, { ...zoom, m: zoom.d })}>
                Copy desktop crop
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-center gap-3 lg:w-48 lg:flex-col lg:items-center">
          <p className="w-full text-center text-xs font-bold uppercase tracking-wider text-muted">{device === "desktop" ? "Desktop" : "Mobile"} previews</p>
          {PREVIEWS[device].map((p) => (
            <figure key={p.label} className={p.w}>
              <div className="overflow-hidden rounded-lg bg-sand ring-1 ring-line" style={{ aspectRatio: p.ratio }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full" style={cropCss(x, y, z)} />
              </div>
              <figcaption className="mt-1 text-center text-[0.68rem] text-muted">{p.label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
