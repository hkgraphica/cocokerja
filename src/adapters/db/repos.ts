import { and, desc, eq, gte, ilike, inArray, isNull, lt, notExists, or, sql } from "drizzle-orm";
import { isoWeek } from "@/core/plans";
import type { Preferences, Tier, UserState } from "@/core/types";
import { db, schema } from "./client";

const { users, profiles, jobs, matches, applications, usage, events, tgUpdates } = schema;

export type User = typeof users.$inferSelect;
export type Job = typeof jobs.$inferSelect;

const DEFAULT_PREFS: Preferences = { roles: [], location: "", remote: false, level: "fresh" };

export const repos = {
  /** true jika update baru, false jika duplikat (retry Telegram). */
  async markUpdate(updateId: number): Promise<boolean> {
    const r = await db().insert(tgUpdates).values({ updateId }).onConflictDoNothing().returning();
    return r.length > 0;
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

  async patchPreferences(userId: string, patch: Partial<Preferences>) {
    const p = await repos.getProfile(userId);
    if (!p) return;
    await db()
      .update(profiles)
      .set({ preferences: { ...p.preferences, ...patch }, updatedAt: new Date() })
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

  /** Simpan atau dapatkan lowongan berdasarkan hash, kembalikan data recordnya */
  async upsertJob(j: typeof jobs.$inferInsert) {
    const existing = await db().select().from(jobs).where(eq(jobs.hash, j.hash)).limit(1);
    if (existing[0]) return { job: existing[0], isNew: false };
    const inserted = await db().insert(jobs).values(j).returning();
    return { job: inserted[0], isNew: true };
  },

  async expireOldJobs(days = 45) {
    const cutoff = new Date(Date.now() - days * 86400000);
    await db().update(jobs).set({ status: "expired" }).where(and(eq(jobs.status, "active"), lt(jobs.fetchedAt, cutoff)));
  },

  /** Penyaringan awal SQL: lowongan aktif, belum pernah dinilai untuk user ini, dan menyebut peran. */
  async candidateJobs(userId: string, roles: string[], limit = 100) {
    const roleFilters = roles
      .filter(Boolean)
      .flatMap((r) => [ilike(jobs.title, `%${r}%`), ilike(jobs.description, `%${r}%`)]);
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
