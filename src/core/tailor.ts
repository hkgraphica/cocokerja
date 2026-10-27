/**
 * Tailor CV anti-halusinasi: LLM hanya boleh menyusun ulang fakta yang ADA di CV.
 * Setiap sorotan wajib menyertakan kutipan bukti dari CV; yang buktinya tidak ditemukan dibuang.
 */
export interface TailorDraft {
  summary: string;
  highlights: { text: string; evidence: string }[];
  missingKeywords: string[];
}

export interface TailorResult {
  summary: string;
  highlights: string[];
  missingKeywords: string[];
  dropped: number;
}

const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Bukti sah bila kutipan (min. 3 kata) muncul utuh di CV setelah normalisasi spasi/tanda baca. */
export function evidenceInCv(evidence: string, cvText: string): boolean {
  const e = squash(evidence);
  return e.split(" ").length >= 3 && squash(cvText).includes(e);
}

export function verifyTailor(draft: TailorDraft, cvText: string): TailorResult {
  const ok = draft.highlights.filter((h) => h.text.trim() && evidenceInCv(h.evidence, cvText));
  const cv = squash(cvText);
  return {
    summary: draft.summary.trim(),
    highlights: ok.slice(0, 5).map((h) => h.text.trim()),
    // kata kunci "kurang" yang ternyata ada di CV tidak boleh dilaporkan sebagai kurang
    missingKeywords: draft.missingKeywords.filter((k) => k.trim() && !cv.includes(squash(k))).slice(0, 6),
    dropped: draft.highlights.length - ok.length,
  };
}
