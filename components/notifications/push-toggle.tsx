"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icons";
import {
  pushSupported,
  isPushEnabled,
  fetchVapidKey,
  enablePush,
  disablePush,
} from "@/lib/push/client";

/** Per-device opt-in for Web Push. Hidden when the browser can't do push or the
 *  server has no VAPID key configured. Shares its logic with the global
 *  enable-notifications banner via lib/push/client. */
export function PushToggle() {
  const [vapid, setVapid] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    let cancelled = false;
    (async () => {
      const key = await fetchVapidKey();
      if (!key || cancelled) return;
      setVapid(key);
      const on = await isPushEnabled();
      if (!cancelled) setEnabled(on);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    if (!vapid) return;
    setBusy(true);
    const res = await enablePush(vapid);
    setBusy(false);
    if (res === "ok") {
      setEnabled(true);
      toast.success("Push notifications enabled on this device");
    } else if (res === "denied") {
      toast.error("Notification permission was denied.");
    } else {
      toast.error("Couldn't enable push notifications.");
    }
  }

  async function disable() {
    setBusy(true);
    const ok = await disablePush();
    setBusy(false);
    if (ok) {
      setEnabled(false);
      toast.success("Push notifications disabled on this device");
    } else {
      toast.error("Couldn't disable push notifications.");
    }
  }

  if (!vapid) return null;

  return (
    <button
      onClick={enabled ? disable : enable}
      disabled={busy}
      className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-canvas px-3 py-2 text-sm font-medium text-content ring-1 ring-inset ring-line transition-colors hover:bg-surface disabled:opacity-50"
    >
      <Icon name="bell" className="size-4" />
      {busy ? "Working…" : enabled ? "Disable push on this device" : "Enable push notifications"}
    </button>
  );
}
