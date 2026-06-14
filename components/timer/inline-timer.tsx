"use client";

import { useEffect, useState, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { startTimer, pauseTimer, stopTimer } from "@/lib/timer/actions";
import { Icon } from "@/components/ui/icons";
import { fmtClock, liveSeconds, type TimerStatusUI } from "@/lib/timer/shared";

/** Compact start/pause/resume/stop control for task lists. */
export function InlineTimer({
  taskId,
  status,
  baseSeconds,
  runStartedAtMs,
}: {
  taskId: string;
  status: TimerStatusUI;
  baseSeconds: number;
  runStartedAtMs: number | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    if (status !== "RUNNING") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  const seconds = liveSeconds(status, baseSeconds, runStartedAtMs, now);
  const live = status === "RUNNING";
  const paused = status === "PAUSED";

  const act = (e: MouseEvent, fn: () => Promise<unknown>) => {
    e.stopPropagation();
    start(async () => {
      await fn();
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {(live || paused) && (
        <span className={"font-display w-12 text-right text-xs font-bold tabular-nums " + (live ? "text-emerald-500" : "text-amber-500")}>
          {fmtClock(seconds)}
        </span>
      )}
      <button
        onClick={(e) => act(e, () => (live ? pauseTimer(taskId) : startTimer(taskId)))}
        disabled={pending}
        title={live ? "Pause" : paused ? "Resume" : "Start timer"}
        className={
          "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-50 " +
          (live
            ? "bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25"
            : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25")
        }
      >
        <Icon name={live ? "pause" : "play"} className="size-3.5" {...(live ? {} : { fill: "currentColor", stroke: "none" })} />
      </button>
      {(live || paused) && (
        <button
          onClick={(e) => act(e, () => stopTimer(taskId))}
          disabled={pending}
          title="Stop & log"
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/15"
        >
          <Icon name="stop" className="size-3" fill="currentColor" stroke="none" />
        </button>
      )}
    </div>
  );
}
