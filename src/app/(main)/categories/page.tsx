import { getCategories } from "@/actions/categories";
import { CategoryForm } from "@/components/CategoryForm";
import { CategoryList } from "@/components/CategoryList";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Master Kategori</h1>
        <p className="text-sm text-zinc-500">
          Kelola kategori pemasukan dan pengeluaran.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Kategori</CardTitle>
          <CardDescription>
            Kategori baru langsung tersedia di form transaksi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Kategori</CardTitle>
          <CardDescription>
            Kategori yang masih dipakai transaksi tidak bisa dihapus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryList categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
