import { repos } from "@/adapters/db/repos";
import { isBlockedError } from "@/adapters/telegram";
import { mapLimit } from "@/core/concurrency";
import { jobHash, looksSuspicious } from "@/core/jobs";
import { jobCard } from "@/core/messages";
import { PLANS } from "@/core/plans";
import { heuristicScore } from "@/core/scoring";
import type { Preferences, ScoreResult, Tier } from "@/core/types";
import type { JobSource, LlmScorer, Messenger } from "@/ports";
import { feedbackButtons } from "./bot";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const LLM_TOP_N = 8;
/** Konkurensi terbatas: cukup cepat, tetap sopan ke sumber eksternal/LLM/Telegram. */
const SOURCE_CONCURRENCY = 4;
const LLM_CONCURRENCY = 4;
const ALERT_USER_CONCURRENCY = 4;
const LINK_CHECK_CONCURRENCY = 8;

const UA = { "user-agent": "CocoKerjaBot/0.1" };

/** Lowongan dianggap tutup hanya jika server menjawab 404/410. Gagal jaringan/timeout = anggap masih buka. */
async function probe(url: string, method: "HEAD" | "GET"): Promise<number> {
  const res = await fetch(url, { method, redirect: "follow", signal: AbortSignal.timeout(5000), headers: UA });
  void res.body?.cancel().catch(() => {}); // jangan unduh isi halaman
  return res.status;
}

async function isJobGone(url: string): Promise<boolean> {
  try {
    // HEAD hemat bandwidth; bila ditolak/tidak didukung/404 (sebagian server salah menjawab), konfirmasi dengan GET.
    const head = await probe(url, "HEAD").catch(() => 0);
    if (head >= 200 && head < 400) return false;
    const status = await probe(url, "GET");
    return status === 404 || status === 410;
  } catch {
    return false;
  }
}

/** 1) Ingestion: ambil paralel, normalisasi, dedup, simpan massal. Satu sumber gagal tidak menghentikan yang lain. */
export async function ingest(sources: JobSource[]) {
  const stats = { fetched: 0, inserted: 0, errors: [] as string[] };

  const results = await mapLimit(sources, SOURCE_CONCURRENCY, async (src) => {
    const rows = new Map<string, Parameters<typeof repos.insertJobs>[0][number]>();
    for (const raw of await src.fetch()) {
      if (!raw.title || !raw.url) continue;
      const hash = jobHash(raw.title, raw.company, raw.location);
      if (rows.has(hash)) continue; // dedup di dalam batch
      rows.set(hash, {
        source: src.name,
        externalId: raw.externalId,
        title: raw.title.slice(0, 200),
        company: raw.company.slice(0, 200),
        location: raw.location.slice(0, 200),
        description: raw.description.slice(0, 8000),
        url: raw.url,
        suspicious: looksSuspicious(`${raw.title} ${raw.description}`),
        hash,
      });
    }
    stats.fetched += rows.size;
    stats.inserted += await repos.insertJobs([...rows.values()]);
  });

  for (const r of results) {
    if (r.status === "rejected") stats.errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
  }
  await repos.expireOldJobs();
  return stats;
}

