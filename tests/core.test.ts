import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "@/core/crypto";
import { parseCv } from "@/core/cv";
import { jobHash, looksSuspicious } from "@/core/jobs";
import { isoWeek } from "@/core/plans";
import { heuristicScore } from "@/core/scoring";
import type { ProfileData } from "@/core/types";

const profile: ProfileData = {
  skills: ["sql", "excel", "power bi"],
  education: "S1 Statistika",
  preferences: { roles: ["data analyst"], location: "jakarta", remote: false, level: "fresh" },
};

describe("heuristicScore", () => {
  it("memberi skor tinggi untuk lowongan yang cocok", () => {
    const r = heuristicScore(profile, {
      title: "Junior Data Analyst", company: "X", location: "Jakarta",
      description: "Fresh graduate welcome. SQL, Excel, Power BI.",
    });
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it("menghukum level senior dan lokasi berbeda, dengan alasan kekurangan", () => {
    const r = heuristicScore(profile, {
      title: "Senior Data Analyst", company: "X", location: "Surabaya",
      description: "Min. 5 tahun. SQL, Python, Tableau.",
    });
    expect(r.score).toBeLessThan(60);
    expect(r.gaps.length).toBeGreaterThan(0);
  });

  it("tidak menghukum gaji yang tidak tersedia", () => {
    const r = heuristicScore(profile, { title: "x", company: "x", location: "", description: "" });
    expect(r.components.salary).toBe(1);
  });
});

describe("util", () => {
  it("hash dedup mengabaikan kapitalisasi, tanda baca, dan sufiks PT", () => {
    expect(jobHash("Data Analyst!", "PT Maju Tbk", "Jakarta")).toBe(jobHash("data analyst", "maju", "JAKARTA"));
  });
  it("mendeteksi indikasi penipuan", () => {
    expect(looksSuspicious("Wajib deposit dan biaya pendaftaran")).toBe(true);
    expect(looksSuspicious("Kami mencari data analyst")).toBe(false);
  });
  it("enkripsi bolak-balik dan gagal jika kunci salah", () => {
    const key = Buffer.alloc(32, 7).toString("base64");
    const enc = encrypt("cv rahasia", key);
    expect(decrypt(enc, key)).toBe("cv rahasia");
    expect(() => decrypt(enc, Buffer.alloc(32, 1).toString("base64"))).toThrow();
  });
  it("parseCv mengekstrak skill dan pendidikan", () => {
    const r = parseCv("Universitas Indonesia S1 Statistika\nSkills: SQL, Python, Node.js, C++");
    expect(r.skills).toEqual(expect.arrayContaining(["sql", "python", "node.js", "c++"]));
    expect(r.education).toContain("Universitas");
  });
  it("isoWeek berformat benar", () => {
    expect(isoWeek(new Date("2026-10-27"))).toBe("2026-W44");
  });
});
