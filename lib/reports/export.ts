// Client-only export helpers: CSV, Excel-compatible XLS, and print-to-PDF.
// (Only call these from client components.)

export type Table = { headers: string[]; rows: (string | number)[][] };

function triggerDownload(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCSV(name: string, t: Table) {
  const lines = [t.headers.map(csvCell).join(","), ...t.rows.map((r) => r.map(csvCell).join(","))];
  // BOM so Excel reads UTF-8 correctly.
  triggerDownload(`${name}.csv`, "text/csv;charset=utf-8", "﻿" + lines.join("\r\n"));
}

function esc(s: string | number): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function tableHTML(t: Table): string {
  const head = `<tr>${t.headers.map((h) => `<th style="background:#0d9488;color:#fff;text-align:left;padding:6px">${esc(h)}</th>`).join("")}</tr>`;
  const body = t.rows
    .map((r) => `<tr>${r.map((c) => `<td style="padding:6px;border:1px solid #e2e8f0">${esc(c)}</td>`).join("")}</tr>`)
    .join("");
  return `<table style="border-collapse:collapse">${head}${body}</table>`;
}

/** Excel opens an HTML table saved with the .xls extension + ms-excel MIME. */
export function downloadXLS(name: string, t: Table) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${tableHTML(t)}</body></html>`;
  triggerDownload(`${name}.xls`, "application/vnd.ms-excel", html);
}

/** Opens a clean printable document and triggers print → save as PDF. */
export function printPDF(title: string, sections: { heading?: string; table: Table }[]) {
  const w = window.open("", "_blank", "width=960,height=720");
  if (!w) return;
  const style =
    "body{font-family:system-ui,Arial,sans-serif;color:#0f172a;padding:28px}h1{font-size:20px;margin:0 0 2px}" +
    "h2{font-size:14px;margin:22px 0 8px;color:#334155}small{color:#64748b}" +
    "table{border-collapse:collapse;width:100%;font-size:12px;margin-bottom:8px}" +
    "th{background:#0d9488;color:#fff;text-align:left;padding:6px}td{padding:6px;border:1px solid #e2e8f0}";
  const body = sections
    .map(({ heading, table }) => `${heading ? `<h2>${esc(heading)}</h2>` : ""}${tableHTML(table)}`)
    .join("");
  w.document.write(
    `<html><head><title>${esc(title)}</title><style>${style}</style></head><body>` +
      `<h1>${esc(title)}</h1><small>Oprix · generated ${new Date().toLocaleString("en-IN")}</small>` +
      `${body}<script>window.onload=function(){window.print()}</script></body></html>`,
  );
  w.document.close();
}
