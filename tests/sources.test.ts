import { afterEach, describe, expect, it, vi } from "vitest";
import { RssSource } from "@/adapters/sources";
import type { FetchCache, FetchValidators } from "@/ports";

const FEED = `<rss><channel><item><title>Junior Analyst - Acme</title><link>https://x.test/1</link><guid>1</guid><description>SQL</description></item></channel></rss>`;

function memCache(initial?: FetchValidators): FetchCache & { saved?: FetchValidators } {
  const c: FetchCache & { saved?: FetchValidators } = {
    get: async () => initial ?? null,
    set: async (_k, v) => void (c.saved = v),
  };
  return c;
}

afterEach(() => vi.unstubAllGlobals());

describe("RssSource conditional GET", () => {
  it("mengirim validator tersimpan & mengembalikan [] saat 304", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 304 }));
    vi.stubGlobal("fetch", fetchMock);
    const src = new RssSource("https://x.test/feed", memCache({ etag: '"abc"', lastModified: "Wed, 01 Jan 2025 00:00:00 GMT" }));
    expect(await src.fetch()).toEqual([]);
    const headers = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    expect(headers["if-none-match"]).toBe('"abc"');
    expect(headers["if-modified-since"]).toBe("Wed, 01 Jan 2025 00:00:00 GMT");
  });

  it("menyimpan ETag baru saat 200 & mem-parse feed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(FEED, { status: 200, headers: { etag: '"v2"' } })));
    const cache = memCache();
    const jobs = await new RssSource("https://x.test/feed", cache).fetch();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe("Junior Analyst");
    expect(cache.saved?.etag).toBe('"v2"');
  });

  it("kegagalan cache (mis. tabel belum dimigrasi) tidak menggagalkan fetch", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(FEED, { status: 200, headers: { etag: '"v3"' } })));
    const broken: FetchCache = {
      get: async () => { throw new Error("relation source_state does not exist"); },
      set: async () => { throw new Error("relation source_state does not exist"); },
    };
    expect(await new RssSource("https://x.test/feed", broken).fetch()).toHaveLength(1);
  });

  it("tanpa cache berperilaku seperti sebelumnya", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(FEED, { status: 200 })));
    expect(await new RssSource("https://x.test/feed").fetch()).toHaveLength(1);
  });
});
