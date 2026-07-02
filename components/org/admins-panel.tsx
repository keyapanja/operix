"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icons";
import { grantSuperAdmin, revokeSuperAdmin } from "@/lib/admins/actions";

type Admin = { userId: string; name: string; email: string; isPrimary: boolean; isSelf: boolean };
type Emp = { employeeId: string; name: string };

/** Super Admin access management (Super-Admin-only tab in Organization). */
export function AdminsPanel({ admins, promotable }: { admins: Admin[]; promotable: Emp[] }) {
  const router = useRouter();
  const [pick, setPick] = useState("");
  const [granting, startGrant] = useTransition();
  const [revoking, startRevoke] = useTransition();

  const options = promotable.map((e) => ({ value: e.employeeId, label: e.name }));

  function grant() {
    if (!pick) return;
    startGrant(async () => {
      const res = await grantSuperAdmin(pick);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Super Admin access granted");
        setPick("");
        router.refresh();
      }
    });
  }

  function revoke(a: Admin) {
    void (async () => {
      const ok = await confirmDialog({
        message: `Remove Super Admin access from ${a.name}? They'll become a regular Employee.`,
        tone: "danger",
        confirmLabel: "Revoke access",
      });
      if (!ok) return;
      startRevoke(async () => {
        const res = await revokeSuperAdmin(a.userId);
        if (res.error) toast.error(res.error);
        else {
          toast.success("Super Admin access removed");
          router.refresh();
        }
      });
    })();
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h3 className="mb-1 text-sm font-semibold text-content">Grant Super Admin access</h3>
        <p className="mb-4 max-w-2xl text-sm text-muted">
          Super Admins have full access to everything, including managing other admins. The{" "}
          <span className="font-medium text-content">primary admin</span> (the original account) always
          keeps access and can&apos;t be removed.
        </p>
        {options.length === 0 ? (
          <p className="text-sm text-muted">Everyone with a login is already a Super Admin.</p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-64">
              <Combobox value={pick} onChange={setPick} options={options} placeholder="Select a team member" />
            </div>
            <Button onClick={grant} disabled={!pick || granting}>
              <Icon name="plus" className="size-4" />
              {granting ? "Granting…" : "Grant access"}
            </Button>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h3 className="text-sm font-semibold text-content">Super Admins</h3>
        </div>
        <ul className="divide-y divide-line">
          {admins.map((a) => (
            <li key={a.userId} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-content">{a.name}</p>
                  {a.isPrimary && <Badge tone="green">Primary</Badge>}
                  {a.isSelf && <Badge tone="gray">You</Badge>}
                </div>
                <p className="truncate text-xs text-muted">{a.email}</p>
              </div>
              {a.isPrimary ? (
                <span className="text-xs text-faint">Can&apos;t be removed</span>
              ) : a.isSelf ? (
                <span className="text-xs text-faint">—</span>
              ) : (
                <button
                  onClick={() => revoke(a)}
                  disabled={revoking}
                  className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/15"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
