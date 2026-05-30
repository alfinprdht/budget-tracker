"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CategoryExpensePoint, DailyExpensePoint } from "@/lib/chart";
import { formatCompactCurrency } from "@/lib/chart";
import { formatCurrency } from "@/lib/format";

type DashboardChartsProps = {
  dailyExpenses: DailyExpensePoint[];
  categoryExpenses: CategoryExpensePoint[];
  periodLabel: string;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium text-zinc-900">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-zinc-600" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: CategoryExpensePoint }>;
}) {
  if (!active || !payload?.[0]?.payload) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-zinc-900">{data.category}</p>
      <p className="text-zinc-600">{formatCurrency(data.total)}</p>
      <p className="text-zinc-500">{data.percentage.toFixed(1)}%</p>
    </div>
  );
}

function CategoryLegend({ items }: { items: CategoryExpensePoint[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-500">Belum ada pengeluaran per kategori pada periode ini.</p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.category} className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate text-sm font-medium text-zinc-900">{item.category}</span>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-medium text-zinc-900">{formatCurrency(item.total)}</p>
            <p className="text-xs text-zinc-500">{item.percentage.toFixed(1)}%</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardCharts({
  dailyExpenses,
  categoryExpenses,
  periodLabel,
}: DashboardChartsProps) {
  const hasDailyData = dailyExpenses.some((item) => item.total > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Pengeluaran per Hari</CardTitle>
          <CardDescription>
            Batang: total harian · Garis: total kumulatif — {periodLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasDailyData ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyExpenses} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCompactCurrency}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCompactCurrency}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="total"
                    name="Harian"
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulative"
                    name="Kumulatif"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-zinc-500">
              Belum ada pengeluaran untuk ditampilkan di chart.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pengeluaran per Kategori</CardTitle>
          <CardDescription>Proporsi pengeluaran periode {periodLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          {categoryExpenses.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryExpenses}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {categoryExpenses.map((entry) => (
                      <Cell key={entry.category} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-zinc-500">
              Belum ada data kategori untuk ditampilkan.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legend Kategori</CardTitle>
          <CardDescription>Detail nominal dan persentase per kategori</CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryLegend items={categoryExpenses} />
        </CardContent>
      </Card>
    </div>
  );
}
