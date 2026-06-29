# Manual Booking di Halaman Admin — Design Spec

**Tanggal:** 2026-06-29
**Status:** Disetujui (menunggu review spec)

## Tujuan

Memungkinkan staff (semua role admin) membuat booking baru secara manual langsung dari
halaman `/admin`, tanpa harus menunggu booking masuk lewat alur WhatsApp publik. Berguna
untuk customer walk-in / yang deal langsung via telepon.

## Keputusan yang Disepakati

| Topik | Keputusan |
|-------|-----------|
| Status awal booking | Langsung `confirmed` |
| Anti-bentrok | Slot yang sudah terbooking/pending/blocked/lewat **tidak ditampilkan** di pilihan jam |
| Multi-slot | Admin bisa pilih beberapa jam sekaligus → beberapa baris booking (team + tanggal sama) |
| Nomor HP | Opsional |
| Efek confirm | Buat Google Calendar event **dan** voucher follow-up 50K (sama seperti konfirmasi normal) |
| Hak akses | **Semua role** (admin, finance, karyawan) boleh membuat booking manual |
| Tombol pemicu | FAB hijau di pojok kanan bawah, identik dengan FAB tambah voucher |
| Gaya modal | Mengikuti `VoucherFormModal` (dark panel, backdrop blur, tombol hijau) |
| Total harga | Auto = jumlah harga efektif semua slot terpilih; bisa diedit. Saat insert, harga dibagi per baris (tiap slot = harga efektifnya); jika total diedit manual, selisih dialokasikan ke baris pertama |

## Arsitektur

Tiga bagian:

### 1. UI — `ManualBookingButton` (komponen client baru)

Lokasi: `components/admin/ManualBookingButton.tsx`, dirender di `app/admin/page.tsx`
berdampingan dengan `BookingTable` (atau di dalam wrapper yang menyatukan keduanya agar
state bisa di-refresh).

- **FAB**: `fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 rounded-full bg-green-500`
  + ikon `Plus` dari `lucide-react`. Sama persis dengan FAB di `VoucherManager.tsx:443-450`.
  Tampil untuk semua role (tidak ada gating role).
- **Modal** (`ManualBookingModal`): gaya mengikuti `VoucherFormModal` di
  `VoucherManager.tsx:110-263`:
  - Backdrop `bg-black/60 backdrop-blur-sm`, panel `bg-slate-900/50 border border-slate-800/80`
    `rounded-t-2xl sm:rounded-2xl`, header "Tambah Booking Manual".
  - Close on `Escape`, lock `document.body.style.overflow`.
  - Tombol Batal (abu) + Tambah (hijau, `bg-green-500 text-green-950`).

**Field form:**

| Field | Tipe | Wajib | Catatan |
|-------|------|-------|---------|
| Nama Tim | text (autoFocus) | Ya | — |
| Tanggal | date | Ya | default hari ini (Jakarta) |
| Kategori | toggle Umum / Pelajar | Ya | default `umum`; gaya toggle sama seperti tipe diskon voucher |
| Pilih Jam | multi-select chip | Ya (min 1) | hanya slot kosong; tiap chip tampil jam + harga efektif |
| Total Harga | number | — | auto = Σ harga efektif slot terpilih; editable |
| No. HP | text | Tidak | boleh kosong |

**Perilaku:**
- Saat **Tanggal** atau **Kategori** berubah → fetch ulang `GET /api/admin/bookings/available`
  dan reset pilihan slot. Harga efektif tiap slot disesuaikan kategori (pelajar pakai
  `getStudentPrice`).
- Saat pilihan slot berubah → Total Harga auto-recalculate (kecuali sudah diedit manual oleh user — gunakan flag "user sudah mengubah total" agar tidak menimpa input).
- Saat submit → `POST /api/admin/bookings/create`. Pada sukses, callback `onSave`
  meng-update state lokal `BookingTable` (booking baru muncul di tab "Akan Main" /
  confirmed) tanpa reload penuh. Karena ini lintas-komponen, halaman akan di-refresh
  via `router.refresh()` (Next.js) untuk menarik ulang data server, konsisten dengan
  pola fetch booking di `app/admin/page.tsx`.

### 2. `GET /api/admin/bookings/available?date=YYYY-MM-DD`

File: `app/api/admin/bookings/available/route.ts`

- Auth: `requireAdminSession()` (semua role; tolak jika `auth.error`).
- Ambil semua `time_slots` aktif, `bookings` pada tanggal itu, `blocked_dates`, dan
  `slot_price_overrides` pada tanggal itu.
- Untuk tiap slot, pakai `getSlotStatus()` dari `lib/schedule.ts` untuk menentukan apakah
  `available`. Hanya kembalikan slot yang `available`.
- Untuk tiap slot available, hitung `getEffectivePrice(slot, date, overrides)` →
  kembalikan `{ id, start_hour, end_hour, price }` (price = harga efektif **umum**;
  diskon pelajar dihitung di klien via `getStudentPrice`, konsisten dengan halaman /jadwal).
- `todayStr` dihitung dengan timezone Jakarta (konsisten dengan pola yang ada).

