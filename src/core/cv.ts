import { extractSkills } from "./skills";

const EDU_RE = /(universitas|university|institut|politeknik|sekolah tinggi|\bS1\b|\bS2\b|\bD3\b|\bD4\b|sarjana|bachelor|master)/i;

export interface ParsedCv {
  skills: string[];
  education: string;
}

/** Parsing CV heuristik (MVP). Dapat diganti parser LLM tanpa mengubah pemanggil. */
export function parseCv(text: string): ParsedCv {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const edu = lines.find((l) => EDU_RE.test(l)) ?? "";
  return { skills: extractSkills(text), education: edu.slice(0, 140) };
}
