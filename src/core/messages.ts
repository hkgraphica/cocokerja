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
  welcomeActive: "✅ Profil siap! Saya akan mengirimkan lowongan yang cocok untukmu secara otomatis.\n\n💡 <b>Tips:</b> Kamu juga bisa cek lowongan kapan saja dengan mengirim link atau teks lowongan ke sini.\n\nPerintah tersedia: /status /profil /ubah /cv /ambang /bantuan",
  quotaWarning: (remaining: number) =>
    `⚠️ <b>Peringatan Kuota:</b> Sisa alert minggu ini hanya <b>${remaining}</b>. Upgrade ke Premium untuk kuota lebih besar.`,
  interviewTip: (jobTitle: string) =>
    `📝 <b>Tips Interview — ${escapeHtml(jobTitle)}</b>\n\n` +
    `1. 🔍 <b>Riset perusahaan</b> minimal 15 menit sebelum interview.\n` +
    `2. 🧩 <b>Gunakan metode STAR</b> (Situation, Task, Action, Result) saat menjawab pertanyaan perilaku.\n` +
    `3. 💬 <b>Siapkan 2–3 pertanyaan</b> untuk interviewer — menunjukkan antusiasmemu.\n` +
    `4. 📄 <b>Bawa/sediakan CV terbaru</b> dan portofolio relevan jika ada.\n` +
    `5. ⏰ <b>Hadir/join tepat waktu</b> — untuk online, test link & audio 5 menit sebelumnya.\n\n` +
    `Semangat! Kamu sudah selangkah lebih dekat. 💪`,
  milestoneMessage: (totalSent: number): string | null => {
    if (totalSent === 1) return "🎉 Lowongan pertamamu sudah terkirim! Semoga ada yang cocok.";
    if (totalSent === 5) return "🌟 Sudah 5 lowongan yang kamu terima dari CocoKerja! Tetap semangat!";
    if (totalSent === 10) return "🏆 10 lowongan! Kamu konsisten — terus pantau dan lamar yang terbaik!";
    if (totalSent === 25) return "🚀 25 lowongan! Perjalananmu makin matang. Jangan menyerah!";
    if (totalSent === 50) return "💎 50 lowongan! Kamu adalah pencari kerja yang gigih. Sukses menantimu!";
    return null;
  },
};

// ---------------------------------------------------------------------------
// Career Tips (rotated weekly)
// ---------------------------------------------------------------------------

export const CAREER_TIPS: string[] = [
  "Sesuaikan setiap lamaran dengan kata kunci dari deskripsi pekerjaan — recruiter sering menggunakan ATS yang menyaring otomatis berdasarkan kata kunci.",
  "Tulis pencapaian di CV dengan format <b>STAR</b> (Situasi, Tugas, Aksi, Hasil) dan sertakan angka nyata, misalnya: <i>\"Meningkatkan efisiensi proses 30% dalam 2 bulan.\"</i>",
  "LinkedIn yang aktif 3× lebih efektif daripada melamar secara pasif. Perbarui headline, tambahkan skill, dan minta rekomendasi dari dosen atau rekan magang.",
  "Jangan lewatkan <b>program Graduate Hire</b> perusahaan besar — pendaftarannya biasanya dibuka Februari–April dan September–Oktober setiap tahun.",
  "Siapkan 3 pertanyaan cerdas untuk pewawancara, misalnya: <i>\"Seperti apa proses onboarding dan growth path untuk posisi ini?\"</i> — ini menunjukkan inisiatif.",
  "Jaringan (networking) menghasilkan ~70% lowongan yang tidak dipublikasikan. Hadiri webinar gratis, bergabung komunitas alumni, dan connect di LinkedIn setelah acara.",
  "Sebelum interview, riset <b>berita terbaru perusahaan</b> 1–2 tahun terakhir. Sebutkan salah satunya saat menjawab pertanyaan \"Mengapa kamu melamar di sini?\"",
  "Gunakan format CV <b>1 halaman</b> untuk fresh graduate; prioritaskan pengalaman magang, proyek kampus, dan organisasi yang relevan dengan posisi yang dilamar.",
  "Kirim <b>follow-up email</b> 24–48 jam setelah interview untuk mengucapkan terima kasih dan menegaskan minatmu — hanya ~10% kandidat yang melakukannya.",
  "Jika belum ada pengalaman kerja, bangun portofolio: analisis data publik, buat project GitHub, atau kontribusi ke open-source agar CV-mu bercerita lewat karya nyata.",
];

/** Mengambil tip karier berdasarkan nomor minggu ISO (0-indexed, modulo 10). */
export function getWeeklyTip(weekNum: number): string {
  return CAREER_TIPS[((weekNum % 10) + 10) % 10];
}

// ---------------------------------------------------------------------------
// Extended MSG templates
// ---------------------------------------------------------------------------

