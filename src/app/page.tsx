import Image from "next/image";

const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL ?? "https://t.me/cocokerja_bot";

export default function Home() {
  return (
    <>
      <div className="bg-grid" aria-hidden="true" />
      <div className="container">
        {/* Navigation */}
        <header className="header">
          <a href="#" className="brand">
            <span className="brand-badge">CK</span>
            <span>CocoKerja</span>
          </a>
          <nav className="nav-actions">
            <a href="#cara-kerja" className="link-muted">Cara Kerja</a>
            <a href="#fitur" className="link-muted">Fitur</a>
            <a
              href={BOT_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              id="nav-bot-link"
            >
              Buka di Telegram
            </a>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="hero">
          <div className="status-badge">
            <span className="status-dot" />
            <span>MVP Pilot Aktif • Khusus Fresh Graduate</span>
          </div>

          <h1>
            Job alert terkurasi langsung ke chat. Bukan sekadar keyword match.
          </h1>

          <p className="lead">
            Kirimkan CV kamu satu kali. CocoKerja mengekstrak skill dan pengalaman secara terstruktur,
            lalu memantau lowongan kerja riil dan memberikan evaluasi kecocokan objektif beserta analisis kekurangannya.
          </p>

          <div className="hero-cta">
            <a
              href={BOT_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-accent"
              id="hero-start-btn"
            >
              Mulai via @cocokerja_bot →
            </a>
            <span className="hero-meta">Gratis 3 alert/minggu • Enkripsi CV tersimpan</span>
          </div>

          <div className="hero-showcase" aria-label="Karier Sukses Bersama CocoKerja">
            <Image
              src="/hero-human.jpg"
              alt="Fresh graduate Indonesia yang percaya diri mempersiapkan karir bersama asisten AI CocoKerja"
              className="hero-img"
              width={1376}
              height={768}
              sizes="(max-width: 1040px) 100vw, 1040px"
              priority
            />
            <div className="hero-overlay-tag">
              <div className="tag-icon">CK</div>
              <div>
                <div className="tag-text">Karier Pertama Dimulai dari Peluang yang Tepat</div>
                <div className="tag-sub">Matching lowongan akurat langsung via @cocokerja_bot Telegram</div>
              </div>
            </div>
          </div>
        </section>

        {/* Split Preview: Real product representation */}
        <section className="preview-section" id="demo">
          <div>
            <div className="section-label">Transparansi Data</div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 600, marginBottom: "16px", letterSpacing: "-0.02em" }}>
              Tahu persis alasan lowongan cocok sebelum kamu melamar.
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "24px" }}>
              Portal kerja konvensional membombardir inbox kamu dengan ratusan lowongan yang meleset.
              Di CocoKerja, setiap alert yang dikirim disertai perincian data: skill mana yang kamu miliki,
              skill apa yang masih kurang, dan apakah level pengalamannya realistis untuk fresh graduate.
            </p>
            <div style={{ display: "grid", gap: "12px", borderLeft: "2px solid var(--border)", paddingLeft: "16px" }}>
              <div>
                <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>Deteksi Indikasi Penipuan</strong>
                <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}>
                  Otomatis menandai postingan yang meminta biaya pendaftaran atau modus MLM.
                </p>
              </div>
              <div>
                <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>Hak Kendali Data Pribadi</strong>
                <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}>
                  Sesuai regulasi UU PDP. Ketik /hapus kapan saja untuk memusnahkan CV dan riwayat profilmu.
                </p>
              </div>
            </div>
          </div>

          {/* Telegram Alert Message Card UI */}
          <div className="mock-telegram">
            <div className="mock-header">
              <div className="mock-sender">
                <div className="mock-avatar">CK</div>
                <div>
                  <div className="mock-title">CocoKerja Bot</div>
                  <div className="mock-tag">bot • verified alert</div>
                </div>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                Hari ini 09:41
              </span>
            </div>

            <div className="mock-content">
              <div>
                <div className="job-title">Junior Data Analyst</div>
                <div className="job-company">PT Telekomunikasi Nusantara • Jakarta Selatan (Hybrid)</div>
              </div>

              <div className="match-bar-container">
                <div className="match-header">
                  <span className="match-label">Skor Kesesuaian Profil</span>
                  <span className="match-value">84% Cocok</span>
                </div>
                <div className="match-bar">
                  <div className="match-bar-fill" style={{ width: "84%" }} />
                </div>
              </div>

              <div className="reason-list">
                <div className="reason-item match">
                  <span className="icon-ok">✓</span>
                  <span>Skill cocok: SQL, Excel, Python dasar, data cleaning</span>
                </div>
                <div className="reason-item match">
                  <span className="icon-ok">✓</span>
                  <span>Kriteria pengalaman terbuka untuk Fresh Graduate / S1</span>
                </div>
                <div className="reason-item gap">
                  <span className="icon-warn">!</span>
                  <span>Skill kurang: Tableau / Power BI dashboarding</span>
                </div>
              </div>

              <div className="mock-actions">
                <a href={BOT_URL} className="mock-btn mock-btn-main">
                  🔗 Buka Link Lamaran Resmi
                </a>
                <span className="mock-btn">📊 Analisis Skill Gap</span>
                <span className="mock-btn">💾 Simpan ke Tracker</span>
                <span className="mock-btn">👍 Cocok</span>
                <span className="mock-btn">👎 Tidak Relevan</span>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow / Cara Kerja */}
        <section className="features-section" id="cara-kerja">
          <div className="section-label">Alur Penggunaan</div>
          <h2 className="section-title">Sederhana. Tanpa perlu download aplikasi baru.</h2>

          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-num">01 / SETUP</div>
              <h3 className="feature-title">Kirimkan CV Kamu</h3>
              <p className="feature-desc">
                Cukup drop file PDF atau paste teks CV ke Telegram. Profil diekstrak otomatis dan disimpan terenkripsi AES-256.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-num">02 / PREFERENSI</div>
              <h3 className="feature-title">Pilih Parameter Kerja</h3>
              <p className="feature-desc">
                Tentukan bidang spesifik, preferensi kota, apakah bersedia remote, dan batasan level (magang / fresh graduate).
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-num">03 / MONITOR</div>
              <h3 className="feature-title">Terima Notifikasi Relevan</h3>
              <p className="feature-desc">
                Pipeline sistem melakukan seleksi berkala dan hanya mengirimkan lowongan yang lolos ambang batas skor yang kamu tentukan.
              </p>
            </div>
          </div>
        </section>

        {/* Value Prop Details */}
        <section className="features-section" id="fitur">
          <div className="section-label">Spesifikasi Sistem</div>
          <h2 className="section-title">Dirancang untuk efisiensi pencari kerja</h2>

          <div className="feature-grid">
            <div className="feature-card">
              <h3 className="feature-title">Chat-First Native</h3>
              <p className="feature-desc">
                Kelola status pencarian, cek sisa kuota, dan atur threshold skor kecocokan langsung lewat perintah chat Telegram.
              </p>
            </div>

            <div className="feature-card">
              <h3 className="feature-title">Audit Logik Objektif</h3>
              <p className="feature-desc">
                Skoring berbasis bobot nyata: korelasi role (30%), kesesuaian skill teknis (35%), level (15%), dan lokasi (10%).
              </p>
            </div>

            <div className="feature-card">
              <h3 className="feature-title">Feedback Loop Akurasi</h3>
              <p className="feature-desc">
                Tiap notifikasi memiliki tombol umpan balik. Tanggapan kamu digunakan sistem untuk memperbaiki akurasi matching berikutnya.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Panel */}
        <section className="cta-panel">
          <h2>Mulai pantau lowongan yang tepat hari ini</h2>
          <p>
            Bergabunglah dalam uji coba bot CocoKerja. Tidak memerlukan biaya pendaftaran atau akun baru.
          </p>
          <a
            href={BOT_URL}
            target="_blank"
            rel="noreferrer"
            className="btn btn-accent"
          >
            Mulai Percakapan di Telegram
          </a>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div>
            © 2026 CocoKerja. Asisten karier cerdas untuk fresh graduate Indonesia.
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            <a href={BOT_URL} target="_blank" rel="noreferrer">Telegram Bot</a>
            <a href="https://github.com/hkgraphica/cocokerja" target="_blank" rel="noreferrer">GitHub</a>
          </div>
        </footer>
      </div>
    </>
  );
}
