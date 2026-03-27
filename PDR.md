# PRD: Booking Lapangan Mini Soccer

**Date:** 2026-03-27
**Status:** Approved for Implementation

---

## Context

Pemilik lapangan mini soccer ingin menggantikan proses booking manual (via WA langsung tanpa sistem) dengan web app yang memungkinkan user melihat jadwal ketersediaan secara mandiri dan melakukan booking sendiri. Admin tetap mengkonfirmasi via WA dan DP manual, namun sistem mencatat semua booking dan mengelola status slot otomatis.

**Referensi:** https://www.orangesccicurug.id/venue/schedule/4

---

## Goal & Success Criteria

- User dapat melihat jadwal 1 bulan penuh dengan slot jam dan harga
- User dapat booking dengan 1 klik → redirect WA dengan pesan terisi otomatis
- Admin dapat confirm/cancel booking → slot otomatis update di publik
- Admin dapat set harga per jam dan blokir tanggal/jam tertentu

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 App Router |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Deployment | Vercel |
| WA Redirect | `wa.me` deep link |

---

## Pages & Routes

### Publik (User)

| Route | Deskripsi |
|---|---|
| `/` | Landing page — nama lapangan, lokasi, info singkat, CTA "Lihat Jadwal" |
| `/jadwal` | Jadwal bulanan horizontal scroll + booking |

### Admin (Protected)

| Route | Deskripsi |
|---|---|
| `/admin/login` | Login dengan Supabase Auth |
| `/admin` | Dashboard daftar semua booking |
| `/admin/slots` | Kelola slot jam: harga, aktif/nonaktif, blokir tanggal |

Semua route `/admin/*` diproteksi dengan Next.js middleware — redirect ke `/admin/login` jika tidak authenticated.

---

## Halaman Jadwal (`/jadwal`) — Layout Detail

### Structure
```
[ Header: Nama Lapangan ]
[ Navigasi Bulan: < Maret 2026 > ]

Timetable grid — kolom JAM fixed di kiri, tanggal scroll horizontal ke kanan:

         │ Sen 25  │ Sel 26  │ Rab 27★ │ Kam 28  │ Jum 29  │ → scroll...
─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
08:00-09 │ Rp 80k  │ BOOKED  │ Rp 80k  │ Rp 80k  │ BOOKED  │
─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
09:00-10 │ BOOKED  │ Rp 80k  │ BOOKED  │ Rp 80k  │ Rp 80k  │
─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
10:00-11 │ Rp 80k  │ Rp 80k  │ PENDING │ TUTUP   │ Rp 80k  │
─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
11:00-12 │ Rp 80k  │ TUTUP   │ Rp 80k  │ Rp 80k  │ BOOKED  │
...
```

**Implementasi:** Gunakan CSS `sticky` pada kolom jam pertama (`position: sticky; left: 0`) agar kolom jam tetap terlihat saat scroll horizontal.

### Aturan Display Per Slot
| State | Tampilan | Aksi |
|---|---|---|
| Available | Harga (e.g. `Rp 80.000`) | Bisa diklik → buka modal |
| Pending (booking masuk, belum confirmed) | Badge "PENDING" (kuning) | Tidak bisa diklik — mencegah double booking |
| Confirmed | Badge "BOOKED" (merah/abu) | Tidak bisa diklik |
| Blocked by admin | Badge "TUTUP" | Tidak bisa diklik |
| Past (sudah lewat) | Dimmed/grey | Tidak bisa diklik |
| Hari ini | Kolom header di-highlight | — |

> **Note:** Slot dengan status `pending` langsung dikunci di publik begitu user submit booking. Admin bisa cancel jika user tidak jadi DP, sehingga slot kembali available.

### Navigasi Bulan
- Tombol `<` dan `>` untuk ganti bulan
- Tidak bisa navigate ke bulan sebelum bulan ini

---

## Modal Booking

Trigger: user klik slot available.

**Konten modal:**
```
┌─────────────────────────────┐
│  Booking Lapangan           │
│  ─────────────────────────  │
│  Nama Tim: [____________]   │
│                             │
│  Tanggal: Rabu, 27 Mar 2026 │
│  Jam:     08:00 – 09:00     │
│  Harga:   Rp 80.000         │
│                             │
│  [   Booking via WhatsApp  ]│
│  [        Batal            ]│
└─────────────────────────────┘
```

**On Submit:**
1. Validasi Nama Tim tidak kosong
2. INSERT ke tabel `bookings` dengan `status: 'pending'`
3. Redirect ke:
   ```
   https://wa.me/6281400842380?text=Halo+Admin+MiniSoccer!%0ASaya+ingin+booking+lapangan.%0A%0ANama+Tim:+[nama]%0ATanggal:+Rabu,+27+Mar+2026%0AJam:+08:00-09:00%0AHarga:+Rp+80.000%0A%0AMohon+konfirmasi+ketersediaan.+Terima+kasih!
   ```
4. Nomor WA admin dikonfigurasi via env var: `NEXT_PUBLIC_ADMIN_WA_NUMBER`

---

## Data Model (Supabase)

