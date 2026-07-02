import type { Metadata } from "next";
import { requirePage } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { PushToggle } from "@/components/notifications/push-toggle";
import { EmailPrefs } from "@/components/notifications/email-prefs";
import { normalizeEmailPrefs } from "@/lib/notifications/categories";

export const metadata: Metadata = { title: "Notification settings · Oprix" };

export default async function NotificationSettingsPage() {
  const session = await requirePage(); // any signed-in user (self-service)

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { emailPrefs: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notification settings"
        description="Control how Oprix reaches you — push on this device, and which activity also emails you."
      />

      <Card className="mb-6">
        <CardHeader
          title="Push notifications"
          description="OS notifications on this device, even when Oprix is closed. Set per device."
          action={<PushToggle />}
        />
      </Card>

      <Card>
        <CardHeader
          title="Email notifications"
          description="Choose which activity also emails you. Push and the in-app bell are always on."
        />
        <CardBody>
          <EmailPrefs initial={normalizeEmailPrefs(me?.emailPrefs)} />
        </CardBody>
      </Card>
    </div>
  );
}
