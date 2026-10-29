import Image from "next/image";

const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL ?? "https://t.me/cocokerja_bot";

function TelegramIcon({ className = "", size = 18 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      style={{ flexShrink: 0 }}
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

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
            <a href="#komparasi" className="link-muted">Perbandingan</a>
            <a href="#faq" className="link-muted">FAQ</a>
            <a
              href={BOT_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              id="nav-bot-link"
            >
              <TelegramIcon size={16} />
              <span>Buka di Telegram</span>
            </a>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="hero">
          <div className="status-badge">
            <span className="status-dot" />
            <span>Asisten Telegram Pribadi • Khusus Fresh Graduate</span>
          </div>

          <h1>
            Job alert terkurasi langsung ke chat. Bukan sekadar keyword match.
          </h1>

          <p className="lead">
            Bukan portal pencari kerja konvensional di mana kamu harus scroll ratusan loker setiap hari.
            Kirimkan CV kamu satu kali ke Telegram, CocoKerja memantau lowongan riil di latar belakang dan memberi tahu saat ada peluang yang benar-benar cocok.
          </p>

          <div className="hero-cta">
            <a
              href={BOT_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-accent"
              id="hero-start-btn"
            >
              <TelegramIcon size={18} />
              <span>Mulai via @cocokerja_bot →</span>
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

        {/* Comparison Section: CocoKerja vs Job Portal Konvensional */}
        <section className="features-section" id="komparasi">
          <div className="section-label">Perbedaan Mendasar</div>
          <h2 className="section-title">Mengapa CocoKerja Berbeda dengan Job Portal Biasa?</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "20px" }}>
            Kami merancang CocoKerja bukan untuk menahanmu berlama-lama di dalam aplikasi, melainkan membantu kamu mendapatkan pekerjaan pertama yang tepat seefisien mungkin.
          </p>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Fitur & Pendekatan</th>
                  <th>Job Portal Konvensional</th>
                  <th className="highlight-col">CocoKerja (@cocokerja_bot)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Cara Pakai</strong></td>
                  <td>Harus buka web/app & scrolling ratusan loker</td>
                  <td className="highlight-col"><strong>Pasif & Santai</strong>: Drop CV sekali, alert masuk ke Telegram</td>
                </tr>
                <tr>
                  <td><strong>Kesesuaian Pengalaman</strong></td>
                  <td>Sering tertipu judul entry-level tapi minta 3+ tahun</td>
                  <td className="highlight-col"><span className="badge-tag yes">✓ Filter Ketat</span> Khusus Fresh Graduate & Magang</td>
                </tr>
                <tr>
                  <td><strong>Transparansi Penilaian</strong></td>
                  <td>Black-box tanpa alasan yang jelas</td>
                  <td className="highlight-col"><span className="badge-tag yes">✓ Skor 0-100%</span> Rincian skill cocok vs skill gap</td>
                </tr>
                <tr>
                  <td><strong>Pencegahan Penipuan</strong></td>
                  <td>Rawan loker bodong (biaya tiket/travel)</td>
                  <td className="highlight-col"><span className="badge-tag yes">✓ Anti-Scam</span> Flagging otomatis indikasi biaya/MLM</td>
                </tr>
                <tr>
                  <td><strong>Tautan Kadaluarsa</strong></td>
                  <td>Sering mendapati link 404 / lowongan tutup</td>
                  <td className="highlight-col"><span className="badge-tag yes">✓ Real-time Probe</span> Batal kirim jika loker sudah 404</td>
                </tr>
                <tr>
                  <td><strong>AI CV Tailoring</strong></td>
                  <td>Rentan mengarang fakta/skill fiktif</td>
                  <td className="highlight-col"><span className="badge-tag yes">✓ Anti-Halusinasi</span> Wajib verifikasi kutipan asli CV</td>
                </tr>
                <tr>
                  <td><strong>Privasi Pengguna</strong></td>
                  <td>Data profil disimpan & sering dibagikan</td>
                  <td className="highlight-col"><span className="badge-tag yes">✓ Enkripsi AES-256</span> Hapus kapan saja via <code>/hapus</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="features-section" id="faq">
          <div className="section-label">Tanya Jawab (FAQ)</div>
          <h2 className="section-title">Pertanyaan yang Sering Diajukan</h2>

          <div className="faq-list">
            <details className="faq-item" open>
              <summary className="faq-summary">Apakah layanan CocoKerja gratis?</summary>
              <div className="faq-content">
                Ya! Setiap pengguna fresh graduate mendapatkan kuota gratis 3 job alert terkurasi per minggu, akses konsultasi AI Copilot, dan fitur on-demand job check tanpa dipungut biaya pendaftaran apapun.
              </div>
            </details>

            <details className="faq-item">
              <summary className="faq-summary">Apakah saya harus menginstal aplikasi baru?</summary>
              <div className="faq-content">
                Tidak perlu. Seluruh interaksi, upload CV, penerimaan alert, dan konsultasi karier dilakukan langsung di dalam aplikasi Telegram melalui bot resmi <b>@cocokerja_bot</b>.
              </div>
            </details>

            <details className="faq-item">
              <summary className="faq-summary">Kapan waktu pengiriman notifikasi lowongan?</summary>
              <div className="faq-content">
                CocoKerja secara otomatis memindai lowongan dan mengirimkan kurasi terbaik setiap hari kerja pada pukul <b>08:00 WIB</b> jika ada lowongan yang mencapai ambang kecocokan dengan profilmu. Selain itu, kamu juga bisa mengecek link loker secara instan kapan saja.
              </div>
            </details>

            <details className="faq-item">
              <summary className="faq-summary">Format CV apa yang didukung?</summary>
              <div className="faq-content">
                Kamu bisa langsung mengirimkan file dokumen <b>PDF</b> (maksimal 5 MB) atau mengetikkan ringkasan pengalaman dan skill langsung sebagai pesan teks ke dalam chat bot.
              </div>
            </details>

            <details className="faq-item">
              <summary className="faq-summary">Bagaimana cara menghapus data saya jika sudah dapat kerja?</summary>
              <div className="faq-content">
                Kami sangat menghargai privasi dan mematuhi regulasi perlindungan data pribadi (UU PDP). Cukup ketik perintah <code>/hapus</code> di Telegram, dan seluruh data profil serta teks CV kamu akan langsung dimusnahkan secara permanen dari database kami.
              </div>
            </details>
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
            <TelegramIcon size={18} />
            <span>Mulai Percakapan di Telegram</span>
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