### `time_slots`
```sql
id          UUID PRIMARY KEY
start_hour  INT NOT NULL  -- e.g. 8 (08:00)
end_hour    INT NOT NULL  -- e.g. 9 (09:00)
price       INT NOT NULL  -- harga dalam rupiah
is_active   BOOL DEFAULT true
created_at  TIMESTAMPTZ DEFAULT now()
```

### `bookings`
```sql
id            UUID PRIMARY KEY
team_name     TEXT NOT NULL
booking_date  DATE NOT NULL
time_slot_id  UUID REFERENCES time_slots(id)
status        TEXT CHECK (status IN ('pending','confirmed','cancelled'))
created_at    TIMESTAMPTZ DEFAULT now()
```

### `blocked_dates`
```sql
id            UUID PRIMARY KEY
date          DATE NOT NULL
time_slot_id  UUID REFERENCES time_slots(id) NULL  -- NULL = blokir seluruh hari
reason        TEXT
created_at    TIMESTAMPTZ DEFAULT now()
```

### Row Level Security (RLS)
- `time_slots`: READ public, WRITE admin only
- `bookings`: INSERT public (create booking), SELECT/UPDATE admin only
- `blocked_dates`: READ public, WRITE admin only

---

## Admin Dashboard (`/admin`)

### Tabel Booking
Kolom: Tanggal | Jam | Nama Tim | Status | Aksi

Aksi per row:
- **Confirm** — ubah `pending → confirmed` (slot tampil BOOKED di publik)
- **Cancel** — ubah `pending/confirmed → cancelled` (slot kembali available)

Filter: All | Pending | Confirmed | Cancelled

Badge warna:
- Pending: kuning
- Confirmed: hijau
- Cancelled: merah/abu

### Kelola Slot (`/admin/slots`)

**Tab 1: Jam Operasional**
- List semua time_slots
- Per slot: tampilkan jam range, harga (editable inline), toggle aktif/nonaktif

**Tab 2: Blokir Tanggal**
- Input tanggal (date picker)
- Radio: "Blokir seluruh hari" atau "Pilih jam tertentu"
- Jika pilih jam: checkbox list dari time_slots aktif
- Tombol simpan + list blocked_dates yang sudah ada (dengan tombol hapus)

---

## UI/UX Notes

### Design System (berdasarkan referensi Dribbble)
Design mengikuti style **clean minimal light mode** — seperti modern calendar/event app.

**Color Palette:**
- Background: `#FFFFFF` / `#F5F7FA` (abu sangat terang)
- Primary accent: Biru (`#3B82F6` atau `#2563EB`) — untuk selected state, CTA button, highlights
- Text utama: `#1E293B` (charcoal gelap)
- Text sekunder: `#94A3B8` (abu medium)
- Border/divider: `#E2E8F0`
- Card background: `#FFFFFF` dengan shadow ringan (`shadow-sm`)

**Slot States:**
- Available: background putih, text harga biru, `hover:bg-blue-50 cursor-pointer`
- BOOKED: `bg-blue-500 text-white` (biru solid, tidak bisa diklik)
- PENDING: `bg-yellow-100 text-yellow-700`
- TUTUP: `bg-gray-100 text-gray-400 cursor-not-allowed`
- Hari ini (header kolom): background biru accent, teks putih

**Typography:**
- Font: Inter (Google Fonts) — clean sans-serif
- Header section: `font-bold text-xl`
- Jam di kolom kiri: `text-sm text-gray-500`
- Harga di slot: `text-sm font-semibold text-blue-600`
- Badge status: `text-xs font-medium`

**Components (shadcn/ui):**
- Dialog (modal booking), Button (rounded-full untuk CTA), Badge, Input
- Tabs (filter admin), Calendar (date picker blokir)
- Rounded corners: `rounded-xl` untuk card, `rounded-full` untuk badge/button

**Layout:**
- **Mobile-first** — horizontal scroll jadwal pakai `overflow-x-auto` dengan touch scroll
- Kolom JAM: `sticky left-0 bg-white z-10 min-w-[80px]`
- Sel slot: `min-w-[100px]` agar touch-friendly
- Generous padding dan white space — bukan layout padat

---

## Out of Scope

- Payment gateway / online payment
- Notifikasi email atau push notification
- Multiple lapangan
- Repeat/recurring booking
- Customer account atau login user
- Laporan keuangan / revenue tracking

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_ADMIN_WA_NUMBER=6281400842380  # nomor WA admin tanpa +
```

---

## Verification

Setelah implementasi, verifikasi end-to-end:
1. Buka `/jadwal` → pastikan slot tampil dengan benar (available/booked/tutup)
2. Klik slot available → modal muncul → isi nama tim → submit → redirect ke WA dengan teks terisi
3. Buka `/admin` → booking baru tampil dengan status `pending`
4. Admin klik Confirm → kembali ke `/jadwal` → slot tersebut tampil BOOKED
5. Admin klik Cancel → slot kembali available
6. Admin blokir tanggal di `/admin/slots` → `/jadwal` tampilkan "TUTUP"
7. Test mobile: horizontal scroll lancar, modal muncul dengan benar
