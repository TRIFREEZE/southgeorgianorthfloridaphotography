"use client";

import { useSyncExternalStore } from "react";

/**
 * Flick's visitor preferences. Read only after hydration (server snapshot is
 * the default), stored defensively: storage can be blocked or throw.
 *  - hidden: localStorage, persists until the visitor restores Flick
 *  - muted:  sessionStorage, speech bubbles off for this visit
 */
export interface FlickPrefs {
  hidden: boolean;
  muted: boolean;
}

const KEY_HIDDEN = "rcl:flick:hidden";
const KEY_MUTED = "rcl:flick:muted";
const CHANGE = "rcl:flick:prefs";

const read = (store: "local" | "session", key: string) => {
  try {
    return (store === "local" ? window.localStorage : window.sessionStorage).getItem(key) === "1";
  } catch {
    return false;
  }
};
const write = (store: "local" | "session", key: string, on: boolean) => {
  try {
    const s = store === "local" ? window.localStorage : window.sessionStorage;
    if (on) s.setItem(key, "1");
    else s.removeItem(key);
  } catch {
    /* storage unavailable: preference lasts for this page view */
  }
  memo = null;
  window.dispatchEvent(new Event(CHANGE));
};

let memo: FlickPrefs | null = null;
const snapshot = (): FlickPrefs => {
  const next = { hidden: read("local", KEY_HIDDEN), muted: read("session", KEY_MUTED) };
  if (memo && memo.hidden === next.hidden && memo.muted === next.muted) return memo;
  memo = next;
  return memo;
};
const SERVER: FlickPrefs = { hidden: false, muted: false };

const subscribe = (cb: () => void) => {
  window.addEventListener(CHANGE, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE, cb);
    window.removeEventListener("storage", cb);
  };
};

export function useFlickPrefs() {
  return useSyncExternalStore(subscribe, snapshot, () => SERVER);
}

export const setFlickHidden = (on: boolean) => write("local", KEY_HIDDEN, on);
export const setFlickMuted = (on: boolean) => write("session", KEY_MUTED, on);

/** Session-scoped flags (first-visit delays, shown lines). */
export function sessionFlag(key: string, set?: boolean) {
  try {
    if (set !== undefined) window.sessionStorage.setItem(`rcl:flick:${key}`, set ? "1" : "0");
    return window.sessionStorage.getItem(`rcl:flick:${key}`) === "1";
  } catch {
    return false;
  }
}
