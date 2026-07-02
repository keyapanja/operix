"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * The task due date — the deadline by which the work should have been submitted.
 * Shows an "On time" / "Delayed" verdict:
 *  - Submitted (submitISO set): on time if submitted on/before the due date.
 *  - Not yet submitted (pending): "Delayed" once today is past the due date, so
 *    people see an overdue task is still outstanding. "today" is computed on the
 *    client after mount, so it's hydration-safe and in the viewer's local date.
 */
export function TaskDueBadge({
  dueISO,
  dueLabel,
  submitISO,
  pending,
}: {
  dueISO: string;
  dueLabel: string;
  submitISO: string | null;
  pending: boolean;
}) {
  const [verdict, setVerdict] = useState<"none" | "ontime" | "delayed">(
    // Submitted verdict is deterministic — render it on the server too (no flash).
    submitISO ? (submitISO <= dueISO ? "ontime" : "delayed") : "none",
  );

  useEffect(() => {
    if (submitISO) {
      setVerdict(submitISO <= dueISO ? "ontime" : "delayed");
      return;
    }
    if (pending) {
      const n = new Date();
      const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
      setVerdict(today > dueISO ? "delayed" : "none");
      return;
    }
    setVerdict("none");
  }, [dueISO, submitISO, pending]);

  const delayed = verdict === "delayed";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold ring-1 ring-inset",
        delayed
          ? "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/25"
          : "bg-accent-soft text-accent-strong ring-brand-500/20",
      )}
    >
      <Icon name="calendar" className="size-4" />
      <span className="font-medium opacity-70">Due</span>
      <span>{dueLabel}</span>
      {verdict === "ontime" && <Badge tone="green" className="ml-0.5">On time</Badge>}
      {verdict === "delayed" && <Badge tone="red" className="ml-0.5">Delayed</Badge>}
    </span>
  );
}
