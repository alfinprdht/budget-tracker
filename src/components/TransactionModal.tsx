"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TransactionForm,
  type CategoryOption,
  type TransactionFormValues,
} from "@/components/TransactionForm";
import { formatCurrency, formatDate, toInputDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type TransactionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOption[];
  transaction?: TransactionFormValues;
  transactions?: TransactionFormValues[];
};

export function TransactionModal({
  open,
  onOpenChange,
  categories,
  transaction,
  transactions = [],
}: TransactionModalProps) {
  const [activeTransaction, setActiveTransaction] = useState<TransactionFormValues | undefined>(
    transaction,
  );
  const [activeDate, setActiveDate] = useState(
    transaction ? toInputDate(new Date(transaction.date)) : toInputDate(),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveTransaction(transaction);
    setActiveDate(transaction ? toInputDate(new Date(transaction.date)) : toInputDate());
  }, [open, transaction]);

  const isEdit = Boolean(activeTransaction);
  const dayTransactions = useMemo(() => {
    return transactions
      .filter((item) => toInputDate(new Date(item.date)) === activeDate)
      .sort((a, b) => Number(b.amount) - Number(a.amount));
  }, [transactions, activeDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Transaksi" : "Tambah Transaksi"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Perbarui detail pemasukan atau pengeluaran."
              : "Catat pemasukan atau pengeluaran baru."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <TransactionForm
            key={activeTransaction?.id ?? "new"}
            categories={categories}
            transaction={activeTransaction}
            initialDate={activeDate}
            onDateChange={setActiveDate}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />

          <div className="space-y-3 rounded-xl border bg-zinc-50 p-4">
            <div>
              <h3 className="font-medium text-zinc-900">Transaksi di hari ini</h3>
              <p className="text-sm text-zinc-500">{formatDate(activeDate)}</p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTransaction(undefined)}
              className={cn(
                "w-full rounded-lg border border-dashed bg-white px-3 py-2 text-left text-sm font-medium text-zinc-700 transition hover:border-blue-300 hover:bg-blue-50",
                !activeTransaction && "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200",
              )}
            >
              + Tambah transaksi baru di tanggal ini
            </button>

            {dayTransactions.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Belum ada transaksi pada tanggal ini.
              </p>
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {dayTransactions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTransaction(item);
                      setActiveDate(toInputDate(new Date(item.date)));
                    }}
                    className={cn(
                      "w-full rounded-lg border bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50",
                      activeTransaction?.id === item.id && "border-blue-500 bg-blue-50 ring-2 ring-blue-200",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {item.notes || "Tanpa catatan"}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {categories.find((category) => category.id === item.categoryId)?.name ?? "-"}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "shrink-0 text-sm font-semibold",
                          item.type === "INCOME" ? "text-green-600" : "text-red-600",
                        )}
                      >
                        {item.type === "INCOME" ? "+" : "-"}
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
