"use client";

import { useMemo, useState } from "react";
import type { TransactionType } from "@prisma/client";
import { deleteTransaction } from "@/actions/transactions";
import { TransactionModal } from "@/components/TransactionModal";
import type { CategoryOption, TransactionFormValues } from "@/components/TransactionForm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { getTransactionTypeLabel } from "@/lib/transaction-type";
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
}: {
  transactions: TransactionItem[];
  categories: CategoryOption[];
}) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [simulationMode, setSimulationMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingTransaction, setEditingTransaction] = useState<TransactionItem | null>(
    null,
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesCategory =
        categoryFilter === "all" || transaction.categoryId === Number(categoryFilter);
      const matchesType = typeFilter === "all" || transaction.type === typeFilter;

      return matchesCategory && matchesType;
    });
  }, [transactions, categoryFilter, typeFilter]);

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

  function toggleSimulationMode() {
    setSimulationMode((current) => {
      if (current) {
        setSelectedIds(new Set());
      }

      return !current;
    });
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
        <div className="grid gap-4 sm:grid-cols-2">
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
                <TableHead>Jenis</TableHead>
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
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        transaction.type === "INCOME"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700",
                      )}
                    >
                      {getTransactionTypeLabel(transaction.type)}
                    </span>
                  </TableCell>
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
        transaction={
          editingTransaction ? toFormValues(editingTransaction) : undefined
        }
      />
    </>
  );
}
