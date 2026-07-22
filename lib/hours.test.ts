import { describe, expect, it } from "vitest";
import { formatIntervals, isOpenAt, todayHoursLabel, todayKey, zonedTime } from "@/lib/hours";
import { DAY_KEYS, type WeeklyHours } from "@/lib/types";

// SAST is UTC+2 year-round (no DST) — instants below are constructed in UTC.
// 2026-07-08 is a Wednesday.

const wk = (open: string, close: string, closedDays: number[] = []): WeeklyHours => {
  const out = {} as WeeklyHours;
  DAY_KEYS.forEach((day, i) => {
    out[day] = closedDays.includes(i) ? [] : [{ open, close }];
  });
  return out;
};

const cafe = wk("07:00", "18:00", [6]); // Sun closed (like Truth)
const always = wk("00:00", "24:00");
const saturdayMarket = wk("09:00", "14:00", [0, 1, 2, 3, 4, 6]); // Sat only

const at = (iso: string) => new Date(iso);

describe("zonedTime / todayKey", () => {
  it("converts UTC instants to SAST day + minutes", () => {
    // 23:30 UTC Tue = 01:30 SAST Wed
    expect(zonedTime(at("2026-07-07T23:30:00Z"))).toEqual({ day: "wed", minutes: 90 });
    expect(todayKey(at("2026-07-08T10:00:00Z"))).toBe("wed");
  });
});

describe("isOpenAt — anchored to Africa/Johannesburg", () => {
  it("is open mid-morning SAST", () => {
    // 08:00 UTC = 10:00 SAST Wed
    expect(isOpenAt(cafe, at("2026-07-08T08:00:00Z"))).toBe(true);
  });

  it("is closed before opening time SAST even if the UTC hour is inside range", () => {
    // 05:30 UTC Wed = 07:30 SAST → open; 04:30 UTC = 06:30 SAST → closed
    expect(isOpenAt(cafe, at("2026-07-08T05:30:00Z"))).toBe(true);
    expect(isOpenAt(cafe, at("2026-07-08T04:30:00Z"))).toBe(false);
  });

  it("closes at closing time exactly", () => {
    // 16:00 UTC = 18:00 SAST
    expect(isOpenAt(cafe, at("2026-07-08T16:00:00Z"))).toBe(false);
    expect(isOpenAt(cafe, at("2026-07-08T15:59:00Z"))).toBe(true);
  });

  it("respects closed days", () => {
    // Sunday 2026-07-12, 10:00 SAST
    expect(isOpenAt(cafe, at("2026-07-12T08:00:00Z"))).toBe(false);
  });

  it("handles always-open venues at any hour", () => {
    expect(isOpenAt(always, at("2026-07-08T22:10:00Z"))).toBe(true); // 00:10 SAST Thu
    expect(isOpenAt(always, at("2026-07-08T08:00:00Z"))).toBe(true);
  });

  it("handles a Saturday-only venue", () => {
    // Sat 2026-07-11, 10:00 SAST → open; Fri 10:00 SAST → closed
    expect(isOpenAt(saturdayMarket, at("2026-07-11T08:00:00Z"))).toBe(true);
    expect(isOpenAt(saturdayMarket, at("2026-07-10T08:00:00Z"))).toBe(false);
  });

  it("handles overnight intervals spanning midnight", () => {
    const nightBar: WeeklyHours = { ...wk("20:00", "02:00", [0, 1, 2, 3, 5, 6]) };
    // Fri 20:00–02:00 (fri index 4). Sat 01:00 SAST = Fri 23:00 UTC → still open.
    expect(isOpenAt(nightBar, at("2026-07-10T23:00:00Z"))).toBe(true);
    // Sat 03:00 SAST → closed.
    expect(isOpenAt(nightBar, at("2026-07-11T01:00:00Z"))).toBe(false);
    // Fri 21:00 SAST → open.
    expect(isOpenAt(nightBar, at("2026-07-10T19:00:00Z"))).toBe(true);
  });
});

describe("formatting", () => {
  it("formats intervals", () => {
    expect(formatIntervals([])).toBe("Closed");
    expect(formatIntervals([{ open: "00:00", close: "24:00" }])).toBe("Open 24 hours");
    expect(formatIntervals([{ open: "07:00", close: "18:00" }])).toBe("07:00 – 18:00");
  });

  it("labels today's hours", () => {
    expect(todayHoursLabel(cafe, at("2026-07-08T08:00:00Z"))).toBe("Today · 07:00 – 18:00");
    expect(todayHoursLabel(cafe, at("2026-07-12T08:00:00Z"))).toBe("Closed today");
    expect(todayHoursLabel(always, at("2026-07-08T08:00:00Z"))).toBe("Open 24 hours");
  });
});
