# CocoKerja

AI Career Launcher + Job Alert (bot Telegram). Lihat [PRD](./PRD%20-%20AI%20Career%20Launcher%20+%20Job%20Alert.md).

Berjalan di **Vercel** untuk uji coba, dan dapat dipindah ke **VPS** tanpa mengubah kode (hanya konfigurasi).

## Arsitektur (hexagonal)

```
src/
  core/        Logika murni: skoring, parsing CV, dedup, enkripsi, kuota. Tanpa I/O.
  ports/       Kontrak: Messenger, LlmScorer, JobSource.
  adapters/    Implementasi: Telegram, LLM (OpenAI-compatible), RSS, Postgres (Drizzle).
  services/    Use case: bot (onboarding/perintah), pipeline (ingest → match → alert), tick.
  app/         Entrypoint Vercel: landing, /api/telegram (webhook), /api/cron/tick, /api/health.
scripts/       worker.ts (VPS: polling + tick), set-webhook.ts, seed.ts.
```

Aturan ketergantungan: `core` ← `services` ← (`app` | `scripts`). Entrypoint hanya menyambungkan,
sehingga Vercel dan VPS memakai kode bisnis yang sama.

| | Vercel (uji coba) | VPS (produksi) |
|---|---|---|
| Penerimaan pesan | Webhook `/api/telegram` | Long polling (`scripts/worker.ts`) |
| Penjadwalan | `/api/cron/tick` (cron-job.org tiap 10-15 mnt; Vercel Cron Hobby hanya harian) | Loop `tick()` di worker |
| Database | Neon/Supabase Postgres (URL pooled) | Postgres di docker-compose |
| Proses | Serverless, dibatasi anggaran waktu | Docker: web + worker + db |

## Menjalankan lokal

```bash
npm install
cp .env.example .env            # isi nilai wajib
npm run db:push                 # buat tabel
npm run seed                    # lowongan contoh (opsional)
npm run worker                  # bot via polling + tick; tidak perlu webhook
npm run dev                     # landing page
npm test
```

## Deploy ke Vercel

1. Buat database Postgres (Neon/Supabase), jalankan `DATABASE_URL=... npm run db:push`.
2. Impor repo ke Vercel, isi semua env dari `.env.example`.
3. Setelah deploy: `npx tsx --env-file=.env scripts/set-webhook.ts https://<app>.vercel.app`.
4. Buat pemicu tiap 10-15 menit (cron-job.org) ke `GET https://<app>.vercel.app/api/cron/tick`
   dengan header `Authorization: Bearer <CRON_SECRET>`.

## Migrasi ke VPS (≈1 hari)

1. `pg_dump` dari database lama, restore ke VPS (atau tetap pakai DB lama dulu).
2. Salin `.env`, set `POSTGRES_PASSWORD`, lalu `docker compose up -d --build`.
3. Pasang Nginx/Caddy + HTTPS di depan port 3000 (untuk landing).
4. Worker otomatis memakai polling (menghapus webhook). Pantau 24-48 jam, lalu matikan Vercel.

## Keamanan & privasi

- CV disimpan terenkripsi AES-256-GCM (`ENCRYPTION_KEY`); tidak pernah masuk log.
- Webhook diverifikasi lewat secret header; cron lewat bearer secret (perbandingan constant-time).
- Idempotensi update Telegram (`tg_updates`), dedup lowongan berdasar hash, unik (user, lowongan).
- `/hapus ya` menghapus profil, match, tracker; event dianonimkan.
- LLM hanya menerima skill, ringkasan pendidikan, dan preferensi: tanpa CV mentah atau identitas.

## Belum ada (fase berikutnya)

Tailor CV, simulasi interview, tracker status penuh, pembayaran, WhatsApp. Tabel `jobs_queue`
dan `subscriptions` sudah disiapkan di skema.
