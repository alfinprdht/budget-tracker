import type { TransactionType } from "@prisma/client";

export const TRANSACTION_TYPES = {
  EXPENSE: "EXPENSE",
  INCOME: "INCOME",
} as const satisfies Record<string, TransactionType>;

export function getTransactionTypeLabel(type: TransactionType) {
  return type === "INCOME" ? "Pemasukan" : "Pengeluaran";
}

export function getTransactionTypeOptions() {
  return [
    { value: TRANSACTION_TYPES.EXPENSE, label: "Pengeluaran" },
    { value: TRANSACTION_TYPES.INCOME, label: "Pemasukan" },
  ];
}
