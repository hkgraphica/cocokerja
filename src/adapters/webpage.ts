import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { stripHtml } from "@/core/jobs";
import { isAllowedUrlShape, isPrivateAddress } from "@/core/net";

/** Hasil pembacaan halaman lowongan atas permintaan pengguna (Cek Lowongan Instan). */
export interface JobPage {
  title: string;
  company: string;
  location: string;
  description: string;
}

const MAX_BYTES = 600_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8000;
const UA = { "user-agent": "CocoKerjaBot/0.1 (cek lowongan atas permintaan pengguna)" };

/** Semua alamat hasil DNS harus publik. Catatan: tidak menutup DNS-rebinding sepenuhnya (TOCTOU). */
async function assertPublicHost(u: URL): Promise<void> {
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new Error("host tidak diizinkan");
    return;
  }
  const addrs = await lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) throw new Error("host tidak diizinkan");
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
    if (total >= MAX_BYTES) {
      await reader.cancel().catch(() => {});
      break;
    }
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Ambil halaman lowongan dengan pengamanan SSRF: hanya http(s) port standar, setiap hop (termasuk redirect)
 * divalidasi ke alamat publik, ukuran dibatasi, tipe konten harus teks/HTML. Mengembalikan null bila gagal.
 */
export async function fetchJobPage(rawUrl: string): Promise<JobPage | null> {
  let current = isAllowedUrlShape(rawUrl);
  for (let hop = 0; current && hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(current);
    const res = await fetch(current, { redirect: "manual", headers: UA, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      void res.body?.cancel().catch(() => {});
      current = loc ? isAllowedUrlShape(new URL(loc, current).toString()) : null;
      continue;
    }
    if (!res.ok || !/text\/html|text\/plain|application\/xhtml/i.test(res.headers.get("content-type") ?? "")) {
      void res.body?.cancel().catch(() => {});
      return null;
    }
    return parseJobHtml(await readCapped(res));
  }
  return null;
}

type Json = Record<string, unknown>;
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v]);
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function meta(html: string, prop: string): string {
  const p = prop.replace(/[:]/g, "\\:");
  const a = new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]*content=["']([^"']*)["']`, "i").exec(html);
  const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${p}["']`, "i").exec(html);
  return stripHtml(a?.[1] ?? b?.[1] ?? "");
}

/** Cari objek JobPosting (schema.org) di blok JSON-LD: sumber data paling akurat bila tersedia. */
function findJobPosting(html: string): Json | null {
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const stack = asArray(JSON.parse(m[1])) as Json[];
      while (stack.length) {
        const node = stack.pop();
        if (!node || typeof node !== "object") continue;
        if (asArray(node["@type"]).includes("JobPosting")) return node;
        stack.push(...(asArray(node["@graph"]) as Json[]));
      }
    } catch {
      // JSON-LD rusak: abaikan
    }
  }
  return null;
}

function postingLocation(p: Json): string {
  const parts = asArray(p.jobLocation).map((l) => {
    const addr = (l as Json)?.address as Json | undefined;
    return [str(addr?.addressLocality), str(addr?.addressRegion)].filter(Boolean).join(", ");
  }).filter(Boolean);
  if (str(p.jobLocationType).toUpperCase() === "TELECOMMUTE") parts.push("Remote");
  return parts.join("; ");
}

export function parseJobHtml(html: string): JobPage {
  const posting = findJobPosting(html);
  if (posting) {
    const org = posting.hiringOrganization;
    const description = stripHtml(stripHtml(str(posting.description))); // deskripsi sering berupa HTML ter-escape
    if (description.length >= 80) {
      return {
        title: str(posting.title).slice(0, 100),
        company: (typeof org === "string" ? org : str((org as Json | undefined)?.name)).slice(0, 100),
        location: postingLocation(posting).slice(0, 100),
        description: description.slice(0, 8000),
      };
    }
  }
  const body = html
    .replace(/<(script|style|noscript|svg|nav|footer|header|aside)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const docTitle = /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1] ?? "";
  return {
    title: (meta(html, "og:title") || stripHtml(docTitle)).slice(0, 100),
    company: meta(html, "og:site_name").slice(0, 100),
    location: "",
    description: stripHtml(body).slice(0, 8000),
  };
}
