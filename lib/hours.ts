import type { DayKey, HoursInterval, WeeklyHours } from "@/lib/types";
import { DAY_KEYS } from "@/lib/types";

/**
 * Opening-hours logic (SPEC §6.3).
 * "Open now" is always computed against the venue timezone, Africa/Johannesburg
 * (SAST, UTC+2), never the device clock, so it's correct for users abroad.
 */

export const VENUE_TZ = "Africa/Johannesburg";

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/** "HH:MM" → minutes since midnight. "24:00" → 1440 (end of day). */
export function parseHM(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const WEEKDAY_TO_KEY: Record<string, DayKey> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

export interface ZonedTime {
  day: DayKey;
  /** Minutes since midnight in the venue timezone. */
  minutes: number;
}

/** Day-of-week and time-of-day of `date`, expressed in the venue timezone. */
export function zonedTime(date: Date, timeZone: string = VENUE_TZ): ZonedTime {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = WEEKDAY_TO_KEY[get("weekday")];
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function todayKey(date: Date): DayKey {
  return zonedTime(date).day;
}

function prevDay(day: DayKey): DayKey {
  const i = DAY_KEYS.indexOf(day);
  return DAY_KEYS[(i + 6) % 7];
}

/** An interval whose close is at or before its open wraps past midnight. */
function wrapsMidnight(iv: HoursInterval): boolean {
  const close = parseHM(iv.close);
  return close !== 1440 && close <= parseHM(iv.open);
}

export function isOpenAt(hours: WeeklyHours, date: Date): boolean {
  const { day, minutes } = zonedTime(date);

  for (const iv of hours[day] ?? []) {
    const open = parseHM(iv.open);
    const close = parseHM(iv.close);
    if (wrapsMidnight(iv)) {
      if (minutes >= open) return true;
    } else if (minutes >= open && minutes < close) {
      return true;
    }
  }
  // The tail of yesterday's overnight interval (e.g. Fri 20:00–02:00 on Sat 01:00).
  for (const iv of hours[prevDay(day)] ?? []) {
    if (wrapsMidnight(iv) && minutes < parseHM(iv.close)) return true;
  }
  return false;
}

export function isAlwaysOpen(intervals: HoursInterval[]): boolean {
  return intervals.length === 1 && intervals[0].open === "00:00" && intervals[0].close === "24:00";
}

/** "Closed" · "Open 24 hours" · "07:00 – 18:00" (multiple intervals comma-joined). */
export function formatIntervals(intervals: HoursInterval[]): string {
  if (intervals.length === 0) return "Closed";
  if (isAlwaysOpen(intervals)) return "Open 24 hours";
  return intervals.map((iv) => `${iv.open} – ${iv.close === "24:00" ? "00:00" : iv.close}`).join(", ");
}

/** Contact-row line for the action card, e.g. "Today · 07:00 – 18:00". */
export function todayHoursLabel(hours: WeeklyHours, date: Date): string {
  const intervals = hours[todayKey(date)] ?? [];
  if (intervals.length === 0) return "Closed today";
  if (isAlwaysOpen(intervals)) return "Open 24 hours";
  return `Today · ${formatIntervals(intervals)}`;
}
