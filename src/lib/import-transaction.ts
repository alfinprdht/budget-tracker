import { createHash } from "node:crypto";

export type ImportableTransaction = {
  date: string;
  time: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
};

export function buildImportTransactionHash(transaction: ImportableTransaction) {
  return createHash("sha256")
    .update(
      [
        transaction.date,
        transaction.time,
        transaction.type,
        transaction.amount.toFixed(2),
        transaction.description.trim().toLowerCase(),
      ].join("|"),
    )
    .digest("hex");
}
