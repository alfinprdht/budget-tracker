"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteCategory, updateCategory } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

import type { TransactionType } from "@prisma/client";
import { getTransactionTypeLabel } from "@/lib/transaction-type";

type CategoryItem = {
  id: number;
  name: string;
  type: TransactionType;
  _count: {
    transactions: number;
  };
};

const initialState = { error: undefined, success: undefined };

function EditCategoryDialog({ category }: { category: CategoryItem }) {
  const [open, setOpen] = useState(false);
  const updateWithId = updateCategory.bind(null, category.id);
  const [state, formAction, pending] = useActionState(updateWithId, initialState);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm">Edit</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Kategori</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor={`type-${category.id}`}>Jenis</Label>
            <select
              id={`type-${category.id}`}
              name="type"
              defaultValue={category.type}
              className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="EXPENSE">Pengeluaran</option>
              <option value="INCOME">Pemasukan</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`name-${category.id}`}>Nama Kategori</Label>
            <Input
              id={`name-${category.id}`}
              name="name"
              defaultValue={category.name}
              required
              maxLength={100}
            />
          </div>
          {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCategoryButton({ category }: { category: CategoryItem }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setMessage(null);
    const result = await deleteCategory(category.id);
    setMessage(result.error ?? result.success ?? null);
    setPending(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending || category._count.transactions > 0}
        onClick={handleDelete}
      >
        {pending ? "..." : "Hapus"}
      </Button>
      {category._count.transactions > 0 ? (
        <span className="text-xs text-zinc-500">
          Dipakai {category._count.transactions} transaksi
        </span>
      ) : null}
      {message ? <span className="text-xs text-red-600">{message}</span> : null}
    </div>
  );
}

export function CategoryList({ categories }: { categories: CategoryItem[] }) {
  if (categories.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-zinc-500">
        Belum ada kategori. Tambahkan kategori pertama Anda.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nama</TableHead>
          <TableHead>Jenis</TableHead>
          <TableHead>Jumlah Transaksi</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <TableRow key={category.id}>
            <TableCell className="font-medium">{category.name}</TableCell>
            <TableCell>{getTransactionTypeLabel(category.type)}</TableCell>
            <TableCell>{category._count.transactions}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <EditCategoryDialog category={category} />
                <DeleteCategoryButton category={category} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
