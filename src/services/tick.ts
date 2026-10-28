import { repos } from "@/adapters/db/repos";
import { configuredSources } from "@/adapters/sources";
import { OpenAiCompatScorer } from "@/adapters/llm";
import { TelegramMessenger } from "@/adapters/telegram";
import { env } from "@/config/env";
import { ingest, runMatching, sendAlerts } from "./pipeline";
import type { FetchCache } from "@/ports";

const feedCache: FetchCache = {
  get: (key) => repos.getSourceState(key),
  set: (key, v) => repos.saveSourceState(key, v),
};

/**
 * Satu siklus kerja idempoten. Dipanggil oleh:
 *  - Vercel Cron / pemicu eksternal  → GET /api/cron/tick
 *  - Worker VPS (scripts/worker.ts)  → langsung memanggil fungsi ini
 * Dibatasi anggaran waktu agar aman di serverless; sisa pekerjaan lanjut di tick berikutnya.
 */
export async function tick() {
  const started = Date.now();
  const deadline = started + env().TICK_BUDGET_MS;
  const ingestStats = await ingest(configuredSources(feedCache));
  const llm = env().LLM_API_KEY ? new OpenAiCompatScorer() : null;
  const matched = await runMatching(llm, deadline);
  const sent = await sendAlerts(new TelegramMessenger(), deadline);
  // Housekeeping best-effort: tidak boleh menggagalkan tick maupun melampaui anggaran waktu.
  if (Date.now() < deadline) await repos.purgeStale().catch((e) => console.error("purge gagal", e instanceof Error ? e.message : e));
  return { ingest: ingestStats, matched, sent, ms: Date.now() - started };
}
