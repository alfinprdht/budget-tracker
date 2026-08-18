import { ImportStatementForm } from "@/components/ImportStatementForm";

export const dynamic = "force-dynamic";

export default function ImportPdfPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Import PDF</h1>
        <p className="text-sm text-zinc-500">
          Preview transaksi dari e-Statement Mandiri yang diproteksi password
        </p>
      </div>

      <ImportStatementForm />
    </div>
  );
}
