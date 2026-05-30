# Budget Tracker

Aplikasi web sederhana untuk melacak pengeluaran harian dengan Next.js, Prisma, dan MySQL.

## Fitur

- Input transaksi: tanggal, kategori, total, catatan
- Dashboard ringkasan bulan berjalan
- Master kategori (tambah, edit, hapus)

## Prasyarat

- Node.js 20+
- MySQL 8 (lokal atau via Docker)

## Setup Database

### Opsi A: Docker

```bash
docker compose up -d
```

Connection string default sudah diset di `.env`:

```
DATABASE_URL="mysql://root:root@localhost:3306/budget_tracker"
```

### Opsi B: MySQL Lokal

1. Buat database:

```sql
CREATE DATABASE budget_tracker;
```

2. Sesuaikan kredensial di `.env` (salin dari `.env.example` jika perlu).

## Menjalankan Aplikasi

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Script Berguna

- `npm run db:migrate` — jalankan migrasi database
- `npm run db:seed` — isi kategori default
- `npm run db:push` — sinkronkan schema tanpa migrasi (development)
- `npm run build` — build production
