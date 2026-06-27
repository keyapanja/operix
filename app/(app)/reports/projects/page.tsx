import type { Metadata } from "next";
import type { ProjectStatus } from "@prisma/client";
import { requirePage } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { nowInZone, dateAtUTC } from "@/lib/dates";
import { humanizeEnum } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { KpiGrid, Section } from "@/components/reports/blocks";
import { BarList, DonutChart } from "@/components/reports/charts";
import { ExportButtons } from "@/components/reports/export-buttons";
import { colorAt } from "@/lib/reports/colors";

export const metadata: Metadata = { title: "Projects report · Oprix" };

const fmtH = (h: number) => `${Math.round(h * 10) / 10}h`;
const r1 = (h: number) => Math.round(h * 10) / 10;

const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  PLANNING: "#94a3b8",
  ACTIVE: "#3b82f6",
  ON_HOLD: "#f59e0b",
  COMPLETED: "#10b981",
  CANCELLED: "#f43f5e",
};
const PROJECT_TONE: Record<ProjectStatus, "gray" | "blue" | "amber" | "green" | "red"> = {
  PLANNING: "gray",
  ACTIVE: "blue",
  ON_HOLD: "amber",
  COMPLETED: "green",
  CANCELLED: "red",
};

export default async function ProjectsReportPage() {
  const session = await requirePage("report:view");
  const companyId = session.companyId;

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { timezone: true } });
  const today = nowInZone(company?.timezone ?? "Asia/Kolkata").dateISO;
  const todayDate = dateAtUTC(today);

  const [projects, svcGroups, services] = await Promise.all([
    prisma.project.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        client: { select: { name: true } },
        tasks: { where: { deletedAt: null }, select: { status: true, dueDate: true } },
        timeEntries: { select: { hours: true } },
      },
    }),
    prisma.task.groupBy({ by: ["serviceId"], where: { deletedAt: null, project: { companyId } }, _count: { _all: true } }),
    prisma.service.findMany({ where: { companyId }, select: { id: true, name: true } }),
  ]);
  const serviceName = new Map(services.map((s) => [s.id, s.name]));

  const rows = projects.map((p) => {
    const taskCount = p.tasks.length;
    const done = p.tasks.filter((t) => t.status === "COMPLETED").length;
    const overdue = p.tasks.filter((t) => t.status !== "COMPLETED" && t.dueDate && t.dueDate < todayDate).length;
    const hours = p.timeEntries.reduce((s, t) => s + t.hours, 0);
    return {
      id: p.id,
      name: p.name,
      client: p.client?.name ?? "—",
      status: p.status,
      taskCount,
      done,
      progress: taskCount ? Math.round((done / taskCount) * 100) : 0,
      hours: r1(hours),
      overdue,
    };
  });

  const statusCount = new Map<ProjectStatus, number>();
  for (const p of projects) statusCount.set(p.status, (statusCount.get(p.status) ?? 0) + 1);
  const statusItems = [...statusCount.entries()].map(([s, v]) => ({ label: humanizeEnum(s), value: v, color: PROJECT_STATUS_COLOR[s] }));

  const svcItems = svcGroups
    .map((g) => ({ label: g.serviceId ? serviceName.get(g.serviceId) ?? "—" : "No service", value: g._count._all }))
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((i, idx) => ({ ...i, color: colorAt(idx) }));

  const totalOverdue = rows.reduce((s, r) => s + r.overdue, 0);
  const active = projects.filter((p) => p.status === "ACTIVE").length;
  const completed = projects.filter((p) => p.status === "COMPLETED").length;
  const avgProgress = rows.length ? Math.round(rows.reduce((s, r) => s + r.progress, 0) / rows.length) : 0;

  const kpis = [
    { label: "Projects", value: String(projects.length), icon: "briefcase", color: "#3b82f6" },
    { label: "Active", value: String(active), icon: "play", color: "#10b981" },
    { label: "Completed", value: String(completed), icon: "check", color: "#22c55e" },
    { label: "Overdue tasks", value: String(totalOverdue), icon: "clock", color: "#f43f5e" },
  ];

  const exportTable = {
    headers: ["Project", "Client", "Status", "Tasks", "Done", "Progress %", "Hours", "Overdue"],
    rows: rows.map((r) => [r.name, r.client, humanizeEnum(r.status), r.taskCount, r.done, r.progress, r.hours, r.overdue] as (string | number)[]),
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Progress, status, task load, and overdue work across all projects." />

      <KpiGrid items={[...kpis, { label: "Avg progress", value: `${avgProgress}%`, icon: "chart", color: "#8b5cf6" }]} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Projects by status">
          <DonutChart items={statusItems} centerTop={String(projects.length)} centerBottom="projects" />
        </Section>
        <Section title="Tasks by service">
          <BarList items={svcItems} />
        </Section>
      </div>

      <Section
        title="Project breakdown"
        action={<ExportButtons name="projects" title="Oprix — Projects report" table={exportTable} />}
      >
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No projects yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wider text-faint">
                  <th className="py-2 pr-4">Project</th>
                  <th className="py-2 pr-4">Client</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Progress</th>
                  <th className="py-2 pr-4 text-right">Tasks</th>
                  <th className="py-2 pr-4 text-right">Hours</th>
                  <th className="py-2 text-right">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 pr-4 font-medium text-content">{r.name}</td>
                    <td className="py-2.5 pr-4 text-muted">{r.client}</td>
                    <td className="py-2.5 pr-4"><Badge tone={PROJECT_TONE[r.status]}>{humanizeEnum(r.status)}</Badge></td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-canvas">
                          <div className="gradient-brand h-full rounded-full" style={{ width: `${r.progress}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-muted">{r.progress}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-muted">{r.done}/{r.taskCount}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-content">{fmtH(r.hours)}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {r.overdue > 0 ? <span className="font-medium text-red-600 dark:text-red-400">{r.overdue}</span> : <span className="text-faint">0</span>}
                    </td>
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
