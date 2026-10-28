import { XMLParser } from "fast-xml-parser";
import { env } from "@/config/env";
import { stripHtml } from "@/core/jobs";
import type { FetchCache, JobSource, RawJob } from "@/ports";

const parser = new XMLParser({ ignoreAttributes: false, processEntities: true });

const text = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "object") return String((v as Record<string, unknown>)["#text"] ?? "");
  return String(v);
};

/** Feed RSS/Atom generik. Konvensi umum: judul "Posisi - Perusahaan" atau "Posisi at Perusahaan". */
export class RssSource implements JobSource {
  readonly name: string;
  constructor(private readonly url: string, private readonly cache?: FetchCache) {
    let host = url;
    try {
      host = new URL(url).hostname;
    } catch {
      // URL tidak valid: biarkan fetch() gagal terisolasi per-sumber, bukan melempar saat konfigurasi dimuat.
    }
    this.name = host;
  }

  async fetch(): Promise<RawJob[]> {
    const headers: Record<string, string> = { "user-agent": "CocoKerjaBot/0.1 (+kontak pemilik)" };
    // Kunci = URL penuh (hostname bisa sama untuk beberapa feed). Kegagalan cache jangan menggagalkan fetch.
    const prev = await this.cache?.get(this.url).catch(() => null);
    if (prev?.etag) headers["if-none-match"] = prev.etag;
    if (prev?.lastModified) headers["if-modified-since"] = prev.lastModified;

    const res = await fetch(this.url, { headers, signal: AbortSignal.timeout(15000) });
    if (res.status === 304) return []; // tidak berubah sejak fetch terakhir
    if (!res.ok) throw new Error(`${this.name}: HTTP ${res.status}`);

    const etag = res.headers.get("etag");
    const lastModified = res.headers.get("last-modified");
    if (this.cache && (etag || lastModified)) await this.cache.set(this.url, { etag, lastModified }).catch(() => {});

    const doc = parser.parse(await res.text());
    const items: Record<string, unknown>[] = [].concat(doc?.rss?.channel?.item ?? doc?.feed?.entry ?? []);
    return items.slice(0, 200).map((it) => {
      const rawTitle = text(it.title);
      const [title, company] = rawTitle.split(/\s+(?:-|–|at|@)\s+/i);
      const link = typeof it.link === "object" ? String((it.link as Record<string, unknown>)["@_href"] ?? "") : text(it.link);
      return {
        externalId: text(it.guid ?? it.id) || link,
        title: (title || rawTitle).trim(),
        company: (text(it["dc:creator"]) || company || this.name).trim(),
        location: text(it.location ?? it["job:location"]),
        description: stripHtml(text(it.description ?? it.summary ?? it["content:encoded"] ?? it.content)),
        url: link,
      };
    });
  }
}

const UA = { "user-agent": "CocoKerjaBot/0.1 (+kontak pemilik)" };

/** GET JSON dengan satu kali retry untuk gangguan sementara (5xx/429/jaringan). */
async function getJson<T>(url: string, name: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
      if (res.ok) return (await res.json()) as T;
      lastErr = new Error(`${name}: HTTP ${res.status}`);
      if (res.status < 500 && res.status !== 429) break; // 4xx permanen: jangan coba lagi
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  throw lastErr instanceof Error ? lastErr : new Error(`${name}: gagal`);
}

const ID_RE = /indonesia|jakarta|bandung|surabaya|yogyakarta|bali|tangerang|bekasi|depok|bogor|semarang|medan/i;
const WORLD_RE = /worldwide|anywhere|asia|apac|southeast/i;

const inIndonesia = (loc: string) => ID_RE.test(loc);
const slugName = (slug: string) => slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** ATS publik per perusahaan (API resmi, tanpa kunci). Hanya lowongan berlokasi Indonesia yang diambil. */
export class AtsSource implements JobSource {
  readonly name: string;
  constructor(private readonly kind: "greenhouse" | "lever" | "ashby", private readonly slug: string) {
    this.name = `${kind}:${slug}`;
  }

  async fetch(): Promise<RawJob[]> {
    const company = slugName(this.slug);
    if (this.kind === "greenhouse") {
      const d = await getJson<{ jobs: { id: number; title: string; absolute_url: string; location?: { name?: string }; content?: string }[] }>(
        `https://boards-api.greenhouse.io/v1/boards/${this.slug}/jobs?content=true`, this.name);
      return d.jobs.filter((j) => inIndonesia(j.location?.name ?? "")).map((j) => ({
        externalId: `gh-${this.slug}-${j.id}`, title: j.title, company, location: j.location?.name ?? "",
        description: stripHtml(decodeEntities(j.content ?? "")), url: j.absolute_url,
      }));
    }
    if (this.kind === "lever") {
      const d = await getJson<{ id: string; text: string; hostedUrl: string; categories?: { location?: string }; descriptionPlain?: string }[]>(
        `https://api.lever.co/v0/postings/${this.slug}?mode=json`, this.name);
      return d.filter((j) => inIndonesia(j.categories?.location ?? "")).map((j) => ({
        externalId: `lv-${this.slug}-${j.id}`, title: j.text, company, location: j.categories?.location ?? "",
        description: j.descriptionPlain ?? "", url: j.hostedUrl,
      }));
    }
    const d = await getJson<{ jobs: { id: string; title: string; location?: string; jobUrl: string; descriptionPlain?: string; isListed?: boolean }[] }>(
      `https://api.ashbyhq.com/posting-api/job-board/${this.slug}`, this.name);
    return d.jobs.filter((j) => j.isListed !== false && inIndonesia(j.location ?? "")).map((j) => ({
      externalId: `ab-${this.slug}-${j.id}`, title: j.title, company, location: j.location ?? "",
      description: j.descriptionPlain ?? "", url: j.jobUrl,
    }));
  }
}

