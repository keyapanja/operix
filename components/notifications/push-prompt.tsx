"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import {
  pushSupported,
  isPushEnabled,
  enablePush,
  permissionState,
} from "@/lib/push/client";

const BANNER_DISMISSED = "oprix:push-banner-dismissed"; // sessionStorage
const MODAL_SEEN = "oprix:push-modal-seen"; // localStorage

/**
 * Global "turn on notifications" nudge. On login it checks whether this device
 * has push enabled (browser permission granted + an active subscription); if
 * not, it shows a persistent banner above the header and — once per browser —
 * a modal asking to enable. Hidden entirely when push isn't supported, the
 * server has no VAPID key, or the user has blocked notifications.
 */
export function PushPrompt({ vapidKey }: { vapidKey: string | null }) {
  const [ready, setReady] = useState(false);
  const [needsEnable, setNeedsEnable] = useState(false);
  const [bannerHidden, setBannerHidden] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!vapidKey || !pushSupported()) {
        if (!cancelled) setReady(true);
        return;
      }
      const enabled = await isPushEnabled();
      if (cancelled) return;
      const perm = permissionState();
      const need = !enabled && perm !== "denied" && perm !== "unsupported";
      setNeedsEnable(need);
      if (need) {
        setBannerHidden(sessionStorage.getItem(BANNER_DISMISSED) === "1");
        const modalSeen = localStorage.getItem(MODAL_SEEN) === "1";
        if (!modalSeen && perm === "default") setShowModal(true);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [vapidKey]);

  async function enable() {
    if (!vapidKey) return;
    setBusy(true);
    const res = await enablePush(vapidKey);
    setBusy(false);
    if (res === "ok") {
      setNeedsEnable(false);
      setShowModal(false);
      try {
        localStorage.setItem(MODAL_SEEN, "1");
      } catch {}
      toast.success("Notifications enabled on this device");
    } else if (res === "denied") {
      setShowModal(false);
      setNeedsEnable(false);
      try {
        localStorage.setItem(MODAL_SEEN, "1");
      } catch {}
      toast.error("Notifications are blocked. Allow them in your browser settings to turn them on.");
    } else {
      toast.error("Couldn't enable notifications. Please try again.");
    }
  }

  function dismissBanner() {
    setBannerHidden(true);
    try {
      sessionStorage.setItem(BANNER_DISMISSED, "1");
    } catch {}
  }

  function notNow() {
    setShowModal(false);
    try {
      localStorage.setItem(MODAL_SEEN, "1");
    } catch {}
  }

  if (!ready || !needsEnable) return null;

  return (
    <>
      {!bannerHidden && (
        <div className="flex items-center gap-3 border-b border-amber-200/70 bg-amber-50 px-4 py-2.5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 sm:px-6">
          <Icon name="bell" className="size-4 shrink-0" />
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">Turn on notifications</span>
            <span className="hidden text-amber-800/90 dark:text-amber-200/80 sm:inline">
              {" "}
              — @mentions, replies &amp; assignments, even when Oprix is closed.
            </span>
          </p>
          <button
            onClick={enable}
            disabled={busy}
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
          >
            {busy ? "Enabling…" : "Enable"}
          </button>
          <button
            onClick={dismissBanner}
            aria-label="Dismiss"
            className="shrink-0 rounded-lg p-1 text-amber-700/70 transition-colors hover:bg-amber-100 hover:text-amber-900 dark:hover:bg-amber-500/20 dark:hover:text-amber-100"
          >
            <Icon name="x" className="size-4" />
          </button>
        </div>
      )}

      {showModal && (
        <Modal onClose={notNow} title="Turn on notifications?">
          <div className="flex gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300">
              <Icon name="bell" className="size-5" />
            </div>
            <div>
              <p className="text-sm leading-relaxed text-content">
                Get pinged the moment someone <strong>@mentions</strong> you, replies on your
                thread, or assigns you a task — even when Oprix isn&apos;t open. You can turn it
                off anytime from Notifications.
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={notNow} disabled={busy}>
              Not now
            </Button>
            <Button onClick={enable} disabled={busy}>
              {busy ? "Enabling…" : "Enable notifications"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
