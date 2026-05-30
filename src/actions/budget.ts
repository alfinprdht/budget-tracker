"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { DateRange } from "@/lib/period";
import { budgetItemSchema } from "@/lib/validations";
import type { ActionState } from "@/actions/categories";

const BUDGET_PATH = "/rancangan-anggaran";

function getDateFilter(range: DateRange) {
  return {
    date: {
      gte: range.start,
      lte: range.end,
    },
  };
}

export async function getBudgetItems(range: DateRange) {
  return prisma.budgetItem.findMany({
    where: getDateFilter(range),
    include: { category: true },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });
}

export async function getBudgetExpensesByCategory(
  range: DateRange,
): Promise<Record<string, number>> {
  const items = await prisma.budgetItem.findMany({
    where: {
      ...getDateFilter(range),
      category: { type: "EXPENSE" },
    },
    include: { category: true },
  });

  const totals: Record<string, number> = {};

  for (const item of items) {
    const name = item.category.name;
    totals[name] = (totals[name] ?? 0) + Number(item.amount);
  }

  return totals;
}

export async function createBudgetItem(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = budgetItemSchema.safeParse({
    date: formData.get("date"),
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    description: formData.get("description") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.categoryId },
  });

  if (!category) {
    return { error: "Kategori tidak ditemukan" };
  }

  try {
    await prisma.budgetItem.create({
      data: {
        date: new Date(parsed.data.date),
        categoryId: parsed.data.categoryId,
        amount: parsed.data.amount,
        description: parsed.data.description ?? null,
      },
    });
  } catch {
    return { error: "Anggaran gagal disimpan" };
  }

  revalidatePath(BUDGET_PATH);
  return { success: "Anggaran berhasil ditambahkan" };
}

export async function updateBudgetItem(
  id: number,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = budgetItemSchema.safeParse({
    date: formData.get("date"),
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    description: formData.get("description") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.categoryId },
  });

  if (!category) {
    return { error: "Kategori tidak ditemukan" };
  }

  try {
    await prisma.budgetItem.update({
      where: { id },
      data: {
        date: new Date(parsed.data.date),
        categoryId: parsed.data.categoryId,
        amount: parsed.data.amount,
        description: parsed.data.description ?? null,
      },
    });
  } catch {
    return { error: "Anggaran gagal diperbarui" };
  }

  revalidatePath(BUDGET_PATH);
  return { success: "Anggaran berhasil diperbarui" };
}

export async function deleteBudgetItem(id: number): Promise<ActionState> {
  try {
    await prisma.budgetItem.delete({ where: { id } });
    revalidatePath(BUDGET_PATH);
    return { success: "Anggaran berhasil dihapus" };
  } catch {
    return { error: "Anggaran gagal dihapus" };
  }
}
