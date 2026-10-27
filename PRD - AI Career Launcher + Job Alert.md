# PRD: AI Career Launcher + Job Alert

**Versi:** 0.3 (Draft MVP, arsitektur Vercel → VPS)\
**Status:** Untuk validasi; fondasi Fase 1 sudah dibangun (lihat 10.4)\
**Pemilik produk:** Agus\
**Tanggal:** 27 Oktober 2026

## Catatan Revisi (v0.1 → v0.2)

- Validasi (bagian 16) dipindah **sebelum** dan **paralel** dengan build, bukan sesudah. Sebelumnya urutannya terbalik dengan rencana rilis.
- Lingkup dipangkas: Fase 3 tidak lagi memuat dua fitur P0 sekaligus. Tracker jadi P1, simulasi interview tetap P0 tetapi versi sederhana.
- Ditambahkan: definisi skor kecocokan, kanal (alasan Telegram dulu), pembayaran, analitik/event, kasus tepi, kriteria berhenti/lanjut, dan detail kepatuhan UU PDP.
- Metrik diberi definisi operasional dan peringatan ukuran sampel kecil.
- Diperbaiki inkonsistensi: kuota gratis vs ambang skor, SLA premium vs hosting, model data (kunci, status lowongan, pembayaran).

## 1. Ringkasan

AI Career Launcher + Job Alert adalah produk berbasis chat (Telegram dulu, WhatsApp setelah validasi) yang memantau lowongan kerja, memberi notifikasi saat ada yang cocok dengan profil pengguna, lalu membantu pengguna melamar: menganalisis kesenjangan skill, menyesuaikan CV, dan berlatih interview untuk lowongan yang sama.

Satu lowongan menjadi pusat alur: **cari → siap → lamar → lacak**. Segmen awal adalah fresh graduate di Indonesia pada **satu niche** (bidang + kota, lihat bagian 16). Mode freelancer menyusul setelah matching terbukti berjalan.

> [!NOTE]
> Telegram dipilih untuk MVP karena Bot API gratis, tanpa persetujuan template, dan cepat dibangun. Risikonya: mayoritas pengguna Indonesia memakai WhatsApp. Ini asumsi yang harus divalidasi pada wawancara (apakah target niche mau memakai Telegram?). Jika tidak, prioritas WhatsApp naik.

## 2. Latar Belakang dan Masalah

- Lowongan tersebar di banyak portal, grup Telegram/WhatsApp, Instagram info loker, dan halaman karier perusahaan. Pencari kerja harus memeriksa semuanya secara manual.
- Alert bawaan portal berbasis keyword, sehingga banyak yang tidak relevan, dan hanya mencakup lowongan di portal itu sendiri.
- Fresh graduate sering tidak tahu mengapa lamaran ditolak, dan CV yang sama dikirim ke semua lowongan.
- Lowongan palsu dan MLM yang menyamar sebagai lowongan marak.
- Produk karier tunggal (hanya CV, atau hanya alert) mudah ditiru dan dipakai sekali lalu ditinggalkan.

> Klaim di atas adalah hipotesis sampai dikonfirmasi lewat wawancara (bagian 16). Cantumkan bukti (kutipan/jumlah responden) di versi berikutnya.

## 3. Tujuan dan Non-Tujuan

### Tujuan (MVP, 3 bulan)

1. Pengguna kembali membuka alert setiap minggu (retensi).
2. Skor kecocokan dianggap relevan oleh pengguna.
3. Ada pengguna yang mau membayar untuk alert lebih cepat dan fitur tailor CV.
4. Mendapatkan 1-2 kemitraan kampus atau bootcamp sebagai pilot (didukung, bukan syarat keberhasilan MVP).

### Kriteria Lanjut / Ubah Arah / Berhenti (akhir bulan 3)