Response:
```json
{ "slots": [ { "id": "uuid", "start_hour": 19, "end_hour": 20, "price": 100000 } ] }
```

### 3. `POST /api/admin/bookings/create`

File: `app/api/admin/bookings/create/route.ts`

- Auth: `requireAdminSession()` (semua role — **tanpa** pembatasan `admin` saja).
- Body:
  ```json
  {
    "team_name": "string (wajib, trim)",
    "booking_date": "YYYY-MM-DD (wajib)",
    "time_slot_ids": ["uuid", "..."],
    "customer_type": "umum | pelajar (default umum)",
    "phone": "string (opsional)",
    "total_price": "number (opsional — total gabungan dari klien)"
  }
  ```
- Validasi:
  - `team_name`, `booking_date`, dan minimal 1 `time_slot_id` wajib.
  - Untuk tiap slot: re-validasi server-side bahwa belum ada booking non-cancelled di
    `(booking_date, time_slot_id)` dan tidak blocked/past. Jika ada yang sudah terisi →
    `409` dengan daftar slot yang bentrok (race-condition guard; tidak ada yang di-insert).
- Hitung harga per slot:
  - Harga efektif tiap slot via override + `getStudentPrice` bila `pelajar`.
  - Jika `total_price` dikirim dan ≠ Σ harga per-slot, alokasikan selisih ke slot pertama.
- Insert satu baris `bookings` per slot dengan:
  `status='confirmed'`, `confirmed_by=auth.userId`, `confirmed_at=now()`,
  `team_name`, `booking_date`, `time_slot_id`, `customer_type`, `phone` (atau null),
  `total_price` (per baris).
- Jalankan efek confirm untuk tiap booking yang dibuat lewat **helper bersama** (lihat
  Refactor). Voucher follow-up dibuat **sekali per sesi** (team + tanggal), memakai
  logika dedup yang sudah ada — jadi multi-slot tetap menghasilkan 1 voucher follow-up.
- Response: daftar booking yang dibuat (dengan join `time_slots` + `confirmed_by_user.name`)
  agar klien bisa langsung render bila diperlukan.

### Refactor: helper efek confirm bersama

File baru: `lib/booking-confirm.ts`

Ekstrak logika dari `app/api/admin/bookings/[id]/route.ts:121-185` (status `confirmed`):
- `createCalendarEvent` (+ hapus event lama bila ada `google_event_id`, lalu simpan
  `google_event_id` baru).
- Auto-generate voucher follow-up 50K dengan dedup per (team, tanggal).

Helper menerima `supabase` (admin client) + objek booking (dengan `time_slots`), lalu
melakukan side-effect dan mengembalikan info voucher (jika dibuat). PATCH lama di
`[id]/route.ts` diubah untuk memanggil helper ini agar perilaku tetap identik (tidak ada
perubahan fungsional pada confirm yang sudah ada).

## Data Flow

```
Admin klik FAB hijau
  → Modal terbuka, fetch GET /available?date=hari-ini
  → Admin isi nama, pilih kategori, centang slot (harga auto), opsional HP
  → Submit → POST /create
      → validasi + re-cek slot kosong
      → insert N baris confirmed
      → helper confirm: Calendar event per booking + 1 voucher follow-up
      → return bookings
  → klien router.refresh() → booking baru tampil di BookingTable (tab Akan Main)
```

## Error Handling

- `GET /available`: error auth → respons error dari `requireAdminSession`; error DB → 500.
- `POST /create`:
  - Body invalid / field wajib kosong → 400.
  - Slot bentrok → 409 + daftar slot bentrok (tidak insert apa pun).
  - Gagal insert DB → 500.
  - Kegagalan side-effect (Calendar/voucher) tidak membatalkan booking yang sudah
    ter-insert (konsisten dengan perilaku confirm saat ini yang best-effort); error
    di-log tapi booking tetap dianggap sukses.
- Modal: tampilkan pesan error di dalam modal (pola `error` state seperti `VoucherFormModal`).

## Testing

- Unit test helper alokasi harga (Σ slot, override, pelajar, alokasi selisih total).
- Unit test logika availability (reuse test pattern `lib/__tests__/schedule.test.ts`).
- Manual/E2E: buat booking 1 slot & multi-slot, cek muncul confirmed, cek 1 voucher
  follow-up, cek slot yang sudah dipilih hilang dari pilihan saat re-fetch.

## File yang Disentuh

| File | Aksi |
|------|------|
| `components/admin/ManualBookingButton.tsx` | Baru — FAB + modal |
| `app/admin/page.tsx` | Render `ManualBookingButton` |
| `app/api/admin/bookings/available/route.ts` | Baru — GET slot kosong |
| `app/api/admin/bookings/create/route.ts` | Baru — POST buat booking |
| `lib/booking-confirm.ts` | Baru — helper efek confirm (Calendar + voucher) |
| `app/api/admin/bookings/[id]/route.ts` | Refactor — pakai helper bersama |

## Out of Scope (YAGNI)

- Pemakaian voucher diskon saat input manual (voucher_id) — admin bisa edit harga langsung.
- Booking berulang/recurring dari modal manual (sudah ada fitur recurring terpisah).
- Verifikasi kartu pelajar saat input manual (kepercayaan staff).
