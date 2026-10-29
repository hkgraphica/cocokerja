import { extractText, getDocumentProxy } from "unpdf";
import { repos } from "@/adapters/db/repos";
import type { TgUpdate } from "@/adapters/telegram";
import { fetchJobPage } from "@/adapters/webpage";
import { env } from "@/config/env";
import { parseCv } from "@/core/cv";
import { encrypt, decrypt } from "@/core/crypto";
import { looksLikeBlockedPage } from "@/core/jobs";
import { verifyTailor } from "@/core/tailor";
import { CONSENT_VERSION, escapeHtml, jobCard, MSG, sanitizeTelegramHtml } from "@/core/messages";
import { PLANS } from "@/core/plans";
import { parseLevel, parseLocation, parseRoles } from "@/core/profile";
import { heuristicScore, mergeLlmScore } from "@/core/scoring";
import type { Messenger } from "@/ports";

type Message = NonNullable<TgUpdate["message"]>;
const MAX_PDF = 5 * 1024 * 1024;

/** Tombol aksi di bawah kartu lowongan. Tombol Lamar hanya ada bila lowongan punya URL asli. */
export const feedbackButtons = (matchId: string, url?: string) => [
  ...(url ? [[{ text: "🔗 Lamar", url }]] : []),
  [
    { text: "📊 Skill gap", data: `gap:${matchId}` },
    { text: "💾 Simpan", data: `track:${matchId}` },
  ],
  [{ text: "✍️ Sesuaikan CV", data: `tlr:${matchId}` }],
  [
    { text: "👍 Cocok", data: `fb:good:${matchId}` },
    { text: "👎 Tidak relevan", data: `fb:bad:${matchId}` },
  ],
];

export async function handleUpdate(update: TgUpdate, messenger: Messenger): Promise<void> {
  if (!(await repos.markUpdate(update.update_id))) return; // retry Telegram
  if (update.callback_query) return handleCallback(update.callback_query, messenger);
  if (update.channel_post) return handleChannelPost(update.channel_post);
  if (update.message) return handleMessage(update.message, messenger);
}