| Keputusan | Kondisi |
| --- | --- |
| Lanjut | Retensi minggu ke-4 ≥ 40% **dan** relevansi ≥ 60% **dan** minimal 5 pengguna membayar atau pre-order |
| Ubah arah | Relevansi baik tetapi retensi/pembayaran rendah (mis. pivot ke B2B kampus) |
| Berhenti | Relevansi < 40% setelah dua iterasi matching, atau tidak ada yang mau membayar |

### Non-Tujuan (di luar MVP)

- Marketplace dua sisi dengan akun pemberi kerja.
- Mode freelancer penuh (proposal, portofolio).
- Aplikasi mobile atau web dashboard yang lengkap.
- Auto-apply ke lowongan atas nama pengguna.
- Jaminan mendapat pekerjaan.

## 4. Target Pengguna

### Persona Utama: Fresh Graduate

- Usia 21-25, baru lulus atau 6 bulan menjelang lulus, di kota besar Indonesia.
- Aktif di Telegram atau WhatsApp, sensitif harga.
- Pain: tidak tahu lowongan mana yang realistis, CV generik, gugup saat interview.
- Bahasa: antarmuka Bahasa Indonesia; CV dan lowongan bisa berbahasa Indonesia atau Inggris, sistem harus menangani keduanya.

### Persona Sekunder (fase berikutnya)

- **Freelancer/gig worker:** butuh notifikasi proyek dan bantuan proposal.
- **Admin kampus/bootcamp:** butuh melihat keberhasilan penempatan alumni.

## 5. Prinsip Produk

1. **Kualitas alert di atas jumlah fitur.** Alert yang tidak relevan membuat fitur lain sia-sia.
2. **Semua fitur berpusat pada satu lowongan.**
3. **Chat-first.** Pengguna tidak perlu membuka aplikasi lain untuk fungsi inti.
4. **Jujur soal batas.** Skor kecocokan disertai alasan, dan tidak menjanjikan hasil.
5. **Legal-first untuk sumber data.** Utamakan API, RSS, dan kemitraan.
6. **Validasi sebelum membangun.** Setiap fase punya gerbang metrik sebelum lanjut.

## 6. Lingkup Fitur

### 6.1 Fase 1: Alert Cerdas (Minggu 1-2)

| ID | Fitur | Prioritas |
| --- | --- | --- |
| F1.1 | Onboarding via bot: persetujuan data, upload CV (PDF), pilih peran, lokasi/remote, rentang gaji, level (fresh grad/magang) | P0 |
| F1.2 | Parsing CV menjadi profil terstruktur (skill, pendidikan, pengalaman), dengan langkah koreksi oleh pengguna | P0 |
| F1.3 | Ingestion lowongan dari 3-5 sumber legal, dijadwalkan dan dideduplikasi | P0 |
| F1.4 | Penyaringan awal berbasis SQL (kategori, lokasi, level) lalu penilaian LLM untuk kandidat teratas | P0 |
| F1.5 | Notifikasi lowongan cocok dengan skor dan alasan singkat | P0 |
| F1.6 | Perintah hapus data (`/hapus`) | P0 |
| F1.7 | Pengaturan ambang skor dan frekuensi alert | P1 |
| F1.8 | Umpan balik per alert (cocok / tidak cocok) untuk memperbaiki matching | P0 (bahan utama mengukur relevansi) |

> F1.8 dinaikkan ke P0 karena metrik "rasio relevan" tidak bisa diukur tanpanya. F1.6 dinaikkan ke P0 karena kewajiban hukum.

### 6.2 Fase 2: Persiapan Melamar (Minggu 3-4)

| ID | Fitur | Prioritas |
| --- | --- | --- |
| F2.1 | Analisis skill gap per lowongan ("cocok 72%, kurang: SQL, portofolio dashboard") | P0 |
| F2.2 | Tailor CV per lowongan, hasil berupa teks (PDF menyusul) | P0 teks, P1 PDF |
| F2.3 | Penyaringan indikasi lowongan palsu/MLM (daftar kata kunci, domain mencurigakan, minta biaya) | P1 |

