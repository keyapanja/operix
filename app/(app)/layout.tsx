import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { listPermissions } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { getActiveTimers } from "@/lib/timer/data";
import { hasPunchedInToday } from "@/lib/attendance/gate";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { TimerBar } from "@/components/timer/timer-bar";
import { PunchInBanner } from "@/components/attendance/punch-banner";
import { noteHref, formatNoteTime, type ClientNote } from "@/lib/notifications/categories";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const isGatedEmployee = session.role === "EMPLOYEE" && !!session.employeeId;

  // One parallel batch for the whole shell instead of several sequential queries.
  const [needsPunchIn, allowed, notifications, unread, activeTimers] = await Promise.all([
    isGatedEmployee
      ? hasPunchedInToday(session.employeeId!, session.companyId).then((p) => !p)
      : Promise.resolve(false),
    listPermissions(session.companyId, session.role),
    prisma.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, title: true, body: true, type: true, meta: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: session.userId, isRead: false } }),
    getActiveTimers(session.userId),
  ]);

  // Base employees must clock in before reaching anything but the dashboard.
  if (needsPunchIn) {
    const pathname = (await headers()).get("x-pathname") ?? "";
    if (pathname && pathname !== "/dashboard") redirect("/dashboard");
  }

  const notes: ClientNote[] = notifications.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    type: n.type,
    href: noteHref(n.type, n.meta),
    time: formatNoteTime(n.createdAt),
  }));

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar allowed={allowed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          email={session.email}
          role={session.role}
          notifications={notes}
          unread={unread}
        />
        {needsPunchIn && <PunchInBanner />}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="animate-rise mx-auto max-w-7xl">{children}</div>
        </main>
        {/* Within the main content column (not under the sidebar). */}
        <TimerBar timers={activeTimers} />
      </div>
    </div>
  );
}
