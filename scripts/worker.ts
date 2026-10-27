/**
 * Worker VPS / dev lokal: long polling Telegram + tick terjadwal.
 * Menjalankan kode yang SAMA dengan Vercel (handleUpdate, tick), tanpa webhook.
 *   npx tsx --env-file=.env scripts/worker.ts
 */
import { TelegramMessenger, telegramApi } from "@/adapters/telegram";
import { handleUpdate } from "@/services/bot";
import { tick } from "@/services/tick";

const TICK_MS = Number(process.env.TICK_INTERVAL_MS ?? 10 * 60 * 1000);
const messenger = new TelegramMessenger();
let stopping = false;
process.on("SIGTERM", () => (stopping = true));
process.on("SIGINT", () => (stopping = true));

async function pollLoop() {
  await telegramApi.deleteWebhook(); // long polling dan webhook tidak boleh bersamaan
  let offset = 0;
  while (!stopping) {
    try {
      for (const u of await telegramApi.getUpdates(offset)) {
        offset = u.update_id + 1;
        await handleUpdate(u, messenger).catch((e) => console.error("update gagal", e instanceof Error ? e.message : e));
      }
    } catch (e) {
      console.error("polling error", e instanceof Error ? e.message : e);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

async function tickLoop() {
  while (!stopping) {
    try {
      console.log("tick", JSON.stringify(await tick()));
    } catch (e) {
      console.error("tick gagal", e instanceof Error ? e.message : e);
    }
    for (let waited = 0; waited < TICK_MS && !stopping; waited += 1000) await new Promise((r) => setTimeout(r, 1000));
  }
}

console.log("CocoKerja worker berjalan");
await Promise.all([pollLoop(), tickLoop()]);
