// Browser-side Web Push helpers, shared by the push toggle and the "enable
// notifications" banner/prompt. These run in the client — no "server-only".

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Current browser notification permission ("default" | "granted" | "denied"). */
export function permissionState(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

/** True if this device already has an active push subscription + granted permission. */
export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return !!sub;
  } catch {
    return false;
  }
}

/** Fetch the server VAPID public key (null if push isn't configured server-side). */
export async function fetchVapidKey(): Promise<string | null> {
  try {
    const r = await fetch("/api/push/key");
    if (!r.ok) return null;
    const d = await r.json();
    return typeof d?.key === "string" ? d.key : null;
  } catch {
    return null;
  }
}

export type EnableResult = "ok" | "denied" | "error";

/** Request permission, register the SW, subscribe, and persist to the server.
 *  Never throws — returns a status the caller can surface. Must be called from
 *  a user gesture so the permission prompt is allowed to appear. */
export async function enablePush(vapidKey: string): Promise<EnableResult> {
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "denied";
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });
    const r = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    });
    return r.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}

/** Unsubscribe this device and tell the server to drop the subscription. */
export async function disablePush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
    return true;
  } catch {
    return false;
  }
}
