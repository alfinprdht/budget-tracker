"use client";

import { useActionState } from "react";
import { createCategory } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTransactionTypeOptions } from "@/lib/transaction-type";

const initialState = { error: undefined, success: undefined };

export function CategoryForm() {
  const [state, formAction, pending] = useActionState(createCategory, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="grid flex-1 gap-2">
        <Label htmlFor="type">Jenis</Label>
        <select
          id="type"
          name="type"
          defaultValue="EXPENSE"
          className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {getTransactionTypeOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid flex-1 gap-2">
        <Label htmlFor="name">Nama Kategori</Label>
        <Input
          id="name"
          name="name"
          placeholder="Contoh: Gaji"
          required
          maxLength={100}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan..." : "Tambah Kategori"}
      </Button>
      {state.error ? (
        <p className="w-full text-sm text-red-600 sm:col-span-2">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="w-full text-sm text-green-600 sm:col-span-2">{state.success}</p>
      ) : null}
    </form>
  );
}
