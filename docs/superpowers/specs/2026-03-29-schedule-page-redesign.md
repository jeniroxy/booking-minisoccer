# Schedule Page UI/UX Redesign

**Date:** 2026-03-29
**Status:** Approved
**Mockup:** `.superpowers/brainstorm/38898-1774727922/content/full-design-v5.html`

---

## Context

Halaman jadwal (`/jadwal`) saat ini menggunakan tabel horizontal 30 hari × 17 jam yang sangat sulit digunakan di HP. Mayoritas user mengakses dari mobile. Masalah utama:

- User harus scroll 2 arah (horizontal + vertikal) untuk menemukan slot
- Tidak ada informasi siapa yang sudah booking slot
- Toggle Umum/Pelajar kecil dan tidak menonjol
- Tampilan tidak mencerminkan nuansa aplikasi olahraga

Redesign ini menyelesaikan masalah tersebut dengan layout single-day view, dark mode sporty, dan UX yang dioptimasi untuk mobile.

---

## Design Decisions

| Aspek | Keputusan |
|---|---|
| Target device | Mobile-first |
| Layout | Single-day view (bukan tabel 30 kolom) |
| Navigasi tanggal | Strip 7 hari responsif, mulai dari hari ini |
| Gaya visual | Dark mode sporty (navy + hijau) |
| Booking flow | Floating bar → bottom sheet |

---

## Layout & Komponen

### 1. Header
- Background `#0f172a`, sticky di atas
- Kiri: ikon hijau + nama app + subtitle
- Kanan: **toggle Umum/Pelajar** — dipindah ke sini agar selalu terlihat tanpa scroll
  - Ukuran: `padding: 7px 16px`, font 12px bold
  - Aktif: background `#22c55e`, teks `#052e16`
  - Inaktif: transparan, teks `#64748b`

### 2. Navigasi Tanggal
- Background `#0f172a`, border bawah `#1e293b`
- **Header baris atas:** tombol bulan (tappable) + tombol ← › + tombol "HARI INI"
  - **Tombol bulan** (mis. "Maret 2026 ▼"): background `#1e293b`, border `#334155`, border-radius `8px`
    - Tap → dropdown grid 3×4 dua belas bulan muncul di bawahnya (absolute position)
    - Bulan yang sudah lewat & terlalu jauh ke depan: disabled (opacity 0.25)
    - Bulan tersedia (dalam rentang 30 hari): bisa dipilih → strip loncat ke awal bulan itu
    - Bulan aktif: background `#22c55e`, teks `#052e16`
    - Tap di luar atau pilih bulan → dropdown tutup, ikon ▼ rotate kembali
  - Tombol ← disabled dan HARI INI redup saat window sudah di hari ini
  - Tombol ← aktif bila window sudah digeser ke depan
- **Strip tanggal scrollable:** `overflow-x: auto`, `scrollbar-width: none` — bisa digeser horizontal
  - Menampilkan 30 hari ke depan mulai dari hari ini, tidak menampilkan hari yang sudah lewat
  - Lebar setiap item tanggal fixed (`~48px`) sehingga terlihat ~6–7 hari sekaligus di layar HP
  - Tombol ← / › dan "HARI INI" tetap berfungsi untuk scroll otomatis ke posisi hari tertentu
  - Hari ini: border `#334155`, background `#1e293b`
  - Hari aktif (dipilih): background `#22c55e`, teks `#052e16`, border-radius `10px`
  - Dot merah kecil di bawah tanggal = ada booking aktif hari itu

### 3. Label Hari Aktif
- Di bawah strip: nama hari lengkap (mis. "Senin, 29 Mar · Hari ini")
- Kanan: badge abu "X tersedia" — user langsung tahu slot kosong tanpa scan grid

### 4. Slot Grid
- Layout: `grid-template-columns: 1fr 1fr` — 2 kolom, scroll vertikal saja
- Border-radius: `12px`, padding: `10px 12px`

**State Available:**
- Background `#1e293b`, border `#334155`
- Waktu: 10px, warna `#64748b`
- Harga: **22px bold**, tanpa "Rp", format `90K` — angka dan K sama ukuran dan warna `#22c55e`

**State Selected:**
- Background `#14532d`, border `2px solid #22c55e`
- Checkmark putaran hijau di pojok kanan atas (`#22c55e`)
- Waktu berubah warna ke `#86efac`

