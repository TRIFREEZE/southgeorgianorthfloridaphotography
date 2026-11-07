"use client";

import { useSyncExternalStore } from "react";

function mediaStore(query: string) {
  return {
    subscribe(cb: () => void) {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    get: () => window.matchMedia(query).matches,
  };
}

const reduced = mediaStore("(prefers-reduced-motion: reduce)");
const small = mediaStore("(max-width: 767px), (pointer: coarse)");

/** prefers-reduced-motion, live. Server snapshot assumes reduced (safest). */
export function useReducedMotion() {
  return useSyncExternalStore(reduced.subscribe, reduced.get, () => true);
}

/** Small screen or touch-first device. */
export function useCompactMode() {
  return useSyncExternalStore(small.subscribe, small.get, () => true);
}

/** Rough "this device should take it easy" heuristic. */
export function isLowPowerDevice() {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2 || Boolean(nav.connection?.saveData);
}
