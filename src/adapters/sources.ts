import { XMLParser } from "fast-xml-parser";
import { env } from "@/config/env";
import { stripHtml } from "@/core/jobs";
import type { JobSource, RawJob } from "@/ports";

const parser = new XMLParser({ ignoreAttributes: false, processEntities: true });

const text = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "object") return String((v as Record<string, unknown>)["#text"] ?? "");
  return String(v);
};

/** Feed RSS/Atom generik. Konvensi umum: judul "Posisi - Perusahaan" atau "Posisi at Perusahaan". */
export class RssSource implements JobSource {
  readonly name: string;
  constructor(private readonly url: string) {
    this.name = new URL(url).hostname;
  }

  async fetch(): Promise<RawJob[]> {
    const res = await fetch(this.url, {
      headers: { "user-agent": "CocoKerjaBot/0.1 (+kontak pemilik)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`${this.name}: HTTP ${res.status}`);
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

async function getJson<T>(url: string, name: string): Promise<T> {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return (await res.json()) as T;
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

/** JOB_SOURCES: daftar dipisah koma, mis. "greenhouse:xendit,lever:nium,ashby:airwallex,remotive". */
function parseSource(spec: string): JobSource | null {
  const [kind, slug] = spec.split(":");
  if (kind === "remotive") return new RemotiveSource();
  if (slug && (kind === "greenhouse" || kind === "lever" || kind === "ashby")) return new AtsSource(kind, slug);
  return null;
}

export function configuredSources(): JobSource[] {
  const csv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
  const e = env();
  return [
    ...csv(e.JOB_FEEDS).map((u) => new RssSource(u)),
    ...csv(e.JOB_SOURCES).map(parseSource).filter((s): s is JobSource => s !== null),
  ];
}
