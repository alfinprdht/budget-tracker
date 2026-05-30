import { getLatestAnalysis } from "@/actions/analysis";
import { getCategories } from "@/actions/categories";
import {
  getCategoryExpenses,
  getDailyExpenses,
  getPeriodFinancialSummary,
  getPeriodOptions,
  getTransactions,
} from "@/actions/transactions";
import { AddTransactionButton } from "@/components/AddTransactionButton";
import { DashboardCharts } from "@/components/DashboardCharts";
import { DashboardPeriodSelector } from "@/components/DashboardPeriodSelector";
import { FinancialAnalysisButton } from "@/components/FinancialAnalysisButton";
import { TransactionList } from "@/components/TransactionList";
import type { PeriodAnalysisData } from "@/lib/analysis";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  formatPeriodLabel,
  getPeriodKey,
  getPeriodRangeForDate,
  parsePeriodKey,
} from "@/lib/period";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { period: periodParam } = await searchParams;
  const currentRange = getPeriodRangeForDate(new Date());
  const defaultPeriodKey = getPeriodKey(currentRange.start);
  const selectedRange = periodParam ? parsePeriodKey(periodParam) : currentRange;
  const selectedPeriodKey = getPeriodKey(selectedRange.start);
  const periodLabel = formatPeriodLabel(selectedRange.start, selectedRange.end);

  const [
    transactions,
    summary,
    dailyExpenses,
    categoryExpenses,
    categories,
    periodOptions,
    latestAnalysis,
  ] = await Promise.all([
    getTransactions(selectedRange),
    getPeriodFinancialSummary(selectedRange),
    getDailyExpenses(selectedRange),
    getCategoryExpenses(selectedRange),
    getCategories(),
    getPeriodOptions(),
    getLatestAnalysis(selectedPeriodKey),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
          <p className="text-sm text-zinc-500">
            Ringkasan pemasukan & pengeluaran {periodLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FinancialAnalysisButton
            periodKey={selectedPeriodKey}
            periodLabel={periodLabel}
            initialAnalysis={
              latestAnalysis
                ? {
                    id: latestAnalysis.id,
                    periodKey: latestAnalysis.periodKey,
                    periodLabel: latestAnalysis.periodLabel,
                    inputData: latestAnalysis.inputData as PeriodAnalysisData,
                    llmResponse: latestAnalysis.llmResponse,
                    createdAt: latestAnalysis.createdAt,
                  }
                : null
            }
          />
          <AddTransactionButton
            categories={categories.map((category) => ({
              id: category.id,
              name: category.name,
              type: category.type,
            }))}
          />
        </div>
      </div>

      <DashboardPeriodSelector
        periods={periodOptions}
        currentKey={selectedPeriodKey}
        defaultPeriodKey={defaultPeriodKey}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Pemasukan</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {formatCurrency(summary.income.total)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Pengeluaran</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {formatCurrency(summary.expense.total)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Saldo Periode</CardDescription>
            <CardTitle
              className={cn(
                "text-3xl",
                summary.balance >= 0 ? "text-green-600" : "text-red-600",
              )}
            >
              {formatCurrency(summary.balance)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Jumlah Transaksi</CardDescription>
            <CardTitle className="text-3xl">{summary.count}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <DashboardCharts
        dailyExpenses={dailyExpenses}
        categoryExpenses={categoryExpenses}
        periodLabel={periodLabel}
      />

      <Card>
        <CardHeader>
          <CardTitle>Daftar Transaksi</CardTitle>
          <CardDescription>
            Pemasukan dan pengeluaran pada periode {periodLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionList
            transactions={transactions}
            categories={categories.map((category) => ({
              id: category.id,
              name: category.name,
              type: category.type,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
