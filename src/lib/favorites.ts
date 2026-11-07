"use client";

import { useSyncExternalStore } from "react";

/**
 * "Save inspiration" hearts. Stored only on this device (localStorage), no
 * account, never sent anywhere unless the visitor submits a booking form that
 * includes them (photo IDs only).
 */
const KEY = "rcl:favorites";
const CHANGE = "rcl:favorites:change";
const MAX = 12;

let cache: string[] | null = null;
const EMPTY: string[] = [];

function read(): string[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").slice(0, MAX) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(ids: string[]) {
  cache = ids.slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* blocked storage: keep in memory for this visit */
  }
  window.dispatchEvent(new Event(CHANGE));
}

const subscribe = (cb: () => void) => {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener(CHANGE, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE, cb);
    window.removeEventListener("storage", onStorage);
  };
};

export function useFavorites() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function toggleFavorite(id: string): boolean {
  const ids = read();
  const on = !ids.includes(id);
  write(on ? [id, ...ids] : ids.filter((x) => x !== id));
  return on;
}

export function clearFavorites() {
  write([]);
}
