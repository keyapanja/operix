"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { RANGES, type RangeKey } from "@/lib/reports/range";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function RangeFilter({ value, from, to }: { value: RangeKey; from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(value === "custom");
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const [pending, start] = useTransition();

  const go = (url: string) => start(() => router.push(url));

  function preset(v: RangeKey) {
    setOpen(false);
    go(`${pathname}?range=${v}`);
  }
  function applyCustom() {
    if (!f || !t) return;
    go(`${pathname}?range=custom&from=${f}&to=${t}`);
  }

  const btn = (active: boolean) =>
    cn(
      "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
      active ? "bg-surface text-content shadow-sm" : "text-muted hover:text-content",
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className={cn("inline-flex flex-wrap rounded-xl bg-canvas p-0.5", pending && "opacity-70")}>
        {RANGES.map((r) => (
          <button key={r.value} onClick={() => preset(r.value)} className={btn(value === r.value)}>
            {r.label}
          </button>
        ))}
        <button onClick={() => setOpen((o) => !o)} className={btn(value === "custom")} aria-expanded={open}>
          Custom
        </button>
      </div>

      {open && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-canvas p-1.5 ring-1 ring-inset ring-line">
          <div className="w-40">
            <DatePicker value={f} onChange={setF} />
          </div>
          <span className="text-sm text-faint">→</span>
          <div className="w-40">
            <DatePicker value={t} onChange={setT} />
          </div>
          <Button size="sm" onClick={applyCustom} disabled={!f || !t || pending}>
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