> Tailor CV tidak boleh mengarang pengalaman atau skill yang tidak ada di CV. Output hanya menyusun ulang dan menyoroti fakta yang ada, dengan peringatan jelas.

### 6.3 Fase 3: Interview dan Pelacakan (Bulan 2)

| ID | Fitur | Prioritas |
| --- | --- | --- |
| F3.1 | Simulasi interview berbasis deskripsi lowongan (5 pertanyaan, umpan balik per jawaban) | P0 |
| F3.2 | Tracker lamaran manual (terkirim, interview, ditolak, diterima) dan pengingat tindak lanjut | P1 |
| F3.3 | Pembayaran premium (lihat bagian 12) | P0 |
| F3.4 | Hasil tracker dipakai memperbaiki akurasi matching | P2 |

### 6.4 Fase 4: Skala (Bulan 3+)

- Dashboard kemitraan kampus/bootcamp (agregat, tanpa data pribadi tanpa persetujuan).
- Mode freelancer.
- Kanal WhatsApp Cloud API.
- Sumber lowongan tambahan.

## 7. Alur Pengguna Utama

1. Pengguna membuka bot dan menekan Start.
2. Bot meminta persetujuan penggunaan data, lalu upload CV.
3. Bot menampilkan ringkasan profil hasil parsing, pengguna mengoreksi jika perlu.
4. Pengguna mengisi preferensi (peran, lokasi, gaji, level).
5. Sistem memantau lowongan secara berkala.
6. Saat ada lowongan cocok, bot mengirim kartu: judul, perusahaan, skor, alasan cocok, kekurangan, tautan lamar.
7. Pengguna memilih aksi: **Skill gap**, **Tailor CV**, **Latihan interview**, **Simpan ke tracker**, atau **Tidak relevan**.
8. Pengguna memperbarui status lamaran di tracker, dan bot mengingatkan tindak lanjut.

### Kasus Tepi

- CV berupa hasil scan/gambar, terproteksi password, atau gagal diparsing: bot meminta unggah ulang atau input manual singkat.
- Tidak ada lowongan cocok dalam seminggu: bot mengirim ringkasan "belum ada yang cocok" dan saran melonggarkan preferensi.
- Lowongan sudah kedaluwarsa atau ditutup: ditandai dan tidak dikirim.
- Pengguna memblokir bot: hentikan pengiriman dan tandai tidak aktif.
- Kuota gratis habis: bot menjelaskan batas dan menawarkan premium, tidak memotong alert di tengah proses.
- Pengguna mengunggah CV orang lain atau data sangat sensitif: tampilkan peringatan dan minimalkan data yang disimpan.

## 8. Persyaratan Fungsional

- Sistem harus mengirim alert hanya jika skor melebihi ambang yang ditentukan pengguna.
- Sistem tidak boleh mengirim lowongan yang sama dua kali ke pengguna yang sama.
- Setiap skor harus disertai minimal satu alasan cocok dan satu kekurangan jika ada.
- Pengguna harus dapat menghapus CV dan seluruh datanya melalui perintah di bot. Penghapusan selesai dalam 7 hari (data cadangan ikut terhapus sesuai siklus).
- Pengguna gratis dibatasi kuota alert dan fitur LLM per minggu. **Kuota dihitung dari alert yang terkirim, dan alert dipilih berdasarkan skor tertinggi**, sehingga kuota tidak dihabiskan oleh lowongan skor rendah.
- Sistem harus mencatat sumber setiap lowongan dan tanggal diambil.
- Sistem harus mencatat event analitik (lihat bagian 13) tanpa menyimpan isi CV di log.

### Definisi Skor Kecocokan (MVP)

Skor 0-100, gabungan berbobot yang dikalibrasi lewat umpan balik:

