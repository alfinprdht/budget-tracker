import { PrismaClient, TransactionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const defaultExpenseCategories = [
  "Makanan",
  "Transport",
  "Belanja",
  "Tagihan",
  "Lainnya",
];

const defaultIncomeCategories = ["Gaji", "Bonus", "Freelance", "Investasi", "Lainnya"];

async function upsertCategory(name: string, type: TransactionType) {
  await prisma.category.upsert({
    where: {
      name_type: { name, type },
    },
    update: {},
    create: { name, type },
  });
}

async function main() {
  const email = process.env.SEED_USER_EMAIL ?? "admin@localhost";
  const password = process.env.SEED_USER_PASSWORD ?? "password123";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Admin",
      passwordHash,
    },
  });

  for (const name of defaultExpenseCategories) {
    await upsertCategory(name, "EXPENSE");
  }

  for (const name of defaultIncomeCategories) {
    await upsertCategory(name, "INCOME");
  }
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