**State Booked:**
- Background `#120a0a`, border `rgba(239,68,68,0.2)`
- Badge: background `rgba(239,68,68,0.32)`, border `rgba(239,68,68,0.4)`, teks `#fca5a5`, label "BOOKED" uppercase
- Di bawah badge: **nama tim** — `font-size: 11px`, `color: #94a3b8`, terpotong dengan ellipsis bila terlalu panjang
- Data nama tim diambil dari field `team_name` di tabel `bookings` (sudah ada, tidak perlu perubahan backend)

**State Pending:**
- Badge: background `rgba(245,158,11,0.2)`, border amber, label "PENDING"
- Nama tim ditampilkan lebih redup (`#78716c`) — belum dikonfirmasi

**State Blocked:**
- Background `#111827`, opacity `0.35`, label "TUTUP"

**State Past:** tidak ditampilkan (slot masa lalu tidak muncul di grid)

### 5. Legend
- 5 item: Tersedia, Dipilih, Booked, Pending, Tutup
- Dot warna masing-masing sesuai state
- Border-top `#1e293b`

### 6. Floating Bar (muncul saat ada slot dipilih)
- Background `#22c55e`, border-radius `14px`, shadow hijau
- Kiri:
  - Baris 1: durasi + harga — `13px bold`, `#052e16` (mis. "2 jam · 180K")
  - Baris 2: tanggal + jam — `10px`, `#166534` (mis. "Sen 29 Mar · 08:00–10:00")
- Kanan: tombol **"Pesan Sekarang"**
  - Background `#052e16`, teks `#22c55e`
  - `padding: 10px 18px`, `font-size: 13px bold`, `border-radius: 10px`

### 7. Bottom Sheet (muncul setelah tap "Pesan Sekarang")
- Slides up dari bawah, backdrop gelap blur
- Handle bar abu di atas
- Ringkasan: tanggal, jam, durasi, kategori, total harga
- Input nama tim (auto-focus)
- Tombol "Batal" + "Booking via WhatsApp"

---

## Data Requirements

Semua data sudah tersedia, tidak ada perubahan skema database:

| Data | Sumber |
|---|---|
| Time slots | `time_slots` table |
| Status booking | `bookings` table (status: confirmed/pending) |
| **Nama tim** | `bookings.team_name` — sudah ada |
| Blocked dates | `blocked_dates` table |

---

## Perubahan dari Kode Saat Ini

| Komponen | Perubahan |
|---|---|
| `ScheduleGrid.tsx` | Ganti tabel horizontal → single-day grid 2 kolom |
| `ScheduleGrid.tsx` | Date strip: dari 30-day window → 7-day window dari hari ini |
| `ScheduleGrid.tsx` | Tampilkan `team_name` di slot booked/pending |
| `ScheduleGrid.tsx` | Floating bar teks & button diperbesar |
| `BookingModal.tsx` | Ubah dari modal dialog → bottom sheet |
| `app/jadwal/page.tsx` | Fetch `team_name` dalam query bookings |
| `globals.css` / Tailwind | Dark mode color tokens |

---

## File Kritis

- `components/schedule/ScheduleGrid.tsx` — komponen utama, perubahan terbesar
- `components/schedule/BookingModal.tsx` — ubah ke bottom sheet
- `app/jadwal/page.tsx` — pastikan `team_name` ikut di-fetch
- `lib/schedule.ts` — logika `get30Days` perlu diubah ke `get7Days(from)`
- `lib/types.ts` — pastikan type `Booking` include `team_name`

---

## Verifikasi

1. Buka `http://localhost:3000/jadwal` di mobile browser (atau DevTools mobile view)
2. Cek strip 7 hari tampil mulai hari ini, tidak ada hari kemarin
3. Tap tanggal → slot grid muncul untuk hari itu
4. Tap slot available → selected state muncul, floating bar muncul di bawah
5. Multi-tap slot berurutan → floating bar update total jam & harga
6. Tap "Pesan Sekarang" → bottom sheet slide up
7. Slot booked → nama tim tampil di bawah badge merah
8. Toggle Umum/Pelajar di header → harga slot berubah
9. Tap tombol › → window geser ke 7 hari berikutnya, tombol HARI INI aktif
10. Tap HARI INI → kembali ke window hari ini, tombol ← disabled lagi
