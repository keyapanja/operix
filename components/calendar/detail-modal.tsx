"use client";

import { Modal } from "@/components/ui/modal";
import { formatDate, formatDateTime } from "@/lib/format";

export type CalendarDetail =
  | { kind: "holiday"; title: string; dateISO: string }
  | {
      kind: "announcement";
      title: string;
      body: string | null;
      dateISO: string;
      authorName: string | null;
      postedAt: string;
    };

/** Read-only detail popup for a calendar holiday or announcement. */
export function CalendarDetailModal({ item, onClose }: { item: CalendarDetail; onClose: () => void }) {
  return (
    <Modal onClose={onClose} title={item.kind === "holiday" ? "Holiday" : "Announcement"}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span
            className={`mt-1.5 size-2.5 shrink-0 rounded-full ${item.kind === "holiday" ? "bg-emerald-500" : "bg-amber-500"}`}
          />
          <h3 className="text-lg font-semibold text-content">{item.title}</h3>
        </div>

        <dl className="grid grid-cols-3 gap-x-3 gap-y-2.5 text-sm">
          <dt className="text-faint">Date</dt>
          <dd className="col-span-2 text-content">{formatDate(item.dateISO)}</dd>
          {item.kind === "announcement" && (
            <>
              <dt className="text-faint">Posted by</dt>
              <dd className="col-span-2 text-content">{item.authorName ?? "—"}</dd>
              <dt className="text-faint">Posted on</dt>
              <dd className="col-span-2 text-content">{formatDateTime(item.postedAt)}</dd>
            </>
          )}
        </dl>

        {item.kind === "announcement" && (
          <div className="border-t border-line pt-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-faint">Description</p>
            {item.body ? (
              <p className="whitespace-pre-wrap text-sm text-content">{item.body}</p>
            ) : (
              <p className="text-sm text-muted">No description.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
