import { describe, expect, it } from "vitest";
import { chunk, mapLimit } from "@/core/concurrency";

describe("mapLimit", () => {
  it("menjaga urutan hasil & membatasi konkurensi", async () => {
    let active = 0;
    let peak = 0;
    const out = await mapLimit([1, 2, 3, 4, 5, 6], 2, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n * 2;
    });
    expect(peak).toBeLessThanOrEqual(2);
    expect(out.map((r) => (r.status === "fulfilled" ? r.value : null))).toEqual([2, 4, 6, 8, 10, 12]);
  });

  it("error satu item tidak membatalkan yang lain", async () => {
    const out = await mapLimit([1, 2, 3], 3, async (n) => {
      if (n === 2) throw new Error("x");
      return n;
    });
    expect(out.map((r) => r.status)).toEqual(["fulfilled", "rejected", "fulfilled"]);
  });

  it("input kosong tidak error", async () => {
    expect(await mapLimit([], 4, async () => 1)).toEqual([]);
  });
});

describe("chunk", () => {
  it("memecah sesuai ukuran", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });
});
