import type { Metadata } from "next";
import type { AttendanceType } from "@prisma/client";
import { requirePage } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { nowInZone, dateAtUTC } from "@/lib/dates";
import { humanizeEnum } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { KpiGrid, Section } from "@/components/reports/blocks";
import { BarList, DonutChart, BarChart } from "@/components/reports/charts";
import { RangeFilter } from "@/components/reports/range-filter";
import { ExportButtons } from "@/components/reports/export-buttons";
import { colorAt } from "@/lib/reports/colors";
import { resolveWindow, granularityFor, buckets, bucketKey } from "@/lib/reports/range";

export const metadata: Metadata = { title: "Attendance report · Oprix" };

const TYPE_COLOR: Record<AttendanceType, string> = {
  PRESENT: "#10b981",
  ABSENT: "#f43f5e",
  HALF_DAY: "#f59e0b",
  LEAVE: "#3b82f6",
  HOLIDAY: "#94a3b8",
};

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export default async function AttendanceReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const session = await requirePage("report:view");
  const sp = await searchParams;

  const company = await prisma.company.findUnique({ where: { id: session.companyId }, select: { timezone: true } });
  const today = nowInZone(company?.timezone ?? "Asia/Kolkata").dateISO;
  const { range, startISO, endISO, label } = resolveWindow(sp, today, "month");

  const records = await prisma.attendance.findMany({
    where: { companyId: session.companyId, date: { gte: dateAtUTC(startISO), lte: dateAtUTC(endISO) } },
    select: {
      date: true,
      type: true,
      clockIn: true,
      employee: {
        select: { fullName: true, department: { select: { name: true } }, workShift: { select: { startTime: true, graceMinutes: true } } },
      },
    },
  });
  type Rec = (typeof records)[number];

  const lateMin = (r: Rec) => {
    if (!r.clockIn || !r.employee.workShift) return 0;
    const ci = toMin(r.clockIn.toISOString().slice(11, 16));
    const cutoff = toMin(r.employee.workShift.startTime) + r.employee.workShift.graceMinutes;
    return Math.max(0, ci - cutoff);
  };
  const isWorked = (t: AttendanceType) => t === "PRESENT" || t === "HALF_DAY";

  const typeCount = new Map<AttendanceType, number>();
  for (const r of records) typeCount.set(r.type, (typeCount.get(r.type) ?? 0) + 1);
  const typeItems = [...typeCount.entries()].map(([t, v]) => ({ label: humanizeEnum(t), value: v, color: TYPE_COLOR[t] }));

  const present = (typeCount.get("PRESENT") ?? 0) + (typeCount.get("HALF_DAY") ?? 0);
  const absent = typeCount.get("ABSENT") ?? 0;
  const onLeave = typeCount.get("LEAVE") ?? 0;
  const lateCount = records.filter((r) => isWorked(r.type) && lateMin(r) > 0).length;

  // present by department
  const deptMap = new Map<string, number>();
  for (const r of records) if (isWorked(r.type)) {
    const d = r.employee.department?.name ?? "Unassigned";
    deptMap.set(d, (deptMap.get(d) ?? 0) + 1);
  }
  const deptItems = [...deptMap.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).map((i, idx) => ({ ...i, color: colorAt(idx) }));

  // present over time
  const gran = granularityFor(startISO, endISO);
  const bkts = buckets(startISO, endISO, gran);
  const presentByBucket = new Map<string, number>();
  for (const r of records) if (isWorked(r.type)) {
    const k = bucketKey(r.date.toISOString().slice(0, 10), gran);
    presentByBucket.set(k, (presentByBucket.get(k) ?? 0) + 1);
  }
  const timeItems = bkts.map((b) => ({ label: b.label, value: presentByBucket.get(b.key) ?? 0 }));

  // per-employee
  const empMap = new Map<string, { name: string; dept: string; present: number; half: number; absent: number; leave: number; late: number }>();
  for (const r of records) {
    const name = r.employee.fullName;
    const cur = empMap.get(name) ?? { name, dept: r.employee.department?.name ?? "—", present: 0, half: 0, absent: 0, leave: 0, late: 0 };
    if (r.type === "PRESENT") cur.present += 1;
    else if (r.type === "HALF_DAY") cur.half += 1;
    else if (r.type === "ABSENT") cur.absent += 1;
    else if (r.type === "LEAVE") cur.leave += 1;
    if (isWorked(r.type) && lateMin(r) > 0) cur.late += 1;
    empMap.set(name, cur);
  }
  const empRows = [...empMap.values()].sort((a, b) => b.present + b.half - (a.present + a.half));

  const kpis = [
    { label: "Present days", value: String(present), icon: "check", color: "#10b981" },
    { label: "Late arrivals", value: String(lateCount), icon: "clock", color: "#f59e0b" },
    { label: "Absent", value: String(absent), icon: "x", color: "#f43f5e" },
    { label: "On leave", value: String(onLeave), icon: "calendar", color: "#3b82f6" },
  ];

  const exportTable = {
    headers: ["Employee", "Department", "Present", "Half-day", "Absent", "Leave", "Late"],
    rows: empRows.map((e) => [e.name, e.dept, e.present, e.half, e.absent, e.leave, e.late] as (string | number)[]),
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Presence, lateness, and absences across the company." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangeFilter value={range} from={startISO} to={endISO} />
        <span className="text-sm text-muted">{label}</span>
      </div>

      <KpiGrid items={kpis} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Attendance breakdown">
          <DonutChart items={typeItems} centerTop={String(records.length)} centerBottom="records" />
        </Section>
        <Section title="Present days by department">
          <BarList items={deptItems} />
        </Section>
      </div>

      <Section title="Present days over time" subtitle={label}>
        <BarChart items={timeItems} />
      </Section>

      <Section
        title="Per-employee attendance"
        action={<ExportButtons name={`attendance-${range}`} title={`Oprix — Attendance (${label})`} table={exportTable} />}
      >
        {empRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No attendance records in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wider text-faint">
                  <th className="py-2 pr-4">Employee</th>
                  <th className="py-2 pr-4">Department</th>
                  <th className="py-2 pr-4 text-right">Present</th>
                  <th className="py-2 pr-4 text-right">Half</th>
                  <th className="py-2 pr-4 text-right">Absent</th>
                  <th className="py-2 pr-4 text-right">Leave</th>
                  <th className="py-2 text-right">Late</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {empRows.map((e) => (
                  <tr key={e.name}>
                    <td className="py-2 pr-4 font-medium text-content">{e.name}</td>
                    <td className="py-2 pr-4 text-muted">{e.dept}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-content">{e.present}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-muted">{e.half}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-muted">{e.absent}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-muted">{e.leave}</td>
                    <td className="py-2 text-right tabular-nums">{e.late > 0 ? <span className="font-medium text-amber-600 dark:text-amber-400">{e.late}</span> : <span className="text-faint">0</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
