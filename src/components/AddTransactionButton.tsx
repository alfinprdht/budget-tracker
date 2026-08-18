"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TransactionModal } from "@/components/TransactionModal";
import type { CategoryOption, TransactionFormValues } from "@/components/TransactionForm";

export function AddTransactionButton({
  categories,
  transactions,
}: {
  categories: CategoryOption[];
  transactions: TransactionFormValues[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Tambah Transaksi
      </Button>
      <TransactionModal
        open={open}
        onOpenChange={setOpen}
        categories={categories}
        transactions={transactions}
      />
    </>
  );
}
