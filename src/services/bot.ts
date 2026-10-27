import { extractText, getDocumentProxy } from "unpdf";
import { repos } from "@/adapters/db/repos";
import type { TgUpdate } from "@/adapters/telegram";
import { env } from "@/config/env";
import { parseCv } from "@/core/cv";
import { encrypt } from "@/core/crypto";
import { CONSENT_VERSION, escapeHtml, jobCard, MSG } from "@/core/messages";
import { PLANS } from "@/core/plans";
import type { Level } from "@/core/types";
import type { Messenger } from "@/ports";

type Message = NonNullable<TgUpdate["message"]>;
const MAX_PDF = 5 * 1024 * 1024;

export const feedbackButtons = (matchId: string, url: string) => [
  [{ text: "🔗 Lamar", url }],
  [
    { text: "📊 Skill gap", data: `gap:${matchId}` },
    { text: "💾 Simpan", data: `track:${matchId}` },
  ],
  [
    { text: "👍 Cocok", data: `fb:good:${matchId}` },
    { text: "👎 Tidak relevan", data: `fb:bad:${matchId}` },
  ],
];

export async function handleUpdate(update: TgUpdate, messenger: Messenger): Promise<void> {
  if (!(await repos.markUpdate(update.update_id))) return; // retry Telegram
  if (update.callback_query) return handleCallback(update.callback_query, messenger);
  if (update.message) return handleMessage(update.message, messenger);
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
      const roles = text.split(",").map((r) => r.trim().toLowerCase()).filter(Boolean).slice(0, 5);
      if (!roles.length) return tg.send(chatId, MSG.askRole);
      await repos.patchPreferences(user.id, { roles });
      await repos.setState(user.id, "location");
      return tg.send(chatId, MSG.askLocation);
    }
    case "location": {
      if (!text) return tg.send(chatId, MSG.askLocation);
      const remote = /\bremote\b/i.test(text);
      await repos.patchPreferences(user.id, { location: text.replace(/\bremote\b/i, "").replace(/[,/&]+/g, " ").trim().toLowerCase(), remote });
      await repos.setState(user.id, "level");
      return askLevel(chatId, tg);
    }
    case "level":
      return askLevel(chatId, tg);
    default:
      return tg.send(chatId, "Saya terus memantau lowongan untukmu. Ketik /bantuan untuk daftar perintah.");
  }
}

const askLevel = (chatId: string, tg: Messenger) =>
  tg.send(chatId, MSG.askLevel, [[
    { text: "Fresh graduate", data: "lvl:fresh" },
    { text: "Magang", data: "lvl:magang" },
    { text: "Semua level", data: "lvl:any" },
  ]]);

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
  await repos.saveProfile(userId, { ...parsed, cvEnc: encrypt(cvText.slice(0, 20000), env().ENCRYPTION_KEY) });
  await repos.setState(userId, "role");
  await repos.track("cv_parsed", userId, { skills: parsed.skills.length });

  const skills = parsed.skills.length ? parsed.skills.map(escapeHtml).join(", ") : "<i>belum terdeteksi</i>";
  await tg.send(chatId, `📄 CV diterima.\n<b>Skill terdeteksi:</b> ${skills}\n<b>Pendidikan:</b> ${escapeHtml(parsed.education || "-")}`);
  await tg.send(chatId, MSG.askRole);
}

async function handleCommand(text: string, userId: string, state: string, chatId: string, tg: Messenger) {
  const [cmd, arg] = text.split(/\s+/, 2);
  switch (cmd.split("@")[0].toLowerCase()) {
    case "/start":
      if (state === "active") return tg.send(chatId, "Kamu sudah terdaftar. Ketik /bantuan untuk perintah.");
      return startOnboarding(chatId, userId, tg);
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
    await repos.patchPreferences(user.id, { level: a as Level });
    await repos.setState(user.id, "active");
    await repos.track("onboarding_done", user.id);
    await tg.answerCallback(cb.id);
    return tg.send(chatId, MSG.done);
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
  return tg.answerCallback(cb.id);
}

export { jobCard };
