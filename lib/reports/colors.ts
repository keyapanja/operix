// Categorical chart palette — vivid in both light and dark themes.
export const CHART_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f43f5e", // rose
  "#84cc16", // lime
  "#f97316", // orange
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#eab308", // yellow
  "#0ea5e9", // sky
  "#d946ef", // fuchsia
];

export function colorAt(i: number): string {
  return CHART_COLORS[i % CHART_COLORS.length];
}

/** Stable color for a named key, so a project keeps one color across charts. */
export function colorFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return CHART_COLORS[h % CHART_COLORS.length];
}
