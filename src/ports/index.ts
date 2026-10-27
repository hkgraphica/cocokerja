import type { JobData, ProfileData, ScoreResult } from "@/core/types";

/** Port: kanal pesan (Telegram sekarang, WhatsApp nanti). */
export interface Button {
  text: string;
  data?: string;
  url?: string;
}
export interface Messenger {
  send(chatId: string, html: string, buttons?: Button[][]): Promise<void>;
  answerCallback(callbackId: string, text?: string): Promise<void>;
  downloadFile(fileId: string): Promise<Uint8Array>;
}

/** Port: penilai LLM (opsional). Mengembalikan null bila gagal/tidak dikonfigurasi. */
export interface LlmScorer {
  score(profile: ProfileData, job: JobData): Promise<ScoreResult | null>;
}

export interface RawJob {
  externalId?: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
}

/** Port: sumber lowongan legal (RSS/API/mitra). */
export interface JobSource {
  name: string;
  fetch(): Promise<RawJob[]>;
}
