"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteClient } from "@/lib/clients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icons";

export type PortalStatus = "none" | "pending" | "active";

export function PortalAccess({
  clientId,
  clientEmail,
  status,
  lastLogin,
}: {
  clientId: string;
  clientEmail: string | null;
  status: PortalStatus;
  lastLogin: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(clientEmail ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send() {
    setMsg(null);
    setErr(null);
    start(async () => {
      const res = await inviteClient(clientId, email.trim() || undefined);
      if (res.error) {
        setErr(res.error);
      } else {
        setMsg(
          res.delivered
            ? "Invite email sent."
            : "Invite created — email isn't configured, so share the link from the server log.",
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-content">Portal access</span>
        {status === "active" && <Badge tone="green">Active</Badge>}
        {status === "pending" && <Badge tone="amber">Invite pending</Badge>}
        {status === "none" && <Badge tone="gray">Not invited</Badge>}
      </div>

      {status === "active" ? (
        <p className="text-sm text-muted">
          This client can sign in to the portal.
          {lastLogin ? ` Last seen ${lastLogin}.` : " They haven't signed in yet."}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted">
            {status === "pending"
              ? "Invite sent — waiting for them to set a password. Resend if needed."
              : "Invite this client to view their projects and approve deliverables."}
          </p>
          {status === "none" && (
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@email.com"
            />
          )}
          <Button onClick={send} disabled={pending} size="sm">
            <Icon name="mail" className="size-4" />
            {pending ? "Sending…" : status === "pending" ? "Resend invite" : "Send invite"}
          </Button>
        </>
      )}

      {msg && <p className="text-xs text-green-600 dark:text-green-400">{msg}</p>}
      {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
    </div>
  );
}