/** 2) Matching: filter SQL → skor heuristik → LLM hanya untuk kandidat teratas (kontrol biaya). */
export async function runMatching(llm: LlmScorer | null, deadline: number) {
  let created = 0;
  for (const { user, profile } of await repos.activeUsers()) {
    if (Date.now() > deadline) break;
    const prefs = profile.preferences as Preferences;
    const data = { skills: profile.skills, education: profile.education, preferences: prefs };
    const candidates = await repos.candidateJobs(user.id, prefs.roles ?? []);

    const scored = candidates
      .map((job) => ({ job, r: heuristicScore(data, job) as ScoreResult, by: "heuristic" }))
      .sort((a, b) => b.r.score - a.r.score);

    const plan = PLANS[user.tier as Tier];
    const usage = await repos.getUsage(user.id);
    const llmLeft = plan.llmPerWeek - usage.llmCallsUsed;

    // Terurut menurun, jadi cukup potong kandidat teratas yang lolos ambang & kuota.
    const eligible = llm && llmLeft > 0
      ? scored.slice(0, LLM_TOP_N).filter((i) => i.r.score >= user.threshold - 15).slice(0, llmLeft)
      : [];
    let llmUsed = 0;
    await mapLimit(eligible, LLM_CONCURRENCY, async (item) => {
      if (Date.now() > deadline) return;
      llmUsed++;
      const refined = await llm!.score(data, item.job);
      if (refined) {
        // Komponen terstruktur tetap dari heuristik (auditable); alasan & skor dari LLM.
        item.r = { ...refined, components: item.r.components };
        item.by = "llm";
      }
    });
    if (llmUsed) await repos.addUsage(user.id, { llm: llmUsed });

    // Simpan hampir-cocok juga (untuk ubah ambang), dalam satu batch insert.
    const rows = scored
      .filter(({ r }) => r.score >= user.threshold - 15)
      .map(({ job, r, by }) => ({
        userId: user.id,
        jobId: job.id,
        score: r.score,
        scoreComponents: r.components,
        reasons: r.reasons,
        gaps: r.gaps,
        scoredBy: by,
      }));
    await repos.insertMatches(rows);
    created += rows.length;
  }
  return created;
}

/** 3) Notifikasi: kuota per paket, skor tertinggi dulu, hormati batas laju Telegram. */
export async function sendAlerts(messenger: Messenger, deadline: number) {
  // Cache cek-tautan per siklus: satu lowongan yang sama sering dikirim ke banyak user.
  const goneCache = new Map<string, Promise<boolean>>();
  const gone = (url: string) => {
    let p = goneCache.get(url);
    if (!p) goneCache.set(url, (p = isJobGone(url)));
    return p;
  };

  const users = await repos.activeUsers();
  const results = await mapLimit(users, ALERT_USER_CONCURRENCY, async ({ user }) => {
    if (Date.now() > deadline) return 0;
    const plan = PLANS[user.tier as Tier];
    const usage = await repos.getUsage(user.id);
    const remaining = plan.alertsPerWeek - usage.alertsUsed;
    if (remaining <= 0) return 0;

    const rows = await repos.unsentMatches(user.id, user.threshold, remaining);
    if (!rows.length) return 0;

    // Cek semua tautan paralel di muka, bukan satu-satu di tengah loop kirim.
    const goneFlags = await mapLimit(rows, LINK_CHECK_CONCURRENCY, ({ job }) => gone(job.url));
    const live = rows.filter((_, i) => !(goneFlags[i].status === "fulfilled" && goneFlags[i].value));
    // Tandai yang sudah tutup agar tidak diproses ulang; tidak memakai kuota.
    await repos.markSentMany(rows.filter((r) => !live.includes(r)).map((r) => r.match.id));

    let delivered = 0;
    for (const { match, job } of live) {
      if (Date.now() > deadline) break;
      try {
        await messenger.send(user.channelId, jobCard(job, match, job.suspicious), feedbackButtons(match.id, job.url));
        await repos.markSent(match.id); // per pesan: bila proses mati di tengah, tidak terkirim ganda
        await repos.track("alert_sent", user.id, { score: match.score, by: match.scoredBy });
        delivered++;
        await sleep(1100); // ±1 pesan/detik per chat
      } catch (e) {
        if (isBlockedError(e)) {
          await repos.markInactive(user.channel, user.channelId);
          break;
        }
        console.error("send alert gagal", e instanceof Error ? e.message : e);
      }
    }
    if (delivered) await repos.addUsage(user.id, { alerts: delivered });
    return delivered;
  });

  return results.reduce((n, r) => n + (r.status === "fulfilled" ? r.value : 0), 0);
}
