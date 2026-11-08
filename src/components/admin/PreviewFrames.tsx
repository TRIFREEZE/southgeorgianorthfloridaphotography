"use client";

import { useEffect, useRef, useState } from "react";

/** Side-by-side desktop and phone previews of the draft site (Draft Mode). */
export function PreviewFrames({ pages }: { pages: { path: string; label: string }[] }) {
  const [path, setPath] = useState(pages[0]?.path ?? "/");
  const [nonce, setNonce] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 1280));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const src = `/api/preview/enable?to=${encodeURIComponent(path)}`;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold">
          Page{" "}
          <select className="field !inline-block !min-h-10 w-64" value={path} onChange={(e) => setPath(e.target.value)} data-testid="preview-page">
            {pages.map((p) => (
              <option key={p.path} value={p.path}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setNonce((n) => n + 1)} className="min-h-10 rounded-full border border-ink/25 px-4 text-sm font-semibold hover:border-ink/60">
          Reload
        </button>
        <a href={src} target="_blank" rel="noreferrer" className="min-h-10 content-center rounded-full border border-ink/25 px-4 text-sm font-semibold hover:border-ink/60">
          Open full preview ↗
        </a>
      </div>
      <div className="mt-6 flex flex-col gap-8 xl:flex-row xl:items-start">
        <figure className="min-w-0 flex-1">
          <figcaption className="mb-2 text-sm font-semibold text-muted">Desktop (1280px, scaled)</figcaption>
          <div ref={box} className="relative overflow-hidden rounded-xl border border-line bg-parchment shadow-lg" style={{ aspectRatio: "1280 / 800" }}>
            <iframe key={`d${nonce}${path}`} src={src} title="Desktop preview" className="absolute left-0 top-0 h-[800px] w-[1280px] origin-top-left border-0" style={{ transform: `scale(${scale})` }} data-testid="preview-desktop" />
          </div>
        </figure>
        <figure className="mx-auto shrink-0">
          <figcaption className="mb-2 text-sm font-semibold text-muted">Phone (390 × 844)</figcaption>
          <div className="overflow-hidden rounded-[2.2rem] border-[10px] border-ink bg-ink shadow-xl">
            <iframe key={`m${nonce}${path}`} src={src} title="Mobile preview" className="block h-[844px] max-h-[75vh] w-[390px] rounded-[1.5rem] border-0 bg-parchment" data-testid="preview-mobile" />
          </div>
        </figure>
      </div>
    </div>
  );
}
