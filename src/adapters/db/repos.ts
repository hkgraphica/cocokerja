import { and, desc, eq, gte, ilike, inArray, isNull, lt, notExists, or, sql } from "drizzle-orm";
import { chunk } from "@/core/concurrency";
import { isoWeek } from "@/core/plans";
import type { Preferences, Tier, UserState } from "@/core/types";
import { db, schema } from "./client";

const { users, profiles, jobs, matches, applications, usage, events, tgUpdates, sourceState } = schema;

/** Ukuran batch insert; menjaga jumlah parameter query jauh di bawah batas protokol Postgres. */
const BATCH = 100;

export type User = typeof users.$inferSelect;
export type Job = typeof jobs.$inferSelect;

const DEFAULT_PREFS: Preferences = { roles: [], location: "", remote: false, level: "fresh" };

export const repos = {
  /** true jika update baru, false jika duplikat (retry Telegram). */
  async markUpdate(updateId: number): Promise<boolean> {
    const r = await db().insert(tgUpdates).values({ updateId }).onConflictDoNothing().returning();
    return r.length > 0;
  },

  async getSourceState(source: string) {
    const [r] = await db().select().from(sourceState).where(eq(sourceState.source, source));
    return r ? { etag: r.etag, lastModified: r.lastModified } : null;
  },

  async saveSourceState(source: string, v: { etag?: string | null; lastModified?: string | null }) {
    const set = { etag: v.etag ?? null, lastModified: v.lastModified ?? null, updatedAt: new Date() };
    await db().insert(sourceState).values({ source, ...set }).onConflictDoUpdate({ target: sourceState.source, set });
  },

  async upsertUser(channel: string, channelId: string): Promise<User> {
    const [u] = await db()
      .insert(users)
      .values({ channel, channelId })
      .onConflictDoUpdate({ target: [users.channel, users.channelId], set: { isActive: true } })
      .returning();
    return u;
  },

  async setState(userId: string, state: UserState) {
    await db().update(users).set({ state }).where(eq(users.id, userId));
  },

  async giveConsent(userId: string, version: string) {
    await db().update(users).set({ consentAt: new Date(), consentVersion: version, state: "cv" }).where(eq(users.id, userId));
  },

  async setThreshold(userId: string, threshold: number) {
    await db().update(users).set({ threshold }).where(eq(users.id, userId));
  },

  async markInactive(channel: string, channelId: string) {
    await db().update(users).set({ isActive: false }).where(and(eq(users.channel, channel), eq(users.channelId, channelId)));
  },

  async saveProfile(userId: string, p: { skills: string[]; education: string; cvEnc: string }) {
    await db()
      .insert(profiles)
      .values({ userId, skills: p.skills, education: p.education, cvEnc: p.cvEnc, preferences: DEFAULT_PREFS })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { skills: p.skills, education: p.education, cvEnc: p.cvEnc, updatedAt: new Date() },
      });
  },

  async getProfile(userId: string) {
    const [p] = await db().select().from(profiles).where(eq(profiles.userId, userId));
    return p ? { ...p, preferences: { ...DEFAULT_PREFS, ...(p.preferences as Partial<Preferences>) } } : null;
  },

  /** Merge atomik di sisi DB (jsonb ||) agar update bersamaan tidak saling menimpa. */
  async patchPreferences(userId: string, patch: Partial<Preferences>) {
    await db()
      .update(profiles)
      .set({
        preferences: sql`coalesce(${profiles.preferences}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));
  },

  /** Hak hapus (UU PDP). Cascade menghapus profil/match/tracker; event dianonimkan via SET NULL. */
  async deleteUser(userId: string) {
    await db().delete(users).where(eq(users.id, userId));
  },

  async activeUsers() {
    return db()
      .select({ user: users, profile: profiles })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(and(eq(users.state, "active"), eq(users.isActive, true)));
  },

  /** Insert lowongan; true bila baru (hash belum ada). */
  async insertJob(j: typeof jobs.$inferInsert): Promise<boolean> {
    const r = await db().insert(jobs).values(j).onConflictDoNothing({ target: jobs.hash }).returning({ id: jobs.id });
    return r.length > 0;
  },

  /** Insert massal (chunk); kembalikan jumlah baris yang benar-benar baru. Duplikat hash diabaikan. */
  async insertJobs(rows: (typeof jobs.$inferInsert)[]): Promise<number> {
    let inserted = 0;
    for (const part of chunk(rows, BATCH)) {
      const r = await db().insert(jobs).values(part).onConflictDoNothing({ target: jobs.hash }).returning({ id: jobs.id });
      inserted += r.length;
    }
    return inserted;
  },

  /** Simpan atau dapatkan lowongan berdasarkan hash, kembalikan data recordnya. Aman terhadap race. */
  async upsertJob(j: typeof jobs.$inferInsert) {
    const inserted = await db().insert(jobs).values(j).onConflictDoNothing({ target: jobs.hash }).returning();
    if (inserted[0]) return { job: inserted[0], isNew: true };
    const [existing] = await db().select().from(jobs).where(eq(jobs.hash, j.hash)).limit(1);
    return { job: existing, isNew: false };
  },

  async expireOldJobs(days = 45) {
    const cutoff = new Date(Date.now() - days * 86400000);
    await db().update(jobs).set({ status: "expired" }).where(and(eq(jobs.status, "active"), lt(jobs.fetchedAt, cutoff)));
  },

  /** Penyaringan awal SQL: lowongan aktif, belum pernah dinilai untuk user ini, dan menyebut peran. */
  async candidateJobs(userId: string, roles: string[], limit = 100) {
    const esc = (s: string) => s.replace(/[\\%_]/g, "\\$&"); // role dari user: % dan _ bukan wildcard
    const roleFilters = roles
      .filter(Boolean)
      .flatMap((r) => [ilike(jobs.title, `%${esc(r)}%`), ilike(jobs.description, `%${esc(r)}%`)]);
    const since = new Date(Date.now() - 30 * 86400000);
    return db()
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.status, "active"),
          gte(jobs.fetchedAt, since),
          roleFilters.length ? or(...roleFilters) : sql`true`,
          notExists(
            db().select({ one: sql`1` }).from(matches).where(and(eq(matches.jobId, jobs.id), eq(matches.userId, userId))),
          ),
        ),
      )
      .orderBy(desc(jobs.fetchedAt))
      .limit(limit);
  },

  async insertMatch(m: typeof matches.$inferInsert) {
    await db().insert(matches).values(m).onConflictDoNothing();
  },

  /**
   * Simpan atau perbarui match (user, lowongan) dan kembalikan id-nya. Dipakai cek lowongan on-demand:
   * id dibutuhkan untuk tombol aksi, dan pengecekan ulang harus menyegarkan skor (bukan memakai data basi).
   */
  async upsertMatch(m: typeof matches.$inferInsert): Promise<string> {
    const [r] = await db()
      .insert(matches)
      .values(m)
      .onConflictDoUpdate({
        target: [matches.userId, matches.jobId],
        set: {
          score: m.score,
          scoreComponents: m.scoreComponents,
          reasons: m.reasons,
          gaps: m.gaps,
          scoredBy: m.scoredBy,
          sentAt: m.sentAt ?? sql`${matches.sentAt}`,
        },
      })
      .returning({ id: matches.id });
    return r.id;
  },

  async insertMatches(rows: (typeof matches.$inferInsert)[]) {
    for (const part of chunk(rows, BATCH)) {
      await db().insert(matches).values(part).onConflictDoNothing();
    }
  },

  /** Tandai banyak match terkirim sekaligus. */
  async markSentMany(matchIds: string[]) {
    if (!matchIds.length) return;
    await db().update(matches).set({ sentAt: new Date() }).where(inArray(matches.id, matchIds));
  },

  /** Buang data kedaluwarsa agar tabel tidak tumbuh tanpa batas. Cascade membersihkan matches. */
  async purgeStale() {
    const ago = (days: number) => new Date(Date.now() - days * 86400000);
    await db().delete(tgUpdates).where(lt(tgUpdates.createdAt, ago(7)));
    await db().delete(events).where(lt(events.createdAt, ago(90)));
    await db()
      .delete(jobs)
      .where(
        and(
          eq(jobs.status, "expired"),
          lt(jobs.fetchedAt, ago(90)),
          notExists(db().select({ one: sql`1` }).from(applications).where(eq(applications.jobId, jobs.id))),
        ),
      );
    // Lowongan kiriman on-demand (private) hanya relevan sementara; yang disimpan ke tracker tetap dipertahankan.
    await db()
      .delete(jobs)
      .where(
        and(
          eq(jobs.status, "private"),
          lt(jobs.fetchedAt, ago(30)),
          notExists(db().select({ one: sql`1` }).from(applications).where(eq(applications.jobId, jobs.id))),
        ),
      );
  },

  async unsentMatches(userId: string, minScore: number, limit: number) {
    return db()
      .select({ match: matches, job: jobs })
      .from(matches)
      .innerJoin(jobs, eq(jobs.id, matches.jobId))
      .where(and(eq(matches.userId, userId), isNull(matches.sentAt), gte(matches.score, minScore), eq(jobs.status, "active")))
      .orderBy(desc(matches.score))
      .limit(limit);
  },

  async markSent(matchId: string) {
    await db().update(matches).set({ sentAt: new Date() }).where(eq(matches.id, matchId));
  },

  async getMatch(matchId: string, userId: string) {
    const [r] = await db()
      .select({ match: matches, job: jobs })
      .from(matches)
      .innerJoin(jobs, eq(jobs.id, matches.jobId))
      .where(and(eq(matches.id, matchId), eq(matches.userId, userId)));
    return r ?? null;
  },

  async setFeedback(matchId: string, userId: string, feedback: "good" | "bad") {
    await db().update(matches).set({ feedback }).where(and(eq(matches.id, matchId), eq(matches.userId, userId)));
  },

  async saveApplication(userId: string, jobId: string) {
    await db()
      .insert(applications)
      .values({ userId, jobId })
      .onConflictDoUpdate({ target: [applications.userId, applications.jobId], set: { updatedAt: new Date() } });
  },

  async getUsage(userId: string, week = isoWeek()) {
    const [u] = await db().select().from(usage).where(and(eq(usage.userId, userId), eq(usage.week, week)));
    return u ?? { userId, week, alertsUsed: 0, llmCallsUsed: 0, chatCallsUsed: 0 };
  },

  async addUsage(userId: string, delta: { alerts?: number; llm?: number; chat?: number }, week = isoWeek()) {
    await db()
      .insert(usage)
      .values({ userId, week, alertsUsed: delta.alerts ?? 0, llmCallsUsed: delta.llm ?? 0, chatCallsUsed: delta.chat ?? 0 })
      .onConflictDoUpdate({
        target: [usage.userId, usage.week],
        set: {
          alertsUsed: sql`${usage.alertsUsed} + ${delta.alerts ?? 0}`,
          llmCallsUsed: sql`${usage.llmCallsUsed} + ${delta.llm ?? 0}`,
          chatCallsUsed: sql`${usage.chatCallsUsed} + ${delta.chat ?? 0}`,
        },
      });
  },

  async track(type: string, userId: string | null, meta: Record<string, unknown> = {}) {
    await db().insert(events).values({ type, userId, meta });
  },

  async setTier(userId: string, tier: Tier) {
    await db().update(users).set({ tier }).where(eq(users.id, userId));
  },

  async countByIds(ids: string[]) {
    if (!ids.length) return 0;
    const r = await db().select({ n: sql<number>`count(*)` }).from(users).where(inArray(users.id, ids));
    return Number(r[0].n);
  },
};
