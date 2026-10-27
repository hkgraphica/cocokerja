import { repos } from "@/adapters/db/repos";
import { isBlockedError } from "@/adapters/telegram";
import { jobHash, looksSuspicious } from "@/core/jobs";
import { jobCard } from "@/core/messages";
import { PLANS } from "@/core/plans";
import { heuristicScore } from "@/core/scoring";
import type { ScoreResult, Tier } from "@/core/types";
import type { JobSource, LlmScorer, Messenger } from "@/ports";
import { feedbackButtons } from "./bot";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const LLM_TOP_N = 8;

/** Lowongan dianggap tutup hanya jika server menjawab 404/410. Gagal jaringan/timeout = anggap masih buka. */
async function isJobGone(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(5000), headers: { "user-agent": "CocoKerjaBot/0.1" } });
    return res.status === 404 || res.status === 410;
  } catch {
    return false;
  }
}

/** 1) Ingestion: ambil, normalisasi, dedup, simpan. Satu sumber gagal tidak menghentikan yang lain. */
export async function ingest(sources: JobSource[]) {
  const stats = { fetched: 0, inserted: 0, errors: [] as string[] };
  for (const src of sources) {
    try {
      for (const raw of await src.fetch()) {
        if (!raw.title || !raw.url) continue;
        stats.fetched++;
        const inserted = await repos.insertJob({
          source: src.name,
          externalId: raw.externalId,
          title: raw.title.slice(0, 200),
          company: raw.company.slice(0, 200),
          location: raw.location.slice(0, 200),
          description: raw.description.slice(0, 8000),
          url: raw.url,
          suspicious: looksSuspicious(`${raw.title} ${raw.description}`),
          hash: jobHash(raw.title, raw.company, raw.location),
        });
        if (inserted) stats.inserted++;
      }
    } catch (e) {
      stats.errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  await repos.expireOldJobs();
  return stats;
}

/** 2) Matching: filter SQL → skor heuristik → LLM hanya untuk kandidat teratas (kontrol biaya). */
export async function runMatching(llm: LlmScorer | null, deadline: number) {
  let created = 0;
  for (const { user, profile } of await repos.activeUsers()) {
    if (Date.now() > deadline) break;
    const prefs = profile.preferences as import("@/core/types").Preferences;
    const data = { skills: profile.skills, education: profile.education, preferences: prefs };
    const candidates = await repos.candidateJobs(user.id, prefs.roles ?? []);

    const scored = candidates
      .map((job) => ({ job, r: heuristicScore(data, job) as ScoreResult, by: "heuristic" }))
      .sort((a, b) => b.r.score - a.r.score);

    const plan = PLANS[user.tier as Tier];
    const usage = await repos.getUsage(user.id);
    let llmLeft = plan.llmPerWeek - usage.llmCallsUsed;
    let llmUsed = 0;

    for (const item of scored.slice(0, LLM_TOP_N)) {
      if (!llm || llmLeft <= 0 || item.r.score < user.threshold - 15 || Date.now() > deadline) break;
      llmLeft--;
      llmUsed++;
      const refined = await llm.score(data, item.job);
      if (refined) {
        // Komponen terstruktur tetap dari heuristik (auditable); alasan & skor dari LLM.
        item.r = { ...refined, components: item.r.components };
        item.by = "llm";
      }
    }
    if (llmUsed) await repos.addUsage(user.id, { llm: llmUsed });

    for (const { job, r, by } of scored) {
      if (r.score < user.threshold - 15) continue; // simpan hampir-cocok untuk ubah ambang
      await repos.insertMatch({
        userId: user.id,
        jobId: job.id,
        score: r.score,
        scoreComponents: r.components,
        reasons: r.reasons,
        gaps: r.gaps,
        scoredBy: by,
      });
      created++;
    }
  }
  return created;
}

/** 3) Notifikasi: kuota per paket, skor tertinggi dulu, hormati batas laju Telegram. */
export async function sendAlerts(messenger: Messenger, deadline: number) {
  let sent = 0;
  for (const { user } of await repos.activeUsers()) {
    if (Date.now() > deadline) break;
    const plan = PLANS[user.tier as Tier];
    const usage = await repos.getUsage(user.id);
    const remaining = plan.alertsPerWeek - usage.alertsUsed;
    if (remaining <= 0) continue;

    const rows = await repos.unsentMatches(user.id, user.threshold, remaining);
    let delivered = 0;
    for (const { match, job } of rows) {
      if (await isJobGone(job.url)) {
        await repos.markSent(match.id); // tandai agar tidak diproses ulang, tidak memakai kuota
        continue;
      }
      try {
        await messenger.send(
          user.channelId,
          jobCard(job, match, job.suspicious),
          feedbackButtons(match.id, job.url),
        );
        await repos.markSent(match.id);
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
    if (delivered) {
      await repos.addUsage(user.id, { alerts: delivered });
      sent += delivered;
    }
  }
  return sent;
}
