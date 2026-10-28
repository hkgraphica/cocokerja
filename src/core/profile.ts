import type { Level } from "./types";

/** Parser input profil (dipakai onboarding dan /ubah). Murni, tanpa I/O. */

/** "data analyst, BI analyst" → ["data analyst","bi analyst"] (maks 5, huruf kecil, unik). */
export function parseRoles(text: string): string[] {
  const roles = text.split(",").map((r) => r.trim().toLowerCase().slice(0, 60)).filter(Boolean);
  return [...new Set(roles)].slice(0, 5);
}

/** "Jakarta, Bandung remote" → { location: "jakarta, bandung", remote: true }. Koma dipertahankan sebagai pemisah kota. */
export function parseLocation(text: string): { location: string; remote: boolean } {
  const remote = /\bremote\b/i.test(text);
  const location = text
    .replace(/\bremote\b/gi, "")
    .replace(/[/&;]+/g, ",")
    .split(",")
    .map((c) => c.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join(", ")
    .toLowerCase()
    .slice(0, 120);
  return { location, remote };
}

const LEVEL_ALIASES: Record<string, Level> = {
  fresh: "fresh", "fresh graduate": "fresh", freshgrad: "fresh", junior: "fresh", entry: "fresh",
  magang: "magang", intern: "magang", internship: "magang",
  any: "any", semua: "any", "semua level": "any",
};

export function parseLevel(text: string): Level | null {
  return LEVEL_ALIASES[text.trim().toLowerCase()] ?? null;
}
