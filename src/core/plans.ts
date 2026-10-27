import type { Tier } from "./types";

export const PLANS: Record<Tier, { alertsPerWeek: number; llmPerWeek: number; chatPerWeek: number }> = {
  free: { alertsPerWeek: 3, llmPerWeek: 10, chatPerWeek: 5 },
  premium: { alertsPerWeek: 30, llmPerWeek: 200, chatPerWeek: 100 },
};

/** Kunci minggu ISO, mis. "2026-W44". */
export function isoWeek(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
