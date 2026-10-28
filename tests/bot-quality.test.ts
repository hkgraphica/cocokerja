import { describe, expect, it } from "vitest";
import { parseJobHtml } from "@/adapters/webpage";
import { looksLikeBlockedPage } from "@/core/jobs";
import { sanitizeTelegramHtml, toPlainText } from "@/core/messages";
import { isAllowedUrlShape, isPrivateAddress } from "@/core/net";
import { parseLevel, parseLocation, parseRoles } from "@/core/profile";
import { extractSkills } from "@/core/skills";

describe("sanitizeTelegramHtml", () => {
  it("mempertahankan tag aman dan meng-escape karakter berbahaya", () => {
    expect(sanitizeTelegramHtml("IPK < 3.0 & <b>tetap</b> semangat")).toBe("IPK &lt; 3.0 &amp; <b>tetap</b> semangat");
  });
  it("membuang tag tidak didukung/berbahaya (a, br, script)", () => {
    const out = sanitizeTelegramHtml('Klik <a href="http://evil">di sini</a><br>ok<script>x</script>');
    expect(out).not.toMatch(/<a|<br|<script/);
    expect(out).toContain("di sini");
  });
  it("menyeimbangkan tag: menutup yang terbuka dan membuang penutup yatim", () => {
    expect(sanitizeTelegramHtml("<b>tebal <i>miring")).toBe("<b>tebal <i>miring</i></b>");
    expect(sanitizeTelegramHtml("teks</b> biasa")).toBe("teks biasa");
  });
  it("mengubah markdown tebal dan heading menjadi <b>", () => {
    expect(sanitizeTelegramHtml("**Penting** dulu")).toBe("<b>Penting</b> dulu");
    expect(sanitizeTelegramHtml("## Langkah 1")).toBe("<b>Langkah 1</b>");
  });
  it("tidak meng-escape ulang entitas yang sudah valid dan membatasi panjang", () => {
    expect(sanitizeTelegramHtml("A &amp; B")).toBe("A &amp; B");
    expect(sanitizeTelegramHtml("x".repeat(10000)).length).toBeLessThanOrEqual(3900);
  });
  it("toPlainText membuang tag dan mengembalikan entitas", () => {
    expect(toPlainText("<b>A</b> &lt;3 &amp; B")).toBe("A <3 & B");
  });
});

describe("pagar SSRF (core/net)", () => {
  it.each(["127.0.0.1", "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "fe80::1", "fc00::1", "::ffff:127.0.0.1", "::ffff:7f00:1"])(
    "%s dianggap privat",
    (ip) => expect(isPrivateAddress(ip)).toBe(true),
  );
  it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111"])("%s dianggap publik", (ip) =>
    expect(isPrivateAddress(ip)).toBe(false),
  );
  it("menolak URL berbahaya & menerima URL biasa", () => {
    for (const bad of ["file:///etc/passwd", "ftp://x.com", "http://localhost/", "http://127.0.0.1/", "http://169.254.169.254/latest/meta-data", "http://user:pw@example.com/", "https://example.com:8443/", "http://[::1]/", "http://db.internal/", "not a url"]) {
      expect(isAllowedUrlShape(bad), bad).toBeNull();
    }
    expect(isAllowedUrlShape("https://www.glints.com/id/opportunities/jobs/1")).not.toBeNull();
  });
});

describe("parseJobHtml", () => {
  it("memakai JSON-LD JobPosting (perusahaan, lokasi, deskripsi akurat)", () => {
    const html = `<html><head><title>Login | Situs</title><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [{
        "@type": "JobPosting", title: "Data Analyst",
        hiringOrganization: { name: "PT Maju Jaya" },
        jobLocation: { address: { addressLocality: "Jakarta", addressRegion: "DKI Jakarta" } },
        description: "&lt;p&gt;Kami mencari data analyst fresh graduate dengan SQL dan Excel untuk bergabung bersama tim kami.&lt;/p&gt;",
      }],
    })}</script></head><body>nav</body></html>`;
    const p = parseJobHtml(html);
    expect(p).toMatchObject({ title: "Data Analyst", company: "PT Maju Jaya", location: "Jakarta, DKI Jakarta" });
    expect(p.description).toContain("SQL dan Excel");
    expect(p.description).not.toMatch(/<|&lt;/);
  });
  it("fallback ke og:title/site_name dan membuang script/nav/footer", () => {
    const p = parseJobHtml(`<head><meta property="og:title" content="Junior Analyst"><meta property="og:site_name" content="Glints"></head><body><nav>MENU</nav><script>var x=1</script><p>Deskripsi pekerjaan</p><footer>FOOT</footer></body>`);
    expect(p.title).toBe("Junior Analyst");
    expect(p.company).toBe("Glints");
    expect(p.description).toContain("Deskripsi pekerjaan");
    expect(p.description).not.toMatch(/MENU|FOOT|var x/);
  });
  it("JSON-LD rusak tidak membuat error", () => {
    expect(() => parseJobHtml(`<script type="application/ld+json">{rusak</script><p>halo</p>`)).not.toThrow();
  });
});

describe("looksLikeBlockedPage", () => {
  it("mendeteksi login wall/captcha/halaman terlalu pendek", () => {
    expect(looksLikeBlockedPage("Sign Up | LinkedIn", "x".repeat(500))).toBe(true);
    expect(looksLikeBlockedPage("Just a moment...", "x".repeat(500))).toBe(true);
    expect(looksLikeBlockedPage("Data Analyst", "pendek")).toBe(true);
    expect(looksLikeBlockedPage("Data Analyst - PT Maju", "x".repeat(500))).toBe(false);
  });
});

describe("parser profil", () => {
  it("parseRoles: huruf kecil, unik, maks 5", () => {
    expect(parseRoles("Data Analyst, BI Analyst, data analyst")).toEqual(["data analyst", "bi analyst"]);
    expect(parseRoles("a,b,c,d,e,f,g")).toHaveLength(5);
    expect(parseRoles(" , ,")).toEqual([]);
  });
  it("parseLocation: mempertahankan koma antar kota dan mendeteksi remote", () => {
    expect(parseLocation("Jakarta, Bandung remote")).toEqual({ location: "jakarta, bandung", remote: true });
    expect(parseLocation("Remote")).toEqual({ location: "", remote: true });
    expect(parseLocation("Jakarta / Bogor & Depok")).toEqual({ location: "jakarta, bogor, depok", remote: false });
  });
  it("parseLevel: alias dan nilai tidak valid", () => {
    expect(parseLevel("Fresh Graduate")).toBe("fresh");
    expect(parseLevel("magang")).toBe("magang");
    expect(parseLevel("semua level")).toBe("any");
    expect(parseLevel("bos")).toBeNull();
  });
});

describe("extractSkills dengan alias Indonesia", () => {
  it("mengenali istilah bahasa Indonesia sebagai skill kanonik", () => {
    expect(extractSkills("Menguasai analisis data, akuntansi, dan bahasa inggris")).toEqual(
      expect.arrayContaining(["data analysis", "accounting", "english"]),
    );
  });
  it("skill baru terdeteksi dan skill lama tidak berubah", () => {
    expect(extractSkills("Google Sheets, Power BI, SQL")).toEqual(expect.arrayContaining(["google sheets", "power bi", "sql"]));
    expect(extractSkills("Node.js dan C++")).toEqual(expect.arrayContaining(["node.js", "c++"]));
  });
});
