"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import type { PeriodOption } from "@/lib/period";

export function PeriodFilter({
  periods,
  currentKey,
  defaultPeriodKey,
}: {
  periods: PeriodOption[];
  currentKey: string;
  defaultPeriodKey: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value === defaultPeriodKey) {
      params.delete("period");
    } else {
      params.set("period", value);
    }

    const query = params.toString();
    router.push(query ? `/?${query}` : "/");
    router.refresh();
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:min-w-80 sm:max-w-lg">
      <Label htmlFor="period-filter">Pilih Periode</Label>
      <select
        id="period-filter"
        value={currentKey}
        onChange={(event) => handleChange(event.target.value)}
        className="flex h-10 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {periods.map((period) => (
          <option key={period.key} value={period.key}>
            {period.label}
          </option>
        ))}
      </select>
    </div>
  );
}
