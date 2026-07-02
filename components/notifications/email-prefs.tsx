"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";
import { updateEmailPrefs } from "@/lib/notifications/actions";
import { EMAILABLE_CATEGORIES, EMAIL_CATEGORY_META } from "@/lib/notifications/categories";
import { cn } from "@/lib/cn";

/** Per-category email opt-in toggles. Saves the whole map on each change so the
 *  stored preferences are always complete. Optimistic with revert-on-error. */
export function EmailPrefs({ initial }: { initial: Record<string, boolean> }) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(initial);
  const [saving, start] = useTransition();

  function toggle(cat: string) {
    const prev = prefs;
    const next = { ...prefs, [cat]: !prefs[cat] };
    setPrefs(next);
    start(async () => {
      const res = await updateEmailPrefs(next);
      if (!res.ok) {
        setPrefs(prev);
        toast.error("Couldn't save your email preferences.");
      }
    });
  }

  return (
    <div className="divide-y divide-line">
      {EMAILABLE_CATEGORIES.map((cat) => {
        const meta = EMAIL_CATEGORY_META[cat];
        const on = !!prefs[cat];
        return (
          <div key={cat} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-content">{meta.label}</p>
              <p className="text-xs text-muted">{meta.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={`Email me about ${meta.label}`}
              disabled={saving}
              onClick={() => toggle(cat)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
                on ? "bg-brand-600" : "bg-line-strong",
              )}
            >
              <span
                className={cn(
                  "inline-block size-5 transform rounded-full bg-white shadow transition-transform",
                  on ? "translate-x-[22px]" : "translate-x-0.5",
                )}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
