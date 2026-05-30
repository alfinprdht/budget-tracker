export const CHART_COLORS = [
  "#2563eb",
  "#16a34a",
  "#ea580c",
  "#9333ea",
  "#db2777",
  "#0891b2",
  "#ca8a04",
  "#dc2626",
  "#4f46e5",
  "#0d9488",
  "#7c3aed",
  "#c026d3",
];

export type DailyExpensePoint = {
  day: number;
  label: string;
  total: number;
  cumulative: number;
  dateKey?: string;
};

export type CategoryExpensePoint = {
  category: string;
  total: number;
  percentage: number;
  color: string;
};

export function getChartColor(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

export function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}jt`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}rb`;
  }

  return String(value);
}
