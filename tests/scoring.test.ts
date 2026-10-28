import { describe, expect, it } from "vitest";
import { mergeLlmScore, heuristicScore, requiredYears, LOCATION_MISMATCH_CAP, SENIOR_SCORE_CAP } from "@/core/scoring";
import type { ProfileData } from "@/core/types";

const me: ProfileData = {
  skills: ["sql", "excel", "python"],
  education: "S1 Statistika",
  preferences: { roles: ["data analyst"], location: "jakarta", remote: false, level: "fresh" },
};
const job = (title: string, description: string, location = "Jakarta") => ({ title, company: "X", location, description });

describe("heuristicScore: regresi dari analisis kualitas bot", () => {
  it("lowongan ideal tetap bernilai tinggi", () => {
    expect(heuristicScore(me, job("Junior Data Analyst", "Fresh graduate welcome. SQL, Excel, Python.")).score).toBeGreaterThanOrEqual(90);
  });

  it("'Senior Associate' dengan 5 tahun TIDAK dianggap entry level", () => {
    const r = heuristicScore(me, job("Senior Associate Data Analyst", "Min 5 years experience. SQL, Excel."));
    expect(r.components.level).toBe(0);
    expect(r.score).toBeLessThanOrEqual(SENIOR_SCORE_CAP);
    expect(r.gaps.join(" ")).toMatch(/pengalaman|level/i);
  });

  it("'Junior' yang meminta 3 tahun pengalaman dihukum", () => {
    const r = heuristicScore(me, job("Junior Data Analyst", "Minimal 3 tahun pengalaman. SQL, Excel."));
    expect(r.components.level).toBe(0);
    expect(r.gaps.join(" ")).toMatch(/3 tahun/);
  });

  it("peran yang hanya disebut sekilas tidak lolos ambang alert default (60)", () => {
    const r = heuristicScore(me, job("Marketing Executive", "Bekerja sama dengan tim data analyst kami."));
    expect(r.score).toBeLessThan(60);
  });

  it("lowongan tak relevan tidak mendapat poin dasar yang menggelembung", () => {
    expect(heuristicScore(me, job("Chef", "Memasak.", "Bali")).score).toBeLessThan(30);
  });

  it("lokasi dicocokkan ke lokasi lowongan, bukan teks bebas (HQ ≠ tempat kerja)", () => {
    const r = heuristicScore(me, job("Data Analyst", "HQ kami di Jakarta. SQL, Excel. Junior.", "Bandung"));
    expect(r.components.location).toBe(0);
    expect(r.gaps.join(" ")).toMatch(/Lokasi/);
  });

  it("lokasi yang jelas berbeda dibatasi di bawah ambang alert default meski hal lain cocok", () => {
    const r = heuristicScore(me, job("Junior Data Analyst", "Fresh graduate welcome. SQL, Excel, Python.", "Surabaya"));
    expect(r.score).toBeLessThanOrEqual(LOCATION_MISMATCH_CAP);
    expect(r.score).toBeLessThan(60);
    expect(r.score).toBeGreaterThanOrEqual(45); // tetap tersimpan sebagai near-miss (ambang 60 - 15)
  });

  it("lokasi generik ('Indonesia', 'Anywhere') dianggap tidak diketahui, bukan tidak cocok", () => {
    for (const loc of ["Indonesia", "Anywhere", ""]) {
      const r = heuristicScore(me, job("Junior Data Analyst", "Fresh graduate welcome. SQL, Excel, Python.", loc));
      expect(r.score, loc).toBeGreaterThan(LOCATION_MISMATCH_CAP);
      expect(r.gaps.join(" ")).not.toMatch(/berbeda/);
    }
  });

  it("tahun hanya dihitung bila berkonteks pengalaman ('founded 10 years ago' diabaikan)", () => {
    expect(requiredYears("We were founded 10 years ago. Fresh graduate welcome.")).toBe(0);
    expect(requiredYears("Minimal 3 tahun pengalaman")).toBe(3);
    expect(requiredYears("Pengalaman minimal 2 tahun di bidang ini")).toBe(2);
    expect(requiredYears("5+ years of relevant experience")).toBe(5);
    expect(requiredYears("1-3 years experience")).toBe(1);
  });

  it("'Staff' (lazim entry di Indonesia) tidak otomatis dianggap senior", () => {
    const admin = { ...me, preferences: { ...me.preferences, roles: ["admin"] } };
    expect(heuristicScore(admin, job("Staff Admin", "Fresh graduate welcome. Excel.")).components.level).toBe(1);
  });

  it("tanpa preferensi lokasi tidak ada gap lokasi", () => {
    const anywhere = { ...me, preferences: { ...me.preferences, location: "", remote: false } };
    const r = heuristicScore(anywhere, job("Junior Data Analyst", "SQL Excel fresh graduate", "Mana saja"));
    expect(r.components.location).toBe(1);
    expect(r.gaps.join(" ")).not.toMatch(/Lokasi/);
  });

  it("mendukung beberapa kota yang dipisah koma dan remote", () => {
    const multi = { ...me, preferences: { ...me.preferences, location: "jakarta, bandung" } };
    expect(heuristicScore(multi, job("Data Analyst", "SQL", "Bandung")).components.location).toBe(1);
    const remote = { ...me, preferences: { ...me.preferences, location: "", remote: true } };
    expect(heuristicScore(remote, job("Data Analyst", "Fully remote. SQL.", "")).components.location).toBe(1);
    expect(heuristicScore(remote, job("Data Analyst", "Onsite only, not remote. SQL.", "")).components.location).toBe(0);
  });

  it("sinonim peran Indonesia dikenali ('analis data' ≈ 'data analyst')", () => {
    const id = { ...me, preferences: { ...me.preferences, roles: ["analis data"] } };
    expect(heuristicScore(id, job("Junior Data Analyst", "SQL")).components.role).toBe(1);
  });

  it("level magang mensyaratkan sinyal magang", () => {
    const intern = { ...me, preferences: { ...me.preferences, level: "magang" as const } };
    expect(heuristicScore(intern, job("Data Analyst Intern", "SQL")).components.level).toBe(1);
    expect(heuristicScore(intern, job("Junior Data Analyst", "SQL fresh graduate")).components.level).toBeLessThan(1);
  });
});

describe("mergeLlmScore", () => {
  const llm = (score: number) => ({ score, reasons: ["ok"], gaps: [] as string[], components: { role: 0, skills: 0, level: 0, location: 0, salary: 0 } });

  it("menegakkan batas skor untuk lowongan senior walau LLM memberi nilai tinggi", () => {
    const heur = heuristicScore(me, job("Senior Data Analyst", "Min 5 tahun pengalaman. SQL"));
    const r = mergeLlmScore(heur, llm(92));
    expect(r.score).toBe(SENIOR_SCORE_CAP);
    expect(r.gaps.length).toBeGreaterThan(0);
    expect(r.components).toEqual(heur.components);
  });

  it("tidak mengubah skor LLM untuk lowongan yang levelnya sesuai", () => {
    const heur = heuristicScore(me, job("Junior Data Analyst", "Fresh graduate welcome. SQL"));
    expect(mergeLlmScore(heur, llm(88)).score).toBe(88);
  });

  it("membatasi skor ke rentang 0-100", () => {
    const heur = heuristicScore(me, job("Junior Data Analyst", "SQL fresh graduate"));
    expect(mergeLlmScore(heur, llm(150)).score).toBe(100);
    expect(mergeLlmScore(heur, llm(-5)).score).toBe(0);
  });
});
