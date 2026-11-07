/**
 * A tiny decoupled event bus so any component can tell Flick something
 * happened without importing (or waiting for) the mascot bundle.
 */
export type FlickSignal =
  | { type: "photo-click"; x?: number; y?: number }
  | { type: "photo-favorite" }
  | { type: "card-pick"; x?: number; y?: number }
  | { type: "booking-step"; step: number }
  | { type: "booking-complete" }
  | { type: "story-complete" }
  | { type: "form-error" }
  | { type: "pause"; reason: string }
  | { type: "resume"; reason: string }
  | { type: "show" }
  | { type: "open-guide" };

const EVENT = "rcl:flick";

export function emitFlick(signal: FlickSignal) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<FlickSignal>(EVENT, { detail: signal }));
}

export function onFlick(handler: (s: FlickSignal) => void) {
  const fn = (e: Event) => handler((e as CustomEvent<FlickSignal>).detail);
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}
