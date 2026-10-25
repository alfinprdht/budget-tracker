"use client";

import { useEffect, useMemo, useState } from "react";
import type { TransactionType } from "@prisma/client";
import {
  bulkUpdateTransactionCategory,
  deleteTransaction,
} from "@/actions/transactions";
import { TransactionModal } from "@/components/TransactionModal";
import type { CategoryOption, TransactionFormValues } from "@/components/TransactionForm";
import { Button } from "@/components/ui/button";
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
import { formatCurrency, formatDate, toInputDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type TransactionItem = {
  id: number;
  date: Date;
  type: TransactionType;
  amount: { toString(): string };
  notes: string | null;
  categoryId: number;
  category: {
    name: string;
  };
};

function toFormValues(transaction: TransactionItem): TransactionFormValues {
  return {
    id: transaction.id,
    date: transaction.date,
    type: transaction.type,
    categoryId: transaction.categoryId,
    amount: Number(transaction.amount),
    notes: transaction.notes,
  };
}

function DeleteTransactionButton({ id }: { id: number }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setMessage(null);
    const result = await deleteTransaction(id);
    setMessage(result.error ?? result.success ?? null);
    setPending(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={handleDelete}
      >
        {pending ? "..." : "Hapus"}
      </Button>
      {message ? <span className="text-xs text-red-600">{message}</span> : null}
    </div>
  );
}

export function TransactionList({
  transactions,
  categories,
  periodStart,
  periodEnd,
}: {
  transactions: TransactionItem[];
  categories: CategoryOption[];
  periodStart: string;
  periodEnd: string;
}) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState(periodStart);
  const [dateTo, setDateTo] = useState(periodEnd);
  const [simulationMode, setSimulationMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<number>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<TransactionItem | null>(
    null,
  );

  useEffect(() => {
    setDateFrom(periodStart);
    setDateTo(periodEnd);
  }, [periodStart, periodEnd]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const transactionDate = toInputDate(new Date(transaction.date));
      const matchesCategory =
        categoryFilter === "all" || transaction.categoryId === Number(categoryFilter);
      const matchesType = typeFilter === "all" || transaction.type === typeFilter;
      const matchesDateRange = transactionDate >= dateFrom && transactionDate <= dateTo;

      return matchesCategory && matchesType && matchesDateRange;
    });
  }, [transactions, categoryFilter, typeFilter, dateFrom, dateTo]);

  const usedCategories = useMemo(() => {
    const usedIds = new Set(transactions.map((transaction) => transaction.categoryId));
    return categories.filter((category) => usedIds.has(category.id));
  }, [transactions, categories]);

  const savingTotal = useMemo(() => {
    return transactions.reduce((total, transaction) => {
      if (
        !selectedIds.has(transaction.id) ||
        transaction.type !== "EXPENSE"
      ) {
        return total;
      }

      return total + Number(transaction.amount);
    }, 0);
  }, [transactions, selectedIds]);

  // Only rows visible under the current filters count toward a bulk edit.
  const bulkSelectedTransactions = useMemo(() => {
    return filteredTransactions.filter((transaction) =>
      bulkSelectedIds.has(transaction.id),
    );
  }, [filteredTransactions, bulkSelectedIds]);

  const bulkTypes = new Set(bulkSelectedTransactions.map((transaction) => transaction.type));
  const bulkType = bulkTypes.size === 1 ? [...bulkTypes][0] : null;
  const bulkHasMixedTypes = bulkTypes.size > 1;
  const bulkCategoryOptions = bulkType
    ? categories.filter((category) => category.type === bulkType)
    : [];
  const selectedBulkCategoryId = bulkCategoryOptions.some(
    (category) => String(category.id) === bulkCategoryId,
  )
    ? bulkCategoryId
    : "";
  const allVisibleBulkSelected =
    filteredTransactions.length > 0 &&
    bulkSelectedTransactions.length === filteredTransactions.length;
  const someVisibleBulkSelected =
    bulkSelectedTransactions.length > 0 && !allVisibleBulkSelected;
  const showBulkToolbar = !simulationMode && bulkSelectedTransactions.length > 0;

  function toggleSimulationMode() {
    setSimulationMode((current) => {
      if (current) {
        setSelectedIds(new Set());
      }

      return !current;
    });
  }

  function toggleBulkSelection(id: number) {
    setBulkMessage(null);
    setBulkSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function toggleAllVisibleBulkSelection() {
    setBulkMessage(null);
    setBulkSelectedIds(
      allVisibleBulkSelected
        ? new Set()
        : new Set(filteredTransactions.map((transaction) => transaction.id)),
    );
  }

  function clearBulkSelection() {
    setBulkSelectedIds(new Set());
    setBulkCategoryId("");
  }

  async function handleBulkSave() {
    if (!selectedBulkCategoryId) {
      return;
    }

    setBulkPending(true);
    setBulkMessage(null);
    const result = await bulkUpdateTransactionCategory(
      bulkSelectedTransactions.map((transaction) => transaction.id),
      Number(selectedBulkCategoryId),
    );

    if (result.error) {
      setBulkMessage({ type: "error", text: result.error });
    } else {
      clearBulkSelection();
      setBulkMessage({ type: "success", text: result.success ?? "Kategori diperbarui" });
    }

    setBulkPending(false);
  }

  function toggleTransactionSelection(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  if (transactions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-zinc-500">
        Belum ada transaksi. Mulai dengan menambahkan pemasukan atau pengeluaran.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="type-filter">Filter Jenis</Label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="all">Semua jenis</option>
              <option value="EXPENSE">Pengeluaran</option>
              <option value="INCOME">Pemasukan</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-filter">Filter Kategori</Label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="all">Semua kategori</option>
              {usedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="date-from">Dari Tanggal</Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              min={periodStart}
              max={dateTo}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="date-to">Sampai Tanggal</Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              min={dateFrom}
              max={periodEnd}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant={simulationMode ? "secondary" : "outline"}
            onClick={toggleSimulationMode}
          >
            {simulationMode ? "Selesai Simulasi" : "Simulasi Saving"}
          </Button>
          {simulationMode ? (
            <p className="text-sm font-semibold text-green-600">
              Potensi saving: {formatCurrency(savingTotal)}
              {selectedIds.size > 0 ? ` (${selectedIds.size} transaksi)` : ""}
            </p>
          ) : null}
          {showBulkToolbar ? (
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <span className="text-sm text-zinc-500">
                {bulkSelectedTransactions.length} dipilih
              </span>
              {bulkHasMixedTypes ? (
                <span className="text-sm text-amber-600">
                  Pilih transaksi dengan jenis yang sama
                </span>
              ) : null}
              <select
                aria-label="Kategori baru"
                value={selectedBulkCategoryId}
                disabled={bulkHasMixedTypes || bulkPending}
                onChange={(event) => setBulkCategoryId(event.target.value)}
                className="flex h-8 min-w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                <option value="">Pilih kategori</option>
                {bulkCategoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                disabled={!selectedBulkCategoryId || bulkPending}
                onClick={handleBulkSave}
              >
                {bulkPending ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={bulkPending}
                onClick={clearBulkSelection}
              >
                Batal
              </Button>
            </div>
          ) : null}
          {bulkMessage && !simulationMode ? (
            <p
              className={cn(
                "text-sm",
                !showBulkToolbar && "ml-auto",
                bulkMessage.type === "error" ? "text-red-600" : "text-green-600",
              )}
            >
              {bulkMessage.text}
            </p>
          ) : null}
        </div>

        {filteredTransactions.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-zinc-500">
            Tidak ada transaksi untuk filter ini.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {simulationMode ? (
                  <TableHead className="w-10">
                    <span className="sr-only">Pilih</span>
                  </TableHead>
                ) : null}
                <TableHead>Tanggal</TableHead>
                {!simulationMode ? (
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleBulkSelected}
                      ref={(element) => {
                        if (element) {
                          element.indeterminate = someVisibleBulkSelected;
                        }
                      }}
                      onChange={toggleAllVisibleBulkSelection}
                      aria-label="Pilih semua transaksi untuk ubah kategori"
                      className="size-4 rounded border-input align-middle"
                    />
                  </TableHead>
                ) : null}
                <TableHead>Kategori</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow
                  key={transaction.id}
                  data-state={
                    !simulationMode && bulkSelectedIds.has(transaction.id)
                      ? "selected"
                      : undefined
                  }
                  className={cn(
                    simulationMode &&
                      selectedIds.has(transaction.id) &&
                      transaction.type === "EXPENSE" &&
                      "bg-green-50",
                  )}
                >
                  {simulationMode ? (
                    <TableCell>
                      {transaction.type === "EXPENSE" ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(transaction.id)}
                          onChange={() => toggleTransactionSelection(transaction.id)}
                          aria-label={`Simulasi saving ${transaction.notes ?? transaction.category.name}`}
                          className="size-4 rounded border-input accent-green-600"
                        />
                      ) : null}
                    </TableCell>
                  ) : null}
                  <TableCell>{formatDate(transaction.date)}</TableCell>
                  {!simulationMode ? (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={bulkSelectedIds.has(transaction.id)}
                        onChange={() => toggleBulkSelection(transaction.id)}
                        aria-label={`Pilih ${transaction.notes ?? transaction.category.name} untuk ubah kategori`}
                        className="size-4 rounded border-input align-middle"
                      />
                    </TableCell>
                  ) : null}
                  <TableCell>{transaction.category.name}</TableCell>
                  <TableCell
                    className={cn(
                      "font-medium",
                      transaction.type === "INCOME" ? "text-green-600" : "text-red-600",
                    )}
                  >
                    {transaction.type === "INCOME" ? "+" : "-"}
                    {formatCurrency(transaction.amount.toString())}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {transaction.notes || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTransaction(transaction)}
                      >
                        Edit
                      </Button>
                      <DeleteTransactionButton id={transaction.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <TransactionModal
        open={editingTransaction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTransaction(null);
          }
        }}
        categories={categories}
        transactions={transactions.map(toFormValues)}
        transaction={
          editingTransaction ? toFormValues(editingTransaction) : undefined
        }
      />
    </>
  );
}
