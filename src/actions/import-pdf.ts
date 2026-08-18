"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { buildImportTransactionHash, type ImportableTransaction } from "@/lib/import-transaction";
import type { MandiriStatementPreview } from "@/lib/mandiri-statement";
import { parseMandiriStatementPdf } from "@/lib/mandiri-statement";

export type ImportPdfState = {
  error?: string;
  success?: string;
  preview?: MandiriStatementPreview;
  skippedDuplicates?: number;
};

export async function previewMandiriStatement(
  _prevState: ImportPdfState,
  formData: FormData,
): Promise<ImportPdfState> {
  const file = formData.get("statement");
  const password = process.env.PDF_IMPORT_PASSWORD;

  if (!(file instanceof File) || file.size === 0) {
    return { error: "File PDF wajib dipilih." };
  }

  if (file.type !== "application/pdf") {
    return { error: "File harus berupa PDF." };
  }

  if (!password) {
    return { error: "PDF_IMPORT_PASSWORD belum dikonfigurasi di file .env." };
  }

  try {
    const preview = await parseMandiriStatementPdf(file, password);
    const transactionsWithHashes = preview.transactions.map((transaction) => ({
      ...transaction,
      importHash: buildImportTransactionHash({
        date: transaction.date,
        time: transaction.time,
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
      }),
    }));
    const existingTransactions = await prisma.transaction.findMany({
      where: {
        importHash: {
          in: transactionsWithHashes.map((item) => item.importHash),
        },
      },
      select: { importHash: true },
    });
    const existingHashes = new Set(
      existingTransactions
        .map((item) => item.importHash)
        .filter((value): value is string => Boolean(value)),
    );
    const filteredPreview = {
      ...preview,
      transactions: transactionsWithHashes
        .filter((item) => !existingHashes.has(item.importHash))
        .map(({ importHash: _hash, ...transaction }) => transaction),
    };
    const skippedDuplicates = preview.transactions.length - filteredPreview.transactions.length;

    if (filteredPreview.transactions.length === 0) {
      return {
        error: skippedDuplicates
          ? "Semua transaksi pada PDF ini sudah pernah diimport."
          : "PDF berhasil dibuka, tetapi transaksi belum bisa diparse. Pastikan format PDF sesuai e-Statement Mandiri.",
        preview: filteredPreview,
        skippedDuplicates,
      };
    }

    return { preview: filteredPreview, skippedDuplicates };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membaca PDF.";
    return {
      error: `Gagal memproses PDF: ${message}`,
    };
  }
}

export async function saveImportedTransactions(
  transactions: ImportableTransaction[],
): Promise<{ success?: string; error?: string; savedCount?: number; skippedCount?: number }> {
  if (transactions.length === 0) {
    return { error: "Tidak ada transaksi untuk disimpan." };
  }

  const defaultCategories = await prisma.category.findMany({
    where: {
      OR: [
        { name: "Lainnya", type: "EXPENSE" },
        { name: "Lainnya", type: "INCOME" },
      ],
    },
  });

  const expenseCategory = defaultCategories.find((item) => item.type === "EXPENSE");
  const incomeCategory = defaultCategories.find((item) => item.type === "INCOME");

  if (!expenseCategory || !incomeCategory) {
    return {
      error: 'Kategori default "Lainnya" untuk pemasukan/pengeluaran belum tersedia.',
    };
  }

  const prepared = transactions.map((transaction) => ({
    ...transaction,
    importHash: buildImportTransactionHash(transaction),
  }));

  const existingTransactions = await prisma.transaction.findMany({
    where: {
      importHash: {
        in: prepared.map((item) => item.importHash),
      },
    },
    select: { importHash: true },
  });
  const existingHashes = new Set(
    existingTransactions.map((item) => item.importHash).filter((value): value is string => Boolean(value)),
  );

  const uniqueTransactions = prepared.filter((item) => !existingHashes.has(item.importHash));
  const skippedCount = prepared.length - uniqueTransactions.length;

  if (uniqueTransactions.length === 0) {
    return {
      error: "Semua transaksi pada preview ini sudah ada di database.",
      skippedCount,
    };
  }

  await prisma.transaction.createMany({
    data: uniqueTransactions.map((transaction) => ({
      date: parseStatementDateToDate(transaction.date),
      time: transaction.time,
      amount: transaction.amount,
      notes: transaction.description,
      type: transaction.type,
      importHash: transaction.importHash,
      categoryId: transaction.type === "INCOME" ? incomeCategory.id : expenseCategory.id,
    })),
  });

  revalidatePath("/");
  revalidatePath("/import-pdf");

  return {
    success: `${uniqueTransactions.length} transaksi berhasil disimpan.`,
    savedCount: uniqueTransactions.length,
    skippedCount,
  };
}

function parseStatementDateToDate(value: string) {
  const monthMap: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };

  const match = value.match(/^(\d{2}) ([A-Za-z]{3}) (\d{4})$/);
  if (!match) {
    throw new Error(`Tanggal statement tidak valid: ${value}`);
  }

  const [, day, monthLabel, year] = match;
  const month = monthMap[monthLabel];

  if (month === undefined) {
    throw new Error(`Bulan statement tidak valid: ${monthLabel}`);
  }

  return new Date(Number(year), month, Number(day));
}