Object.assign(MSG, {
  /** Pesan selamat datang kaya setelah onboarding selesai. */
  welcomeActive: (tipText: string) =>
    `✅ <b>Profil kamu sudah aktif!</b> Selamat datang di CocoKerja 🎉\n\n` +
    `📅 Alert lowongan akan dikirim setiap hari kerja pukul <b>08:00 WIB</b> — hanya lowongan yang benar-benar cocok dengan profilmu.\n\n` +
    `💡 <b>Tip minggu ini:</b>\n${tipText}\n\n` +
    `<b>Kamu bisa langsung bertanya, misalnya:</b>\n` +
    `• <i>"Berikan saya tips interview untuk posisi Data Analyst"</i>\n` +
    `• <i>"Cek kecocokan saya dengan lowongan ini: [tempel link/teks]"</i>\n` +
    `• <i>"Sesuaikan CV saya untuk posisi Marketing Officer"</i>\n\n` +
    `<b>Perintah penting:</b>\n` +
    `<code>/status</code> · <code>/profil</code> · <code>/ubah</code> · <code>/cv</code> · <code>/ambang</code> · <code>/bantuan</code>`,

  /** Pesan re-engagement untuk user yang >7 hari tidak menerima alert. */
  reEngagement: (tipText: string) =>
    `👋 <b>Hai, sudah lama tidak bertemu!</b>\n\n` +
    `Kami belum menemukan lowongan yang melewati ambang skor kamu dalam 7+ hari terakhir. Pasar kerja bergerak cepat — mungkin saatnya menyegarkan profil?\n\n` +
    `💡 <b>Tip karier:</b>\n${tipText}\n\n` +
    `Coba langkah berikut:\n` +
    `• Turunkan ambang skor dengan <code>/ambang 60</code>\n` +
    `• Tambah peran atau lokasi baru dengan <code>/ubah</code>\n` +
    `• Perbarui CV-mu dengan <code>/cv</code>\n\n` +
    `Kami terus memantau untuk kamu! 🚀`,

  /** Pesan peringatan kuota alert hampir habis. */
  quotaWarning: (remaining: number, resetDay: string) =>
    `⚠️ <b>Kuota alert hampir habis!</b>\n\n` +
    `Sisa kuota alert minggu ini: <b>${remaining} lowongan</b>.\n` +
    `Kuota akan direset pada <b>${resetDay}</b>.\n\n` +
    `Agar tidak melewatkan lowongan terbaik, pertimbangkan upgrade ke <b>Premium</b> untuk kuota tanpa batas.\n\n` +
    `Ketik /status untuk melihat detail kuota.`,

  /** Ringkasan mingguan aktivitas CocoKerja. */
  weeklyDigest: (alertCount: number, totalJobs: number, topSkills: string[], tipText: string) =>
    `📊 <b>Ringkasan Minggu Ini</b>\n\n` +
    `• Alert terkirim: <b>${alertCount} lowongan</b>\n` +
    `• Total lowongan dipantau: <b>${totalJobs}</b>\n` +
    (topSkills.length
      ? `• Skill yang paling banyak dicari: <b>${topSkills.slice(0, 3).join(", ")}</b>\n`
      : "") +
    `\n💡 <b>Tip minggu ini:</b>\n${tipText}\n\n` +
    `Terus semangat dalam pencarian kerja! Gunakan <code>/profil</code> untuk mengecek profilmu atau kirim link lowongan untuk dicek kecocokannya.`,

  /** Pesan milestone saat alertsUsed mencapai angka tertentu, atau null. */
  milestoneMessage: (count: number): string | null => {
    const milestones: Record<number, string> = {
      5: `🌟 <b>Milestone pertama!</b> Kamu sudah menerima <b>5 alert lowongan</b>.\nTerus semangat — statistik menunjukkan kandidat yang konsisten melamar 3× lebih cepat mendapat panggilan!`,
      10: `🏆 <b>10 Alert!</b> Kamu makin dekat dengan pekerjaan impianmu.\nJangan lupa minta feedback dari setiap proses rekrutmen — itu kunci berkembang cepat. 💪`,
      20: `🎉 <b>20 Alert!</b> Dedikasi yang luar biasa!\nJika belum ada yang berhasil, coba refresh CV-mu dengan <code>/cv</code> — kadang sentuhan kecil membuat perbedaan besar.`,
    };
    return milestones[count] ?? null;
  },

  /** Tips interview kontekstual berdasarkan judul pekerjaan. */
  interviewTip: (jobTitle: string): string => {
    const title = jobTitle.toLowerCase();
    if (/\b(data|analyst|analytics|bi|business intelligence|machine learning|ml|ai)\b/.test(title)) {
      return (
        `🎯 <b>Tips Interview: ${jobTitle}</b>\n\n` +
        `• Siapkan <b>studi kasus analisis data</b> — ceritakan proyek nyata atau analisis dataset publik yang pernah kamu lakukan.\n` +
        `• Kuasai dasar SQL: GROUP BY, JOIN, window function. Banyak perusahaan memberikan live coding test.\n` +
        `• Tunjukkan kemampuan <i>storytelling data</i>: bagaimana kamu mengubah angka menjadi insight bisnis.\n` +
        `• Pelajari tools yang disebutkan di JD (Python, Tableau, Looker, BigQuery, dll.).\n\n` +
        `💡 Pertanyaan andalan: <i>"Ceritakan proyek analisis data yang paling menantang dan bagaimana kamu mengatasinya."</i>`
      );
    }
    if (/\b(marketing|brand|digital|content|social media|seo|sem|growth|crm)\b/.test(title)) {
      return (
        `🎯 <b>Tips Interview: ${jobTitle}</b>\n\n` +
        `• Siapkan <b>portofolio konten atau kampanye</b> yang pernah kamu buat, meski dari proyek kampus.\n` +
        `• Kuasai metrik utama: CTR, ROAS, CAC, LTV, dan cara mengoptimalkannya.\n` +
        `• Tunjukkan kemampuan riset kompetitor — coba analisis singkat brand perusahaan sebelum interview.\n` +
        `• Pelajari funnel pemasaran dan cara membaca data dari Google Analytics atau Meta Ads.\n\n` +
        `💡 Pertanyaan andalan: <i>"Kampanye marketing apa yang paling memukau kamu belakangan ini, dan mengapa berhasil?"</i>`
      );
    }
    if (/\b(finance|keuangan|accounting|akuntan|treasury|tax|pajak|audit|controller)\b/.test(title)) {
      return (
        `🎯 <b>Tips Interview: ${jobTitle}</b>\n\n` +
        `• Pastikan kamu fasih dengan <b>laporan keuangan</b>: neraca, laba rugi, dan arus kas.\n` +
        `• Latih soal jurnal akuntansi dan rekonsiliasi — sering muncul sebagai tes teknis.\n` +
        `• Pelajari dasar perpajakan (PPh 21, PPN) jika melamar posisi finance/accounting.\n` +
        `• Tunjukkan ketelitian: sertakan contoh konkret saat kamu berhasil menemukan dan memperbaiki kesalahan.\n\n` +
        `💡 Pertanyaan andalan: <i>"Bagaimana cara kamu memastikan akurasi laporan keuangan dalam kondisi deadline ketat?"</i>`
      );
    }
    if (/\b(hr|sdm|hrd|people|rekrutmen|recruitment|talent|hris|payroll|industrial relation)\b/.test(title)) {
      return (
        `🎯 <b>Tips Interview: ${jobTitle}</b>\n\n` +
        `• Pelajari proses rekrutmen end-to-end: sourcing, screening, interview, offering.\n` +
        `• Kuasai dasar hukum ketenagakerjaan Indonesia (UU Cipta Kerja, Perjanjian Kerja).\n` +
        `• Tunjukkan empati dan kemampuan komunikasi — ceritakan pengalaman menangani konflik atau negosiasi.\n` +
        `• Kenali tools HRIS yang umum dipakai (Talenta, Mekari, SAP SuccessFactors).\n\n` +
        `💡 Pertanyaan andalan: <i>"Bagaimana cara kamu menarik kandidat terbaik dalam pasar tenaga kerja yang kompetitif?"</i>`
      );
    }
    if (/\b(tech|it|software|developer|engineer|backend|frontend|fullstack|devops|cloud|cyber|security|network)\b/.test(title)) {
      return (
        `🎯 <b>Tips Interview: ${jobTitle}</b>\n\n` +
        `• Latih soal <b>algoritma dan struktur data</b> di LeetCode atau HackerRank (minimal level Easy–Medium).\n` +
        `• Siapkan penjelasan proyek GitHub-mu: arsitektur, keputusan teknis, dan apa yang kamu pelajari.\n` +
        `• Tunjukkan kemampuan debug: ceritakan bug paling sulit yang pernah kamu pecahkan.\n` +
        `• Pelajari konsep dasar sistem: REST API, database, caching, dan deployment.\n\n` +
        `💡 Pertanyaan andalan: <i>"Jelaskan trade-off teknis yang pernah kamu hadapi dan bagaimana kamu memutuskan solusinya."</i>`
      );
    }
    // Fallback umum
    return (
      `🎯 <b>Tips Interview: ${jobTitle}</b>\n\n` +
      `• Pelajari <b>profil perusahaan</b> secara mendalam — produk, nilai, berita terbaru, dan kompetitornya.\n` +
      `• Siapkan jawaban STAR (Situasi, Tugas, Aksi, Hasil) untuk pertanyaan behavioral umum.\n` +
      `• Bawa pertanyaan balik yang menunjukkan ketertarikan tulus pada peran ini.\n` +
      `• Latih jawaban untuk: <i>"Ceritakan tentang dirimu"</i>, <i>"Kelebihan dan kelemahanmu"</i>, <i>"Di mana kamu 5 tahun lagi?"</i>\n\n` +
      `💡 Tip: Tiba 10 menit lebih awal (virtual: cek koneksi & kamera) dan berpakaian satu tingkat lebih formal dari budaya perusahaan.`
    );
  },
} satisfies Record<string, unknown>);

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
