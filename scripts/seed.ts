/** Mengisi lowongan contoh untuk uji lokal tanpa feed. npx tsx --env-file=.env scripts/seed.ts */
import { repos } from "@/adapters/db/repos";
import { jobHash } from "@/core/jobs";

const jobs = [
  ["Junior Data Analyst", "PT Contoh Data", "Jakarta", "Fresh graduate welcome. SQL, Excel, Power BI, data analysis. Min S1 Statistika/TI."],
  ["Data Analyst Intern", "Startup Analitika", "Remote", "Magang remote. Python, pandas, SQL, Tableau. Mahasiswa tingkat akhir/fresh graduate."],
  ["Senior Data Analyst", "PT Besar Tbk", "Jakarta", "Pengalaman min. 5 tahun. SQL, Python, leadership."],
  ["Frontend Developer Junior", "Studio Web", "Bandung", "React, TypeScript, HTML, CSS, git. Fresh graduate diterima."],
  ["Admin Online - Bayar biaya pendaftaran", "CV Cepat Kaya", "Jakarta", "Wajib deposit dan biaya pendaftaran Rp500.000, rekrut downline."],
] as const;

let n = 0;
for (const [title, company, location, description] of jobs) {
  const ok = await repos.insertJob({
    source: "seed", title, company, location, description,
    url: `https://example.com/jobs/${encodeURIComponent(title)}`,
    suspicious: /deposit|downline/i.test(description),
    hash: jobHash(title, company, location),
  });
  if (ok) n++;
}
console.log(`Seed: ${n} lowongan baru`);
process.exit(0);
