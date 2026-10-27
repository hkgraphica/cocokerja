import { sql } from "drizzle-orm";
import {
  bigint, boolean, index, integer, jsonb, pgTable, primaryKey, serial, text, timestamp, unique, uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channel: text("channel").notNull(),
    channelId: text("channel_id").notNull(),
    tier: text("tier").notNull().default("free"),
    state: text("state").notNull().default("new"),
    threshold: integer("threshold").notNull().default(60),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    consentVersion: text("consent_version"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("users_channel_uq").on(t.channel, t.channelId)],
);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  skills: text("skills").array().notNull().default(sql`'{}'::text[]`),
  education: text("education").notNull().default(""),
  experience: text("experience").notNull().default(""),
  preferences: jsonb("preferences").notNull().default(sql`'{}'::jsonb`),
  /** CV terenkripsi AES-256-GCM. Tidak pernah masuk log. */
  cvEnc: text("cv_enc"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull(),
    externalId: text("external_id"),
    title: text("title").notNull(),
    company: text("company").notNull(),
    location: text("location").notNull().default(""),
    level: text("level"),
    category: text("category"),
    salaryRange: text("salary_range"),
    description: text("description").notNull().default(""),
    url: text("url").notNull(),
    suspicious: boolean("suspicious").notNull().default(false),
    status: text("status").notNull().default("active"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    hash: text("hash").notNull(),
  },
  (t) => [unique("jobs_hash_uq").on(t.hash), index("jobs_status_fetched_idx").on(t.status, t.fetchedAt)],
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    scoreComponents: jsonb("score_components").notNull().default(sql`'{}'::jsonb`),
    reasons: text("reasons").array().notNull().default(sql`'{}'::text[]`),
    gaps: text("gaps").array().notNull().default(sql`'{}'::text[]`),
    scoredBy: text("scored_by").notNull().default("heuristic"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    feedback: text("feedback"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("matches_user_job_uq").on(t.userId, t.jobId), index("matches_user_sent_idx").on(t.userId, t.sentAt)],
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("saved"),
    notes: text("notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("applications_user_job_uq").on(t.userId, t.jobId)],
);

export const usage = pgTable(
  "usage",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    week: text("week").notNull(),
    alertsUsed: integer("alerts_used").notNull().default(0),
    llmCallsUsed: integer("llm_calls_used").notNull().default(0),
    chatCallsUsed: integer("chat_calls_used").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.week] })],
);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  paymentRef: text("payment_ref"),
});

/** Analitik. user_id dilepas (SET NULL) saat hapus data agar anonim. */
export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    meta: jsonb("meta").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_type_created_idx").on(t.type, t.createdAt)],
);

/** Antrean tugas asinkron (tailor CV, interview, dll). Diproses oleh tick/worker. */
export const jobsQueue = pgTable(
  "jobs_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("jobs_queue_status_run_idx").on(t.status, t.runAfter)],
);

/** Idempotensi webhook Telegram. */
export const tgUpdates = pgTable("tg_updates", {
  updateId: bigint("update_id", { mode: "number" }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
