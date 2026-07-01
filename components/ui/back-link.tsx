"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";

/**
 * Back control used across detail/create pages. Goes to the **actual previous
 * page** (browser history) when there is one; falls back to `href` on a direct
 * load / new tab so it always lands somewhere sensible (and so it degrades to a
 * real link for middle-click / open-in-new-tab). `href` should point at a page
 * the viewer can definitely access — history-back sidesteps permission gates,
 * but the fallback shouldn't bounce them (e.g. to /dashboard).
 */
export function BackLink({ href, children = "Back" }: { href: string; children?: React.ReactNode }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(e) => {
        // Prefer the real previous page; the login flow guarantees in-app history.
        if (typeof window !== "undefined" && window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      className="group inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-content"
    >
      <span className="flex size-7 items-center justify-center rounded-lg bg-surface ring-1 ring-inset ring-line-strong transition-all group-hover:bg-canvas group-hover:-translate-x-0.5">
        <Icon name="arrowLeft" className="size-4" />
      </span>
      {children}
    </Link>
  );
}
