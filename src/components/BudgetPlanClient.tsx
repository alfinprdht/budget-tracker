"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TransactionType } from "@prisma/client";
import {
  createBudgetItem,
  deleteBudgetItem,
  updateBudgetItem,
} from "@/actions/budget";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getChartColor } from "@/lib/chart";
import { formatCurrency, formatDateWithWeekday, toInputDate } from "@/lib/format";
import { eachDayInRange, parsePeriodKey } from "@/lib/period";
import { cn } from "@/lib/utils";

export type BudgetCategoryOption = {
  id: number;
  name: string;
  type: TransactionType;
};

export type BudgetItemView = {
  id: number;
  date: string;
  amount: number;
  description: string | null;
  categoryId: number;
  categoryName: string;
  categoryType: TransactionType;
};

const WEEKDAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

type BudgetPlanClientProps = {
  periodKey: string;
  periodLabel: string;
  categories: BudgetCategoryOption[];
  budgetItems: BudgetItemView[];
};

function getMondayBasedIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

export function BudgetPlanClient({
  periodKey,
  periodLabel,
  categories,
  budgetItems,
}: BudgetPlanClientProps) {
  const router = useRouter();
  const range = useMemo(() => parsePeriodKey(periodKey), [periodKey]);
  const [pending, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const expenseCategories = categories.filter((category) => category.type === "EXPENSE");
  const incomeCategories = categories.filter((category) => category.type === "INCOME");

  const itemsByDate = useMemo(() => {
    const map = new Map<string, BudgetItemView[]>();

    for (const item of budgetItems) {
      const key = toInputDate(new Date(item.date));
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }

    return map;
  }, [budgetItems]);

  const calendarDays = useMemo(() => eachDayInRange(range), [range]);

  const calendarCells = useMemo(() => {
    const leadingEmpty = getMondayBasedIndex(calendarDays[0]);
    const cells: Array<Date | null> = Array.from({ length: leadingEmpty }, () => null);
    return cells.concat(calendarDays);
  }, [calendarDays]);

  const totals = useMemo(() => {
    return budgetItems.reduce(
      (acc, item) => {
        if (item.categoryType === "INCOME") {
          acc.income += item.amount;
        } else {
          acc.expense += item.amount;
        }
        return acc;
      },
      { income: 0, expense: 0 },
    );
  }, [budgetItems]);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();

    for (const item of budgetItems) {
      if (item.categoryType !== "EXPENSE") {
        continue;
      }

      map.set(item.categoryName, (map.get(item.categoryName) ?? 0) + item.amount);
    }

    return [...map.entries()]
      .map(([category, total], index) => ({
        category,
        total,
        percentage: totals.expense > 0 ? (total / totals.expense) * 100 : 0,
        color: getChartColor(index),
      }))
      .sort((a, b) => b.total - a.total);
  }, [budgetItems, totals.expense]);

  const selectedDayItems = selectedDate ? (itemsByDate.get(selectedDate) ?? []) : [];

  const selectedDayBalance = useMemo(() => {
    if (!selectedDate) {
      return 0;
    }

    return budgetItems.reduce((balance, item) => {
      const itemDate = toInputDate(new Date(item.date));

      if (itemDate >= selectedDate) {
        return balance;
      }

      if (item.categoryType === "INCOME") {
        return balance + item.amount;
      }

      return balance - item.amount;
    }, 0);
  }, [budgetItems, selectedDate]);

  function resetForm() {
    setEditingId(null);
    setCategoryId("");
    setDescription("");
    setAmount("");
    setFormError(null);
    setFormSuccess(null);
  }

  function openDayDialog(dateKey: string) {
    resetForm();
    setSelectedDate(dateKey);
  }

  function closeDayDialog() {
    setSelectedDate(null);
    resetForm();
  }

  function handleEdit(item: BudgetItemView) {
    setEditingId(item.id);
    setCategoryId(String(item.categoryId));
    setDescription(item.description ?? "");
    setAmount(String(item.amount));
    setFormError(null);
    setFormSuccess(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDate) {
      return;
    }

    const formData = new FormData();
    formData.set("date", selectedDate);
    formData.set("categoryId", categoryId);
    formData.set("amount", amount);
    formData.set("description", description);

    startTransition(async () => {
      setFormError(null);
      setFormSuccess(null);

      const result = editingId
        ? await updateBudgetItem(editingId, {}, formData)
        : await createBudgetItem({}, formData);

      if (result.error) {
        setFormError(result.error);
        return;
      }

      setFormSuccess(result.success ?? "Berhasil disimpan");
      resetForm();
      router.refresh();
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      const result = await deleteBudgetItem(id);

      if (result.error) {
        setFormError(result.error);
        return;
      }

      if (editingId === id) {
        resetForm();
      }

      router.refresh();
    });
  }

  const todayKey = toInputDate(new Date());

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Kalender Anggaran</CardTitle>
            <CardDescription>{periodLabel} — klik tanggal untuk kelola anggaran</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-zinc-500">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-2">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="min-h-16" />;
                }

                const dateKey = toInputDate(day);
                const dayItems = itemsByDate.get(dateKey) ?? [];
                const dayExpense = dayItems
                  .filter((item) => item.categoryType === "EXPENSE")
                  .reduce((sum, item) => sum + item.amount, 0);

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => openDayDialog(dateKey)}
                    className={cn(
                      "flex min-h-16 flex-col items-center justify-center rounded-lg border p-1 text-left transition hover:border-blue-300 hover:bg-blue-50",
                      dateKey === todayKey && "border-blue-400 bg-blue-50/50",
                      selectedDate === dateKey && "border-blue-500 bg-blue-50 ring-2 ring-blue-200",
                    )}
                  >
                    <span className="text-sm font-semibold text-zinc-900">{day.getDate()}</span>
                    {dayExpense > 0 ? (
                      <span className="mt-1 line-clamp-2 text-[10px] font-medium text-red-600">
                        {formatCompact(dayExpense)}
                      </span>
                    ) : dayItems.length > 0 ? (
                      <span className="mt-1 size-1.5 rounded-full bg-green-500" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Akumulasi Pengeluaran</CardDescription>
              <CardTitle className="text-2xl text-red-600">
                {formatCurrency(totals.expense)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pemasukan</CardDescription>
              <CardTitle className="text-2xl text-green-600">
                {formatCurrency(totals.income)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pengeluaran per Kategori</CardDescription>
            </CardHeader>
            <CardContent className="max-h-64 space-y-3 overflow-y-auto pt-0">
              {expenseByCategory.length === 0 ? (
                <p className="text-sm text-zinc-500">Belum ada pengeluaran rencana.</p>
              ) : (
                expenseByCategory.map((item) => (
                  <div key={item.category} className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate text-sm text-zinc-900">{item.category}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium text-red-600">
                        {formatCurrency(item.total)}
                      </p>
                      <p className="text-xs text-zinc-500">{item.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Anggaran Periode</CardTitle>
          <CardDescription>Semua rencana anggaran {periodLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          {budgetItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              Belum ada anggaran pada periode ini. Klik tanggal di kalender untuk menambahkan.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgetItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateWithWeekday(item.date)}
                    </TableCell>
                    <TableCell>{item.categoryName}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.description || "-"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "whitespace-nowrap font-medium",
                        item.categoryType === "INCOME" ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            openDayDialog(toInputDate(new Date(item.date)));
                            handleEdit(item);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={pending}
                          onClick={() => handleDelete(item.id)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={selectedDate !== null} onOpenChange={(open) => !open && closeDayDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Anggaran {selectedDate ? formatDateWithWeekday(selectedDate) : ""}
            </DialogTitle>
            <DialogDescription>
              Tambah atau ubah rencana anggaran untuk tanggal ini
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div
              className={cn(
                "rounded-lg border px-4 py-3",
                selectedDayBalance >= 0
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50",
              )}
            >
              <p className="text-xs text-zinc-600">Sisa anggaran hari ini</p>
              <p
                className={cn(
                  "text-xl font-semibold",
                  selectedDayBalance >= 0 ? "text-green-700" : "text-red-600",
                )}
              >
                {formatCurrency(selectedDayBalance)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Akumulasi pemasukan − pengeluaran dari hari sebelumnya dalam periode ini
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="budget-category">Kategori</Label>
              <select
                id="budget-category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                required
                className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Pilih kategori</option>
                {expenseCategories.length > 0 ? (
                  <optgroup label="Pengeluaran">
                    {expenseCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {incomeCategories.length > 0 ? (
                  <optgroup label="Pemasukan">
                    {incomeCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="budget-description">Deskripsi</Label>
              <Textarea
                id="budget-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Catatan anggaran (opsional)"
                rows={2}
                maxLength={1000}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="budget-amount">Total</Label>
              <Input
                id="budget-amount"
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0"
                required
              />
            </div>

            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            {formSuccess ? <p className="text-sm text-green-600">{formSuccess}</p> : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Menyimpan..." : editingId ? "Perbarui" : "Tambah"}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Batal Edit
                </Button>
              ) : null}
            </div>
          </form>

          <div className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-medium text-zinc-900">
              Anggaran tanggal ini ({selectedDayItems.length})
            </h3>
            {selectedDayItems.length === 0 ? (
              <p className="text-sm text-zinc-500">Belum ada anggaran pada tanggal ini.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDayItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.categoryName}</TableCell>
                      <TableCell className="max-w-32 truncate">
                        {item.description || "-"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "whitespace-nowrap font-medium",
                          item.categoryType === "INCOME" ? "text-green-600" : "text-red-600",
                        )}
                      >
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={pending}
                            onClick={() => handleDelete(item.id)}
                          >
                            Hapus
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatCompact(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}jt`;
  }

  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}rb`;
  }

  return String(value);
}
