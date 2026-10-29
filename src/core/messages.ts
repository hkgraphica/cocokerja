import type { ScoreResult } from "./types";

export const CONSENT_VERSION = "2026-10-v2";

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const ALLOWED_TAGS = new Set(["b", "i", "u", "code", "pre"]);
const MAX_TELEGRAM_CHARS = 3900;

/**
 * Membersihkan teks hasil LLM agar aman dikirim dengan parse_mode HTML Telegram:
 * hanya tag <b> <i> <u> <code> <pre> yang dipertahankan (dan diseimbangkan); karakter lain di-escape.
 * Mencegah pesan ditolak (HTTP 400) dan tag berbahaya seperti <a href> dari output model.
 */
export function sanitizeTelegramHtml(input: string): string {
  const text = input
    .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>") // markdown tebal → <b>
    .replace(/^#{1,6}\s+(.+)$/gm, "<b>$1</b>") // heading markdown → <b>
    .slice(0, MAX_TELEGRAM_CHARS);
  const out: string[] = [];
  const stack: string[] = [];
  for (const part of text.split(/(<\/?[a-zA-Z][^<>]*>)/g)) {
    const tag = /^<(\/?)([a-zA-Z]+)[^<>]*>$/.exec(part);
    if (!tag) {
      // Escape, tanpa meng-escape ulang entitas yang sudah valid.
      out.push(part.replace(/&(?!(?:amp|lt|gt|quot|#\d+);)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
      continue;
    }
    const name = tag[2].toLowerCase();
    if (!ALLOWED_TAGS.has(name)) continue; // tag lain dibuang
    if (!tag[1]) {
      stack.push(name);
      out.push(`<${name}>`);
    } else if (stack.includes(name)) {
      while (stack.length) {
        const top = stack.pop()!;
        out.push(`</${top}>`);
        if (top === name) break;
      }
    } // penutup tanpa pembuka: dibuang
  }
  while (stack.length) out.push(`</${stack.pop()}>`);
  return out.join("");
}

/** Versi teks polos (tanpa tag) untuk fallback bila Telegram menolak HTML. */
export const toPlainText = (html: string) =>
  html.replace(/<[^>]*>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

export const MSG = {
  consent: `👋 Halo! Saya <b>CocoKerja</b>, asisten pencari kerja.

Saya memantau lowongan dan mengirim yang cocok dengan profilmu, lengkap dengan alasan skor.

<b>Data yang saya simpan:</b> CV (terenkripsi), skill, dan preferensi kerja. Dipakai hanya untuk mencocokkan lowongan. Kamu bisa menghapus semuanya kapan saja dengan <code>/hapus</code>. CV tidak dijual ke pihak lain.

<b>Pemrosesan AI:</b> untuk penilaian dan saran, ringkasan profilmu (skill, pendidikan, preferensi) dikirim ke penyedia model AI pihak ketiga. Khusus fitur <i>Sesuaikan CV</i>, <b>teks CV-mu</b> juga dikirim ke penyedia tersebut saat kamu menekan tombolnya.

Setuju melanjutkan?`,
  askCv: "📄 <b>Kirimkan CV Kamu</b>\n\nKirimkan file <b>PDF</b> (maks. 5 MB) atau <b>tempel/ketik teks ringkasan CV-mu</b> di sini.\n\n<i>Info yang dibutuhkan:</i> Pendidikan, jurusan, pengalaman/organisasi/proyek, dan skill utama kamu.\n\n💡 <i>Belum punya file PDF di HP?</i> Kamu bisa langsung ketik ringkasan skill atau pilih tombol di bawah:",
  cvNeedMore: "👋 Halo! Saya perhatikan teks yang kamu kirimkan terlalu singkat untuk dianalisis sebagai CV.\n\nAgar CocoKerja bisa mencocokkan lowongan yang relevan dan menghitung skor skill kamu:\n\n1. 📎 <b>Kirim dokumen PDF CV-mu</b>, atau\n2. ✍️ <b>Ketik ringkasan CV</b> (minimal mencakup jurusan, keahlian/software yang dikuasai, atau pengalaman magang/organisasi).\n\n<i>Atau pilih opsi di bawah jika ingin langsung memilih peran dulu:</i>",
  cvFailed: "⚠️ Saya tidak bisa membaca dokumen tersebut (kemungkinan hasil scan gambar/foto non-teks). Silakan kirim file PDF teks atau tempel isi teks CV langsung ke chat ini.",
  askRole: "🎯 Peran apa yang kamu cari? Pisahkan dengan koma jika lebih dari satu.\nContoh: <code>staff keuangan, accounting officer</code>\natau: <code>data analyst, business development</code>",
  askLocation: "📍 Lokasi kerja yang kamu inginkan? Contoh: <code>Jakarta</code> atau <code>Bandung</code>. Tulis <code>remote</code> jika ingin kerja dari rumah.",
  askLevel: "Tingkat posisi yang kamu cari?",
  done: "✅ Profil siap! Saya akan mengirim lowongan yang cocok. Perintah: /status /profil /ubah /cv /ambang /bantuan",
  help: `<b>Perintah</b>
/start - mulai atau lanjutkan pendaftaran
/status - kuota dan pengaturan
/profil - ringkasan profil
/ubah peran data analyst, bi analyst - ganti peran (pisahkan koma)
/ubah lokasi jakarta, bandung remote - ganti lokasi
/ubah level fresh | magang | any - ganti level
/cv - perbarui CV (kirim PDF atau tempel teks)
/ambang 70 - skor minimum alert (30-95)
/bantuan - tampilkan pesan ini
/hapus - hapus semua datamu

💡 <b>Fitur Cek Lowongan Instan:</b>
Kirimkan link lowongan (LinkedIn/Glints/Jobstreet/dll) atau paste teks lowongan ke sini. CocoKerja akan langsung menilai kecocokannya dengan profilmu. Bila halaman butuh login, tempel teks lowongannya saja.
Setelah itu, tekan <i>Sesuaikan CV</i> untuk draft CV yang disusun dari isi CV aslimu.`,
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
