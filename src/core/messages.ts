import type { ScoreResult } from "./types";

export const CONSENT_VERSION = "2026-10-v1";

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const MSG = {
  consent: `👋 Halo! Saya <b>CocoKerja</b>, asisten pencari kerja.

Saya memantau lowongan dan mengirim yang cocok dengan profilmu, lengkap dengan alasan skor.

<b>Data yang saya simpan:</b> CV (terenkripsi), skill, dan preferensi kerja. Dipakai hanya untuk mencocokkan lowongan. Kamu bisa menghapus semuanya kapan saja dengan <code>/hapus</code>. CV tidak dijual ke pihak lain.

Setuju melanjutkan?`,
  askCv: "Kirim CV kamu sebagai <b>file PDF</b> (maks 5 MB) atau <b>tempel teksnya</b> di sini.",
  cvFailed: "Saya tidak bisa membaca CV itu (mungkin hasil scan). Coba kirim PDF teks atau tempel isi CV langsung.",
  askRole: "Peran apa yang kamu cari? Pisahkan dengan koma.\nContoh: <i>data analyst, business analyst</i>",
  askLocation: "Lokasi kerja yang kamu mau? Contoh: <i>Jakarta</i>. Tulis <i>remote</i> jika mau remote.",
  askLevel: "Level yang kamu cari?",
  done: "✅ Profil siap! Saya akan mengirim lowongan yang cocok. Perintah: /status /profil /ambang /bantuan",
  help: `<b>Perintah</b>
/status - kuota dan pengaturan
/profil - ringkasan profil
/ambang 70 - skor minimum alert (30-95)
/hapus - hapus semua datamu`,
  deleteConfirm: "Ini akan menghapus CV, profil, dan riwayat. Ketik <code>/hapus ya</code> untuk konfirmasi.",
  deleted: "🗑️ Semua datamu sudah dihapus. Ketik /start jika ingin memulai lagi.",
  needConsent: "Tekan tombol <b>Setuju</b> di atas untuk melanjutkan, atau /start untuk mengulang.",
  noMatchYet: "Belum ada lowongan baru yang cocok. Saya terus memantau.",
};

export function jobCard(
  job: { title: string; company: string; location: string; url: string; source: string },
  r: Pick<ScoreResult, "score" | "reasons" | "gaps">,
  suspicious: boolean,
): string {
  const lines = [
    `<b>${escapeHtml(job.title)}</b>`,
    `${escapeHtml(job.company)} • ${escapeHtml(job.location || "Lokasi tidak disebut")}`,
    `🎯 Kecocokan: <b>${r.score}%</b>`,
  ];
  if (r.reasons.length) lines.push("", ...r.reasons.slice(0, 3).map((x) => `✅ ${escapeHtml(x)}`));
  if (r.gaps.length) lines.push(...r.gaps.slice(0, 2).map((x) => `⚠️ ${escapeHtml(x)}`));
  if (suspicious) lines.push("", "🚩 Waspada: lowongan ini memuat indikasi penipuan/MLM. Jangan bayar apa pun untuk melamar.");
  lines.push("", `Sumber: ${escapeHtml(job.source)}`);
  return lines.join("\n");
}
