/** Mendaftarkan webhook Telegram ke URL deploy. Usage: npx tsx --env-file=.env scripts/set-webhook.ts https://app.vercel.app */
import { telegramApi } from "@/adapters/telegram";
import { env } from "@/config/env";

const base = process.argv[2];
if (!base) throw new Error("Berikan URL dasar, mis. https://cocokerja.vercel.app");

const webhookUrl = `${base.replace(/\/$/, "")}/api/telegram`;
console.log("Menyetel webhook ke:", webhookUrl);
await telegramApi.setWebhook(webhookUrl, env().TELEGRAM_WEBHOOK_SECRET);
console.log("✓ Webhook berhasil disetel!");

console.log("Menyelaraskan daftar perintah bot (setMyCommands)...");
const commands = [
  { command: "start", description: "Mulai / lanjutkan pendaftaran" },
  { command: "status", description: "Cek kuota & status alert mingguan" },
  { command: "profil", description: "Lihat profil & preferensi kerja" },
  { command: "ubah", description: "Ubah peran, lokasi, atau level" },
  { command: "cv", description: "Perbarui berkas atau teks CV" },
  { command: "ambang", description: "Atur batas skor cocok (mis. /ambang 70)" },
  { command: "bantuan", description: "Panduan fitur & cara cek loker instan" },
  { command: "hapus", description: "Hapus seluruh data pribadi & CV" },
];

await telegramApi.setMyCommands(commands);
console.log("✓ Daftar perintah bot berhasil diperbarui di Telegram:");
commands.forEach((c) => console.log(`  /${c.command} - ${c.description}`));