function decodeEntities(s: string): string {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

/** Remotive (remote global). Hanya yang terbuka untuk Indonesia/worldwide/Asia. Wajib kredit & link balik ke Remotive. */
export class RemotiveSource implements JobSource {
  readonly name = "remotive";
  async fetch(): Promise<RawJob[]> {
    const d = await getJson<{ jobs: { id: number; title: string; company_name: string; url: string; candidate_required_location?: string; description?: string }[] }>(
      "https://remotive.com/api/remote-jobs?limit=100", this.name);
    return d.jobs
      .filter((j) => WORLD_RE.test(j.candidate_required_location ?? "") || inIndonesia(j.candidate_required_location ?? ""))
      .map((j) => ({
        externalId: `rm-${j.id}`, title: j.title, company: j.company_name,
        location: `Remote (${j.candidate_required_location ?? "worldwide"})`,
        description: stripHtml(j.description ?? ""), url: j.url,
      }));
  }
}

/** Channel Telegram Publik (t.me/s/) kurasi Indonesia / fresh graduate. */
export class TelegramChannelSource implements JobSource {
  readonly name: string;
  private readonly channelName: string;

  constructor(channel: string) {
    this.channelName = channel.replace(/^@/, "").replace(/^https?:\/\/t\.me\/(?:s\/)?/, "").trim();
    this.name = `telegram:@${this.channelName}`;
  }

  async fetch(): Promise<RawJob[]> {
    const url = `https://t.me/s/${this.channelName}`;
    const res = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "accept": "text/html,application/xhtml+xml",
        "accept-language": "id,en-US;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];

    const html = await res.text();
    const parts = html.split('<div class="tgme_widget_message ');
    const jobs: RawJob[] = [];

    for (let i = 1; i < parts.length; i++) {
      const block = parts[i];
      const postTagMatch = block.match(/data-post="([^"]+)"/);
      if (!postTagMatch) continue;
      const postTag = postTagMatch[1];

      const textMatch = block.match(/<div class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (!textMatch) continue;

      const rawContent = textMatch[1];
      // Pertahankan ganti baris sebelum stripHtml agar pemisahan baris per paragraf tidak hilang
      const text = rawContent
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/div>|<\/p>/gi, "\n")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/[ \t]+/g, " ")
        .trim();
      if (text.length < 60) continue;

      // Filter relevansi: pastikan memuat indikator lowongan kerja riil
      const isJob = /\b(hiring|lowongan|loker|we're hiring|posisi|dibutuhkan|kualifikasi|persyaratan|requirements|job description|fresh graduate|magang|internship)\b/i.test(text);
      if (!isJob) continue;

      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      const firstLine = lines[0] || "";

      let title = (firstLine.match(/^(?:lowongan(?:\s+kerja)?|loker|we(?:'re|\s+are)\s+hiring|dicari|posisi)\s*[:\-–]?\s*(.+)/i)?.[1] || firstLine)
        .replace(/[#*`_]/g, "")
        .trim();
      if (title.length > 90) title = title.slice(0, 87) + "...";

      const companyMatch = text.match(/\b(?:pt|cv)\.?\s+([a-zA-Z0-9\s.,]+)/i) || text.match(/(?:startup|perusahaan|at)\s+([a-zA-Z0-9\s.,]+)/i);
      let company = companyMatch ? (companyMatch[0].startsWith("pt") || companyMatch[0].startsWith("cv") || companyMatch[0].startsWith("PT") || companyMatch[0].startsWith("CV") ? companyMatch[0] : companyMatch[1]).split("\n")[0].split(/\s+di\s+/i)[0].replace(/[#*`_]/g, "").slice(0, 60).trim() : `@${this.channelName}`;

      const locMatch = text.match(/(?:lokasi|penempatan|domisili)\s*[:\-–]?\s*([a-zA-Z0-9\s.,]+)/i) || text.match(/\bdi\s+([a-zA-Z\s]+)/i);
      let location = locMatch ? locMatch[1].split("\n")[0].replace(/[#*`_]/g, "").slice(0, 60).trim() : (/\bremote\b/i.test(text) ? "Remote" : "Indonesia");

      const urlMatch = text.match(/https?:\/\/[^\s"'<>]+/i);
      const applyUrl = urlMatch ? urlMatch[0] : `https://t.me/${postTag}`;
      const postId = postTag.split("/")[1] || String(Date.now());

      jobs.push({
        externalId: `tg-${this.channelName}-${postId}`,
        title: title || "Lowongan Komunitas",
        company: company || `@${this.channelName}`,
        location: location || "Indonesia",
        description: text.slice(0, 8000),
        url: applyUrl,
      });
    }

    return jobs;
  }
}

/** JOB_SOURCES: daftar dipisah koma, mis. "greenhouse:xendit,lever:nium,ashby:airwallex,remotive". */
function parseSource(spec: string): JobSource | null {
  const [kind, slug] = spec.split(":");
  if (kind === "remotive") return new RemotiveSource();
  if (slug && (kind === "greenhouse" || kind === "lever" || kind === "ashby")) return new AtsSource(kind, slug);
  return null;
}

export function configuredSources(cache?: FetchCache): JobSource[] {
  const csv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
  const e = env();
  return [
    ...csv(e.JOB_FEEDS).map((u) => new RssSource(u, cache)),
    ...csv(e.JOB_SOURCES).map(parseSource).filter((s): s is JobSource => s !== null),
    ...csv(e.TELEGRAM_CHANNELS).map((ch) => new TelegramChannelSource(ch)),
  ];
}

