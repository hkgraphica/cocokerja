const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL ?? "https://t.me/";

const steps = [
  { n: "01", t: "Kirim CV", d: "Upload PDF ke bot Telegram. Data terenkripsi dan bisa kamu hapus kapan saja." },
  { n: "02", t: "Atur preferensi", d: "Peran, kota atau remote, dan level. Tidak sampai satu menit." },
  { n: "03", t: "Terima alert cerdas", d: "Hanya lowongan yang relevan, lengkap dengan skor dan alasannya." },
  { n: "04", t: "Siap melamar", d: "Lihat skill gap, simpan ke tracker, dan beri umpan balik agar makin akurat." },
];

const features = [
  { i: "🎯", t: "Skor kecocokan yang jujur", d: "Bukan sekadar keyword. Setiap skor punya alasan cocok dan kekurangannya." },
  { i: "🛡️", t: "Penyaring lowongan palsu", d: "Indikasi MLM atau minta biaya pendaftaran ditandai sebelum kamu melamar." },
  { i: "🔒", t: "Privasi dulu", d: "CV terenkripsi, persetujuan eksplisit, dan hapus semua data dengan satu perintah." },
  { i: "💬", t: "Tanpa aplikasi baru", d: "Semua berjalan di Telegram. Tidak perlu mendaftar akun atau mengingat kata sandi." },
];

export default function Home() {
  return (
    <main>
      <div className="glow" aria-hidden />
      <header className="nav">
        <span className="logo">Coco<b>Kerja</b></span>
        <a className="btn btn-ghost" href={BOT_URL} id="nav-cta">Buka bot</a>
      </header>

      <section className="hero">
        <span className="pill">Uji coba terbuka • Gratis</span>
        <h1>
          Lowongan yang <em>benar-benar cocok</em>, langsung ke Telegram kamu.
        </h1>
        <p className="lead">
          CocoKerja memantau lowongan, menilai kecocokannya dengan profilmu, lalu membantu kamu siap melamar.
          Dibuat untuk fresh graduate Indonesia.
        </p>
        <div className="cta">
          <a className="btn btn-primary" href={BOT_URL} id="hero-cta">Mulai di Telegram →</a>
          <span className="note">Tanpa kartu kredit • 3 alert gratis per minggu</span>
        </div>

        <div className="card-demo" aria-label="Contoh alert lowongan">
          <div className="demo-top">
            <strong>Junior Data Analyst</strong>
            <span className="score">87%</span>
          </div>
          <p className="muted">PT Contoh Data • Jakarta</p>
          <ul>
            <li className="ok">Skill cocok: sql, excel, power bi</li>
            <li className="ok">Terbuka untuk fresh graduate</li>
            <li className="warn">Skill kurang: tableau</li>
          </ul>
          <div className="demo-actions"><span>📊 Skill gap</span><span>💾 Simpan</span><span>👍 Cocok</span></div>
        </div>
      </section>

      <section className="section" aria-labelledby="how">
        <h2 id="how">Cara kerjanya</h2>
        <div className="grid4">
          {steps.map((s) => (
            <article className="tile" key={s.n}>
              <span className="num">{s.n}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="why">
        <h2 id="why">Kenapa CocoKerja</h2>
        <div className="grid2">
          {features.map((f) => (
            <article className="tile" key={f.t}>
              <span className="icon">{f.i}</span>
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="final">
        <h2>Siap berhenti scroll grup loker?</h2>
        <a className="btn btn-primary" href={BOT_URL} id="final-cta">Mulai sekarang →</a>
      </section>

      <footer className="foot">© 2026 CocoKerja • Versi uji coba. Kami tidak menjamin mendapat pekerjaan.</footer>
    </main>
  );
}
