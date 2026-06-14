import Link from "next/link";
import { Icon } from "@/components/ui/icons";

/** Consistent "back" control used across detail/create pages. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-content"
    >
      <span className="flex size-7 items-center justify-center rounded-lg bg-surface ring-1 ring-inset ring-line-strong transition-all group-hover:bg-canvas group-hover:-translate-x-0.5">
        <Icon name="arrowLeft" className="size-4" />
      </span>
      {children}
    </Link>
  );
}
