"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishDeliverable, updateDeliverable, deleteDeliverable } from "@/lib/deliverables/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icons";

type Tone = "gray" | "green" | "amber" | "blue" | "red";

export type InternalDeliverable = {
  id: string;
  name: string;
  description: string | null;
  link: string | null;
  status: string;
  feedback: string | null;
};

const STATUS: Record<string, { tone: Tone; label: string }> = {
  SUBMITTED: { tone: "amber", label: "Awaiting client" },
  APPROVED: { tone: "green", label: "Approved" },
  REVISION_REQUESTED: { tone: "blue", label: "Revision requested" },
};

export function DeliverablesPanel({ projectId, items }: { projectId: string; items: InternalDeliverable[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<{ kind: "add" } | { kind: "edit"; id: string } | null>(null);
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function openAdd() {
    setMode({ kind: "add" });
    setName("");
    setLink("");
    setDesc("");
    setErr(null);
  }
  function openEdit(d: InternalDeliverable) {
    setMode({ kind: "edit", id: d.id });
    setName(d.name);
    setLink(d.link ?? "");
    setDesc(d.description ?? "");
    setErr(null);
  }
  function close() {
    setMode(null);
    setErr(null);
  }

  function save() {
    setErr(null);
    start(async () => {
      const input = { name: name.trim(), link: link.trim(), description: desc.trim() };
      const res =
        mode?.kind === "edit"
          ? await updateDeliverable(mode.id, input)
          : await publishDeliverable(projectId, input);
      if (res.error) setErr(res.error);
      else {
        close();
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    start(async () => {
      await deleteDeliverable(id);
      router.refresh();
    });
  }

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div>
          <h2 className="font-semibold text-content">Deliverables</h2>
          <p className="text-xs text-muted">Share a link for the client to review and approve.</p>
        </div>
        {!mode && (
          <Button size="sm" variant="secondary" onClick={openAdd}>
            <Icon name="plus" className="size-4" />
            Publish deliverable
          </Button>
        )}
      </div>

      <div className="space-y-4 p-5">
        {mode && (
          <div className="space-y-2 rounded-xl bg-canvas p-4">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Deliverable name (e.g. Homepage design v2)" />
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link (https://…)" />
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Short description for the client (optional)"
              className="min-h-16 text-sm"
            />
            {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={pending}>
                {pending ? "Saving…" : mode.kind === "edit" ? "Save & re-submit" : "Publish for review"}
              </Button>
              <Button size="sm" variant="secondary" onClick={close} disabled={pending}>
                Cancel
              </Button>
            </div>
            {mode.kind === "edit" && (
              <p className="text-xs text-faint">Saving re-submits this deliverable for the client to review.</p>
            )}
          </div>
        )}

        {items.length === 0 && !mode ? (
          <p className="text-sm text-muted">No deliverables yet. Publish one for the client to review.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((d) => {
              const s = STATUS[d.status] ?? { tone: "gray" as Tone, label: d.status };
              return (
                <li key={d.id} className="rounded-xl p-4 ring-1 ring-inset ring-line">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-content">{d.name}</p>
                      {d.link && (
                        <a
                          href={d.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-xs text-accent-strong hover:underline"
                        >
                          {d.link}
                        </a>
                      )}
                    </div>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </div>
                  {d.status === "REVISION_REQUESTED" && d.feedback && (
                    <p className="mt-2 rounded-lg bg-canvas px-3 py-2 text-sm text-muted">
                      <span className="font-medium text-content">Client feedback:</span> {d.feedback}
                    </p>
                  )}
                  <div className="mt-2 flex gap-3">
                    <button onClick={() => openEdit(d)} className="text-xs font-medium text-muted hover:text-content" disabled={pending}>
                      Edit
                    </button>
                    <button onClick={() => remove(d.id)} className="text-xs font-medium text-red-600 hover:text-red-700" disabled={pending}>
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
