// Report date-range presets + time-series bucketing. ISO "YYYY-MM-DD" (UTC).

export type RangeKey = "week" | "month" | "quarter" | "year" | "all" | "custom";

export const RANGES: { value: RangeKey; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "quarter", label: "This quarter" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

const parse = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const fmt = (d: Date) => d.toISOString().slice(0, 10);

export function isRange(v: string | undefined): v is RangeKey {
  return v === "week" || v === "month" || v === "quarter" || v === "year" || v === "all";
}

export function isISODate(v: string | undefined): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export type Resolved = { range: RangeKey; startISO: string; endISO: string; label: string };

function customLabel(s: string, e: string): string {
  const p = (iso: string) =>
    new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return s === e ? p(s) : `${p(s)} – ${p(e)}`;
}

/** Resolve a window from search params: a preset, or a custom from/to pair. */
export function resolveWindow(
  p: { range?: string; from?: string; to?: string },
  todayISO: string,
  fallback: RangeKey = "month",
): Resolved {
  if (p.range === "custom" && isISODate(p.from) && isISODate(p.to)) {
    let s = p.from;
    let e = p.to;
    if (s > e) [s, e] = [e, s];
    return { range: "custom", startISO: s, endISO: e, label: customLabel(s, e) };
  }
  const r: RangeKey = isRange(p.range) ? p.range : fallback;
  const w = rangeWindow(r, todayISO);
  return { range: r, startISO: w.startISO, endISO: w.endISO, label: w.label };
}

export function rangeWindow(range: RangeKey, todayISO: string): { startISO: string; endISO: string; label: string } {
  const d = parse(todayISO);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  if (range === "week") {
    const s = parse(todayISO);
    s.setUTCDate(s.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const e = new Date(s);
    e.setUTCDate(e.getUTCDate() + 6);
    return { startISO: fmt(s), endISO: fmt(e), label: "This week" };
  }
  if (range === "month") {
    return { startISO: fmt(new Date(Date.UTC(y, m, 1))), endISO: fmt(new Date(Date.UTC(y, m + 1, 0))), label: "This month" };
  }
  if (range === "quarter") {
    const q = Math.floor(m / 3) * 3;
    return { startISO: fmt(new Date(Date.UTC(y, q, 1))), endISO: fmt(new Date(Date.UTC(y, q + 3, 0))), label: "This quarter" };
  }
  if (range === "year") {
    return { startISO: `${y}-01-01`, endISO: `${y}-12-31`, label: "This year" };
  }
  return { startISO: "2000-01-01", endISO: todayISO, label: "All time" };
}

/** Daily buckets for short spans (≤ ~2 months), monthly for longer. */
export function granularityFor(startISO: string, endISO: string): "day" | "month" {
  const days = Math.round((parse(endISO).getTime() - parse(startISO).getTime()) / 86_400_000) + 1;
  return days <= 62 ? "day" : "month";
}

export function bucketKey(dateISO: string, gran: "day" | "month"): string {
  return gran === "day" ? dateISO : dateISO.slice(0, 7);
}

/** Ordered, gap-filled buckets between start and end (inclusive). */
export function buckets(startISO: string, endISO: string, gran: "day" | "month"): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const end = parse(endISO);
  let guard = 0;
  if (gran === "day") {
    let d = parse(startISO);
    while (d <= end && guard++ < 400) {
      out.push({ key: fmt(d), label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }) });
      d = new Date(d);
      d.setUTCDate(d.getUTCDate() + 1);
    }
  } else {
    let d = new Date(Date.UTC(parse(startISO).getUTCFullYear(), parse(startISO).getUTCMonth(), 1));
    while (d <= end && guard++ < 200) {
      out.push({ key: fmt(d).slice(0, 7), label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" }) });
      d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
    }
  }
  return out;
}
