import type { Metadata } from "next";
import { requirePage } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { nowInZone, dateAtUTC } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { KpiGrid, Section } from "@/components/reports/blocks";
import { BarList, DonutChart, BarChart } from "@/components/reports/charts";
import { RangeFilter } from "@/components/reports/range-filter";
import { ExportButtons } from "@/components/reports/export-buttons";
import { colorAt, colorFor } from "@/lib/reports/colors";
import { resolveWindow, granularityFor, buckets, bucketKey } from "@/lib/reports/range";

export const metadata: Metadata = { title: "Time report · Oprix" };

const fmtH = (h: number) => `${Math.round(h * 10) / 10}h`;
const r1 = (h: number) => Math.round(h * 10) / 10;

export default async function TimeReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const session = await requirePage("report:view");
  const sp = await searchParams;

  const company = await prisma.company.findUnique({ where: { id: session.companyId }, select: { timezone: true } });
  const today = nowInZone(company?.timezone ?? "Asia/Kolkata").dateISO;
  const { range, startISO, endISO, label } = resolveWindow(sp, today, "month");

  const entries = await prisma.timeEntry.findMany({
    where: { companyId: session.companyId, date: { gte: dateAtUTC(startISO), lte: dateAtUTC(endISO) } },
    select: {
      date: true,
      hours: true,
      userId: true,
      project: { select: { name: true } },
      task: { select: { service: { select: { name: true } } } },
      employee: { select: { fullName: true, department: { select: { name: true } } } },
    },
  });
  type Entry = (typeof entries)[number];

  const orphanIds = [...new Set(entries.filter((e) => !e.employee && e.userId).map((e) => e.userId!))];
  const users = orphanIds.length
    ? await prisma.user.findMany({ where: { id: { in: orphanIds } }, select: { id: true, email: true } })
    : [];
  const emailById = new Map(users.map((u) => [u.id, u.email]));
  const whoOf = (e: Entry) => e.employee?.fullName ?? (e.userId ? emailById.get(e.userId) ?? "Unknown" : "Unknown");

  const total = entries.reduce((s, e) => s + e.hours, 0);

  const sumBy = (keyOf: (e: Entry) => string) => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(keyOf(e), (m.get(keyOf(e)) ?? 0) + e.hours);
    return [...m.entries()]
      .map(([label, value]) => ({ label, value: r1(value) }))
      .filter((i) => i.value > 0)
      .sort((a, b) => b.value - a.value);
  };

  const byProject = sumBy((e) => e.project.name).map((i) => ({ ...i, color: colorFor(i.label) }));
  const byService = sumBy((e) => e.task?.service?.name ?? "No service").map((i, idx) => ({ ...i, color: colorAt(idx) }));
  const byDept = sumBy((e) => e.employee?.department?.name ?? "Unassigned").map((i, idx) => ({ ...i, color: colorAt(idx) }));
  const byPerson = sumBy(whoOf).map((i) => ({ ...i, color: colorFor(i.label) }));

  const gran = granularityFor(startISO, endISO);
  const bkts = buckets(startISO, endISO, gran);
  const byBucket = new Map<string, number>();
  for (const e of entries) {
    const k = bucketKey(e.date.toISOString().slice(0, 10), gran);
    byBucket.set(k, (byBucket.get(k) ?? 0) + e.hours);
  }
  const timeItems = bkts.map((b) => ({ label: b.label, value: r1(byBucket.get(b.key) ?? 0) }));

  const personMap = new Map<string, { who: string; dept: string; hours: number; entries: number }>();
  for (const e of entries) {
    const who = whoOf(e);
    const cur = personMap.get(who) ?? { who, dept: e.employee?.department?.name ?? "—", hours: 0, entries: 0 };
    cur.hours += e.hours;
    cur.entries += 1;
    personMap.set(who, cur);
  }
  const personRows = [...personMap.values()].sort((a, b) => b.hours - a.hours);

  const kpis = [
    { label: "Total hours", value: fmtH(total), icon: "clock", color: "#10b981" },
    { label: "Entries", value: String(entries.length), icon: "chart", color: "#3b82f6" },
    { label: "People", value: String(personRows.length), icon: "users", color: "#8b5cf6" },
    { label: "Avg / day", value: fmtH(total / Math.max(1, bkts.length)), icon: "calendar", color: "#f59e0b" },
  ];

  const exportTable = {
    headers: ["Person", "Department", "Hours", "Entries"],
    rows: personRows.map((p) => [p.who, p.dept, r1(p.hours), p.entries] as (string | number)[]),
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Time & Utilization" description="Hours logged across projects, services, people, and departments." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangeFilter value={range} from={startISO} to={endISO} />
        <span className="text-sm text-muted">{label}</span>
      </div>

      <KpiGrid items={kpis} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Hours by project"><BarList items={byProject} format={fmtH} /></Section>
        <Section title="Hours by service"><DonutChart items={byService} format={fmtH} centerTop={fmtH(total)} centerBottom="total" /></Section>
        <Section title="Hours by department"><BarList items={byDept} format={fmtH} /></Section>
        <Section title="Hours by person"><BarList items={byPerson} format={fmtH} /></Section>
      </div>

      <Section title="Hours over time" subtitle={label}>
        <BarChart items={timeItems} format={fmtH} />
      </Section>

      <Section
        title="Per-person breakdown"
        action={<ExportButtons name={`time-${range}`} title={`Oprix — Time report (${label})`} table={exportTable} />}
      >
        {personRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No time logged in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wider text-faint">
                  <th className="py-2 pr-4">Person</th>
                  <th className="py-2 pr-4">Department</th>
                  <th className="py-2 pr-4 text-right">Hours</th>
                  <th className="py-2 text-right">Entries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {personRows.map((p) => (
                  <tr key={p.who}>
                    <td className="py-2 pr-4 font-medium text-content">{p.who}</td>
                    <td className="py-2 pr-4 text-muted">{p.dept}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-content">{fmtH(p.hours)}</td>
                    <td className="py-2 text-right tabular-nums text-muted">{p.entries}</td>
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
