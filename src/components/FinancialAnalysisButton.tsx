"use client";

import { useEffect, useState, useTransition } from "react";
import { runFinancialAnalysis } from "@/actions/analysis";
import type { PeriodAnalysisData } from "@/lib/analysis";
import { AnalysisMarkdown } from "@/components/AnalysisMarkdown";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AnalysisView = {
  id: number;
  periodKey: string;
  periodLabel: string;
  inputData: PeriodAnalysisData;
  llmResponse: string;
  createdAt: Date;
};

export function FinancialAnalysisButton({
  periodKey,
  periodLabel,
  initialAnalysis,
}: {
  periodKey: string;
  periodLabel: string;
  initialAnalysis?: AnalysisView | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisView | null>(
    initialAnalysis ?? null,
  );

  useEffect(() => {
    setAnalysis(initialAnalysis ?? null);
  }, [initialAnalysis, periodKey]);

  function handleAnalyze() {
    setOpen(true);
    setError(null);

    startTransition(async () => {
      const result = await runFinancialAnalysis(periodKey);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.analysis) {
        setAnalysis(result.analysis);
      }
    });
  }

  return (
    <>
      <Button type="button" variant="outline" disabled={pending} onClick={handleAnalyze}>
        {pending ? "Menganalisis..." : "Analisa"}
      </Button>

      {analysis && !pending ? (
        <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
          Lihat Analisis
        </Button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Analisis Keuangan</DialogTitle>
            <DialogDescription>{periodLabel}</DialogDescription>
          </DialogHeader>

          {pending ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              Sedang menganalisis data keuangan dengan AI...
            </p>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {analysis && !pending ? (
            <div className="space-y-6">
              <section className="grid gap-3 sm:grid-cols-2">
                <StatCard label="Pemasukan" value={formatCurrency(analysis.inputData.income)} tone="green" />
                <StatCard label="Pengeluaran" value={formatCurrency(analysis.inputData.expense)} tone="red" />
                <StatCard
                  label="Rata-rata Pengeluaran/Hari"
                  value={formatCurrency(analysis.inputData.averageDailyExpense)}
                />
                <StatCard
                  label="Saldo Periode"
                  value={formatCurrency(analysis.inputData.balance)}
                  tone={analysis.inputData.balance >= 0 ? "green" : "red"}
                />
              </section>

              <section className="space-y-2">
                <h3 className="font-medium text-zinc-900">Pengeluaran Terbanyak per Hari</h3>
                {analysis.inputData.topExpenseDays.length === 0 ? (
                  <p className="text-sm text-zinc-500">Tidak ada data</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {analysis.inputData.topExpenseDays.map((item) => (
                      <li key={item.label} className="flex justify-between gap-4">
                        <span>{formatDate(item.label)}</span>
                        <span className="font-medium text-red-600">
                          {formatCurrency(item.total)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="font-medium text-zinc-900">Pengeluaran Terbanyak per Kategori</h3>
                {analysis.inputData.topExpenseCategories.length === 0 ? (
                  <p className="text-sm text-zinc-500">Tidak ada data</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {analysis.inputData.topExpenseCategories.map((item) => (
                      <li key={item.label} className="flex justify-between gap-4">
                        <span>{item.label}</span>
                        <span className="font-medium text-red-600">
                          {formatCurrency(item.total)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-4">
                <h3 className="font-medium text-green-900">Analisis AI — Risiko & Solusi</h3>
                <AnalysisMarkdown content={analysis.llmResponse} />
                <p className="text-xs text-green-700">
                  Dianalisis:{" "}
                  {new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(analysis.createdAt))}
                </p>
              </section>

              <Button type="button" variant="outline" disabled={pending} onClick={handleAnalyze}>
                Analisa Ulang
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "red";
}) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p
        className={
          tone === "green"
            ? "text-lg font-semibold text-green-600"
            : tone === "red"
              ? "text-lg font-semibold text-red-600"
              : "text-lg font-semibold text-zinc-900"
        }
      >
        {value}
      </p>
    </div>
  );
}
