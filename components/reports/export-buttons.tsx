"use client";

import { downloadCSV, downloadXLS, printPDF, type Table } from "@/lib/reports/export";
import { Icon } from "@/components/ui/icons";

export function ExportButtons({ name, title, table }: { name: string; title: string; table: Table }) {
  const disabled = table.rows.length === 0;
  return (
    <div className="inline-flex items-center gap-0.5 rounded-xl bg-canvas p-0.5">
      <Btn label="CSV" disabled={disabled} onClick={() => downloadCSV(name, table)} />
      <Btn label="Excel" disabled={disabled} onClick={() => downloadXLS(name, table)} />
      <Btn label="PDF" disabled={disabled} onClick={() => printPDF(title, [{ table }])} />
    </div>
  );
}

function Btn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-content disabled:opacity-40"
    >
      <Icon name="download" className="size-3.5" />
      {label}
    </button>
  );
}