| Komponen | Bobot awal (hipotesis) |
| --- | --- |
| Kesesuaian peran/kategori | 30% |
| Kesesuaian skill wajib | 35% |
| Level/pengalaman | 15% |
| Lokasi/remote | 10% |
| Rentang gaji (jika tersedia) | 10% |

Penilaian LLM menghasilkan keluaran terstruktur (JSON: skor komponen, alasan, kekurangan) agar bisa diuji dan diaudit. Lowongan tanpa gaji tidak dihukum. Skor yang ditampilkan dibulatkan dan disertai alasan, bukan klaim peluang diterima.

## 9. Persyaratan Non-Fungsional

| Aspek | Target MVP |
| --- | --- |
| Keterlambatan alert (tier gratis) | Maksimal 24 jam sejak lowongan terdeteksi (dikirim dalam digest harian) |
| Keterlambatan alert (premium) | Maksimal 1 jam di shared hosting, 30 menit di VPS (selaras dengan interval cron) |
| Waktu respons bot (aksi non-LLM) | Kurang dari 3 detik |
| Waktu tailor CV | Kurang dari 60 detik, disampaikan secara asinkron dengan pesan "sedang diproses" |
| Ketersediaan | Best effort pada MVP, dengan pemantauan sederhana (alert error ke pemilik) |
| Keamanan | HTTPS, enkripsi CV saat disimpan, akses database dibatasi, secret di environment, verifikasi token webhook Telegram |
| Kepatuhan | Persetujuan eksplisit, hak akses/koreksi/hapus data, kebijakan privasi, pemberitahuan insiden (UU PDP Indonesia) |
| Penyedia LLM | Dokumentasikan penyedia dan lokasi pemrosesan data; jangan kirim data identitas (nama, telepon, email) ke LLM bila tidak perlu |
| Akurasi parsing CV | Target ≥ 85% skill utama terdeteksi pada 20 CV uji |

## 10. Arsitektur Teknis

### 10.1 Keputusan Hosting: Vercel (uji coba) → VPS (produksi)

Shared hosting **tidak dipakai** (timeout, tanpa proses permanen, Node.js tidak pasti). Uji coba berjalan di Vercel, dengan arsitektur yang dirancang agar pindah ke VPS (±Rp50 ribu/bulan) hanya perubahan konfigurasi.

| Aspek | Vercel (uji coba) | VPS (produksi) |
| --- | --- | --- |
| Runtime | Next.js (Node.js, serverless) | Docker: web + worker + Postgres |
| Penerimaan pesan | Webhook `/api/telegram` | Long polling (`scripts/worker.ts`) |
| Penjadwalan | `/api/cron/tick` dipicu cron-job.org tiap 10-15 menit (Vercel Cron Hobby hanya harian) | Loop `tick()` di worker |
| Database | Postgres terkelola (Neon/Supabase), URL pooled | Postgres di compose (pgvector bila perlu) |
| Matching | Filter SQL → skor heuristik → LLM top-N | Sama; embedding menyusul |
| Antrean | Tabel `jobs_queue`, diproses per tick | Sama, worker permanen |
| Skala | Puluhan pengguna | Ratusan hingga ribuan |

**Prinsip portabilitas (wajib):**

1. **Arsitektur heksagonal:** `core` (logika murni) ← `services` (use case) ← entrypoint (`app/`, `scripts/`). Adapter vendor (Telegram, LLM, DB, sumber lowongan) di balik `ports`.
2. Entrypoint Vercel dan VPS memanggil fungsi yang sama (`handleUpdate`, `tick`).
3. Tidak memakai fitur khusus Vercel (KV, Blob, Edge). Semua konfigurasi lewat environment.
4. Satu tick dibatasi anggaran waktu (`TICK_BUDGET_MS`) dan idempoten, sehingga aman terhadap timeout serverless.
5. Skema database dikelola lewat migrasi (Drizzle).

