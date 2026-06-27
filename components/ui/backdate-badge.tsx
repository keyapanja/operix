"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

/**
 * Subtle "Backdate" badge shown when `date` is before today. It computes "today"
 * on the client after mount (so it stays hydration-safe and needs no server
 * "today" plumbed in) — drop it next to any date that can be set in the past,
 * e.g. a task due date or a leave start date.
 */
export function BackdateBadge({
  date,
  label = "Backdate",
}: {
  date: string | Date | null | undefined;
  label?: string;
}) {
  const [backdated, setBackdated] = useState(false);

  useEffect(() => {
    if (!date) {
      setBackdated(false);
      return;
    }
    const iso = typeof date === "string" ? date.slice(0, 10) : new Date(date).toISOString().slice(0, 10);
    const n = new Date();
    const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
    setBackdated(iso < today);
  }, [date]);

  if (!backdated) return null;
  return (
    <Badge tone="amber" className="ml-1.5 shrink-0">
      {label}
    </Badge>
  );
}
