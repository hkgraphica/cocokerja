import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16),
  CRON_SECRET: z.string().min(16),
  ENCRYPTION_KEY: z.string().min(1),
  LLM_BASE_URL: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default("gpt-4o-mini"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  /** Daftar URL feed RSS dipisah koma. Gunakan hanya sumber yang mengizinkan. */
  JOB_FEEDS: z.string().default(""),
  JOB_SOURCES: z.string().default(""),
  TICK_BUDGET_MS: z.coerce.number().default(45000),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Divalidasi sekali, saat pertama dipakai (bukan saat build). */
export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const keys = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`Konfigurasi env tidak valid: ${keys}`);
    }
    cached = parsed.data;
  }
  return cached;
}