**Pemicu pindah ke VPS** (salah satu): ≥ 100 pengguna aktif, tick sering melewati anggaran waktu, biaya Vercel Pro/DB melebihi biaya VPS, atau ada pelanggan berbayar yang butuh alert ≤ 30 menit andal. Prosedur: lihat `README.md` (±1 hari, downtime hampir nol).

> [!NOTE]
> Batas Vercel Hobby (durasi fungsi, cron harian) membuat tailor CV/interview harus asinkron lewat `jobs_queue`. Batas bisa berubah, cek dokumentasi Vercel saat deploy.

### 10.2 Komponen

1. **Ingestion:** mengambil lowongan dari RSS/API, normalisasi, deduplikasi (hash dari judul + perusahaan + lokasi yang sudah dinormalisasi: huruf kecil, tanpa tanda baca dan sufiks seperti "PT"/"Tbk"). Tangani lowongan yang diposting ulang di beberapa sumber.
2. **Profile service:** parsing CV, penyimpanan profil terstruktur.
3. **Matching engine:** penyaringan kandidat, penilaian LLM, penyimpanan skor dan alasan.
4. **Notification service:** pengiriman pesan Telegram (kemudian WhatsApp), penanganan batas laju (Telegram sekitar 30 pesan/detik global, 1 pesan/detik per chat) dan percobaan ulang.
5. **Document service:** tailor CV dan ekspor PDF.
6. **Interview service:** sesi tanya-jawab berbasis lowongan, dengan status sesi.
7. **Tracker:** status lamaran dan pengingat.
8. **Billing:** status langganan dan kuota.

### 10.3 Model Data Inti

- `users` (id, channel, channel\_id, tier, consent\_at, consent\_version, is\_active, created\_at)
- `profiles` (user\_id, skills, education, experience, preferences, cv\_ref, updated\_at)
- `jobs` (id, source, title, company, location, level, category, salary\_range, description, url, fetched\_at, expires\_at, status, hash)
- `matches` (id, user\_id, job\_id, score, score\_components, reasons, gaps, sent\_at, feedback) — unik pada (user\_id, job\_id)
- `applications` (id, user\_id, job\_id, status, updated\_at, notes)
- `usage` (user\_id, week, alerts\_used, llm\_calls\_used)
- `subscriptions` (user\_id, plan, started\_at, expires\_at, payment\_ref)
- `events` (id, user\_id, type, created\_at, meta) — untuk analitik
- `jobs_queue` (id, type, payload, status, attempts, run\_after)

> Saat pengguna menghapus data, baris di `profiles`, `matches`, `applications`, `usage`, dan `events` yang terkait dihapus atau dianonimkan. Berkas CV mentah dihapus.

### 10.4 Status Implementasi (repo `cocokerja`)

| Fitur | Status |
| --- | --- |
| F1.1 Onboarding (persetujuan, CV PDF/teks, peran, lokasi, level) | Selesai |
| F1.2 Parsing CV (heuristik kamus skill) | Selesai, akurasi perlu diuji pada 20 CV |
| F1.3 Ingestion RSS + dedup hash | Selesai; sumber nyata perlu diinventarisasi (bagian 11) |
| F1.4 Filter SQL + skor heuristik + LLM top-N | Selesai (LLM opsional via API kompatibel OpenAI) |
| F1.5 Alert dengan skor, alasan, kekurangan, kuota per paket | Selesai |
| F1.6 `/hapus` | Selesai |
| F1.7 `/ambang` | Selesai (frekuensi belum) |
| F1.8 Umpan balik 👍/👎 | Selesai, tercatat di `matches.feedback` dan `events` |
| F2.1 Skill gap | Tampilan dasar dari kekurangan yang tersimpan; analisis lanjut belum |
| F2.3 Penanda lowongan mencurigakan | Versi kata kunci |
| Tailor CV, interview, tracker status, pembayaran | Belum (tabel `jobs_queue`, `subscriptions`, `applications` sudah disiapkan) |

