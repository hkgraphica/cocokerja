import type { JobData, ProfileData, ScoreResult } from "@/core/types";
import type { TailorDraft } from "@/core/tailor";

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

/** Port: penilai LLM & copilot karier (opsional). Mengembalikan null bila gagal/tidak dikonfigurasi. */
export interface LlmScorer {
  score(profile: ProfileData, job: JobData): Promise<ScoreResult | null>;
  chatCareerAdvice(profile: ProfileData, userMessage: string): Promise<string | null>;
  tailorCv(cvText: string, job: JobData): Promise<TailorDraft | null>;
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

/** Validator HTTP untuk conditional GET (hemat bandwidth, lebih sopan ke sumber). */
export interface FetchValidators {
  etag?: string | null;
  lastModified?: string | null;
}

/** Port: penyimpanan validator per sumber. Kegagalan penyimpanan tidak boleh menggagalkan fetch. */
export interface FetchCache {
  get(key: string): Promise<FetchValidators | null>;
  set(key: string, v: FetchValidators): Promise<void>;
}