/** Opsi 4: Otomatis panen lowongan dari Telegram Channel/Group Komunitas Loker */
async function handleChannelPost(post: NonNullable<TgUpdate["channel_post"]>) {
  const text = post.text?.trim() ?? "";
  if (text.length < 50) return;

  const firstLine = text.split("\n")[0].slice(0, 100);
  const title = (firstLine.match(/^(?:lowongan(?:\s+kerja)?|loker|we(?:'re|\s+are)\s+hiring|dicari|posisi)\s*[:\-–]?\s*(.+)/i)?.[1] || firstLine)
    .replace(/[#*]/g, "").trim();
  const companyMatch = text.match(/(?:di|pt|cv|startup|perusahaan|at)\s+([a-zA-Z0-9\s.,]+)/i);
  const company = companyMatch ? companyMatch[1].split("\n")[0].slice(0, 80).trim() : (post.chat.title || "Telegram Channel");
  const locMatch = text.match(/(?:lokasi|penempatan|domisili)\s*[:\-–]?\s*([a-zA-Z0-9\s.,]+)/i);
  const location = locMatch ? locMatch[1].split("\n")[0].slice(0, 80).trim() : (/\bremote\b/i.test(text) ? "Remote" : "Indonesia");
  const urlMatch = text.match(/https?:\/\/[^\s]+/i);
  const url = urlMatch ? urlMatch[0] : (post.chat.username ? `https://t.me/${post.chat.username}/${post.message_id}` : `https://t.me/c/${Math.abs(post.chat.id)}/${post.message_id}`);

  const { jobHash, looksSuspicious } = await import("@/core/jobs");
  await repos.insertJob({
    source: `telegram:@${post.chat.username || post.chat.title || "community"}`,
    externalId: `tg-${post.chat.id}-${post.message_id}`,
    title: title || "Lowongan Komunitas",
    company: company || "Perusahaan",
    location: location || "Indonesia",
    description: text.slice(0, 8000),
    url,
    suspicious: looksSuspicious(text),
    hash: jobHash(title, company, location),
  });
}

/** Cek apakah teks pesan pengguna adalah link lowongan atau posting deskripsi pekerjaan */
function looksLikeJobInput(text: string): boolean {
  if (/https?:\/\/(?:www\.)?(?:linkedin\.com\/jobs|jobstreet\.|glints\.com|kalibrr\.com|kitalulus\.com|dealls\.com|indeed\.com)[^\s]+/i.test(text)) {
    return true;
  }
  const isJobKeyword = /\b(we are hiring|lowongan|kualifikasi|persyaratan|requirements|job description|responsibilities|tanggung jawab|kriteria|salary|gaji|fresh graduate welcome)\b/i.test(text);
  return isJobKeyword && text.length > 80;
}

/** Nama host untuk ditampilkan sebagai "perusahaan" bila halaman tidak menyebutkannya. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function handleOnDemandJobCheck(text: string, user: { id: string; tier: string; threshold: number }, chatId: string, tg: Messenger) {
  const p = await repos.getProfile(user.id);
  if (!p) return tg.send(chatId, "Profilmu belum lengkap. Ketik /start untuk mengunggah CV terlebih dahulu.");

  const url = text.match(/https?:\/\/[^\s]+/i)?.[0] ?? null;
  const pasted = text.replace(/https?:\/\/[^\s]+/gi, " ").replace(/\s+/g, " ").trim();

  await tg.send(chatId, "🔍 <i>Sedang menganalisis kecocokan lowongan dengan profilmu...</i>");

  // Halaman dibaca dengan pengamanan SSRF. Halaman login/captcha dianggap gagal, bukan dinilai sebagai lowongan.
  let page = url ? await fetchJobPage(url).catch(() => null) : null;
  if (page && looksLikeBlockedPage(page.title, page.description)) page = null;

  if (!page && pasted.length < 80) {
    return tg.send(
      chatId,
      "Saya belum bisa membaca isi halaman itu (biasanya karena perlu login atau diblokir). Tempel <b>teks lowongannya</b> di sini, ya.",
    );
  }

  const { jobHash, looksSuspicious } = await import("@/core/jobs");
  const firstLine = text.split("\n").map((l) => l.replace(/https?:\/\/[^\s]+/gi, "").replace(/[*#]/g, "").trim()).find(Boolean) ?? "Lowongan";
  const title = (page?.title || firstLine).slice(0, 100);
  const company = page?.company || (url ? hostOf(url) : "") || "Tidak disebut";
  const location = page?.location ?? "";
  const description = [pasted, page?.description].filter(Boolean).join("\n").slice(0, 8000);

  // Status "private": lowongan kiriman pengguna tidak boleh ikut dikirim sebagai alert ke pengguna lain.
  const { job } = await repos.upsertJob({
    source: "user_ondemand",
    title,
    company,
    location,
    description,
    url: url ?? "https://t.me/cocokerja_bot",
    suspicious: looksSuspicious(`${text} ${description}`),
    status: "private",
    hash: jobHash(title, company, location + (url ?? pasted.slice(0, 300))),
  });

  const profileData = {
    skills: p.skills,
    education: p.education,
    preferences: p.preferences as import("@/core/types").Preferences,
  };

  let scoreRes = heuristicScore(profileData, job);
  let scoredBy = "heuristic";
  let note = "";

  // Penilaian LLM memakai kuota chat (aksi yang dipicu pengguna). Kuota habis → tetap dijawab dengan skor standar.
  if (env().LLM_API_KEY) {
    const plan = PLANS[user.tier as "free" | "premium"];
    const usage = await repos.getUsage(user.id);
    if (usage.chatCallsUsed < plan.chatPerWeek) {
      try {
        const { OpenAiCompatScorer } = await import("@/adapters/llm");
        const refined = await new OpenAiCompatScorer().score(profileData, job);
        if (refined) {
          scoreRes = mergeLlmScore(scoreRes, refined);
          scoredBy = "llm";
          await repos.addUsage(user.id, { chat: 1 });
        }
      } catch {
        // fallback ke heuristik
      }
    } else {
      note = "\n\n<i>Kuota analisis AI minggu ini habis, jadi skor memakai penilaian standar.</i>";
    }
  }

  // id match dipakai untuk tombol aksi; upsert juga menyegarkan skor bila lowongan yang sama dicek ulang.
  const matchId = await repos.upsertMatch({
    userId: user.id,
    jobId: job.id,
    score: scoreRes.score,
    scoreComponents: scoreRes.components,
    reasons: scoreRes.reasons,
    gaps: scoreRes.gaps,
    scoredBy,
    sentAt: new Date(),
  });

  await repos.track("ondemand_job_checked", user.id, { score: scoreRes.score, by: scoredBy, page: Boolean(page) });

  const card = jobCard(job, scoreRes, job.suspicious);
  return tg.send(chatId, `🎯 <b>Hasil Analisis Lowongan Instan:</b>\n\n${card}${note}`, feedbackButtons(matchId, url ?? undefined));
}

async function handleMessage(m: Message, tg: Messenger) {
  const chatId = String(m.chat.id);
  const user = await repos.upsertUser("telegram", chatId);
  const text = m.text?.trim() ?? "";

  if (text.startsWith("/")) return handleCommand(text, user.id, user.state, chatId, tg);

  switch (user.state) {
    case "new":
      return startOnboarding(chatId, user.id, tg);
    case "consent":
      return tg.send(chatId, MSG.needConsent);
    case "cv":
      return handleCv(m, user.id, chatId, tg);
    case "role": {
      // Deteksi input pendidikan yang salah masuk ke field peran
      const looksLikeEducation = /^(pendidikan|education|s1|s2|d3|d4|sarjana|bachelor|master|universitas|jurusan|prodi)/i.test(text);
      const roles = parseRoles(text);
      if (!roles.length || looksLikeEducation) {
        const hint = looksLikeEducation
          ? "Sepertinya kamu memasukkan pendidikan — yang ini sudah tercatat dari CV-mu 😊\n\n"
          : "";
        return tg.send(chatId,
          hint + "Tuliskan <b>peran kerja</b> yang kamu cari. Pisahkan dengan koma jika lebih dari satu.\n"
          + "Contoh: <code>staff keuangan, accounting officer</code>\n"
          + "atau: <code>marketing, social media specialist</code>"
        );
      }
      await repos.patchPreferences(user.id, { roles });
      await repos.setState(user.id, "location");
      return tg.send(chatId, MSG.askLocation);
    }
    case "location": {
      const loc = parseLocation(text);
      if (!loc.location && !loc.remote) return tg.send(chatId, MSG.askLocation);
      await repos.patchPreferences(user.id, loc);
      await repos.setState(user.id, "level");
      return askLevel(chatId, tg);
    }
    case "level":
      return askLevel(chatId, tg);
    default: {
      if (looksLikeJobInput(text)) {
        return handleOnDemandJobCheck(text, user, chatId, tg);
      }

      // User aktif yang mengirim pesan chat bebas
      const p = await repos.getProfile(user.id);
      if (!p) {
        return tg.send(chatId, "Profilmu belum lengkap. Ketik /start untuk memperbarui data.");
      }

      // Deteksi cepat jika user bertanya tentang jadwal / jam kirim notifikasi
      if (/((jam|kapan|waktu|pukul)\s+(berapa|saja)?.*(notif|loker|alert|kirim)|setiap\s+jam)/i.test(text)) {
        return tg.send(
          chatId,
          "⏰ <b>Jadwal Job Alert CocoKerja:</b>\n\n" +
          "CocoKerja secara otomatis memindai dan mengirimkan lowongan terkurasi setiap hari kerja pada pukul <b>08:00 WIB</b> jika ada lowongan yang mencapai skor kecocokan dengan CV-mu.\n\n" +
          "💡 <i>Tips:</i> Kamu juga bisa langsung mengecek lowongan sendiri kapan saja dengan mengirimkan link atau teks lowongan ke chat ini!"
        );
      }

      // Deteksi cepat jika user bertanya apakah ada loker cocok / temukan lowongan
      if (/(apakah.*(ada|ditemukan).*loker|ada.*loker.*(cocok|baru)|rekomendasi.*loker|cari.*loker)/i.test(text)) {
        const candidates = await repos.candidateJobs(user.id, p.preferences.roles ?? []);
        if (candidates.length > 0) {
          const topCandidates = candidates.slice(0, 3);
          const list = topCandidates
            .map((j, i) => `${i + 1}. <b>${escapeHtml(j.title)}</b> — ${escapeHtml(j.company)} (${escapeHtml(j.location || "Indonesia")})\n🔗 <a href="${j.url}">Lihat Detail</a>`)
            .join("\n\n");
          return tg.send(
            chatId,
            `🎯 <b>Lowongan aktif yang relevan di radar CocoKerja:</b>\n\n${list}\n\n` +
            `Kirimkan link loker di atas ke sini jika ingin saya hitung skor kecocokan detailnya dengan CV kamu!`
          );
        } else {
          return tg.send(
            chatId,
            "🔍 Belum ada lowongan baru yang melampaui ambang batas skor profilmu saat ini.\n\n" +
            "Sistem terus memantau feed secara otomatis setiap hari. Kamu juga bisa memperbarui peran incaranmu dengan mengetik <code>/ubah peran [nama posisi]</code> atau mengecek profilmu dengan <code>/profil</code>."
          );
        }
      }

      const plan = PLANS[user.tier as "free" | "premium"];
      const currentUsage = await repos.getUsage(user.id);
      if (currentUsage.chatCallsUsed >= plan.chatPerWeek) {
        return tg.send(
          chatId,
          `⚠️ Kuota konsultasi AI minggu ini sudah habis (${plan.chatPerWeek} chat). Kuota direset setiap hari Senin.`,
        );
      }

      if (env().LLM_API_KEY) {
        const { OpenAiCompatScorer } = await import("@/adapters/llm");
        const llm = new OpenAiCompatScorer();
        const profileData = {
          skills: p.skills,
          education: p.education,
          preferences: p.preferences as import("@/core/types").Preferences,
        };

        const answer = await llm.chatCareerAdvice(profileData, text);
        if (answer) {
          // Sanitasi keluaran LLM; kuota dipotong hanya setelah jawaban benar-benar terkirim.
          await tg.send(chatId, sanitizeTelegramHtml(answer));
          await repos.addUsage(user.id, { chat: 1 });
          await repos.track("chat_copilot", user.id, { textLength: text.length });
          return;
        }
      }

      return tg.send(
        chatId,
        "Saya terus memantau lowongan yang cocok untuk profilmu. Jika ingin konsultasi karier lebih lanjut atau mengecek status, ketik /bantuan atau /status.",
      );
    }
  }
}

const askLevel = (chatId: string, tg: Messenger) =>
  tg.send(chatId, MSG.askLevel, [[
    { text: "Fresh graduate", data: "lvl:fresh" },
    { text: "Magang", data: "lvl:magang" },
    { text: "Semua level", data: "lvl:any" },
  ]]);

/**
 * Pipeline matching & notifikasi ringan untuk satu pengguna baru yang baru selesai onboarding.
 * Dijalankan di background tanpa menghambat respons bot. Gagal diam-diam agar tidak mengganggu UX.
 */
async function triggerInstantMatch(userId: string, threshold: number, chatId: string, tg: Messenger) {
  const [profile, user] = await Promise.all([repos.getProfile(userId), repos.upsertUser("telegram", chatId)]);
  if (!profile) return;

  const prefs = profile.preferences as import("@/core/types").Preferences;
  const data = { skills: profile.skills, education: profile.education, preferences: prefs };
  const candidates = await repos.candidateJobs(userId, prefs.roles ?? []);
  if (!candidates.length) return;

  const scored = candidates
    .map((job) => ({ job, r: heuristicScore(data, job) as import("@/core/types").ScoreResult }))
    .filter(({ r }) => r.score >= threshold)
    .sort((a, b) => b.r.score - a.r.score)
    .slice(0, 3); // Maksimal 3 alert instan saat onboarding baru

  if (!scored.length) return;

  await tg.send(chatId, `🎯 <b>Saya sudah menemukan ${scored.length} lowongan yang cocok untukmu!</b>`);

  const { PLANS } = await import("@/core/plans");
  const plan = PLANS[user.tier as import("@/core/types").Tier];
  const usage = await repos.getUsage(userId);
  const alertQuota = plan.alertsPerWeek - usage.alertsUsed;
  const toSend = scored.slice(0, Math.min(alertQuota, scored.length));

  for (const { job, r } of toSend) {
    const matchId = await repos.upsertMatch({
      userId,
      jobId: job.id,
      score: r.score,
      scoreComponents: r.components,
      reasons: r.reasons,
      gaps: r.gaps,
      scoredBy: "heuristic",
      sentAt: new Date(),
    });
    const { jobCard: jc } = await import("@/core/messages");
    await tg.send(chatId, jc(job, r, job.suspicious), feedbackButtons(matchId, job.url));
    await repos.track("alert_sent", userId, { score: r.score, by: "heuristic", trigger: "onboarding" });
    await repos.addUsage(userId, { alerts: 1 });
    await new Promise((res) => setTimeout(res, 1100));
  }
}



async function startOnboarding(chatId: string, userId: string, tg: Messenger) {
  await repos.setState(userId, "consent");
  await repos.track("onboarding_started", userId);
  await tg.send(chatId, MSG.consent, [[{ text: "✅ Setuju", data: "consent:yes" }]]);
}

async function handleCv(m: Message, userId: string, chatId: string, tg: Messenger) {
  let cvText = "";
  try {
    if (m.document) {
      if ((m.document.file_size ?? 0) > MAX_PDF || m.document.mime_type !== "application/pdf") {
        return tg.send(chatId, MSG.cvFailed);
      }
      const pdf = await getDocumentProxy(await tg.downloadFile(m.document.file_id));
      cvText = (await extractText(pdf, { mergePages: true })).text;
    } else {
      cvText = m.text ?? "";
    }
  } catch {
    return tg.send(chatId, MSG.cvFailed);
  }
  cvText = cvText.trim();
  if (cvText.length < 80) return tg.send(chatId, m.document ? MSG.cvFailed : MSG.askCv);

  const parsed = parseCv(cvText);
  // Pengguna lama yang memperbarui CV (/cv) sudah punya preferensi: jangan ulangi onboarding.
  const prev = await repos.getProfile(userId);
  const isUpdate = Boolean(prev?.preferences.roles.length);
  await repos.saveProfile(userId, { ...parsed, cvEnc: encrypt(cvText.slice(0, 20000), env().ENCRYPTION_KEY) });
  await repos.setState(userId, isUpdate ? "active" : "role");
  await repos.track(isUpdate ? "cv_updated" : "cv_parsed", userId, { skills: parsed.skills.length });

  const skills = parsed.skills.length ? parsed.skills.map(escapeHtml).join(", ") : "<i>belum terdeteksi</i>";
  await tg.send(chatId, `📄 CV ${isUpdate ? "diperbarui" : "diterima"}.\n<b>Skill terdeteksi:</b> ${skills}\n<b>Pendidikan:</b> ${escapeHtml(parsed.education || "-")}`);
  if (isUpdate) return tg.send(chatId, "✅ Alert dilanjutkan dengan profil terbaru. Ketik /profil untuk melihatnya.");
  await tg.send(chatId, MSG.askRole);
}

async function handleCommand(text: string, userId: string, state: string, chatId: string, tg: Messenger) {
  const [cmd, arg] = text.split(/\s+/, 2);
  switch (cmd.split("@")[0].toLowerCase()) {
    case "/start": {
      // Aktif DAN punya profil = sudah terdaftar. Aktif tanpa profil (data tidak lengkap) boleh mengulang.
      if (state === "active" && (await repos.getProfile(userId))) return tg.send(chatId, "Kamu sudah terdaftar. Ketik /bantuan untuk perintah.");
      return startOnboarding(chatId, userId, tg);
    }
    case "/cv":
      if (state !== "active") return tg.send(chatId, "Selesaikan pendaftaran dulu dengan /start.");
      await repos.setState(userId, "cv");
      return tg.send(chatId, `${MSG.askCv}\n\n<i>Alert dijeda sampai CV baru diterima. Ketik /batal untuk membatalkan.</i>`);
    case "/batal": {
      const p = await repos.getProfile(userId);
      if (state === "cv" && p?.preferences.roles.length) {
        await repos.setState(userId, "active");
        return tg.send(chatId, "Dibatalkan. CV lamamu tetap dipakai dan alert dilanjutkan.");
      }
      return tg.send(chatId, "Tidak ada yang perlu dibatalkan.");
    }
    case "/ubah": {
      const usage = "Contoh:\n<code>/ubah peran data analyst, bi analyst</code>\n<code>/ubah lokasi jakarta, bandung remote</code>\n<code>/ubah level fresh</code> (fresh | magang | any)";
      const p = await repos.getProfile(userId);
      if (state !== "active" || !p) return tg.send(chatId, "Selesaikan pendaftaran dulu dengan /start.");
      const [field = "", ...words] = text.replace(/^\S+\s*/, "").split(/\s+/);
      const value = words.join(" ").trim();
      switch (field.toLowerCase()) {
        case "peran": {
          const roles = parseRoles(value);
          if (!roles.length) return tg.send(chatId, usage);
          await repos.patchPreferences(userId, { roles });
          return tg.send(chatId, `✅ Peran diubah: <b>${escapeHtml(roles.join(", "))}</b>`);
        }
        case "lokasi": {
          const loc = parseLocation(value);
          if (!loc.location && !loc.remote) return tg.send(chatId, usage);
          await repos.patchPreferences(userId, loc);
          return tg.send(chatId, `✅ Lokasi diubah: <b>${escapeHtml(loc.location || "-")}</b>${loc.remote ? " (+remote)" : ""}`);
        }
        case "level": {
          const level = parseLevel(value);
          if (!level) return tg.send(chatId, usage);
          await repos.patchPreferences(userId, { level });
          return tg.send(chatId, `✅ Level diubah: <b>${level}</b>`);
        }
        default:
          return tg.send(chatId, usage);
      }
    }
    case "/bantuan":
    case "/help":
      return tg.send(chatId, MSG.help);
    case "/status": {
      const [u, usage] = await Promise.all([repos.upsertUser("telegram", chatId), repos.getUsage(userId)]);
      const plan = PLANS[u.tier as "free" | "premium"];
      return tg.send(chatId, `Paket: <b>${u.tier}</b>\nAlert minggu ini: ${usage.alertsUsed}/${plan.alertsPerWeek}\nAmbang skor: ${u.threshold}%`);
    }
    case "/ambang": {
      const n = Number(arg);
      if (!Number.isInteger(n) || n < 30 || n > 95) return tg.send(chatId, "Gunakan: <code>/ambang 70</code> (30-95)");
      await repos.setThreshold(userId, n);
      return tg.send(chatId, `Ambang skor diatur ke ${n}%.`);
    }
    case "/profil": {
      const p = await repos.getProfile(userId);
      if (!p) return tg.send(chatId, "Belum ada profil. Ketik /start.");
      const pr = p.preferences;
      return tg.send(chatId, `<b>Skill:</b> ${escapeHtml(p.skills.join(", ") || "-")}\n<b>Peran:</b> ${escapeHtml(pr.roles.join(", ") || "-")}\n<b>Lokasi:</b> ${escapeHtml(pr.location || "-")}${pr.remote ? " (+remote)" : ""}\n<b>Level:</b> ${pr.level}`);
    }
    case "/hapus":
      if (arg?.toLowerCase() !== "ya") return tg.send(chatId, MSG.deleteConfirm);
      await repos.track("user_deleted", null);
      await repos.deleteUser(userId);
      return tg.send(chatId, MSG.deleted);
    default:
      return tg.send(chatId, MSG.help);
  }
}

async function handleCallback(cb: NonNullable<TgUpdate["callback_query"]>, tg: Messenger) {
  const chatId = cb.message ? String(cb.message.chat.id) : null;
  if (!chatId || !cb.data) return tg.answerCallback(cb.id);
  const user = await repos.upsertUser("telegram", chatId);
  const [kind, a, b] = cb.data.split(":");

  if (kind === "consent" && user.state === "consent") {
    await repos.giveConsent(user.id, CONSENT_VERSION);
    await tg.answerCallback(cb.id, "Terima kasih!");
    return tg.send(chatId, MSG.askCv);
  }
  if (kind === "lvl" && user.state === "level") {
    const level = parseLevel(a ?? "");
    if (!level) return tg.answerCallback(cb.id);
    await repos.patchPreferences(user.id, { level });
    await repos.setState(user.id, "active");
    await repos.track("onboarding_done", user.id);
    await tg.answerCallback(cb.id);
    await tg.send(chatId, MSG.done);
    // Trigger matching instan: jalankan pipeline ringan hanya untuk user ini di background
    triggerInstantMatch(user.id, user.threshold, chatId, tg).catch((e) =>
      console.error("instant_match_gagal", e instanceof Error ? e.message : e)
    );
    return;
  }

  const matchId = kind === "fb" ? b : a;
  const row = matchId ? await repos.getMatch(matchId, user.id) : null;
  if (!row) return tg.answerCallback(cb.id, "Data tidak ditemukan");

  if (kind === "fb" && (a === "good" || a === "bad")) {
    await repos.setFeedback(row.match.id, user.id, a);
    await repos.track("alert_feedback", user.id, { value: a, score: row.match.score });
    return tg.answerCallback(cb.id, a === "good" ? "Terima kasih! 👍" : "Dicatat, saya perbaiki 👎");
  }
  if (kind === "track") {
    await repos.saveApplication(user.id, row.job.id);
    return tg.answerCallback(cb.id, "Disimpan ke tracker 💾");
  }
  if (kind === "gap") {
    await tg.answerCallback(cb.id);
    const gaps = row.match.gaps.length ? row.match.gaps.map((g) => `• ${escapeHtml(g)}`).join("\n") : "Tidak ada kekurangan berarti 🎉";
    return tg.send(chatId, `<b>Skill gap — ${escapeHtml(row.job.title)}</b>\nKecocokan ${row.match.score}%\n${gaps}`);
  }
  if (kind === "tlr") return handleTailor(cb.id, row, user, chatId, tg);
  return tg.answerCallback(cb.id);
}

async function handleTailor(
  cbId: string,
  row: NonNullable<Awaited<ReturnType<typeof repos.getMatch>>>,
  user: { id: string; tier: string },
  chatId: string,
  tg: Messenger,
) {
  const plan = PLANS[user.tier as "free" | "premium"];
  const usage = await repos.getUsage(user.id);
  if (usage.chatCallsUsed >= plan.chatPerWeek) {
    return tg.answerCallback(cbId, `Kuota AI minggu ini habis (${plan.chatPerWeek}).`);
  }
  const profile = await repos.getProfile(user.id);
  if (!profile?.cvEnc || !env().LLM_API_KEY) return tg.answerCallback(cbId, "Fitur belum tersedia.");
  await tg.answerCallback(cbId, "Menyusun CV...");

  const cvText = decrypt(profile.cvEnc, env().ENCRYPTION_KEY);
  const { OpenAiCompatScorer } = await import("@/adapters/llm");
  const draft = await new OpenAiCompatScorer().tailorCv(cvText, row.job);
  if (!draft) return tg.send(chatId, "Maaf, AI sedang sibuk. Coba lagi beberapa menit lagi.");

  const r = verifyTailor(draft, cvText);
  await repos.addUsage(user.id, { chat: 1 });
  await repos.track("cv_tailored", user.id, { kept: r.highlights.length, dropped: r.dropped });
  if (!r.highlights.length) {
    return tg.send(chatId, "Belum ada bagian CV yang bisa dibuktikan relevan untuk lowongan ini. Coba lowongan lain atau lengkapi CV-mu.");
  }
  const lines = [
    `<b>CV untuk ${escapeHtml(row.job.title)} — ${escapeHtml(row.job.company)}</b>`,
    `\n<b>Ringkasan</b>\n${escapeHtml(r.summary)}`,
    `\n<b>Sorotan (semua berasal dari CV-mu)</b>\n${r.highlights.map((h) => `• ${escapeHtml(h)}`).join("\n")}`,
  ];
  if (r.missingKeywords.length) {
    lines.push(`\n<b>Diminta lowongan tapi tidak ada di CV</b>\n${r.missingKeywords.map(escapeHtml).join(", ")}\n<i>Jangan diklaim kecuali benar-benar kamu kuasai.</i>`);
  }
  return tg.send(chatId, lines.join("\n"));
}

export { jobCard };
