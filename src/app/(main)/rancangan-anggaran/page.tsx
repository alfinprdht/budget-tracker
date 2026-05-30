import { Suspense } from "react";
import { getBudgetItems } from "@/actions/budget";
import { getCategories } from "@/actions/categories";
import { BudgetPeriodFilter } from "@/components/BudgetPeriodFilter";
import { BudgetPlanClient } from "@/components/BudgetPlanClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatPeriodLabel,
  getBudgetPeriodOptions,
  getPeriodKey,
  getPeriodRangeForDate,
  parsePeriodKey,
} from "@/lib/period";

export const dynamic = "force-dynamic";

type BudgetPlanPageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function BudgetPlanPage({ searchParams }: BudgetPlanPageProps) {
  const { period: periodParam } = await searchParams;
  const periodOptions = getBudgetPeriodOptions();
  const currentRange = getPeriodRangeForDate(new Date());
  const defaultPeriodKey = getPeriodKey(currentRange.start);
  const allowedKeys = new Set(periodOptions.map((option) => option.key));
  const selectedRange =
    periodParam && allowedKeys.has(periodParam)
      ? parsePeriodKey(periodParam)
      : currentRange;
  const selectedPeriodKey = getPeriodKey(selectedRange.start);
  const periodLabel = formatPeriodLabel(selectedRange.start, selectedRange.end);

  const [budgetItems, categories] = await Promise.all([
    getBudgetItems(selectedRange),
    getCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Rancangan Anggaran</h1>
        <p className="text-sm text-zinc-500">
          Rencanakan pemasukan dan pengeluaran per periode
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Periode</CardTitle>
          <CardDescription>
            Periode berjalan dan 1 periode ke depan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="h-10 animate-pulse rounded-lg bg-zinc-100" aria-hidden="true" />
            }
          >
            <BudgetPeriodFilter
              periods={periodOptions}
              currentKey={selectedPeriodKey}
              defaultPeriodKey={defaultPeriodKey}
            />
          </Suspense>
        </CardContent>
      </Card>

      <BudgetPlanClient
        periodKey={selectedPeriodKey}
        periodLabel={periodLabel}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          type: category.type,
        }))}
        budgetItems={budgetItems.map((item) => ({
          id: item.id,
          date: item.date.toISOString(),
          amount: Number(item.amount),
          description: item.description,
          categoryId: item.categoryId,
          categoryName: item.category.name,
          categoryType: item.category.type,
        }))}
      />
    </div>
  );
}
