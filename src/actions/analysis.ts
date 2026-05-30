"use server";

import { prisma } from "@/lib/prisma";
import {
  buildGeminiPrompt,
  buildPeriodAnalysisData,
  type PeriodAnalysisData,
} from "@/lib/analysis";
import { callGemini } from "@/lib/gemini";
import { formatPeriodLabel, parsePeriodKey } from "@/lib/period";

export type AnalysisActionState = {
  error?: string;
  success?: string;
  analysis?: {
    id: number;
    periodKey: string;
    periodLabel: string;
    inputData: PeriodAnalysisData;
    llmResponse: string;
    createdAt: Date;
  };
};

export async function getLatestAnalysis(periodKey: string) {
  return prisma.financialAnalysis.findFirst({
    where: { periodKey },
    orderBy: { createdAt: "desc" },
  });
}

export async function runFinancialAnalysis(
  periodKey: string,
): Promise<AnalysisActionState> {
  try {
    const range = parsePeriodKey(periodKey);
    const periodLabel = formatPeriodLabel(range.start, range.end);

    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: range.start,
          lte: range.end,
        },
      },
      include: { category: true },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    });

    const inputData = buildPeriodAnalysisData(periodKey, range, transactions);

    if (inputData.expense === 0 && inputData.income === 0) {
      return {
        error: "Tidak ada data transaksi pada periode ini untuk dianalisis.",
      };
    }

    const prompt = buildGeminiPrompt(inputData);
    const llmResponse = await callGemini(prompt);

    const saved = await prisma.financialAnalysis.create({
      data: {
        periodKey,
        periodLabel,
        inputData,
        llmResponse,
      },
    });

    return {
      success: "Analisis keuangan berhasil dibuat",
      analysis: {
        id: saved.id,
        periodKey: saved.periodKey,
        periodLabel: saved.periodLabel,
        inputData: saved.inputData as PeriodAnalysisData,
        llmResponse: saved.llmResponse,
        createdAt: saved.createdAt,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Analisis keuangan gagal dijalankan";

    return { error: message };
  }
}
