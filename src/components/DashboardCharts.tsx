"use client";

import { useMemo, useState } from "react";
import type { TransactionType } from "@prisma/client";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CategoryExpensePoint, DailyExpensePoint } from "@/lib/chart";
import { formatCompactCurrency } from "@/lib/chart";
import { formatCurrency, formatDateWithWeekday, toInputDate } from "@/lib/format";
import { getTransactionTypeLabel } from "@/lib/transaction-type";
import { cn } from "@/lib/utils";

export type ChartTransaction = {
  id: number;
  date: string;
  type: TransactionType;
  amount: number;
  notes: string | null;
  categoryName: string;
};

type DashboardChartsProps = {
  dailyExpenses: DailyExpensePoint[];
  categoryExpenses: CategoryExpensePoint[];
  plannedByCategory: Record<string, number>;
  transactions: ChartTransaction[];
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

function CategoryLegend({
  items,
  plannedByCategory,
}: {
  items: CategoryExpensePoint[];
  plannedByCategory: Record<string, number>;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-500">Belum ada pengeluaran per kategori pada periode ini.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-2 border-b pb-2 text-xs font-medium text-zinc-500">
        <span>Kategori</span>
        <span className="text-right">Aktual</span>
        <span className="text-right">Planned</span>
        <span className="text-right">%</span>
      </div>
      {items.map((item) => {
        const planned = plannedByCategory[item.category] ?? 0;
        const isOverBudget = item.total > planned;

        return (
        <div
          key={item.category}
          className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate text-sm font-medium text-zinc-900">{item.category}</span>
          </div>
          <p
            className={cn(
              "text-right text-sm font-medium",
              isOverBudget ? "text-red-600" : "text-zinc-900",
            )}
          >
            {formatCurrency(item.total)}
          </p>
          <p className="text-right text-sm font-medium text-zinc-900">
            {formatCurrency(planned)}
          </p>
          <p className="text-right text-xs text-zinc-500">{item.percentage.toFixed(1)}%</p>
        </div>
        );
      })}
    </div>
  );
}

export function DashboardCharts({
  dailyExpenses,
  categoryExpenses,
  plannedByCategory,
  transactions,
  periodLabel,
}: DashboardChartsProps) {
  const hasDailyData = dailyExpenses.some((item) => item.total > 0);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const transactionsByDate = useMemo(() => {
    const map = new Map<string, ChartTransaction[]>();

    for (const transaction of transactions) {
      const key = toInputDate(new Date(transaction.date));
      const items = map.get(key) ?? [];
      items.push(transaction);
      map.set(key, items);
    }

    for (const items of map.values()) {
      items.sort((a, b) => b.amount - a.amount);
    }

    return map;
  }, [transactions]);

  const selectedDayTransactions = selectedDateKey
    ? (transactionsByDate.get(selectedDateKey) ?? [])
    : [];
  const selectedDayTotal = selectedDayTransactions.reduce(
    (sum, item) => sum + (item.type === "EXPENSE" ? item.amount : 0),
    0,
  );

  function handleBarClick(data: { payload?: DailyExpensePoint; dateKey?: string }) {
    const dateKey = data.payload?.dateKey ?? data.dateKey;

    if (!dateKey) {
      return;
    }

    setSelectedDateKey(dateKey);
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Pengeluaran per Hari</CardTitle>
          <CardDescription>
            Batang: total harian · Garis: total kumulatif — {periodLabel}. Klik batang untuk
            lihat transaksi hari tersebut.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasDailyData ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyExpenses} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
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
                    className="cursor-pointer"
                    onClick={handleBarClick}
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
          <CardDescription>
            Detail nominal aktual, perencanaan, dan persentase per kategori
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryLegend items={categoryExpenses} plannedByCategory={plannedByCategory} />
        </CardContent>
      </Card>
    </div>

      <Dialog
        open={selectedDateKey !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDateKey(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Transaksi {selectedDateKey ? formatDateWithWeekday(selectedDateKey) : ""}
            </DialogTitle>
            <DialogDescription>
              {selectedDayTransactions.length} transaksi
              {selectedDayTotal > 0
                ? ` · Total pengeluaran ${formatCurrency(selectedDayTotal)}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedDayTransactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">
              Tidak ada transaksi pada hari ini.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDayTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap">
                      {getTransactionTypeLabel(transaction.type)}
                    </TableCell>
                    <TableCell>{transaction.categoryName}</TableCell>
                    <TableCell
                      className={cn(
                        "whitespace-nowrap font-medium",
                        transaction.type === "INCOME" ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="max-w-40 truncate">
                      {transaction.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
