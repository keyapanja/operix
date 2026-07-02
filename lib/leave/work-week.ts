// Working-days model for leave counting. Isomorphic (no "server-only") so the
// apply form can show a live working-day count matching the server.

export type WorkWeek = {
  workingWeekdays: number[]; // weekdays that are working days (0=Sun … 6=Sat)
  saturdayOffWeeks: number[]; // nth Saturdays of the month that are OFF (1..5)
};

// Default: Monday–Saturday working, Sunday off, no Saturday exceptions.
export const DEFAULT_WORK_WEEK: WorkWeek = {
  workingWeekdays: [1, 2, 3, 4, 5, 6],
  saturdayOffWeeks: [],
};

export const WEEKDAYS: { value: number; label: string; short: string }[] = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

export const SATURDAY_WEEK_LABELS: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
  5: "5th",
};

/** Parse/sanitize the JSON stored on Company.workWeek into a valid WorkWeek. */
export function parseWorkWeek(json: unknown): WorkWeek {
  const j = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
  const wd = Array.isArray(j.workingWeekdays)
    ? [...new Set(j.workingWeekdays.filter((n): n is number => Number.isInteger(n) && n >= 0 && n <= 6))]
    : DEFAULT_WORK_WEEK.workingWeekdays;
  const so = Array.isArray(j.saturdayOffWeeks)
    ? [...new Set(j.saturdayOffWeeks.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 5))]
    : [];
  return { workingWeekdays: wd.sort((a, b) => a - b), saturdayOffWeeks: so.sort((a, b) => a - b) };
}

/** nth occurrence of this weekday within its month (1..5). */
export function nthWeekdayOfMonth(iso: string): number {
  return Math.floor((Number(iso.slice(8, 10)) - 1) / 7) + 1;
}

/** Is `iso` (YYYY-MM-DD) a working day given the work-week and holiday set? */
export function isWorkingDay(iso: string, ww: WorkWeek, holidays: Set<string>): boolean {
  if (holidays.has(iso)) return false;
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay();
  if (!ww.workingWeekdays.includes(dow)) return false;
  if (dow === 6 && ww.saturdayOffWeeks.includes(nthWeekdayOfMonth(iso))) return false;
  return true;
}

/**
 * Working days in the inclusive ISO range [startISO, endISO], excluding weekly
 * offs, nth-Saturday rules, and holidays. A half-day counts as 0.5 (only if
 * that single day is itself a working day; otherwise 0).
 */
export function countWorkingDays(
  startISO: string,
  endISO: string,
  ww: WorkWeek,
  holidays: Set<string>,
  isHalfDay: boolean,
): number {
  let count = 0;
  const d = new Date(`${startISO}T00:00:00Z`);
  const end = new Date(`${endISO}T00:00:00Z`);
  while (d.getTime() <= end.getTime()) {
    if (isWorkingDay(d.toISOString().slice(0, 10), ww, holidays)) count += 1;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  if (isHalfDay) return count >= 1 ? 0.5 : 0;
  return count;
}
