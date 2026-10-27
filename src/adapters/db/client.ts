import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/config/env";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const g = globalThis as unknown as { __db?: Db };

/**
 * Satu koneksi per instance serverless + `prepare: false` agar kompatibel dengan
 * pooler (Neon/Supabase pgbouncer). Di VPS bisa dinaikkan lewat DB_POOL_MAX.
 */
export function db(): Db {
  if (!g.__db) {
    const client = postgres(env().DATABASE_URL, {
      max: Number(process.env.DB_POOL_MAX ?? 1),
      prepare: false,
      idle_timeout: 20,
    });
    g.__db = drizzle(client, { schema });
  }
  return g.__db;
}

export { schema };
