import { createHash } from "node:crypto";

const COMPANY_SUFFIX = /\b(pt|cv|tbk|persero|ltd|inc|co)\b\.?/gi;

export const normalizeKey = (s: string) =>
  s.toLowerCase().replace(COMPANY_SUFFIX, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Hash dedup: judul + perusahaan + lokasi ter-normalisasi (PRD 10.2). */
export function jobHash(title: string, company: string, location: string): string {
  return createHash("sha256")
    .update([title, company, location].map(normalizeKey).join("|"))
    .digest("hex");
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const SCAM_RE = /(biaya pendaftaran|deposit|transfer dulu|bayar .* dulu|investasi awal|rekrut downline|join member|tanpa interview.*gaji)/i;

/** Sinyal sederhana lowongan mencurigakan (PRD F2.3). */
export const looksSuspicious = (text: string) => SCAM_RE.test(text);

const BLOCKED_TITLE_RE = /(log ?in|sign ?in|sign ?up|masuk|daftar akun|captcha|just a moment|attention required|access denied|forbidden|403|robot)/i;

/** Halaman yang kemungkinan bukan isi lowongan (login wall/captcha/terlalu pendek). */
export function looksLikeBlockedPage(title: string, text: string): boolean {
  return text.trim().length < 200 || BLOCKED_TITLE_RE.test(title);
}
