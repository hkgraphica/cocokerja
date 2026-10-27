import { extractSkills } from "./skills";
import type { JobData, ProfileData, ScoreResult } from "./types";

/** Bobot sesuai PRD bagian 8 (hipotesis, dikalibrasi lewat umpan balik). */
export const WEIGHTS = { role: 30, skills: 35, level: 15, location: 10, salary: 10 } as const;

const SENIOR_RE = /\b(senior|sr\.?|lead|manager|head of|principal|director|staff)\b/i;
const ENTRY_RE = /\b(fresh ?graduate|fresh grad|junior|entry[- ]level|intern|internship|magang|trainee|associate|management trainee)\b/i;
const MIN_YEARS_RE = /(?:min(?:imal|imum)?\.?\s*)?(\d+)\s*\+?\s*(?:tahun|years?|yrs?)/i;
const REMOTE_RE = /\b(remote|wfh|work from home)\b/i;

const norm = (s: string) => s.toLowerCase();

export function heuristicScore(profile: ProfileData, job: JobData): ScoreResult {
  const { preferences: pref } = profile;
  const title = norm(job.title);
  const text = norm(`${job.title}\n${job.description}`);
  const reasons: string[] = [];
  const gaps: string[] = [];

  // Peran
  const roles = pref.roles.map(norm).filter(Boolean);
  let role = 0;
  if (roles.some((r) => title.includes(r))) role = 1;
  else if (roles.some((r) => text.includes(r))) role = 0.5;
  if (role === 1) reasons.push("Judul sesuai peran yang kamu cari");
  else if (role === 0.5) reasons.push("Peran disebut di deskripsi lowongan");
  else gaps.push("Peran tidak persis sama dengan preferensimu");

  // Skill
  const required = extractSkills(text);
  const mine = new Set(profile.skills.map(norm));
  const matched = required.filter((s) => mine.has(s));
  const missing = required.filter((s) => !mine.has(s));
  const skills = required.length === 0 ? 0.5 : matched.length / required.length;
  if (matched.length) reasons.push(`Skill cocok: ${matched.slice(0, 4).join(", ")}`);
  if (missing.length) gaps.push(`Skill kurang: ${missing.slice(0, 4).join(", ")}`);

  // Level
  let level = 0.6;
  const years = MIN_YEARS_RE.exec(text);
  const wantsFresh = pref.level !== "any";
  if (wantsFresh) {
    if (ENTRY_RE.test(text)) {
      level = 1;
      reasons.push("Terbuka untuk fresh graduate/entry level");
    } else if (SENIOR_RE.test(title) || (years && Number(years[1]) >= 3)) {
      level = 0;
      gaps.push("Level kemungkinan di atas pengalamanmu");
    } else if (years && Number(years[1]) >= 2) {
      level = 0.3;
      gaps.push(`Meminta pengalaman ±${years[1]} tahun`);
    }
  }

  // Lokasi
  const loc = norm(pref.location);
  const jobLoc = norm(job.location);
  let location = 0;
  const jobRemote = REMOTE_RE.test(text);
  if ((pref.remote && jobRemote) || (loc && jobLoc.includes(loc)) || (loc && text.includes(loc))) {
    location = 1;
    reasons.push(jobRemote && pref.remote ? "Bisa remote" : `Lokasi sesuai (${job.location || pref.location})`);
  } else gaps.push("Lokasi berbeda dari preferensimu");

  // Gaji: tidak dihukum jika tidak tersedia (PRD). Penyaringan gaji belum diimplementasikan di MVP.
  const salary = 1;

  const components = { role, skills, level, location, salary };
  const score = Math.round(
    role * WEIGHTS.role + skills * WEIGHTS.skills + level * WEIGHTS.level + location * WEIGHTS.location + salary * WEIGHTS.salary,
  );
  return { score, components, reasons, gaps };
}
