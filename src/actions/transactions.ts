"use server";

import { revalidatePath } from "next/cache";
import type { TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getChartColor,
  type CategoryExpensePoint,
  type DailyExpensePoint,
} from "@/lib/chart";
import { toInputDate } from "@/lib/format";
import {
  buildPeriodOptions,
  eachDayInRange,
  getDayLabel,
  getDateKey,
  getPeriodRangeForDate,
  type DateRange,
  type PeriodOption,
} from "@/lib/period";
import { transactionSchema } from "@/lib/validations";
import type { ActionState } from "@/actions/categories";

function getDateFilter(range: DateRange) {
  return {
    date: {
      gte: range.start,
      lte: range.end,
    },
  };
}

function getRangeFilter(range: DateRange, type?: TransactionType) {
  return {
    ...getDateFilter(range),
    ...(type ? { type } : {}),
  };
}

async function validateTransactionInput(formData: FormData) {
  const parsed = transactionSchema.safeParse({
    date: formData.get("date"),
    type: formData.get("type") ?? "EXPENSE",
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    notes: formData.get("notes") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" } as const;
  }

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.categoryId },
  });

  if (!category) {
    return { error: "Kategori tidak ditemukan" } as const;
  }

  if (category.type !== parsed.data.type) {
    return { error: "Kategori tidak sesuai dengan jenis transaksi" } as const;
  }

  return { data: parsed.data } as const;
}

export async function getPeriodOptions(): Promise<PeriodOption[]> {
  const bounds = await prisma.transaction.aggregate({
    _min: { date: true },
    _max: { date: true },
  });

  return buildPeriodOptions(bounds._min.date, bounds._max.date);
}

export async function getTransactions(range?: DateRange) {
  return prisma.transaction.findMany({
    where: range ? getDateFilter(range) : undefined,
    orderBy: [{ date: "desc" }, { id: "desc" }],
    include: { category: true },
  });
}

export async function getDailyExpenses(range: DateRange): Promise<DailyExpensePoint[]> {
  const transactions = await prisma.transaction.findMany({
    where: getRangeFilter(range, "EXPENSE"),
    select: {
      date: true,
      amount: true,
    },
  });

  const totalsByDateKey = new Map<string, number>();

  for (const transaction of transactions) {
    const key = toInputDate(new Date(transaction.date));
    totalsByDateKey.set(key, (totalsByDateKey.get(key) ?? 0) + Number(transaction.amount));
  }

  let cumulative = 0;

  return eachDayInRange(range).map((day) => {
    const key = getDateKey(day);
    const total = totalsByDateKey.get(key) ?? 0;
    cumulative += total;

    return {
      day: day.getDate(),
      label: getDayLabel(day),
      total,
      cumulative,
      dateKey: key,
    };
  });
}

export async function getCategoryExpenses(range: DateRange): Promise<CategoryExpensePoint[]> {
  const grouped = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: getRangeFilter(range, "EXPENSE"),
    _sum: {
      amount: true,
    },
    orderBy: {
      _sum: {
        amount: "desc",
      },
    },
  });

  if (grouped.length === 0) {
    return [];
  }

  const categories = await prisma.category.findMany({
    where: {
      id: {
        in: grouped.map((item) => item.categoryId),
      },
    },
  });

  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
  const grandTotal = grouped.reduce(
    (sum, item) => sum + Number(item._sum.amount ?? 0),
    0,
  );

  return grouped.map((item, index) => {
    const total = Number(item._sum.amount ?? 0);

    return {
      category: categoryMap.get(item.categoryId) ?? "Unknown",
      total,
      percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
      color: getChartColor(index),
    };
  });
}

export async function getPeriodSummary(range: DateRange, type?: TransactionType) {
  const result = await prisma.transaction.aggregate({
    where: getRangeFilter(range, type),
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
  });

  return {
    total: Number(result._sum.amount ?? 0),
    count: result._count.id,
  };
}

export async function getPeriodFinancialSummary(range: DateRange) {
  const [income, expense] = await Promise.all([
    getPeriodSummary(range, "INCOME"),
    getPeriodSummary(range, "EXPENSE"),
  ]);

  return {
    income,
    expense,
    balance: income.total - expense.total,
    count: income.count + expense.count,
  };
}

export async function getMonthlySummary(date: Date = new Date()) {
  return getPeriodFinancialSummary(getPeriodRangeForDate(date));
}

export async function createTransaction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const validated = await validateTransactionInput(formData);

  if ("error" in validated) {
    return { error: validated.error };
  }

  try {
    await prisma.transaction.create({
      data: {
        date: new Date(validated.data.date),
        type: validated.data.type,
        categoryId: validated.data.categoryId,
        amount: validated.data.amount,
        notes: validated.data.notes ?? null,
      },
    });
  } catch {
    return { error: "Transaksi gagal disimpan" };
  }

  revalidatePath("/");
  return { success: "Transaksi berhasil ditambahkan" };
}

export async function updateTransaction(
  id: number,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const validated = await validateTransactionInput(formData);

  if ("error" in validated) {
    return { error: validated.error };
  }

  try {
    await prisma.transaction.update({
      where: { id },
      data: {
        date: new Date(validated.data.date),
        type: validated.data.type,
        categoryId: validated.data.categoryId,
        amount: validated.data.amount,
        notes: validated.data.notes ?? null,
      },
    });
  } catch {
    return { error: "Transaksi gagal diperbarui" };
  }

  revalidatePath("/");
  return { success: "Transaksi berhasil diperbarui" };
}

export async function deleteTransaction(id: number): Promise<ActionState> {
  try {
    await prisma.transaction.delete({ where: { id } });
    revalidatePath("/");
    return { success: "Transaksi berhasil dihapus" };
  } catch {
    return { error: "Transaksi gagal dihapus" };
  }
}
