import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icons";
import { formatDate } from "@/lib/format";
import { ReviewControls } from "@/components/portal/review-controls";

type Tone = "gray" | "green" | "amber" | "blue" | "red";

export type PortalDeliverable = {
  id: string;
  name: string;
  description: string | null;
  link: string | null;
  status: string;
  feedback: string | null;
  submittedAt: Date;
  decidedAt: Date | null;
  project?: { id: string; name: string } | null;
};

const STATUS: Record<string, { tone: Tone; label: string }> = {
  SUBMITTED: { tone: "amber", label: "Awaiting your review" },
  APPROVED: { tone: "green", label: "Approved" },
  REVISION_REQUESTED: { tone: "blue", label: "Revision requested" },
};

export function DeliverableCard({ d, showProject = false }: { d: PortalDeliverable; showProject?: boolean }) {
  const s = STATUS[d.status] ?? { tone: "gray" as Tone, label: d.status };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-content">{d.name}</p>
          {showProject && d.project && <p className="text-xs text-muted">{d.project.name}</p>}
          {d.description && <p className="mt-1 text-sm text-muted">{d.description}</p>}
        </div>
        <Badge tone={s.tone}>{s.label}</Badge>
      </div>

      {d.link && (
        <a
          href={d.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent-strong hover:underline"
        >
          <Icon name="folder" className="size-4" />
          Open deliverable
        </a>
      )}

      {d.status === "REVISION_REQUESTED" && d.feedback && (
        <p className="mt-3 rounded-lg bg-canvas px-3 py-2 text-sm text-muted">
          <span className="font-medium text-content">Your feedback:</span> {d.feedback}
        </p>
      )}

      {d.status === "SUBMITTED" ? (
        <div className="mt-3 border-t border-line pt-3">
          <ReviewControls kind="deliverable" id={d.id} />
        </div>
      ) : (
        <p className="mt-2 text-xs text-faint">
          {d.status === "APPROVED" ? "Approved" : "Updated"} {formatDate(d.decidedAt ?? d.submittedAt)}
        </p>
      )}
    </Card>
  );
}
