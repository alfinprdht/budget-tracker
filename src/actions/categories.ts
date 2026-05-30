"use server";

import { revalidatePath } from "next/cache";
import type { TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validations";

export type ActionState = {
  error?: string;
  success?: string;
};

export async function getCategories(type?: TransactionType) {
  return prisma.category.findMany({
    where: type ? { type } : undefined,
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });
}

export async function createCategory(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type") ?? "EXPENSE",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  try {
    await prisma.category.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
      },
    });
    revalidatePath("/categories");
    revalidatePath("/transactions/new");
    return { success: "Kategori berhasil ditambahkan" };
  } catch {
    return { error: "Kategori sudah ada atau gagal disimpan" };
  }
}

export async function updateCategory(
  id: number,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type") ?? "EXPENSE",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  try {
    await prisma.category.update({
      where: { id },
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
      },
    });
    revalidatePath("/categories");
    revalidatePath("/");
    revalidatePath("/transactions/new");
    return { success: "Kategori berhasil diperbarui" };
  } catch {
    return { error: "Kategori gagal diperbarui. Nama mungkin sudah digunakan." };
  }
}

export async function deleteCategory(id: number): Promise<ActionState> {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { transactions: true } } },
  });

  if (!category) {
    return { error: "Kategori tidak ditemukan" };
  }

  if (category._count.transactions > 0) {
    return {
      error: "Kategori masih digunakan oleh transaksi dan tidak bisa dihapus",
    };
  }

  try {
    await prisma.category.delete({ where: { id } });
    revalidatePath("/categories");
    revalidatePath("/transactions/new");
    return { success: "Kategori berhasil dihapus" };
  } catch {
    return { error: "Kategori gagal dihapus" };
  }
}
