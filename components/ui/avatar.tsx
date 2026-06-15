import { cn } from "@/lib/cn";

const SIZES: Record<string, string> = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-16 text-xl",
  xl: "size-24 text-3xl",
};

const DOT: Record<string, string> = { sm: "size-2.5", md: "size-3", lg: "size-4", xl: "size-5" };

function initialsOf(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name || "?").slice(0, 2).toUpperCase();
}

export function Avatar({
  name,
  src,
  size = "md",
  status,
  className,
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  status?: "active" | "inactive" | null;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {src ? (
        // Real uploads land in Phase 2; for now avatars are image URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className={cn("rounded-full object-cover", SIZES[size])} />
      ) : (
        <span
          className={cn(
            "gradient-brand flex items-center justify-center rounded-full font-semibold text-white",
            SIZES[size],
          )}
        >
          {initialsOf(name)}
        </span>
      )}
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full ring-2 ring-surface",
            DOT[size],
            status === "active" ? "bg-emerald-500" : "bg-slate-400",
          )}
          title={status === "active" ? "Active" : "Away"}
        />
      )}
    </span>
  );
}
