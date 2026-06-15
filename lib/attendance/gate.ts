import "server-only";
import { prisma } from "@/lib/db";
import { nowInZone, dateAtUTC } from "@/lib/dates";
import { getCompanyTimezone } from "@/lib/cache";

/** Whether an employee has clocked in for today (in the company-local date). */
export async function hasPunchedInToday(employeeId: string, companyId: string): Promise<boolean> {
  const { dateISO } = nowInZone(await getCompanyTimezone(companyId));
  const att = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: dateAtUTC(dateISO) } },
    select: { clockIn: true },
  });
  return !!att?.clockIn;
}
