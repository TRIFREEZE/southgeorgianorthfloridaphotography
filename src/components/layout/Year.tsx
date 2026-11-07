"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Current year, computed on the client so prerendered HTML never goes stale. */
export function Year() {
  const year = useSyncExternalStore(
    subscribe,
    () => new Date().getFullYear(),
    () => null,
  );
  return <span suppressHydrationWarning>{year ?? "2026"}</span>;
}
