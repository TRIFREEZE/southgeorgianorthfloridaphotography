import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("session dates", () => {
  it("counts days in the studio's time zone, not UTC", async () => {
    const { daysUntil, todayInStudio } = await import("@/lib/admin-data");
    // 11:30 PM in Florida on Nov 9 is already Nov 10 in UTC.
    const late = new Date("2026-11-10T04:30:00Z");
    expect(todayInStudio(late)).toBe("2026-11-09");
    expect(daysUntil("2026-11-09", late)).toBe(0);
    expect(daysUntil("2026-11-12", late)).toBe(3);
    expect(daysUntil("2026-11-08", late)).toBe(-1);
  });

  it("uses the confirmed session date, or the exact date they asked for", async () => {
    const { sessionDateOf } = await import("@/lib/admin-data");
    expect(sessionDateOf({ session_date: "2026-12-01", preferred_date: "2026-11-20", date_flexibility: "specific" })).toBe("2026-12-01");
    expect(sessionDateOf({ session_date: null, preferred_date: "2026-11-20", date_flexibility: "specific" })).toBe("2026-11-20");
    expect(sessionDateOf({ session_date: null, preferred_date: "2026-11-20", date_flexibility: "range" })).toBeNull();
  });

  it("moves booked → shot → edited → delivered", async () => {
    const { NEXT_STAGE, STATUSES } = await import("@/lib/admin-data");
    expect([NEXT_STAGE.booked, NEXT_STAGE.shot, NEXT_STAGE.edited, NEXT_STAGE.delivered]).toEqual(["shot", "edited", "delivered", undefined]);
    expect(STATUSES.indexOf("shot")).toBe(STATUSES.indexOf("booked") + 1);
  });
});
