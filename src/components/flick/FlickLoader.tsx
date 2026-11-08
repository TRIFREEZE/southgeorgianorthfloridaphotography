"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { GuideData } from "./guide";
import type { FilmStripPhoto } from "./types";

const FlickRoot = dynamic(() => import("./FlickRoot"), { ssr: false });

/**
 * Flick is non-critical: its code is loaded only after the page has loaded and
 * the browser is idle, so it never competes with the hero image (LCP) or input
 * responsiveness (INP).
 */
export function FlickLoader({ filmStrip, guide, preview = false }: { filmStrip: FilmStripPhoto[]; guide: GuideData; preview?: boolean }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let idleId: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const go = () => {
      if (cancelled) return;
      const ric = window.requestIdleCallback;
      if (ric) idleId = ric(() => !cancelled && setReady(true), { timeout: 1500 });
      else timer = setTimeout(() => !cancelled && setReady(true), 600);
    };
    if (document.readyState === "complete") timer = setTimeout(go, 300);
    else window.addEventListener("load", () => (timer = setTimeout(go, 300)), { once: true });
    return () => {
      cancelled = true;
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return ready ? <FlickRoot filmStrip={filmStrip} guide={guide} preview={preview} /> : null;
}
