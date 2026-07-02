"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { setWorkWeek } from "@/lib/leave/actions";
import { WEEKDAYS, SATURDAY_WEEK_LABELS, type WorkWeek } from "@/lib/leave/work-week";
import { cn } from "@/lib/cn";

/** Company working-days config (drives leave-day counting). */
export function WorkingDaysSettings({ initial }: { initial: WorkWeek }) {
  const router = useRouter();
  const [working, setWorking] = useState<Set<number>>(new Set(initial.workingWeekdays));
  const [satOff, setSatOff] = useState<Set<number>>(new Set(initial.saturdayOffWeeks));
  const [pending, start] = useTransition();

  const saturdayWorking = working.has(6);

  function toggleDay(d: number) {
    setWorking((s) => {
      const n = new Set(s);
      if (n.has(d)) n.delete(d);
      else n.add(d);
      return n;
    });
  }
  function toggleSat(w: number) {
    setSatOff((s) => {
      const n = new Set(s);
      if (n.has(w)) n.delete(w);
      else n.add(w);
      return n;
    });
  }

  function save() {
    start(async () => {
      const res = await setWorkWeek({
        workingWeekdays: [...working].sort((a, b) => a - b),
        saturdayOffWeeks: saturdayWorking ? [...satOff].sort((a, b) => a - b) : [],
      });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Working days updated");
        router.refresh();
      }
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line p-5">
        <h3 className="text-sm font-semibold text-content">Working days</h3>
        <p className="mt-0.5 max-w-md text-sm text-muted">
          Non-working days and holidays inside a leave range aren&apos;t counted. Pick which
          weekdays are working; for Saturdays you can mark specific ones off (e.g. 2nd &amp; 4th).
        </p>
      </div>
      <div className="space-y-5 p-5">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">Weekly working days</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => {
              const on = working.has(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  aria-pressed={on}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors",
                    on
                      ? "bg-brand-600 text-white ring-brand-600"
                      : "bg-canvas text-muted ring-line hover:text-content",
                  )}
                >
                  {d.short}
                </button>
              );
            })}
          </div>
        </div>

        {saturdayWorking && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
              Saturdays off (by week of the month)
            </p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((w) => {
                const off = satOff.has(w);
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => toggleSat(w)}
                    aria-pressed={off}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors",
                      off
                        ? "bg-amber-500 text-white ring-amber-500"
                        : "bg-canvas text-muted ring-line hover:text-content",
                    )}
                  >
                    {SATURDAY_WEEK_LABELS[w]}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">
              Highlighted Saturdays are treated as non-working. Leave all off for every Saturday working.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save working days"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
