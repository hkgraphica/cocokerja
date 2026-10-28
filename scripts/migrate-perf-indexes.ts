/**
 * Migrasi indeks performa (idempoten, aman diulang). SENGAJA tanpa `drizzle-kit push`
 * (lihat AGENTS.md): hanya CREATE INDEX IF NOT EXISTS via lib `postgres`.
 *   npx tsx --env-file=.env scripts/migrate-perf-indexes.ts
 * CONCURRENTLY dipakai agar tidak mengunci tabel; harus di luar transaksi.
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL belum di-set");

const sql = postgres(url, { max: 1, prepare: false });

const statements = [
  // Ekstensi harus ada sebelum indeks trigram. Aman diulang.
  `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
  `CREATE TABLE IF NOT EXISTS source_state (
    source text PRIMARY KEY,
    etag text,
    last_modified text,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS users_state_active_idx ON users (state, is_active)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS matches_unsent_idx ON matches (user_id, score DESC) WHERE sent_at IS NULL`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS tg_updates_created_idx ON tg_updates (created_at)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS jobs_title_trgm_idx ON jobs USING gin (title gin_trgm_ops) WHERE status = 'active'`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS jobs_desc_trgm_idx ON jobs USING gin (description gin_trgm_ops) WHERE status = 'active'`,
];

try {
  for (const s of statements) {
    console.log(s);
    await sql.unsafe(s);
  }
  console.log("Selesai.");
} finally {
  await sql.end();
}