Keamanan yang sudah ada: CV terenkripsi AES-256-GCM, verifikasi secret webhook/cron (constant-time), idempotensi update Telegram, LLM hanya menerima skill/preferensi tanpa identitas.

## 11. Sumber Data Lowongan

- Prioritas: API resmi, RSS, kemitraan, dan halaman karier yang mengizinkan pengambilan data.
- Dihindari: scraping portal yang ToS-nya melarang.
- Simpan sumber dan tanggal ambil untuk setiap lowongan, dan sediakan mekanisme penghapusan jika sumber meminta.
- Tampilkan atribusi sumber dan tautan asli pada setiap alert.
- **Tindakan sebelum Fase 1:** buat daftar kandidat sumber beserta status legal, format, frekuensi, dan cakupan niche. Jika kurang dari 3 sumber layak, jalankan fase validasi dengan kurasi manual lebih dulu.

## 12. Model Bisnis

| Paket | Isi | Harga indikatif |
| --- | --- | --- |
| Gratis | 3 alert/minggu, 1 analisis CV, 1 simulasi interview | Rp0 |
| Premium | Alert lebih cepat, tailor CV dan interview dengan kuota besar | Rp29.000-49.000/bulan |
| Sprint 30 hari | Akses premium sekali bayar | Perlu diuji |
| Kampus/bootcamp | Harga per alumni atau per angkatan | Negosiasi |

- Metode pembayaran MVP: transfer manual/QRIS dengan konfirmasi manual, lalu payment gateway (mis. Midtrans/Xendit) setelah ada permintaan nyata.
- Asumsi harga bersifat hipotesis dan harus diuji (uji kesediaan membayar sebelum membangun billing otomatis).
- Perkiraan unit economics: biaya LLM per pengguna aktif harus dihitung dari uji nyata (jumlah panggilan × harga token) dan dicatat di dokumen terpisah.

## 13. Metrik Keberhasilan

| Metrik | Definisi | Target MVP (hipotesis) |
| --- | --- | --- |
| Pengguna terdaftar | Pengguna yang menyelesaikan onboarding (CV + preferensi) | 50-100 |
| Retensi mingguan | % pengguna aktif minggu ke-4 yang membuka atau merespons ≥ 1 alert (dari kohort yang menyelesaikan onboarding) | > 40% |
| Rasio alert relevan | Alert bertanda "cocok" ÷ alert yang diberi umpan balik (laporkan juga tingkat respons umpan balik) | > 60% |
| Klik tautan lamar per alert | Klik ÷ alert terkirim | > 20% |
| Konversi gratis ke berbayar | Pengguna berbayar ÷ pengguna aktif | > 3-5% |
| Biaya LLM per pengguna aktif per bulan | Total biaya LLM ÷ pengguna aktif | < 30% harga premium |
| Kemitraan kampus/bootcamp | Pilot yang disepakati | Minimal 1 |

> [!IMPORTANT]
> Dengan 50-100 pengguna, konversi 3-5% berarti hanya 2-5 pembayar sehingga tidak signifikan secara statistik. Perlakukan sebagai sinyal arah, dan gunakan juga sinyal kuat: pre-order, atau pengguna yang bersedia membayar saat kuota habis.

Angka di atas adalah titik awal untuk disesuaikan setelah data nyata terkumpul.

## 14. Rencana Rilis

| Waktu | Kegiatan | Gerbang lanjut |
| --- | --- | --- |
| Minggu 0-2 | Wawancara 20-30 calon pengguna, inventarisasi sumber lowongan, tes parsing CV; alert semi-manual untuk kelompok kecil | Masalah terkonfirmasi, ≥ 3 sumber layak |
| Minggu 2-4 | Bot Telegram, onboarding, ingestion, alert dengan skor (**fondasi Fase 1 sudah dibangun**, lihat 10.4) | Relevansi awal ≥ 50% |
| Minggu 5-6 | Skill gap dan tailor CV, uji dengan 30-50 pengguna | Penggunaan fitur ≥ 30% pengguna aktif |
| Bulan 2-3 | Simulasi interview, tracker, pembayaran premium, uji kesediaan membayar | Ada pengguna berbayar/pre-order |
| Bulan 3 | Pilot kampus, evaluasi pindah ke VPS, keputusan lanjut/ubah/berhenti | Kriteria bagian 3 |
| Setelah itu | Mode freelancer, WhatsApp Cloud API, dashboard mitra | — |

