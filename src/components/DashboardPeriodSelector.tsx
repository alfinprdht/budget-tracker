import { Suspense } from "react";
import { PeriodFilter } from "@/components/PeriodFilter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PeriodOption } from "@/lib/period";

export function DashboardPeriodSelector({
  periods,
  currentKey,
  defaultPeriodKey,
}: {
  periods: PeriodOption[];
  currentKey: string;
  defaultPeriodKey: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Periode</CardTitle>
        <CardDescription>
          Tanggal 5 bulan ini sampai tanggal 4 bulan berikutnya
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense
          fallback={
            <div className="h-10 animate-pulse rounded-lg bg-zinc-100" aria-hidden="true" />
          }
        >
          <PeriodFilter
            periods={periods}
            currentKey={currentKey}
            defaultPeriodKey={defaultPeriodKey}
          />
        </Suspense>
      </CardContent>
    </Card>
  );
}
