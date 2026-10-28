import { extractSkills } from "./skills";
import type { JobData, ProfileData, ScoreResult } from "./types";

/** Bobot sesuai PRD bagian 8 (hipotesis, dikalibrasi lewat umpan balik). */
export const WEIGHTS = { role: 30, skills: 35, level: 15, location: 10, salary: 10 } as const;

/**
 * Gaji belum diimplementasikan di MVP, jadi tidak ikut dihitung: total dinormalisasi dari bobot
 * yang benar-benar dinilai. Dengan begitu lowongan tak relevan tidak mendapat "poin gratis".
 */
const SCORED_TOTAL = WEIGHTS.role + WEIGHTS.skills + WEIGHTS.level + WEIGHTS.location;

/** Skor maksimum bila level lowongan jelas di atas fresh graduate (selaras dengan prompt LLM). */
export const SENIOR_SCORE_CAP = 40;

/** Lokasi lowongan jelas berbeda & bukan remote: di bawah ambang alert default (60), tetap tersimpan sebagai near-miss. */
export const LOCATION_MISMATCH_CAP = 55;

/** Lokasi lowongan yang terlalu umum untuk dibandingkan dengan kota pilihan pengguna. */
const GENERIC_LOC_RE = /^(indonesia|seluruh indonesia|nationwide|anywhere|worldwide|tidak disebut|-)$/i;

// "staff" dan "associate" sengaja tidak dianggap senior/entry: di Indonesia "Staff Admin" lazim entry-level,
// sedangkan "Senior Associate" jelas senior.
const SENIOR_RE = /\b(senior|sr\.?|lead|manager|head of|principal|director|vp|chief)\b/i;
const ENTRY_RE = /\b(fresh ?graduate|fresh grad|junior|jr\.?|entry[- ]level|intern|internship|magang|trainee|management trainee|pengalaman tidak diperlukan|no experience)\b/i;
const INTERN_RE = /\b(intern|internship|magang)\b/i;
const REMOTE_RE = /\b(remote|wfh|work from home)\b/i;
const NOT_REMOTE_RE = /\b(non[- ]?remote|not remote|bukan remote|on-?site|wfo)\b/i;

// Tahun hanya dihitung bila berkonteks pengalaman ("3 years of experience", "pengalaman minimal 3 tahun"),
// bukan "founded 10 years ago".
const YEARS_BEFORE = /(\d+)\s*\+?\s*(?:-\s*\d+\s*)?(?:tahun|years?|yrs?)\b[^.\n]{0,25}?(?:pengalaman|experience|exp\b)/gi;
const YEARS_AFTER = /(?:pengalaman|experience)[^.\n]{0,30}?(\d+)\s*\+?\s*(?:tahun|years?|yrs?)\b/gi;

/** Sinonim peran yang umum, diterapkan ke judul maupun preferensi sebelum dicocokkan. */
const ROLE_SYNONYMS: [RegExp, string][] = [
  [/\banalis\b/g, "analyst"],
  [/\bpengembang\b/g, "developer"],
  [/\bprogrammer\b/g, "developer"],
  [/\bsoftware engineer\b/g, "developer"],
];

const norm = (s: string) => s.toLowerCase();
const normRole = (s: string) => ROLE_SYNONYMS.reduce((acc, [re, to]) => acc.replace(re, to), norm(s)).replace(/\s+/g, " ").trim();

/** Pengalaman minimal (tahun) yang diminta teks lowongan; 0 bila tidak disebut. */
export function requiredYears(text: string): number {
  let max = 0;
  for (const re of [YEARS_BEFORE, YEARS_AFTER]) {
    for (const m of text.matchAll(re)) max = Math.max(max, Number(m[1]));
  }
  return max;
}

