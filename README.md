# Mahalu Spa — Ayu Marketing Workspace

Prototype web app untuk alur kerja marketing Ayu dan approval CEO.

## Fitur

1. Checklist Harian
   - Jadwal SOP otomatis
   - TikTok Feed 7x / hari
   - Instagram Feed 2x / hari
   - TikTok Story 7 touchpoint / hari
   - Instagram Story 10 slide / hari
   - Status selesai / late / missed
   - URL publish + upload bukti
   - Compliance harian otomatis

2. Content Plan Mingguan
   - Plan 7 hari
   - 9 feed slot / hari
   - Pillar, winning framing, hook, storyline, treatment
   - Upload asset per konten
   - TikTok Story Plan
   - Instagram Story Plan
   - Weekly strategy
   - Submit ke CEO

3. Approval CEO
   - Mode CEO
   - Approve per konten
   - Request Revision per konten
   - Decline per konten
   - Approve / Revision / Decline satu minggu
   - CEO comment
   - Approval history

4. Upload Hasil Kerja
   - Asset
   - Final edit
   - Screenshot publish
   - Report / performance
   - Riwayat upload

## Cara membuka

Jalankan server lokal pada port `5501` agar origin cocok dengan CORS Cloudflare R2, misalnya melalui Live Server dengan port tersebut. Membuka file langsung (`file://`) tidak dapat mengakses Worker/R2 karena origin tidak diizinkan.

## Prototype vs Production

Data teks/status disimpan di Supabase. Aset lama tetap dibaca dari Supabase Storage; upload baru menggunakan Cloudflare R2 melalui Worker penandatangan URL.

Ikuti [panduan storage Cloudflare](PANDUAN-STORAGE-CLOUDFLARE.md) untuk mengonfigurasi CORS, secret Worker, dan URL Worker frontend sebelum mencoba upload.

## Backend

- Supabase PostgreSQL untuk state aplikasi
- Supabase Storage untuk aset lama
- Cloudflare R2 untuk upload aset baru
- Auth dengan 2 role awal:
  - `marketing`
  - `ceo`

## Tables minimal

- `content_weeks`
- `content_plan_items`
- `daily_sop_slots`
- `daily_execution`
- `content_approvals`
- `work_uploads`
- `audit_logs`

## Rule penting

- Jadwal SOP tidak boleh bisa diedit Ayu.
- Approval marketing: Ayu -> CEO.
- Revisi dan Decline wajib mempunyai komentar CEO.
- Late/Missed wajib mempunyai alasan.
- Semua perubahan penting harus menyimpan timestamp.

## Status Approval — revisi terbaru

Workflow status sekarang:

`DRAFT` -> Ayu klik **Submit ke CEO** -> `WAITING CEO`

Kemudian CEO dapat memberi keputusan per konten:

- `APPROVED`
- `REVISION`
- `DECLINED`

Status mingguan ikut tersinkron:

- semua approved -> `APPROVED`
- campuran approved + waiting -> `PARTIAL REVIEW`
- ada revision -> `REVISION`
- ada declined -> `DECLINED`

## Preview Konten untuk CEO

Versi ini menambahkan preview asset pada halaman Approval CEO.

- Ayu upload file pada setiap slot Content Plan.
- Prototype menyimpan blob lokal menggunakan IndexedDB.
- CEO klik **Preview** untuk melihat:
  - image
  - video
  - PDF
- Dari modal preview CEO bisa langsung:
  - Approve
  - Revisi
  - Decline

Untuk production, IndexedDB diganti dengan Supabase Storage / object storage sehingga preview dapat dilihat lintas device dan akun.
