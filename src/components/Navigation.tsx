import Link from "next/link";
import { logout } from "@/actions/auth";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/rancangan-anggaran", label: "Rancangan Anggaran" },
  { href: "/categories", label: "Kategori" },
];

export function Navigation() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="text-lg font-semibold text-zinc-900">
            Budget Tracker
          </Link>
          <p className="text-sm text-zinc-500">Kelola pemasukan dan pengeluaran harian Anda</p>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {item.label}
            </Link>
          ))}
          <form action={logout}>
            <Button type="submit" variant="ghost">
              Keluar
            </Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
