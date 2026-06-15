import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icons";

export type Kpi = { label: string; value: string; icon: string; color?: string };

export function KpiGrid({ items }: { items: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((k) => (
        <Card key={k.label} className="p-4">
          <div className="flex items-center gap-2">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: (k.color ?? "#10b981") + "22", color: k.color ?? "#10b981" }}
            >
              <Icon name={k.icon} className="size-4" />
            </span>
            <span className="text-xs font-medium text-muted">{k.label}</span>
          </div>
          <div className="font-display mt-2 text-2xl font-bold text-content">{k.value}</div>
        </Card>
      ))}
    </div>
  );
}

export function Section({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={"p-5 " + (className ?? "")}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-content">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}
