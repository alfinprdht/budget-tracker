"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TransactionType } from "@prisma/client";
import { createTransaction, updateTransaction } from "@/actions/transactions";
import { ButtonLink } from "@/components/ButtonLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toInputDate } from "@/lib/format";
import {
  getTransactionTypeLabel,
  getTransactionTypeOptions,
  TRANSACTION_TYPES,
} from "@/lib/transaction-type";

export type CategoryOption = {
  id: number;
  name: string;
  type: TransactionType;
};

export type TransactionFormValues = {
  id: number;
  date: Date;
  type: TransactionType;
  categoryId: number;
  amount: number;
  notes: string | null;
};

const initialState = { error: undefined, success: undefined };

type TransactionFormProps = {
  categories: CategoryOption[];
  transaction?: TransactionFormValues;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function TransactionForm({
  categories,
  transaction,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const router = useRouter();
  const isEdit = Boolean(transaction);
  const formAction = isEdit
    ? updateTransaction.bind(null, transaction!.id)
    : createTransaction;

  const [transactionType, setTransactionType] = useState<TransactionType>(
    transaction?.type ?? TRANSACTION_TYPES.EXPENSE,
  );
  const [state, submitAction, pending] = useActionState(formAction, initialState);

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === transactionType),
    [categories, transactionType],
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onSuccess?.();
    }
  }, [state.success, router, onSuccess]);

  if (categories.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-zinc-600">
          Belum ada kategori. Tambahkan kategori terlebih dahulu.
        </p>
        <ButtonLink href="/categories" className="mt-4">
          Ke Master Kategori
        </ButtonLink>
      </div>
    );
  }

  return (
    <form action={submitAction} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor={`type-${transaction?.id ?? "new"}`}>Jenis</Label>
        <select
          id={`type-${transaction?.id ?? "new"}`}
          name="type"
          value={transactionType}
          onChange={(event) =>
            setTransactionType(event.target.value as TransactionType)
          }
          className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {getTransactionTypeOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`date-${transaction?.id ?? "new"}`}>Tanggal</Label>
        <Input
          id={`date-${transaction?.id ?? "new"}`}
          name="date"
          type="date"
          defaultValue={
            transaction ? toInputDate(new Date(transaction.date)) : toInputDate()
          }
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`categoryId-${transaction?.id ?? "new"}`}>
          Kategori {getTransactionTypeLabel(transactionType)}
        </Label>
        {filteredCategories.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Belum ada kategori {getTransactionTypeLabel(transactionType).toLowerCase()}.{" "}
            <ButtonLink href="/categories" variant="link" className="h-auto p-0">
              Tambah di master kategori
            </ButtonLink>
          </p>
        ) : (
          <select
            id={`categoryId-${transaction?.id ?? "new"}`}
            name="categoryId"
            required
            defaultValue={transaction?.categoryId ?? ""}
            key={`${transactionType}-${transaction?.id ?? "new"}`}
            className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="" disabled>
              Pilih kategori
            </option>
            {filteredCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`amount-${transaction?.id ?? "new"}`}>Total (Rp)</Label>
        <Input
          id={`amount-${transaction?.id ?? "new"}`}
          name="amount"
          type="number"
          min="1"
          step="1"
          placeholder="50000"
          defaultValue={transaction?.amount}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`notes-${transaction?.id ?? "new"}`}>Catatan</Label>
        <Textarea
          id={`notes-${transaction?.id ?? "new"}`}
          name="notes"
          placeholder={
            transactionType === "INCOME"
              ? "Opsional, contoh: gaji bulan Mei"
              : "Opsional, contoh: makan siang"
          }
          rows={3}
          maxLength={1000}
          defaultValue={transaction?.notes ?? ""}
        />
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || filteredCategories.length === 0}>
          {pending
            ? "Menyimpan..."
            : isEdit
              ? "Simpan Perubahan"
              : `Simpan ${getTransactionTypeLabel(transactionType)}`}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Batal
          </Button>
        ) : null}
      </div>
    </form>
  );
}
