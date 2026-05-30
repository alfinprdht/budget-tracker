import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ImportItem = {
  category: string;
  total: number;
  notes: string;
};

type ImportDay = {
  date: string;
  total_day: number;
  items: ImportItem[];
};

function parseDate(raw: string) {
  const datePart = raw.includes("|") ? raw.split("|")[1].trim() : raw.trim();
  const parsed = new Date(datePart);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Format tanggal tidak valid: ${raw}`);
  }

  return parsed;
}

async function main() {
  const filePath = resolve(__dirname, "data/may-2026.json");
  const days = JSON.parse(readFileSync(filePath, "utf-8")) as ImportDay[];

  const categoryNames = new Set<string>();
  for (const day of days) {
    for (const item of day.items) {
      categoryNames.add(item.category);
    }
  }

  const categoryMap = new Map<string, number>();

  for (const name of categoryNames) {
    const category = await prisma.category.upsert({
      where: {
        name_type: { name, type: "EXPENSE" },
      },
      update: {},
      create: { name, type: "EXPENSE" },
    });
    categoryMap.set(name, category.id);
  }

  await prisma.transaction.deleteMany();

  let importedCount = 0;

  for (const day of days) {
    const date = parseDate(day.date);

    for (const item of day.items) {
      const categoryId = categoryMap.get(item.category);

      if (!categoryId) {
        throw new Error(`Kategori tidak ditemukan: ${item.category}`);
      }

      await prisma.transaction.create({
        data: {
          date,
          type: "EXPENSE",
          categoryId,
          amount: item.total,
          notes: item.notes,
        },
      });

      importedCount += 1;
    }
  }

  console.log(`Berhasil import ${importedCount} transaksi dari ${days.length} hari.`);
  console.log(`Kategori: ${[...categoryNames].sort().join(", ")}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
