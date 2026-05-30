"use client";

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

type TransactionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOption[];
  transaction?: TransactionFormValues;
};

export function TransactionModal({
  open,
  onOpenChange,
  categories,
  transaction,
}: TransactionModalProps) {
  const isEdit = Boolean(transaction);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Transaksi" : "Tambah Transaksi"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Perbarui detail pemasukan atau pengeluaran."
              : "Catat pemasukan atau pengeluaran baru."}
          </DialogDescription>
        </DialogHeader>
        <TransactionForm
          key={transaction?.id ?? "new"}
          categories={categories}
          transaction={transaction}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
