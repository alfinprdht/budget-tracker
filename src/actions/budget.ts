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

export async function copyBudgetFromPeriod(
  sourceRange: DateRange,
  targetRange: DateRange,
): Promise<ActionState> {
  try {
    const sourceItems = await prisma.budgetItem.findMany({
      where: getDateFilter(sourceRange),
    });

    if (sourceItems.length === 0) {
      return { error: "Tidak ada anggaran pada periode sumber" };
    }

    const sourceDays = Math.round(
      (sourceRange.end.getTime() - sourceRange.start.getTime()) / 86_400_000,
    );
    const targetDays = Math.round(
      (targetRange.end.getTime() - targetRange.start.getTime()) / 86_400_000,
    );

    const data = sourceItems.map((item) => {
      const dayOffset = Math.round(
        (item.date.getTime() - sourceRange.start.getTime()) / 86_400_000,
      );
      const mappedOffset = sourceDays > 0
        ? Math.min(Math.round((dayOffset / sourceDays) * targetDays), targetDays)
        : 0;
      const newDate = new Date(targetRange.start);
      newDate.setDate(newDate.getDate() + mappedOffset);

      return {
        date: newDate,
        categoryId: item.categoryId,
        amount: item.amount,
        description: item.description,
      };
    });

    await prisma.budgetItem.createMany({ data });
    revalidatePath(BUDGET_PATH);
    return { success: `${data.length} item anggaran berhasil disalin` };
  } catch {
    return { error: "Gagal menyalin anggaran dari periode sebelumnya" };
  }
}

export async function moveBudgetItem(
  id: number,
  newDate: string,
): Promise<ActionState> {
  try {
    await prisma.budgetItem.update({
      where: { id },
      data: { date: new Date(newDate) },
    });
    revalidatePath(BUDGET_PATH);
    return { success: "Anggaran berhasil dipindahkan" };
  } catch {
    return { error: "Gagal memindahkan anggaran" };
  }
}

export async function copyBudgetItem(
  id: number,
  newDate: string,
): Promise<ActionState> {
  try {
    const source = await prisma.budgetItem.findUnique({ where: { id } });

    if (!source) {
      return { error: "Item anggaran tidak ditemukan" };
    }

    await prisma.budgetItem.create({
      data: {
        date: new Date(newDate),
        categoryId: source.categoryId,
        amount: source.amount,
        description: source.description,
      },
    });

    revalidatePath(BUDGET_PATH);
    return { success: "Anggaran berhasil disalin" };
  } catch {
    return { error: "Gagal menyalin anggaran" };
  }
}
