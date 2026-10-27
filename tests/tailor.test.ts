import { describe, expect, it } from "vitest";
import { evidenceInCv, verifyTailor } from "@/core/tailor";

const cv = "Magang Data Analyst di PT Maju. Membuat dashboard Power BI untuk tim penjualan. Menguasai SQL dan Excel.";

describe("tailor anti-halusinasi", () => {
  it("menerima kutipan yang ada di CV (abaikan tanda baca/kapital)", () => {
    expect(evidenceInCv("membuat dashboard power bi untuk tim penjualan", cv)).toBe(true);
  });
  it("menolak kutipan karangan atau terlalu pendek", () => {
    expect(evidenceInCv("memimpin tim 10 orang", cv)).toBe(false);
    expect(evidenceInCv("SQL", cv)).toBe(false);
  });
  it("membuang sorotan tanpa bukti dan tidak melaporkan kata kunci yang sebenarnya ada", () => {
    const r = verifyTailor(
      {
        summary: "Fresh graduate analitik.",
        highlights: [
          { text: "Membangun dashboard Power BI", evidence: "Membuat dashboard Power BI untuk tim penjualan" },
          { text: "Menguasai Python tingkat lanjut", evidence: "Ahli Python dan machine learning" },
        ],
        missingKeywords: ["Tableau", "SQL"],
      },
      cv,
    );
    expect(r.highlights).toEqual(["Membangun dashboard Power BI"]);
    expect(r.dropped).toBe(1);
    expect(r.missingKeywords).toEqual(["Tableau"]);
  });
});
