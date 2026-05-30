import { toInputDate } from "@/lib/format";
import {
  eachDayInRange,
  formatPeriodLabel,
  getNextPeriodRange,
  getPeriodKey,
  type DateRange,
} from "@/lib/period";

export type TransactionListItem = {
  date: string;
  category: string;
  type: "EXPENSE" | "INCOME";
  amount: number;
  notes: string | null;
};

export type ExpenseListItem = TransactionListItem;

export type RankedItem = {
  label: string;
  total: number;
};

export type PeriodAnalysisData = {
  periodKey: string;
  periodLabel: string;
  nextPeriodKey: string;
  nextPeriodLabel: string;
  income: number;
  expense: number;
  balance: number;
  averageDailyExpense: number;
  projectedNextPeriodExpense: number;
  emergencyFundTarget: number;
  recommendedEmergencyFundContribution: number;
  recommendedSavingContribution: number;
  totalFutureNeeds: number;
  estimatedAdditionalIncomeNeeded: number;
  topExpenseDays: RankedItem[];
  topExpenseCategories: RankedItem[];
  transactions: TransactionListItem[];
  expenses: ExpenseListItem[];
};

type TransactionWithCategory = {
  date: Date;
  amount: { toString(): string };
  notes: string | null;
  type: "EXPENSE" | "INCOME";
  category: { name: string };
};

