import "server-only";
import { prisma } from "@/lib/db";
import { parseWorkWeek, countWorkingDays, type WorkWeek } from "@/lib/leave/work-week";

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** The company's configured work-week (falls back to the default). */
export async function getWorkWeek(companyId: string): Promise<WorkWeek> {
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: { workWeek: true },
  });
  return parseWorkWeek(c?.workWeek);
}

/** Company holidays (ISO dates) within an inclusive range. */
export async function holidaySet(companyId: string, start: Date, end: Date): Promise<Set<string>> {
  const hs = await prisma.holiday.findMany({
    where: { companyId, deletedAt: null, date: { gte: start, lte: end } },
    select: { date: true },
  });
  return new Set(hs.map((h) => iso(h.date)));
}

/**
 * Countable leave days in [start, end] inclusive: working days only, excluding
 * weekly offs, nth-Saturday rules, and company holidays. Half-day = 0.5 (if that
 * day is a working day). Returns 0 when the whole span is non-working.
 */
export async function countLeaveDays(
  companyId: string,
  start: Date,
  end: Date,
  isHalfDay: boolean,
): Promise<number> {
  const [ww, hs] = await Promise.all([getWorkWeek(companyId), holidaySet(companyId, start, end)]);
  return countWorkingDays(iso(start), iso(end), ww, hs, isHalfDay);
}
