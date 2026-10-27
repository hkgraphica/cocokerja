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
                <span className="mock-btn" style={{ borderColor: "var(--accent-glow)", color: "var(--accent)" }}>✍️ Sesuaikan CV (Anti-Halusinasi)</span>
                <span className="mock-btn">👍 Cocok</span>
                <span className="mock-btn">👎 Tidak Relevan</span>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow / Cara Kerja 4 Tahap Lengkap */}
        <section className="features-section" id="cara-kerja">
          <div className="section-label">Arsitektur & Alur Kerja</div>
          <h2 className="section-title">Bagaimana CocoKerja bekerja untukmu: 4 Tahapan Presisi</h2>

          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-num">TAHAP 01 / ONBOARDING AMAN</div>
              <h3 className="feature-title">Setup & Enkripsi CV (UU PDP)</h3>
              <p className="feature-desc">
                Cukup drop file PDF atau ketik CV ke Telegram. Skill & pendidikan diekstrak terstruktur, sedangkan teks CV mentah dienkripsi simetris dengan <b>AES-256</b>. Tidak ada data yang diperjualbelikan.
              </p>
              <div style={{ marginTop: "12px", fontSize: "0.8rem", color: "var(--accent-light)", fontFamily: "var(--font-mono)" }}>
                • Ekstraksi otomatis • Enkripsi AES-256
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-num">TAHAP 02 / PASOKAN LEGAL</div>
              <h3 className="feature-title">Filter Anti-Scam & Link Aktif</h3>
              <p className="feature-desc">
                Lowongan dihimpun dari portal ATS resmi perusahaan (Greenhouse, Lever, Ashby) dan komunitas terverifikasi. Dilengkapi deteksi otomatis modus penipuan/deposit dan pengecekan link 404 sebelum dikirim.
              </p>
              <div style={{ marginTop: "12px", fontSize: "0.8rem", color: "var(--success)", fontFamily: "var(--font-mono)" }}>
                • Anti-Scam Flagging • Zero Broken Links
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-num">TAHAP 03 / MATCHING ENGINE</div>
              <h3 className="feature-title">Skoring Objektif & Skill Gap</h3>
              <p className="feature-desc">
                Bukan black-box AI! Kecocokan dihitung dengan 5 bobot terukur: Peran (30%), Skill Teknis (35%), Level Fresh Grad (15%), Lokasi (10%), dan Gaji (10%). Disertai detail skill yang harus dipelajari.
              </p>
              <div style={{ marginTop: "12px", fontSize: "0.8rem", color: "var(--warning)", fontFamily: "var(--font-mono)" }}>
                • Heuristic 5-Factors • Detail Skill Gap
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-num">TAHAP 04 / ON-DEMAND TOOLS</div>
              <h3 className="feature-title">Cek Instan & Tailor Anti-Bohong</h3>
              <p className="feature-desc">
                Temukan loker di LinkedIn/Glints? Cukup paste link/teks ke bot untuk analisis instan. Klik "Sesuaikan CV" untuk membuat draft CV relevan yang dijamin 100% berbasis fakta asli tanpa halusinasi AI.
              </p>
              <div style={{ marginTop: "12px", fontSize: "0.8rem", color: "var(--accent-light)", fontFamily: "var(--font-mono)" }}>
                • On-Demand Inspection • Evidence-Verified
              </div>
            </div>
          </div>
        </section>

        {/* Value Prop Details */}
        <section className="features-section" id="fitur">
          <div className="section-label">Spesifikasi Sistem</div>
          <h2 className="section-title">Teknologi yang dibangun untuk melindungi pencari kerja</h2>

          <div className="feature-grid">
            <div className="feature-card">
              <h3 className="feature-title">Anti-Hallucination Guardrails</h3>
              <p className="feature-desc">
                Banyak AI mengarang pengalaman palsu yang membuat pelamar gagal interview. Sistem kami memverifikasi bukti kutipan riil dari CV sebelum draft diserahkan ke pengguna.
              </p>
            </div>

            <div className="feature-card">
              <h3 className="feature-title">AI Career Copilot 24/7</h3>
              <p className="feature-desc">
                Konsultasikan persiapan interview teknis, review profil, hingga negosiasi gaji entry-level langsung via chat interaktif di Telegram kapan saja.
              </p>
            </div>

            <div className="feature-card">
              <h3 className="feature-title">Signal over Volume</h3>
              <p className="feature-desc">
                Kami tidak membombardirmu dengan 100 loker sampah. Kamu hanya menerima sedikit lowongan yang benar-benar bernilai tinggi dan relevan dengan kompetensimu.
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