export function buildPeriodAnalysisData(
  periodKey: string,
  range: DateRange,
  transactions: TransactionWithCategory[],
): PeriodAnalysisData {
  const periodLabel = formatPeriodLabel(range.start, range.end);
  const expenses = transactions.filter((transaction) => transaction.type === "EXPENSE");
  const incomes = transactions.filter((transaction) => transaction.type === "INCOME");

  const totalExpense = expenses.reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0,
  );
  const totalIncome = incomes.reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0,
  );

  const periodDays = eachDayInRange(range).length;
  const averageDailyExpense = periodDays > 0 ? totalExpense / periodDays : 0;

  const expenseByDay = new Map<string, number>();
  for (const transaction of expenses) {
    const key = toInputDate(new Date(transaction.date));
    expenseByDay.set(key, (expenseByDay.get(key) ?? 0) + Number(transaction.amount));
  }

  const topExpenseDays = [...expenseByDay.entries()]
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const expenseByCategory = new Map<string, number>();
  for (const transaction of expenses) {
    const name = transaction.category.name;
    expenseByCategory.set(name, (expenseByCategory.get(name) ?? 0) + Number(transaction.amount));
  }

  const topExpenseCategories = [...expenseByCategory.entries()]
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const transactionList: TransactionListItem[] = transactions
    .map((transaction) => ({
      date: toInputDate(new Date(transaction.date)),
      category: transaction.category.name,
      type: transaction.type,
      amount: Number(transaction.amount),
      notes: transaction.notes,
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);

  const expenseList = transactionList.filter((item) => item.type === "EXPENSE");

  const nextRange = getNextPeriodRange(range);
  const nextPeriodKey = getPeriodKey(nextRange.start);
  const nextPeriodLabel = formatPeriodLabel(nextRange.start, nextRange.end);
  const projectedNextPeriodExpense = totalExpense;

  // Target dana darurat = 3× pengeluaran periode; alokasi per periode = target / 12 (capai target dalam 1 tahun)
  const emergencyFundTarget = totalExpense * 3;
  const recommendedEmergencyFundContribution = Math.ceil(emergencyFundTarget / 12);

  // Saving = 10% pemasukan; jika pemasukan nol, fallback 5% pengeluaran
  const recommendedSavingContribution = Math.ceil(
    totalIncome > 0 ? totalIncome * 0.1 : totalExpense * 0.05,
  );

  const totalFutureNeeds =
    projectedNextPeriodExpense +
    recommendedEmergencyFundContribution +
    recommendedSavingContribution;
  const estimatedAdditionalIncomeNeeded = Math.max(0, totalFutureNeeds - totalIncome);

  return {
    periodKey,
    periodLabel,
    nextPeriodKey,
    nextPeriodLabel,
    income: totalIncome,
    expense: totalExpense,
    balance: totalIncome - totalExpense,
    averageDailyExpense,
    projectedNextPeriodExpense,
    emergencyFundTarget,
    recommendedEmergencyFundContribution,
    recommendedSavingContribution,
    totalFutureNeeds,
    estimatedAdditionalIncomeNeeded,
    topExpenseDays,
    topExpenseCategories,
    transactions: transactionList,
    expenses: expenseList,
  };
}

export function buildGeminiPrompt(data: PeriodAnalysisData) {
  const summaryForLlm = {
    periodKey: data.periodKey,
    periodLabel: data.periodLabel,
    nextPeriodKey: data.nextPeriodKey,
    nextPeriodLabel: data.nextPeriodLabel,
    income: data.income,
    expense: data.expense,
    balance: data.balance,
    averageDailyExpense: data.averageDailyExpense,
    projectedNextPeriodExpense: data.projectedNextPeriodExpense,
    emergencyFundTarget: data.emergencyFundTarget,
    recommendedEmergencyFundContribution: data.recommendedEmergencyFundContribution,
    recommendedSavingContribution: data.recommendedSavingContribution,
    totalFutureNeeds: data.totalFutureNeeds,
    estimatedAdditionalIncomeNeeded: data.estimatedAdditionalIncomeNeeded,
    topExpenseDays: data.topExpenseDays,
    topExpenseCategories: data.topExpenseCategories,
    transactionCount: data.transactions.length,
    incomeCount: data.transactions.filter((item) => item.type === "INCOME").length,
    expenseCount: data.transactions.filter((item) => item.type === "EXPENSE").length,
    transactions: data.transactions,
  };

  return `Kamu adalah advisor keuangan pribadi. Analisis data keuangan berikut untuk periode ${data.periodLabel}.

Data keuangan (JSON):
${JSON.stringify(summaryForLlm, null, 2)}

Catatan:
- Analisis ini hanya untuk periode ${data.periodLabel} (bukan gabungan beberapa periode).
- Field "transactions" berisi seluruh transaksi periode tersebut (type: EXPENSE = pengeluaran, INCOME = pemasukan).
- "projectedNextPeriodExpense" = proyeksi pengeluaran operasional periode mendatang (${data.nextPeriodLabel}) jika pola serupa dengan periode ini.
- "emergencyFundTarget" = target dana darurat ideal (3× pengeluaran periode ini).
- "recommendedEmergencyFundContribution" = alokasi dana darurat per periode mendatang (target / 12, capai target dalam 12 periode).
- "recommendedSavingContribution" = alokasi saving per periode (10% pemasukan, atau 5% pengeluaran jika pemasukan nol).
- "totalFutureNeeds" = proyeksi pengeluaran + alokasi dana darurat + alokasi saving.
- "estimatedAdditionalIncomeNeeded" = max(0, totalFutureNeeds - pemasukan periode ini).

Instruksi:
- Analisis dalam bahasa Indonesia
- Pertimbangkan seluruh transaksi pemasukan dan pengeluaran periode ini
- Fokus pada tingkat risiko keuangan dan solusi agar keuangan periode mendatang tetap aman
- Gunakan angka dari data untuk mendukung analisis; sesuaikan estimasi jika pola transaksi menunjukkan kebutuhan berbeda

Format respons WAJIB menggunakan struktur berikut:

## Tingkat Risiko
[Pilih: Rendah / Sedang / Tinggi] — jelaskan alasan singkat (2-3 kalimat)

## Temuan Utama
- (bullet poin temuan penting, min 3 poin)

## Estimasi Pemasukan Tambahan (Periode Mendatang)
Periode target: **${data.nextPeriodLabel}**

Breakdown kebutuhan:
- **Operasional (pengeluaran rutin):** Rp [angka] — proyeksi pengeluaran periode mendatang
- **Dana darurat:** Rp [angka] — alokasi per periode menuju target dana darurat (ideal: 3× biaya hidup)
- **Saving:** Rp [angka] — alokasi tabungan per periode mendatang
- **Total kebutuhan periode mendatang:** Rp [angka]
- **Pemasukan periode ini:** Rp [angka]
- **Estimasi pemasukan tambahan yang diperlukan:** **Rp [angka]** (sesuaikan dengan data, jelaskan jika berbeda dari estimatedAdditionalIncomeNeeded)

- Asumsi perhitungan: (2-3 kalimat — pola pengeluaran, target dana darurat, dan target saving)
- Langkah konkret untuk memenuhi kebutuhan pemasukan ini (min 2 poin)

## Solusi & Rekomendasi
- (bullet poin solusi konkret dan actionable, min 3 poin)

## Kesimpulan
(paragraf singkat 2-3 kalimat)`;
}
