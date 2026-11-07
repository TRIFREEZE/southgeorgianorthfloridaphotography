import { describe, expect, it } from "vitest";
import { COOLDOWN, DURATION, initialMachine, transition, type Machine } from "@/components/flick/machine";

const req = (m: Machine, state: Parameters<typeof transition>[1] extends infer E ? (E extends { type: "request"; state: infer S } ? S : never) : never, now: number) =>
  transition(m, { type: "request", state }, now);

describe("Flick state machine", () => {
  it("starts at rest and enters a requested behavior", () => {
    const m = req(initialMachine(0), "wander", 100);
    expect(m.state).toBe("wander");
  });

  it("respects priority: a low-priority request can't interrupt a higher one", () => {
    let m = req(initialMachine(0), "celebrate", 10);
    m = req(m, "wander", 20);
    expect(m.state).toBe("celebrate");
    m = req(m, "react", 30);
    expect(m.state).toBe("celebrate");
  });

  it("returns to rest after a behavior's duration and applies its cooldown", () => {
    let m = req(initialMachine(0), "peek", 0);
    m = transition(m, { type: "tick" }, DURATION.peek + 1);
    expect(m.state).toBe("rest");
    m = req(m, "peek", DURATION.peek + 10);
    expect(m.state).toBe("rest");
    m = req(m, "peek", DURATION.peek + 1 + COOLDOWN.peek! + 1);
    expect(m.state).toBe("peek");
  });

  it("pauses (typing, menu, lightbox) interrupt behaviors and block new ones until every reason resumes", () => {
    let m = req(initialMachine(0), "wander", 0);
    m = transition(m, { type: "pause", reason: "typing" }, 10);
    expect(m.state).toBe("rest");
    m = transition(m, { type: "pause", reason: "menu" }, 11);
    expect(req(m, "notice", 20).state).toBe("rest");
    m = transition(m, { type: "resume", reason: "typing" }, 30);
    expect(req(m, "notice", 40).state).toBe("rest");
    m = transition(m, { type: "resume", reason: "menu" }, 50);
    expect(req(m, "notice", 60).state).toBe("notice");
  });

  it("still celebrates a completed booking while paused", () => {
    const m = transition(initialMachine(0), { type: "pause", reason: "typing" }, 0);
    expect(req(m, "celebrate", 10).state).toBe("celebrate");
  });

  it("disables movement behaviors when motion isn't allowed (reduced motion / mobile)", () => {
    const m = initialMachine(0, false);
    for (const s of ["wander", "peek", "inspect", "hide", "antic"] as const) expect(req(m, s, 10).state).toBe("rest");
    expect(req(m, "react", 10).state).toBe("react");
  });

  it("runs antics, which a click reaction can interrupt but a wander can't", () => {
    let m = req(initialMachine(0), "antic", 0);
    expect(m.state).toBe("antic");
    expect(req(m, "wander", 10).state).toBe("antic");
    m = req(m, "react", 20);
    expect(m.state).toBe("react");
  });

  it("sleeps when idle and wakes on activity", () => {
    let m = transition(initialMachine(0), { type: "idle" }, 50_000);
    expect(m.state).toBe("sleep");
    m = transition(m, { type: "activity" }, 50_100);
    expect(m.state).toBe("notice");
  });

  it("drag overrides everything and ends at rest; dismissed ignores all but restore", () => {
    let m = req(initialMachine(0), "help", 0);
    m = transition(m, { type: "drag-start" }, 5);
    expect(m.state).toBe("drag");
    expect(req(m, "celebrate", 6).state).toBe("drag");
    m = transition(m, { type: "drag-end" }, 7);
    expect(m.state).toBe("rest");
    m = transition(m, { type: "dismiss" }, 8);
    expect(req(m, "celebrate", 9).state).toBe("dismissed");
    expect(transition(m, { type: "restore" }, 10).state).toBe("rest");
  });
});
