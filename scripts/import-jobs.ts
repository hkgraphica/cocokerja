/**
 * Impor lowongan hasil kurasi manual (20-30/minggu).
 * npx tsx --env-file=.env scripts/import-jobs.ts data/jobs.json
 * Format JSON: [{ "title","company","location","description","url" }]
 * Format CSV (header wajib): title,company,location,description,url
 */
import { readFileSync } from "node:fs";
import { repos } from "@/adapters/db/repos";
import { jobHash } from "@/core/jobs";

type Row = { title: string; company: string; location: string; description: string; url: string };

function parseCsv(src: string): Row[] {
  const rows: string[][] = [];
  let cur = "", row: string[] = [], q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])) as Row);
}

const file = process.argv[2];
if (!file) { console.error("Pakai: import-jobs.ts <file.json|file.csv>"); process.exit(1); }
const raw = readFileSync(file, "utf8");
const list: Row[] = file.endsWith(".csv") ? parseCsv(raw) : JSON.parse(raw);

let n = 0, skip = 0;
for (const j of list) {
  if (!j.title || !j.company || !j.url) { skip++; continue; }
  const ok = await repos.insertJob({
    source: "manual", title: j.title, company: j.company, location: j.location ?? "",
    description: j.description ?? "", url: j.url,
    suspicious: /deposit|downline|biaya pendaftaran|bayar dulu/i.test(`${j.title} ${j.description}`),
    hash: jobHash(j.title, j.company, j.location ?? ""),
  });
  if (ok) n++;
}
console.log(`Impor: ${n} baru, ${list.length - n - skip} duplikat, ${skip} dilewati`);
process.exit(0);
