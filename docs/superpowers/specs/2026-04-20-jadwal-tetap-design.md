# Spec: Jadwal Tetap (Recurring Bookings)

## Overview

Fitur untuk admin membuat jadwal tetap tim — misal "SSB Bantang Jr main setiap Rabu & Sabtu jam 15:00". Sistem otomatis generate booking confirmed untuk 4 minggu ke depan saat jadwal dibuat, dan cron mingguan extend window rolling-nya.

---

## Keputusan Desain

- **Siapa buat**: Admin only (bukan customer)
- **Window**: Rolling 4 minggu ke depan
- **Cara extend**: Generate saat simpan + cron mingguan tambah minggu ke-4
- **Status booking**: Langsung `confirmed` (tidak perlu approve ulang)
- **Konflik**: Skip tanggal itu + push notifikasi ke admin
- **UI placement**: Tab "Jadwal Tetap" sejajar dengan Pending / Akan Main / Selesai / Cancelled

---

## Database

### Tabel baru: `recurring_schedules`

```sql
CREATE TABLE recurring_schedules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name    TEXT NOT NULL,
  phone        TEXT,
  customer_type TEXT NOT NULL DEFAULT 'umum' CHECK (customer_type IN ('umum', 'pelajar')),
  time_slot_id UUID NOT NULL REFERENCES time_slots(id),
  day_of_week  INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Minggu, 6=Sabtu
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_by   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Kolom baru di `bookings`

```sql
ALTER TABLE bookings ADD COLUMN recurring_schedule_id UUID REFERENCES recurring_schedules(id) ON DELETE SET NULL;
```

Diisi saat booking di-generate dari jadwal tetap. Memungkinkan filter dan tracing.

---

## API Routes

### `GET /api/admin/recurring`
Fetch semua recurring schedules dengan join time_slots.

### `POST /api/admin/recurring`
Buat recurring schedule baru.
- Simpan ke `recurring_schedules`
- Generate booking untuk semua tanggal dalam 4 minggu ke depan yang cocok dengan `day_of_week`
- Tiap tanggal: cek konflik → jika bebas, insert booking confirmed; jika ada konflik → skip + catat untuk notif
- Kirim push notif ke admin untuk tiap konflik yang ditemukan

### `PATCH /api/admin/recurring/[id]`
Toggle `is_active` (pause / aktifkan kembali).
- Saat diaktifkan kembali: re-generate booking yang belum ada dalam 4 minggu ke depan

### `DELETE /api/admin/recurring/[id]`
Hapus recurring schedule.
- Booking yang sudah `confirmed` dari jadwal ini **tidak** dihapus (biarkan berjalan)
- Hanya mencegah generate baru

### `GET /api/cron/extend-recurring` (cron)
Jalankan tiap Senin 00:00 WIB (`0 17 * * 0` UTC).
- Untuk tiap active recurring schedule, hitung tanggal di minggu ke-4 (28 hari dari sekarang) yang cocok dengan `day_of_week`
- Jika booking untuk tanggal itu belum ada → buat (cek konflik terlebih dahulu)
- Konflik → push notif admin

---

## Logika Generate

```
function generateForSchedule(schedule, fromDate, toDate):
  dates = semua tanggal antara fromDate dan toDate yang day_of_week cocok
  for each date:
    existing = cek bookings where booking_date=date AND time_slot_id=schedule.time_slot_id AND status != 'cancelled'
    if existing: push notif konflik, skip
    else: insert booking confirmed dengan recurring_schedule_id
```

Harga ditentukan dari `time_slots.price` (atau `price_overrides` jika ada), dengan diskon pelajar jika `customer_type = 'pelajar'`.

---

## UI: Tab Jadwal Tetap

### List view (kartu per jadwal)
- Nama tim + badge kategori (Umum/Pelajar) + badge "Tetap"
- Hari & jam slot
- Nomor WA (opsional)
- Toggle aktif/pause (langsung PATCH)
- Tombol hapus (dengan konfirmasi)

### Form tambah
- Input: Nama Tim, No. WA, Hari (dropdown Senin–Minggu), Slot Jam (dropdown dari time_slots aktif), Kategori
- Tombol: "Simpan & Generate 4 Minggu" / "Batal"

### FAB (+) di sudut kanan bawah
Hanya muncul di tab Jadwal Tetap, buka form tambah.

---

## Notifikasi Konflik

Push notif ke semua admin:
- Title: `Konflik Jadwal Tetap`
- Body: `[Nama Tim] — [Hari], [Tanggal] [Jam]: slot sudah dipakai`
- URL: `/admin`

---

## Files

| File | Status |
|------|--------|
| `supabase/migrations/019_recurring_schedules.sql` | Baru |
| `lib/types.ts` | Ubah — tambah `RecurringSchedule` |
| `app/api/admin/recurring/route.ts` | Baru |
| `app/api/admin/recurring/[id]/route.ts` | Baru |
| `app/api/cron/extend-recurring/route.ts` | Baru |
| `components/admin/RecurringScheduleTab.tsx` | Baru |
| `components/admin/BookingTable.tsx` | Ubah — tambah tab + filter |
| `app/admin/page.tsx` | Ubah — fetch recurring schedules |
| `vercel.json` | Ubah — tambah cron schedule |
