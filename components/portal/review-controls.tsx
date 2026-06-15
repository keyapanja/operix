"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  clientApproveTask,
  clientRequestTaskChanges,
  clientApproveDeliverable,
  clientRequestDeliverableRevision,
  type PortalActionState,
} from "@/lib/portal/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Icon } from "@/components/ui/icons";

/**
 * Approve / request-changes controls for an item awaiting the client's review.
 * One component for both tasks and deliverables — switched by `kind`.
 */
export function ReviewControls({ kind, id }: { kind: "task" | "deliverable"; id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const approve = () => (kind === "task" ? clientApproveTask(id) : clientApproveDeliverable(id));
  const request = (fb: string): Promise<PortalActionState> =>
    kind === "task" ? clientRequestTaskChanges(id, fb) : clientRequestDeliverableRevision(id, fb);

  const requestLabel = kind === "task" ? "Request changes" : "Request revision";

  function run(fn: () => Promise<PortalActionState>, onOk?: () => void) {
    setErr(null);
    start(async () => {
      const res = await fn();
      if (res.error) setErr(res.error);
      else {
        onOk?.();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      {open ? (
        <div className="space-y-2">
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What needs to change? The team will see this."
            className="min-h-24 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => run(() => request(feedback), () => { setOpen(false); setFeedback(""); })} disabled={pending}>
              {pending ? "Sending…" : "Send feedback"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => { setOpen(false); setErr(null); }} disabled={pending}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => run(approve)} disabled={pending}>
            <Icon name="check" className="size-4" />
            {pending ? "Working…" : "Approve"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => { setOpen(true); setErr(null); }} disabled={pending}>
            {requestLabel}
          </Button>
        </div>
      )}
      {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
    </div>
  );
}