> Jadwal v0.1 (fase 1 dalam 2 minggu) tidak realistis untuk satu orang karena mencakup parsing CV, ingestion, matching LLM, dan notifikasi. Jadwal di atas memberi waktu riset dan buffer.

## 15. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Alert tidak relevan | Pengguna berhenti | Umpan balik per alert, ambang skor, mulai dari satu niche |
| Legalitas scraping dan pemblokiran sumber | Data berhenti | Utamakan API/RSS/kemitraan, siapkan beberapa sumber |
| Volume lowongan niche terlalu sedikit | Alert kosong, retensi rendah | Ukur volume sumber saat inventarisasi, perluas niche bila perlu |
| Biaya LLM membengkak | Margin negatif | Penilaian LLM hanya untuk kandidat teratas, kuota per tier, caching, model murah untuk tahap awal |
| Batas shared hosting (timeout, tanpa proses permanen) | Alert lambat atau gagal | Cron per batch, batas waktu per run, rencana migrasi ke VPS |
| Privasi data CV | Risiko hukum dan reputasi | Persetujuan, enkripsi, hak hapus, minimalkan data, kurangi data ke LLM |
| Halusinasi LLM pada tailor CV/skill gap | Pengguna melamar dengan klaim palsu | Larang karangan fakta baru, tampilkan peringatan, batasi ke isi CV |
| Telegram bukan kanal utama target | Adopsi rendah | Validasi di wawancara, siapkan jalur WhatsApp |
| Retensi turun setelah dapat kerja | Churn alami | Pemantauan karier dan upskilling di fase lanjut |
| Kompetitor besar menambah fitur serupa | Diferensiasi hilang | Alur terpadu, lokalisasi, kanal informal, kemitraan kampus |
| Scope creep dan ketergantungan satu orang | MVP terlambat | Bangun berurutan sesuai fase, gerbang metrik per fase |

## 16. Rencana Validasi

1. Pilih satu niche (misalnya fresh graduate IT atau bisnis di satu kota) dan tulis alasan pemilihannya.
2. Wawancara 20-30 calon pengguna untuk memvalidasi masalah, kanal (Telegram vs WhatsApp), dan kesediaan membayar.
3. Jalankan alert semi-otomatis (kurasi manual + skrip sederhana) untuk 30-50 pengguna selama 2-4 minggu **sebelum** membangun otomasi penuh.
4. Ukur retensi, relevansi, dan kesediaan membayar (landing page pre-order atau paket sprint).
5. Keputusan lanjut, ubah arah, atau berhenti berdasarkan metrik di bagian 13 dan kriteria di bagian 3.

## 17. Pertanyaan Terbuka

- Niche awal: bidang dan kota apa?
- Sumber lowongan mana yang tersedia secara legal dan stabil, dan berapa volumenya per minggu di niche tersebut?
- Penyedia Postgres untuk uji coba di Vercel (Neon atau Supabase) dan domain/URL bot mana yang dipakai?
- Model LLM, penyedia, dan anggaran bulanan untuk fase uji coba?
- Bagaimana persetujuan data dan kebijakan privasi akan dikemas di dalam bot (teks, tautan, versi)?
- Siapa calon mitra kampus atau bootcamp untuk pilot?
- Bagaimana cara menerima pembayaran pada MVP (manual vs gateway)?
- Siapa yang menangani dukungan pengguna dan moderasi laporan lowongan palsu?
