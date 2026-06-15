import type { Metadata } from "next";
import { requirePortal } from "@/lib/auth/guard";
import { listClientDeliverables } from "@/lib/portal/data";
import { Card } from "@/components/ui/card";
import { DeliverableCard } from "@/components/portal/deliverable-card";

export const metadata: Metadata = { title: "Deliverables · Client Portal" };

export default async function PortalDeliverablesPage() {
  const session = await requirePortal();
  const deliverables = await listClientDeliverables(session.clientId, session.companyId);

  const awaiting = deliverables.filter((d) => d.status === "SUBMITTED");
  const decided = deliverables.filter((d) => d.status !== "SUBMITTED");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-content">Deliverables</h1>

      {deliverables.length === 0 ? (
        <Card className="px-5 py-16 text-center text-sm text-muted">
          No deliverables yet — your team will share them here for review.
        </Card>
      ) : (
        <>
          {awaiting.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-faint">
                <span className="size-1.5 rounded-full bg-amber-500" />
                Awaiting your review
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {awaiting.map((d) => (
                  <DeliverableCard key={d.id} d={d} showProject />
                ))}
              </div>
            </section>
          )}

          {decided.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-faint">Reviewed</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {decided.map((d) => (
                  <DeliverableCard key={d.id} d={d} showProject />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
