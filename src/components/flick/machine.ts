/**
 * Flick's behavior state machine: pure, deterministic and unit-tested.
 * The engine (motion) and the React shell (mood, speech) react to its output;
 * nothing here touches the DOM.
 */

export type FlickState =
  | "rest"
  | "notice"
  | "blink"
  | "wander"
  | "peek"
  | "inspect"
  | "antic"
  | "react"
  | "help"
  | "hide"
  | "celebrate"
  | "sleep"
  | "drag"
  | "dismissed";

export const PRIORITY: Record<FlickState, number> = {
  dismissed: 100,
  drag: 90,
  celebrate: 80,
  help: 70,
  react: 60,
  inspect: 50,
  antic: 45,
  peek: 40,
  hide: 40,
  notice: 30,
  wander: 20,
  blink: 15,
  sleep: 10,
  rest: 0,
};

/** Maximum time a behavior runs before Flick settles back to rest (ms). */
export const DURATION: Record<FlickState, number> = {
  rest: Infinity,
  sleep: Infinity,
  drag: Infinity,
  dismissed: Infinity,
  notice: 1800,
  blink: 300,
  wander: 3200,
  peek: 4200,
  inspect: 3600,
  antic: 14000,
  react: 1500,
  help: 6000,
  hide: 5200,
  celebrate: 2600,
};

/** After a behavior ends, it can't start again for this long (ms). */
export const COOLDOWN: Partial<Record<FlickState, number>> = {
  notice: 4000,
  wander: 6000,
  peek: 16000,
  inspect: 9000,
  antic: 3000,
  hide: 50000,
  react: 1800,
  help: 90000,
  celebrate: 3000,
};

/** Behaviors that move Flick around. Disabled for reduced motion and on low-motion devices. */
export const MOTION_STATES: FlickState[] = ["wander", "peek", "inspect", "hide", "antic"];

export type FlickEvent =
  | { type: "tick" }
  | { type: "request"; state: Exclude<FlickState, "dismissed" | "drag" | "rest"> }
  | { type: "done" }
  | { type: "idle" }
  | { type: "activity" }
  | { type: "pause"; reason: string }
  | { type: "resume"; reason: string }
  | { type: "drag-start" }
  | { type: "drag-end" }
  | { type: "dismiss" }
  | { type: "restore" };

export interface Machine {
  state: FlickState;
  since: number;
  /** Reasons Flick is paused (typing, menu, lightbox, hidden tab…). Empty = active. */
  pauses: string[];
  cooldownUntil: Partial<Record<FlickState, number>>;
  allowMotion: boolean;
}

export const initialMachine = (now: number, allowMotion = true): Machine => ({
  state: "rest",
  since: now,
  pauses: [],
  cooldownUntil: {},
  allowMotion,
});

const enter = (m: Machine, state: FlickState, now: number): Machine => {
  const cd = COOLDOWN[m.state];
  const cooldownUntil = cd && m.state !== state ? { ...m.cooldownUntil, [m.state]: now + cd } : m.cooldownUntil;
  return { ...m, state, since: now, cooldownUntil };
};

export const isPaused = (m: Machine) => m.pauses.length > 0;

export function canEnter(m: Machine, target: FlickState, now: number) {
  if (m.state === "dismissed" || m.state === "drag") return false;
  if (isPaused(m) && target !== "celebrate") return false;
  if (!m.allowMotion && MOTION_STATES.includes(target)) return false;
  if ((m.cooldownUntil[target] ?? 0) > now) return false;
  const expired = now - m.since >= DURATION[m.state];
  return expired || PRIORITY[target] >= PRIORITY[m.state];
}

export function transition(m: Machine, e: FlickEvent, now: number): Machine {
  switch (e.type) {
    case "dismiss":
      return m.state === "dismissed" ? m : enter(m, "dismissed", now);
    case "restore":
      return m.state === "dismissed" ? { ...m, state: "rest", since: now } : m;
    case "drag-start":
      return m.state === "dismissed" ? m : enter(m, "drag", now);
    case "drag-end":
      return m.state === "drag" ? enter(m, "rest", now) : m;
    case "pause": {
      if (m.pauses.includes(e.reason)) return m;
      const paused = { ...m, pauses: [...m.pauses, e.reason] };
      // Interrupt anything expressive; drag and dismissed are left alone.
      return m.state === "dismissed" || m.state === "drag" || m.state === "celebrate" ? paused : enter(paused, "rest", now);
    }
    case "resume":
      return m.pauses.includes(e.reason) ? { ...m, pauses: m.pauses.filter((r) => r !== e.reason) } : m;
    case "request":
      return canEnter(m, e.state, now) ? enter(m, e.state, now) : m;
    case "done":
      return m.state === "dismissed" || m.state === "drag" || m.state === "rest" ? m : enter(m, "rest", now);
    case "tick":
      return now - m.since >= DURATION[m.state] ? enter(m, "rest", now) : m;
    case "idle":
      return m.state === "rest" && !isPaused(m) ? enter(m, "sleep", now) : m;
    case "activity":
      return m.state === "sleep" ? enter(m, "notice", now) : m;
  }
}
