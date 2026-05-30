/** YYYY-MM-DD for `now` in the given IANA timezone (e.g. Asia/Bangkok). */
export function todayInTimezone(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** 0 (Sunday) .. 6 (Saturday) for `now` in the given timezone. */
export function weekdayInTimezone(timeZone: string, now: Date = new Date()): number {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(now);
  return WEEKDAY_INDEX[label] ?? 0;
}
