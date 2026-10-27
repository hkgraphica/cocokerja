import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { TelegramMessenger, type TgUpdate } from "@/adapters/telegram";
import { env } from "@/config/env";
import { handleUpdate } from "@/services/bot";

export const runtime = "nodejs";
export const maxDuration = 60;

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function POST(req: Request) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!safeEqual(secret, env().TELEGRAM_WEBHOOK_SECRET)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const update = (await req.json()) as TgUpdate;
  try {
    await handleUpdate(update, new TelegramMessenger());
  } catch (e) {
    // Selalu 200 agar Telegram tidak me-retry badai; error dicatat tanpa isi pesan/CV.
    console.error("handleUpdate gagal", update.update_id, e instanceof Error ? e.message : e);
  }
  return NextResponse.json({ ok: true });
}
