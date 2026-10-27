/** Mendaftarkan webhook Telegram ke URL deploy. Usage: npx tsx --env-file=.env scripts/set-webhook.ts https://app.vercel.app */
import { telegramApi } from "@/adapters/telegram";
import { env } from "@/config/env";

const base = process.argv[2];
if (!base) throw new Error("Berikan URL dasar, mis. https://cocokerja.vercel.app");
await telegramApi.setWebhook(`${base.replace(/\/$/, "")}/api/telegram`, env().TELEGRAM_WEBHOOK_SECRET);
console.log("Webhook terpasang ke", `${base}/api/telegram`);