const cities = (loc: string) => norm(loc).split(/[,;/]+/).map((s) => s.trim()).filter(Boolean);
const tokens = (s: string) => new Set(s.split(/[^a-z0-9+#.]+/).filter(Boolean));

export function heuristicScore(profile: ProfileData, job: JobData): ScoreResult {
  const { preferences: pref } = profile;
  const title = norm(job.title);
  const text = norm(`${job.title}\n${job.description}`);
  const roleTitle = normRole(job.title);
  const roleText = normRole(`${job.title}\n${job.description}`);
  const reasons: string[] = [];
  const gaps: string[] = [];

  // Peran. Judul: substring ATAU semua kata peran ada (urutan bebas, mis. "analis data" ≈ "data analyst").
  // Deskripsi: hanya substring, agar kata lepas tidak menggelembungkan kecocokan.
  const roles = pref.roles.map(normRole).filter(Boolean);
  const titleTokens = tokens(roleTitle);
  const inTitle = (r: string) => roleTitle.includes(r) || (r.includes(" ") && r.split(" ").every((t) => titleTokens.has(t)));
  let role = 0;
  if (roles.some(inTitle)) role = 1;
  else if (roles.some((r) => roleText.includes(r))) role = 0.5;
  if (role === 1) reasons.push("Judul sesuai peran yang kamu cari");
  else if (role === 0.5) reasons.push("Peran disebut di deskripsi lowongan");
  else gaps.push("Peran tidak persis sama dengan preferensimu");

  // Skill. Tanpa skill dikenal di lowongan, nilai netral-rendah (bukan setengah) agar tidak menggelembungkan skor.
  const required = extractSkills(text);
  const mine = new Set(profile.skills.map(norm));
  const matched = required.filter((s) => mine.has(s));
  const missing = required.filter((s) => !mine.has(s));
  const skills = required.length === 0 ? 0.3 : matched.length / required.length;
  if (matched.length) reasons.push(`Skill cocok: ${matched.slice(0, 4).join(", ")}`);
  if (missing.length) gaps.push(`Skill kurang: ${missing.slice(0, 4).join(", ")}`);

  // Level: syarat senioritas/pengalaman dicek SEBELUM sinyal "entry", agar "Junior ... min 3 tahun" tidak lolos.
  let level = 1;
  if (pref.level !== "any") {
    const years = requiredYears(text);
    if (SENIOR_RE.test(title) || years >= 3) {
      level = 0;
      gaps.push(years >= 3 ? `Meminta pengalaman ±${years} tahun` : "Level kemungkinan di atas pengalamanmu");
    } else if (years >= 2) {
      level = 0.3;
      gaps.push(`Meminta pengalaman ±${years} tahun`);
    } else if (pref.level === "magang") {
      if (INTERN_RE.test(text)) {
        level = 1;
        reasons.push("Posisi magang");
      } else {
        level = ENTRY_RE.test(text) ? 0.4 : 0.3;
        gaps.push("Bukan posisi magang");
      }
    } else if (ENTRY_RE.test(text)) {
      level = 1;
      reasons.push("Terbuka untuk fresh graduate/entry level");
    } else {
      level = years === 1 ? 0.8 : 0.6; // level tidak disebut: netral
    }
  }

  // Lokasi: dicocokkan ke lokasi LOWONGAN, bukan teks bebas ("HQ kami di Jakarta" bukan bukti kerja di Jakarta).
  const prefCities = cities(pref.location);
  const rawJobLoc = norm(job.location).trim();
  const jobLoc = GENERIC_LOC_RE.test(rawJobLoc) ? "" : rawJobLoc; // lokasi generik = tidak diketahui
  const jobRemote = (REMOTE_RE.test(rawJobLoc) || (REMOTE_RE.test(text) && !NOT_REMOTE_RE.test(text)));
  let location = 0;
  let locationMismatch = false;
  if (!prefCities.length && !pref.remote) {
    location = 1; // tidak ada preferensi lokasi: tidak menghukum
  } else if (pref.remote && jobRemote) {
    location = 1;
    reasons.push("Bisa remote");
  } else if (!prefCities.length && NOT_REMOTE_RE.test(text)) {
    locationMismatch = true; // pengguna hanya mau remote, lowongan eksplisit onsite
    gaps.push("Bukan posisi remote");
  } else if (jobLoc && prefCities.some((c) => jobLoc.includes(c))) {
    location = 1;
    reasons.push(`Lokasi sesuai (${job.location})`);
  } else if (!jobLoc && prefCities.some((c) => text.includes(c))) {
    location = 0.5; // lokasi lowongan tidak tertulis; hanya disebut di deskripsi
    reasons.push("Lokasi disebut di deskripsi lowongan");
  } else if (!jobLoc) {
    location = 0.3; // lokasi tidak diketahui: netral-rendah, bukan hukuman penuh
    gaps.push("Lokasi lowongan tidak disebut jelas");
  } else {
    locationMismatch = true;
    gaps.push("Lokasi berbeda dari preferensimu");
  }

  // Gaji: belum dinilai (tidak dihukum, tidak ikut total). Komponen tetap 1 untuk kompatibilitas.
  const salary = 1;

  const components = { role, skills, level, location, salary };
  const raw = Math.round(
    ((role * WEIGHTS.role + skills * WEIGHTS.skills + level * WEIGHTS.level + location * WEIGHTS.location) / SCORED_TOTAL) * 100,
  );
  // Batas skor: level senior dan lokasi yang jelas tidak cocok (keduanya konstrain keras, bukan sekadar bobot kecil).
  let score = raw;
  if (level === 0) score = Math.min(score, SENIOR_SCORE_CAP);
  if (locationMismatch) score = Math.min(score, LOCATION_MISMATCH_CAP);
  return { score, components, reasons, gaps };
}

/**
 * Gabungkan hasil LLM dengan heuristik. Komponen terstruktur tetap dari heuristik (auditable);
 * alasan & skor dari LLM. Aturan "senior/3+ tahun → skor maks 40" DITEGAKKAN di kode,
 * bukan hanya diminta lewat prompt.
 */
export function mergeLlmScore(heur: ScoreResult, refined: ScoreResult): ScoreResult {
  const score = Math.max(0, Math.min(100, Math.round(refined.score)));
  const capped = heur.components.level === 0 && score > SENIOR_SCORE_CAP;
  const gaps = [...refined.gaps];
  if (capped && !gaps.some((g) => /level|pengalaman|senior/i.test(g))) {
    gaps.push(heur.gaps.find((g) => /level|pengalaman/i.test(g)) ?? "Level di atas pengalamanmu");
  }
  return { ...refined, score: capped ? SENIOR_SCORE_CAP : score, gaps, components: heur.components };
}
