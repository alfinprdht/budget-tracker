import { toInputDate } from "@/lib/format";

export const PERIOD_START_DAY = 5;

export type DateRange = {
  start: Date;
  end: Date;
};

export type PeriodOption = {
  key: string;
  label: string;
};

export function getPeriodRangeForDate(date: Date = new Date()): DateRange {
  const year = date.getFullYear();
  const month = date.getMonth();

  if (date.getDate() >= PERIOD_START_DAY) {
    return {
      start: new Date(year, month, PERIOD_START_DAY),
      end: new Date(year, month + 1, PERIOD_START_DAY - 1, 23, 59, 59, 999),
    };
  }

  return {
    start: new Date(year, month - 1, PERIOD_START_DAY),
    end: new Date(year, month, PERIOD_START_DAY - 1, 23, 59, 59, 999),
  };
}

export function getPeriodKey(start: Date): string {
  const year = start.getFullYear();
  const month = String(start.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function parsePeriodKey(key: string): DateRange {
  const [yearStr, monthStr] = key.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;

  if (Number.isNaN(year) || Number.isNaN(month)) {
    return getPeriodRangeForDate(new Date());
  }

  return {
    start: new Date(year, month, PERIOD_START_DAY),
    end: new Date(year, month + 1, PERIOD_START_DAY - 1, 23, 59, 59, 999),
  };
}

export function formatPeriodLabel(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function getNextPeriodRange(range: DateRange): DateRange {
  const reference = new Date(range.end);
  reference.setDate(reference.getDate() + 1);
  return getPeriodRangeForDate(reference);
}

export function eachDayInRange(range: DateRange): Date[] {
  const days: Date[] = [];
  const current = new Date(range.start);

  while (current <= range.end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

export function listPeriodOptions(from: Date, to: Date): PeriodOption[] {
  const options: PeriodOption[] = [];
  const seen = new Set<string>();

  let cursor = getPeriodRangeForDate(from);
  const endRange = getPeriodRangeForDate(to);

  while (cursor.start <= endRange.start) {
    const key = getPeriodKey(cursor.start);

    if (!seen.has(key)) {
      seen.add(key);
      options.push({
        key,
        label: formatPeriodLabel(cursor.start, cursor.end),
      });
    }

    const nextReference = new Date(cursor.end);
    nextReference.setDate(nextReference.getDate() + 1);
    cursor = getPeriodRangeForDate(nextReference);
  }

  return options;
}

export function buildPeriodOptions(
  earliestDate?: Date | null,
  latestDate?: Date | null,
  extraPastPeriods = 11,
): PeriodOption[] {
  const currentRange = getPeriodRangeForDate(new Date());
  const from = earliestDate ?? currentRange.start;
  const to = latestDate ?? currentRange.end;

  const optionMap = new Map<string, PeriodOption>();

  for (const option of listPeriodOptions(from, to)) {
    optionMap.set(option.key, option);
  }

  const currentKey = getPeriodKey(currentRange.start);
  if (!optionMap.has(currentKey)) {
    optionMap.set(currentKey, {
      key: currentKey,
      label: formatPeriodLabel(currentRange.start, currentRange.end),
    });
  }

  let reference = new Date(currentRange.start);
  reference.setDate(reference.getDate() - 1);

  for (let index = 0; index < extraPastPeriods; index += 1) {
    const range = getPeriodRangeForDate(reference);
    const key = getPeriodKey(range.start);

    if (!optionMap.has(key)) {
      optionMap.set(key, {
        key,
        label: formatPeriodLabel(range.start, range.end),
      });
    }

    reference = new Date(range.start);
    reference.setDate(reference.getDate() - 1);
  }

  return Array.from(optionMap.values()).sort((a, b) => b.key.localeCompare(a.key));
}

export function getBudgetPeriodOptions(): PeriodOption[] {
  const currentRange = getPeriodRangeForDate(new Date());
  const nextRange = getNextPeriodRange(currentRange);

  return [currentRange, nextRange].map((range) => ({
    key: getPeriodKey(range.start),
    label: formatPeriodLabel(range.start, range.end),
  }));
}

export function getDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function getDateKey(date: Date): string {
  return toInputDate(date);
}
