/**
 * scripts/harvest-telegram.ts
 *
 * Scraper otomatis untuk memanen lowongan dari channel publik Telegram via t.me/s/
 * Tidak memerlukan akun khusus atau bot admin.
 *
 * Contoh penggunaan:
 *   npx tsx --env-file=.env scripts/harvest-telegram.ts loker_programmer loker_it_id
 *   Atau tanpa argumen untuk channel bawaan:
 *   npx tsx --env-file=.env scripts/harvest-telegram.ts
 */

import { repos } from "@/adapters/db/repos";
import { jobHash, looksSuspicious, stripHtml } from "@/core/jobs";

// Daftar channel publik rekomendasi (bisa ditambahkan / diganti via argumen CLI)
const DEFAULT_CHANNELS = [
  "loker_programmer",
  "lowongankerjadotnet",
  "iddevjobs",
  "lokerjakarta_info",
];

interface ExtractedJob {
  channel: string;
  postId: string;
  postUrl: string;
  text: string;
  title: string;
  company: string;
  location: string;
  applyUrl: string;
}

function parsePostText(text: string, channel: string, postId: string, postUrl: string): ExtractedJob | null {
  const clean = text.trim();
  if (clean.length < 60) return null;

  // Cek apakah postingan ini memang lowongan kerja
  const isJob = /\b(hiring|lowongan|loker|we're hiring|posisi|dibutuhkan|kualifikasi|requirements|job description|fresh graduate|internship|magang)\b/i.test(clean);
  if (!isJob) return null;

  const lines = clean.split("\n").map(l => l.trim()).filter(Boolean);
  const firstLine = lines[0] || "";

  // Ekstraksi Judul
  let title = (firstLine.match(/^(?:lowongan(?:\s+kerja)?|loker|we(?:'re|\s+are)\s+hiring|dicari|posisi)\s*[:\-–]?\s*(.+)/i)?.[1] || firstLine)
    .replace(/[#*`_]/g, "")
    .trim();
  if (title.length > 90) title = title.slice(0, 87) + "...";

  // Ekstraksi Perusahaan
  const companyMatch = clean.match(/(?:di|pt|cv|startup|perusahaan|at)\s+([a-zA-Z0-9\s.,]+)/i);
  let company = companyMatch ? companyMatch[1].split("\n")[0].replace(/[#*`_]/g, "").slice(0, 60).trim() : `@${channel}`;

  // Ekstraksi Lokasi
  const locMatch = clean.match(/(?:lokasi|penempatan|domisili)\s*[:\-–]?\s*([a-zA-Z0-9\s.,]+)/i);
  let location = locMatch ? locMatch[1].split("\n")[0].replace(/[#*`_]/g, "").slice(0, 60).trim() : (/\bremote\b/i.test(clean) ? "Remote" : "Indonesia");

  // Ekstraksi URL Lamaran
  const urlMatch = clean.match(/https?:\/\/[^\s"'<>]+/i);
  const applyUrl = urlMatch ? urlMatch[0] : postUrl;

  return {
    channel,
    postId,
    postUrl,
    text: clean,
    title: title || "Lowongan Komunitas",
    company: company || `@${channel}`,
    location: location || "Indonesia",
    applyUrl,
  };
}

async function scrapeChannel(channelName: string): Promise<ExtractedJob[]> {
  const cleanName = channelName.replace(/^@/, "").replace(/^https?:\/\/t\.me\/(?:s\/)?/, "").trim();
  const url = `https://t.me/s/${cleanName}`;
  console.log(`\n📡 Mengambil feed dari t.me/s/${cleanName}...`);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "id,en-US;q=0.9,en;q=0.8",
    },
  });

  if (!res.ok) {
    console.warn(`  ⚠️ Gagal mengambil ${url} (HTTP ${res.status})`);
    return [];
  }

  const html = await res.text();
  
  // Telegram preview menaruh text di <div class="tgme_widget_message_text js-message_text" dir="auto">...</div>
  // dan data-post="channel/123" pada parent
  const parts = html.split('<div class="tgme_widget_message ');
  console.log(`  [DEBUG] Total message blocks di halaman: ${parts.length - 1}`);

  const results: ExtractedJob[] = [];
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const postTagMatch = block.match(/data-post="([^"]+)"/);
    if (!postTagMatch) continue;
    const postTag = postTagMatch[1];

    const textMatch = block.match(/<div class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (!textMatch) continue;

    const rawContent = textMatch[1];
    const text = stripHtml(rawContent.replace(/<br\s*\/?>/gi, "\n"));
    const postId = postTag.split("/")[1] || String(Date.now());
    const postUrl = `https://t.me/${postTag}`;

    const job = parsePostText(text, cleanName, postId, postUrl);
    if (job) results.push(job);
  }



  console.log(`  ✓ Ditemukan ${results.length} postingan berformat lowongan.`);
  return results;
}

async function main() {
  const inputChannels = process.argv.slice(2);
  const channels = inputChannels.length > 0 ? inputChannels : DEFAULT_CHANNELS;

  console.log("=================================================");
  console.log(" 🚀 CocoKerja - Telegram Channel Harvester (Lokal)");
  console.log(" Target Channel:", channels.join(", "));
  console.log("=================================================");

  let totalInserted = 0;
  let totalDuplicates = 0;
  let totalScam = 0;

  for (const ch of channels) {
    try {
      const jobs = await scrapeChannel(ch);
      for (const j of jobs) {
        const suspicious = looksSuspicious(j.text);
        if (suspicious) totalScam++;

        const hash = jobHash(j.title, j.company, j.location);
        const ok = await repos.insertJob({
          source: `telegram:@${j.channel}`,
          externalId: `tg-${j.channel}-${j.postId}`,
          title: j.title,
          company: j.company,
          location: j.location,
          description: j.text.slice(0, 8000),
          url: j.applyUrl,
          suspicious,
          hash,
        });

        if (ok) {
          totalInserted++;
          console.log(`  [BARU] ${j.title} | ${j.company} (${j.location})`);
        } else {
          totalDuplicates++;
        }
      }
    } catch (err) {
      console.error(`  ❌ Error saat memproses @${ch}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("\n=================================================");
  console.log(" 📊 Ringkasan Harvest:");
  console.log(`  - Loker Baru Berhasil Disimpan : ${totalInserted}`);
  console.log(`  - Loker Duplikat (Dilewati)    : ${totalDuplicates}`);
  console.log(`  - Indikasi Suspicious / Scam   : ${totalScam}`);
  console.log("=================================================");

  if (totalInserted > 0) {
    console.log("\n💡 Ingin langsung kirim alert ke user? Jalankan:");
    console.log("   npx tsx --env-file=.env -e \"import { tick } from './src/services/tick'; tick().then(console.log);\"");
  }
}

main().catch(console.error);
