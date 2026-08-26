import { readFile } from "node:fs/promises";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

const globalWithWorker = globalThis as typeof globalThis & {
  pdfjsWorker?: unknown;
};

// pdfjs expects DOMMatrix in Node environments.
if (typeof (globalThis as { DOMMatrix?: unknown }).DOMMatrix === "undefined") {
  Object.defineProperty(globalThis, "DOMMatrix", {
    value: class DOMMatrixPolyfill {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;

      constructor(init?: string | number[]) {
        if (Array.isArray(init) && init.length >= 6) {
          this.a = init[0] ?? 1;
          this.b = init[1] ?? 0;
          this.c = init[2] ?? 0;
          this.d = init[3] ?? 1;
          this.e = init[4] ?? 0;
          this.f = init[5] ?? 0;
        }
      }

      static fromMatrix() {
        return new DOMMatrixPolyfill();
      }

      static fromFloat32Array() {
        return new DOMMatrixPolyfill();
      }

      static fromFloat64Array() {
        return new DOMMatrixPolyfill();
      }
    },
    configurable: true,
    writable: true,
  });
}

globalWithWorker.pdfjsWorker = pdfjsWorker;

export type MandiriStatementTransaction = {
  rowNumber: number;
  date: string;
  time: string;
  description: string;
  amount: number;
  balance: number;
  type: "INCOME" | "EXPENSE";
};

export type MandiriStatementPreview = {
  accountNumber: string | null;
  accountName: string | null;
  period: string | null;
  openingBalance: number | null;
  closingBalance: number | null;
  incomingTotal: number | null;
  outgoingTotal: number | null;
  transactions: MandiriStatementTransaction[];
  rawTextPreview: string;
};

type PositionedText = {
  str: string;
  x: number;
  y: number;
};

function parseIndonesianAmount(value: string) {
  return Number(value.replaceAll(".", "").replace(",", "."));
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractMeta(text: string, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${escapedLabel}\\s*:?\\s*([^\\n]+)`, "i");
  return text.match(regex)?.[1]?.trim() ?? null;
}

function extractFirstMatch(text: string, pattern: RegExp) {
  return text.match(pattern)?.[1]?.trim() ?? null;
}

function groupTextIntoLines(items: PositionedText[]) {
  const lines = new Map<number, PositionedText[]>();

  for (const item of items) {
    const key = Math.round(item.y);
    const list = lines.get(key) ?? [];
    list.push(item);
    lines.set(key, list);
  }

  return [...lines.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, lineItems]) =>
      lineItems
        .sort((a, b) => a.x - b.x)
        .map((item) => item.str)
        .join(" "),
    );
}

function parseTransactionsFromItems(items: PositionedText[]) {
  const dateItems = items
    .filter((item) => item.x < 100 && /^\d{2} [A-Za-z]{3} \d{4}$/.test(item.str))
    .sort((a, b) => b.y - a.y);

  const transactions: MandiriStatementTransaction[] = [];

  for (let index = 0; index < dateItems.length; index += 1) {
    const dateItem = dateItems[index];
    const nextDateY = dateItems[index + 1]?.y ?? -9999;
    const rowItems = items.filter(
      (item) => item.y > nextDateY + 15 && item.y <= dateItem.y + 18,
    );

    const rowNumber = rowItems.find((item) => item.x < 40 && /^\d+$/.test(item.str));
    const balance = rowItems.find((item) => item.x > 500 && /^\d[\d.]*,\d{2}$/.test(item.str));
    const amount = rowItems.find(
      (item) => item.x > 340 && item.x < 460 && /^[+-]\d[\d.]*,\d{2}$/.test(item.str),
    );
    const time = rowItems.find(
      (item) => item.x < 110 && /^\d{2}:\d{2}:\d{2} WIB$/.test(item.str),
    );

    if (!rowNumber || !balance || !amount || !time) {
      continue;
    }

    const description = normalizeSpaces(
      rowItems
        .filter((item) => item.x >= 110 && item.x < 350)
        .sort((a, b) => b.y - a.y || a.x - b.x)
        .map((item) => item.str)
        .join(" "),
    );

    transactions.push({
      rowNumber: Number(rowNumber.str),
      date: dateItem.str,
      time: time.str,
      description,
      amount: Math.abs(parseIndonesianAmount(amount.str)),
      balance: parseIndonesianAmount(balance.str),
      type: amount.str.startsWith("+") ? "INCOME" : "EXPENSE",
    });
  }

  return transactions;
}

export async function parseMandiriStatementPdf(file: File, password: string) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({
    data: bytes,
    password,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pages: PositionedText[][] = [];
  const allLines: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items
      .map((item: { str?: unknown; transform?: number[] }) => {
        if (typeof item.str !== "string" || !Array.isArray(item.transform)) {
          return null;
        }

        return {
          str: item.str,
          x: item.transform[4] ?? 0,
          y: item.transform[5] ?? 0,
        } satisfies PositionedText;
      })
      .filter((item: PositionedText | null): item is PositionedText => {
        return item !== null && item.str.trim().length > 0;
      });

    pages.push(items);
    allLines.push(...groupTextIntoLines(items));
  }

  const rawText = allLines.join("\n");
  const previewTransactions = pages
    .flatMap((items) => parseTransactionsFromItems(items.filter((item) => item.y > 40)))
    .sort((a, b) => a.rowNumber - b.rowNumber);

  return {
    accountNumber:
      extractFirstMatch(rawText, /(\d{10,})\s*:\s*: IDR/i) ??
      extractFirstMatch(rawText, /(\d{10,})/),
    period:
      extractFirstMatch(rawText, /(\d{2} [A-Za-z]{3} \d{4} - \d{2} [A-Za-z]{3} \d{4})/) ??
      extractMeta(rawText, "Periode/Period"),
    accountName: extractFirstMatch(rawText, /Closing Balance :\s*\n([A-Z\s]+)\nKCP/i),
    openingBalance: (() => {
      const value = extractMeta(rawText, "Saldo Awal/Initial Balance");
      return value ? parseIndonesianAmount(value) : null;
    })(),
    closingBalance: (() => {
      const value = extractMeta(rawText, "Saldo Akhir/Closing Balance");
      return value ? parseIndonesianAmount(value) : null;
    })(),
    incomingTotal: (() => {
      const value = extractMeta(rawText, "Dana Masuk/Incoming Transactions");
      return value ? parseIndonesianAmount(value.replace("+", "")) : null;
    })(),
    outgoingTotal: (() => {
      const value = extractMeta(rawText, "Dana Keluar/Outgoing Transactions");
      return value ? parseIndonesianAmount(value.replace("-", "")) : null;
    })(),
    transactions: previewTransactions,
    rawTextPreview: rawText.slice(0, 8000),
  } satisfies MandiriStatementPreview;
}

export async function parseMandiriStatementPdfFromPath(path: string, password: string) {
  const buffer = await readFile(path);
  const file = new File([buffer], "statement.pdf", { type: "application/pdf" });
  return parseMandiriStatementPdf(file, password);
}
