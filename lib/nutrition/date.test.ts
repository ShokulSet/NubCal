import { describe, it, expect } from "vitest";
import { todayInTimezone, weekdayInTimezone } from "./date";

describe("todayInTimezone", () => {
  it("resolves the local date in Asia/Bangkok across the UTC-midnight boundary", () => {
    // 2026-05-30T18:30:00Z == 2026-05-31 01:30 in Bangkok (UTC+7)
    const d = new Date("2026-05-30T18:30:00Z");
    expect(todayInTimezone("Asia/Bangkok", d)).toBe("2026-05-31");
    expect(todayInTimezone("UTC", d)).toBe("2026-05-30");
  });
});

describe("weekdayInTimezone", () => {
  it("returns 0..6 with Sunday = 0", () => {
    // 2026-05-31 is a Sunday
    const d = new Date("2026-05-31T05:00:00Z");
    expect(weekdayInTimezone("Asia/Bangkok", d)).toBe(0);
  });
});
