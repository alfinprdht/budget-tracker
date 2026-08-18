"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import {
  previewMandiriStatement,
  saveImportedTransactions,
  type ImportPdfState,
} from "@/actions/import-pdf";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, toInputDate } from "@/lib/format";

const initialState: ImportPdfState = {};

export function ImportStatementForm() {
  const [state, formAction, pending] = useActionState(previewMandiriStatement, initialState);
  const [savePending, startSaveTransition] = useTransition();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [excludeWords, setExcludeWords] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<string[]>([]);

  const transactionsWithDate = useMemo(() => {
    return (state.preview?.transactions ?? []).map((item) => ({
      ...item,
      parsedDate: parseStatementDate(item.date),
    }));
  }, [state.preview]);

  const availableDates = useMemo(() => {
    const dates = transactionsWithDate
      .map((item) => item.parsedDate)
      .filter((value): value is string => Boolean(value))
      .sort();

    return {
      min: dates[0] ?? "",
      max: dates[dates.length - 1] ?? "",
    };
  }, [transactionsWithDate]);

  useEffect(() => {
    setDateFrom(availableDates.min);
    setDateTo(availableDates.max);
    setExcludeWords("");
    setSaveMessage(null);
    setSaveError(null);
    setSavedKeys([]);
  }, [availableDates.max, availableDates.min, state.preview]);

  const excludedTerms = useMemo(() => {
    return excludeWords
      .split(";")
      .map((term) => term.trim().toLowerCase())
      .filter(Boolean);
  }, [excludeWords]);

  const filteredTransactions = useMemo(() => {
    return transactionsWithDate.filter((item) => {
      const itemKey = buildPreviewKey(item);
      if (savedKeys.includes(itemKey)) {
        return false;
      }

      const inDateRange =
        (!dateFrom || (item.parsedDate && item.parsedDate >= dateFrom)) &&
        (!dateTo || (item.parsedDate && item.parsedDate <= dateTo));

      if (!inDateRange) {
        return false;
      }

      if (excludedTerms.length === 0) {
        return true;
      }

      const haystack = `${item.description} ${item.date} ${item.time}`.toLowerCase();
      return !excludedTerms.some((term) => haystack.includes(term));
    });
  }, [transactionsWithDate, dateFrom, dateTo, excludedTerms, savedKeys]);

  function handleSaveToDatabase() {
    startSaveTransition(async () => {
      setSaveMessage(null);
      setSaveError(null);

      const result = await saveImportedTransactions(
        filteredTransactions.map((item) => ({
          date: item.date,
          time: item.time,
          description: item.description,
          amount: item.amount,
          type: item.type,
        })),
      );

      if (result.error) {
        setSaveError(result.error);
        return;
      }

      setSavedKeys((current) => [
        ...current,
        ...filteredTransactions.map((item) => buildPreviewKey(item)),
      ]);
      setSaveMessage(
        result.skippedCount && result.skippedCount > 0
          ? `${result.success} ${result.skippedCount} transaksi dilewati karena duplikat.`
          : result.success ?? "Transaksi berhasil disimpan.",
      );
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload PDF</CardTitle>
          <CardDescription>
            Upload e-Statement Mandiri yang dilindungi password. Sistem akan menampilkan
            preview transaksi tanpa menyimpan ke database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="statement">File PDF</Label>
              <Input id="statement" name="statement" type="file" accept="application/pdf" required />
            </div>
            {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Memproses..." : "Preview PDF"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {state.preview ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Nama" value={state.preview.accountName ?? "-"} />
            <SummaryCard label="Rekening" value={state.preview.accountNumber ?? "-"} />
            <SummaryCard label="Periode" value={state.preview.period ?? "-"} />
            <SummaryCard
              label="Jumlah Transaksi"
              value={`${filteredTransactions.length} / ${state.preview.transactions.length}`}
            />
            <SummaryCard
              label="Duplikat Dilewati"
              value={String((state.skippedDuplicates ?? 0) + savedKeys.length)}
            />
            <SummaryCard
              label="Saldo Awal"
              value={formatMaybeCurrency(state.preview.openingBalance)}
            />
            <SummaryCard
              label="Dana Masuk"
              value={formatMaybeCurrency(state.preview.incomingTotal)}
            />
            <SummaryCard
              label="Dana Keluar"
              value={formatMaybeCurrency(state.preview.outgoingTotal)}
            />
            <SummaryCard
              label="Saldo Akhir"
              value={formatMaybeCurrency(state.preview.closingBalance)}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Preview Hasil Parse</CardTitle>
              <CardDescription>
                Tinjau transaksi yang berhasil dibaca dari PDF sebelum langkah import berikutnya.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="filter-date-from">Dari tanggal</Label>
                  <Input
                    id="filter-date-from"
                    type="date"
                    value={dateFrom}
                    min={availableDates.min}
                    max={dateTo || availableDates.max}
                    onChange={(event) => setDateFrom(event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="filter-date-to">Sampai tanggal</Label>
                  <Input
                    id="filter-date-to"
                    type="date"
                    value={dateTo}
                    min={dateFrom || availableDates.min}
                    max={availableDates.max}
                    onChange={(event) => setDateTo(event.target.value)}
                  />
                </div>
                <div className="grid gap-2 sm:col-span-3">
                  <Label htmlFor="filter-exclude">
                    Exclude word
                  </Label>
                  <Input
                    id="filter-exclude"
                    value={excludeWords}
                    onChange={(event) => setExcludeWords(event.target.value)}
                    placeholder="Contoh: Shopee; QRIS; biaya transaksi"
                  />
                  <p className="text-xs text-zinc-500">
                    Pisahkan beberapa kata dengan titik koma `;`. Preview berubah real-time.
                  </p>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  disabled={savePending || filteredTransactions.length === 0}
                  onClick={handleSaveToDatabase}
                >
                  {savePending ? "Menyimpan..." : "Simpan ke DB"}
                </Button>
                {saveMessage ? <p className="text-sm text-green-600">{saveMessage}</p> : null}
                {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Nominal</TableHead>
                    <TableHead>Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((item) => (
                    <TableRow key={`${item.rowNumber}-${item.date}-${item.time}`}>
                      <TableCell>{item.rowNumber}</TableCell>
                      <TableCell className="whitespace-nowrap">{item.date}</TableCell>
                      <TableCell className="whitespace-nowrap">{item.time}</TableCell>
                      <TableCell className="max-w-md whitespace-normal">
                        {item.description || "-"}
                      </TableCell>
                      <TableCell>{item.type === "INCOME" ? "Pemasukan" : "Pengeluaran"}</TableCell>
                      <TableCell
                        className={
                          item.type === "INCOME"
                            ? "whitespace-nowrap font-medium text-green-600"
                            : "whitespace-nowrap font-medium text-red-600"
                        }
                      >
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatCurrency(item.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredTransactions.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">
                  Tidak ada transaksi yang cocok dengan filter.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardHeader className="pb-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-sm break-words">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function formatMaybeCurrency(value: number | null) {
  return value === null ? "-" : formatCurrency(value);
}

function buildPreviewKey(item: { rowNumber: number; date: string; time: string }) {
  return `${item.rowNumber}|${item.date}|${item.time}`;
}

function parseStatementDate(value: string) {
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
    return "";
  }

  const [, day, monthLabel, year] = match;
  const month = monthMap[monthLabel];
  if (month === undefined) {
    return "";
  }

  return toInputDate(new Date(Number(year), month, Number(day)));
}
