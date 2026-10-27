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

export function configuredSources(): JobSource[] {
  return env()
    .JOB_FEEDS.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((u) => new RssSource(u));
}
