"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { punchIn } from "@/lib/attendance/self";
import { Icon } from "@/components/ui/icons";

/** Top-of-app nudge shown to employees who haven't clocked in yet today. */
export function PunchInBanner() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onPunch = () =>
    start(async () => {
      setError(null);
      const res = await punchIn();
      if (res.error) setError(res.error);
      else router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-amber-300/50 bg-amber-50 px-6 py-2.5 dark:border-amber-500/25 dark:bg-amber-500/10">
      <div className="flex items-center gap-2.5 text-sm">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300">
          <Icon name="clock" className="size-4" />
        </span>
        <span className="font-medium text-amber-900 dark:text-amber-200">
          {error ?? "You haven't punched in yet — punch in to start your day and open your workspace."}
        </span>
      </div>
      <button
        onClick={onPunch}
        disabled={pending}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
      >
        <Icon name="clock" className="size-4" />
        {pending ? "Punching in…" : "Punch in"}
      </button>
    </div>
  );
}
