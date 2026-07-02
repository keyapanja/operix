import type { Metadata } from "next";
import { requirePage } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { PushToggle } from "@/components/notifications/push-toggle";
import { EmailPrefs } from "@/components/notifications/email-prefs";
import {
  noteHref,
  formatNoteTime,
  normalizeEmailPrefs,
  type ClientNote,
} from "@/lib/notifications/categories";

export const metadata: Metadata = { title: "Notifications · Oprix" };

export default async function NotificationsPage() {
  const session = await requirePage(); // any signed-in user

  const [rows, me] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, title: true, body: true, type: true, meta: true, createdAt: true, isRead: true },
    }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { emailPrefs: true } }),
  ]);

  const notes: ClientNote[] = rows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    type: n.type,
    href: noteHref(n.type, n.meta),
    time: formatNoteTime(n.createdAt),
    isRead: n.isRead,
  }));

  return (
    <>
      <PageHeader
        title="Notifications"
        description={`${notes.length} ${notes.length === 1 ? "notification" : "notifications"}.`}
        action={<PushToggle />}
      />

      <Card className="mb-6">
        <CardHeader
          title="Email notifications"
          description="Choose which activity also emails you. Push (above) and the in-app bell are always on."
        />
        <CardBody>
          <EmailPrefs initial={normalizeEmailPrefs(me?.emailPrefs)} />
        </CardBody>
      </Card>

      <NotificationsList notes={notes} />
    </>
  );
}
