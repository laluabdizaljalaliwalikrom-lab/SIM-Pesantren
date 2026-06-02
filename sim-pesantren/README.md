# 🚀 Panduan Deploy SIM Pesantren ke Vercel

## Prasyarat

- Akun [Vercel](https://vercel.com) (gratis)
- Repository GitHub: `laluabdizaljalaliwalikrom-lab/SIM-Pesantren`
- Project Supabase sudah aktif

---

## Langkah 1 — Push Kode ke GitHub

```bash
git add .
git commit -m "chore: prepare for Vercel deployment"
git push origin main
```

---

## Langkah 2 — Import Project di Vercel

1. Buka [vercel.com/new](https://vercel.com/new)
2. Klik **"Import Git Repository"**
3. Pilih repo `SIM-Pesantren`
4. **Framework Preset**: Next.js (otomatis terdeteksi ✅)
5. Jangan ubah **Root Directory** (biarkan `./`)

---

## Langkah 3 — Tambahkan Environment Variables ⚠️ WAJIB

Di halaman import Vercel, klik **"Environment Variables"** dan tambahkan:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | *( key dari Supabase dashboard)* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(anon key dari Supabase dashboard)* |
| `WEBHOOK_SECRET_TOKEN` | *(token pilihan Anda)* |
| `FONNTE_API_TOKEN` | *(token Fonnte, jika dipakai)* |

> **Dimana menemukan nilai ini?**
> Supabase Dashboard → Project → **Settings** → **API**

---

## Langkah 4 — Deploy

Klik tombol **"Deploy"**. Vercel akan:
1. Clone repository
2. Install dependencies (`npm install`)
3. Build project (`npm run build`)
4. Deploy ke URL `*.vercel.app`

Build biasanya selesai dalam **1–3 menit**.

---

## Langkah 5 — Konfigurasi Supabase (Penting!)

Setelah dapat URL Vercel (misal `https://sim-pesantren.vercel.app`), tambahkan ke Supabase:

1. Buka **Supabase Dashboard** → Project → **Authentication** → **URL Configuration**
2. Set **Site URL**: `https://sim-pesantren.vercel.app`
3. Tambahkan ke **Redirect URLs**: `https://sim-pesantren.vercel.app/**`

---

## Deploy Otomatis Selanjutnya

Setiap `git push origin main` → Vercel **auto-deploy** secara otomatis. ✨

---

## Troubleshooting

| Error | Solusi |
|-------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` kosong | Cek Environment Variables di Vercel Settings |
| Build gagal karena TypeScript | Sudah dikonfigurasi `ignoreBuildErrors: true` di `next.config.ts` |
| Data tidak muncul | Pastikan RLS policy Supabase mengizinkan akses publik |
| Foto tidak tampil | Pastikan URL foto menggunakan HTTPS |


thanks