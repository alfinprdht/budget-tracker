import { z } from "zod";

const transactionTypeSchema = z.enum(["EXPENSE", "INCOME"]);

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama kategori wajib diisi")
    .max(100, "Nama kategori maksimal 100 karakter"),
  type: transactionTypeSchema.default("EXPENSE"),
});

export const transactionSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  type: transactionTypeSchema.default("EXPENSE"),
  categoryId: z.coerce
    .number()
    .int("Kategori tidak valid")
    .positive("Kategori wajib dipilih"),
  amount: z.coerce
    .number()
    .positive("Total harus lebih dari 0"),
  notes: z
    .string()
    .trim()
    .max(1000, "Catatan maksimal 1000 karakter")
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export type LoginInput = z.infer<typeof loginSchema>;
