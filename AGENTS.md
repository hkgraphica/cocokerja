# CocoKerja — Architecture & Engineering Guide (AGENTS.md)

Dokumen ini adalah panduan arsitektur utama untuk AI Assistant / Agent pengembang agar selalu memahami fondasi, aturan ketat, dan konteks repo **CocoKerja**.

---

## 1. Domain & Filosofi Produk
- **Produk:** Asisten Karier & Kurasi Lowongan AI khusus Fresh Graduate Indonesia.
- **Kanal Utama:** Bot Telegram (`@cocokerja_bot`).
- **Web:** Landing page Next.js modern, performan, dan informatif ([cocokerja.vercel.app](https://cocokerja.vercel.app)).
- **Prinsip Utama:**
  1. *Signal over Volume:* Kirim sedikit lowongan tapi bernilai tinggi dan relevan.
  2. *Anti-Hallucination:* Fitur penyesuaian CV (`/tailor`) **DILARANG KERAS** mengarang fakta/skill yang tidak tertulis di CV asli pengguna. Wajib verifikasi bukti kutipan (`verifyTailor` di `core/tailor.ts`).
  3. *Zero Illegal Scraping:* Utamakan ATS publik resmi perusahaan (Greenhouse, Lever, Ashby), RSS resmi, integrasi Telegram Channel komunitas, dan On-demand Job Check oleh user.
  4. *Anti-Scam First:* Setiap loker dicek indikasi penipuan (biaya registrasi, deposit, MLM).

---

## 2. Arsitektur Hexagonal (Ports & Adapters)

Struktur folder terpisah ketat berdasarkan domain vs infrastruktur:

```
src/
├── core/               # Domain murni (Zero external dependencies)
│   ├── types.ts        # Definisi entitas data domain
│   ├── jobs.ts         # Dedup hash SHA-256, deteksi scam, stripHtml
│   ├── scoring.ts      # Logika bobot skor heuristik transparan
│   ├── skills.ts       # Ekstraksi kata kunci keahlian
│   ├── cv.ts           # Ekstraksi & parsing struktur teks CV
│   ├── tailor.ts       # Anti-hallucination CV tailoring & evidence checking
│   ├── crypto.ts       # Enkripsi simetris AES-256 untuk CV pengguna
│   ├── plans.ts        # Limitasi kuota mingguan (Free vs Premium)
│   └── messages.ts     # Template teks percakapan bot Telegram
│
├── ports/              # Interfaces / Kontrak sistem
│   └── index.ts        # Messenger, LlmScorer, JobSource, RawJob
│
├── adapters/           # Implementasi infrastruktur konkret
│   ├── db/
│   │   ├── schema.ts   # Drizzle ORM PostgreSQL schema
│   │   ├── client.ts   # Koneksi Neon serverless pooler
│   │   └── repos.ts    # Repository data query & mutasi
│   ├── telegram.ts     # Telegram Bot API Messenger adapter
│   ├── llm.ts          # Adapter LLM OpenAI-compatible (scoring, chat copilot, tailor)
│   └── sources.ts      # ATS Source (Greenhouse, Lever, Ashby) & Remotive
│
├── services/           # Application Service Orchestrator
│   ├── bot.ts          # Handler interaksi chat Telegram, callback, on-demand check, channel harvester
│   ├── pipeline.ts     # Ingestion feed, matching batch, alert notification scheduler
│   └── tick.ts         # Wrapper job runner dengan deadline safety
│
├── app/                # Next.js App Router (UI & API Webhook)
│   ├── api/telegram/   # Endpoint webhook Telegram bot
│   ├── api/cron/tick/  # Endpoint cron job worker
│   ├── api/health/     # Health check
│   ├── page.tsx        # Modern dark Landing Page
│   └── globals.css     # Design tokens & responsive styles
│
└── config/
    └── env.ts          # Validasi Zod environment variables
```

---

## 3. Aturan Teknis Kritis (Harus Ditaati)

1. **JANGAN JALANKAN `drizzle-kit push` KE DATABASE PRODUKSI!**
   - Perintah ini berisiko meminta *truncate* tabel users karena perbedaan penamaan constraint.
   - Untuk perubahan skema tabel di Neon, gunakan skrip migrasi SQL manual via `postgres` lib (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
2. **Kepatuhan Kuota Pengguna:**
   - Kuota direset setiap minggu ISO (`isoWeek()`).
   - `alerts`: Alert terjadwal via cron.
   - `chat`: Konsultasi AI Copilot chat & fitur On-Demand Tailor CV.
   - `llm`: Scoring batch di background.
3. **Penyaringan Loker Masih Buka (`isJobGone`):**
   - Sebelum alert dikirimkan, URL dicek dengan HEAD/GET cepat. Jika HTTP 404/410, batalkan pengiriman agar tidak spam ke user.
4. **Keamanan & Enkripsi:**
   - CV pengguna wajib dienkripsi (`encrypt(text, ENCRYPTION_KEY)`) sebelum masuk kolom `profiles.cv_enc`.
   - Webhook Telegram diverifikasi melalui header `x-telegram-bot-api-secret-token` menggunakan `timingSafeEqual`.

---

## 4. Perintah Penting (CLI Cheatsheet)

- **Test:** `npx vitest run` (Wajib lulus semua sebelum commit)
- **Typecheck:** `npx tsc --noEmit`
- **Build:** `npm run build`
- **Git di Windows PowerShell:** `$env:Path = "C:\Program Files\Git\cmd;$env:Path"`
- **Impor Loker Manual:** `npx tsx --env-file=.env scripts/import-jobs.ts <file.json|file.csv>`
- **Set Webhook Telegram:** `npx tsx --env-file=.env scripts/set-webhook.ts <url>`
