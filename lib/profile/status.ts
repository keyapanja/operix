import "server-only";
import { prisma } from "@/lib/db";
import { nowInZone, dateAtUTC } from "@/lib/dates";
import { getCompanyTimezone } from "@/lib/cache";

export type LiveStatus = "active" | "inactive";

/** Active = clocked in today and not yet clocked out (present / on shift). */
export async function employeeLiveStatus(employeeId: string, companyId: string): Promise<LiveStatus> {
  const { dateISO } = nowInZone(await getCompanyTimezone(companyId));
  const att = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: dateAtUTC(dateISO) } },
    select: { clockIn: true, clockOut: true },
  });
  return att?.clockIn && !att.clockOut ? "active" : "inactive";
}
