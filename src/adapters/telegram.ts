import { env } from "@/config/env";
import type { Button, Messenger } from "@/ports";

export interface TgUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type?: string; title?: string };
    text?: string;
    document?: { file_id: string; file_size?: number; mime_type?: string };
  };
  channel_post?: {
    message_id: number;
    chat: { id: number; type?: string; title?: string; username?: string };
    text?: string;
  };
  callback_query?: { id: string; data?: string; message?: { chat: { id: number } } };
}

const api = (method: string) => `https://api.telegram.org/bot${env().TELEGRAM_BOT_TOKEN}/${method}`;

async function call<T>(method: string, body: unknown): Promise<T> {
  const res = await fetch(api(method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string; error_code?: number };
  if (!json.ok) {
    const err = new Error(`Telegram ${method}: ${json.description}`) as Error & { code?: number };
    err.code = json.error_code;
    throw err;
  }
  return json.result;
}

export class TelegramMessenger implements Messenger {
  async send(chatId: string, html: string, buttons?: Button[][]) {
    await call("sendMessage", {
      chat_id: chatId,
      text: html,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(buttons && {
        reply_markup: {
          inline_keyboard: buttons.map((row) =>
            row.map((b) => (b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: b.data })),
          ),
        },
      }),
    });
  }

  async answerCallback(callbackId: string, text?: string) {
    await call("answerCallbackQuery", { callback_query_id: callbackId, text }).catch(() => undefined);
  }

  async downloadFile(fileId: string) {
    const f = await call<{ file_path: string }>("getFile", { file_id: fileId });
    const res = await fetch(`https://api.telegram.org/file/bot${env().TELEGRAM_BOT_TOKEN}/${f.file_path}`);
    if (!res.ok) throw new Error("Gagal mengunduh file Telegram");
    return new Uint8Array(await res.arrayBuffer());
  }
}

export const telegramApi = {
  setWebhook: (url: string, secret: string) =>
    call("setWebhook", { url, secret_token: secret, allowed_updates: ["message", "callback_query"], drop_pending_updates: true }),
  deleteWebhook: () => call("deleteWebhook", { drop_pending_updates: false }),
  getUpdates: (offset: number, timeout = 25) =>
    call<TgUpdate[]>("getUpdates", { offset, timeout, allowed_updates: ["message", "callback_query"] }),
};

/** Telegram mengembalikan 403 bila user memblokir bot. */
export const isBlockedError = (e: unknown) => (e as { code?: number })?.code === 403;
