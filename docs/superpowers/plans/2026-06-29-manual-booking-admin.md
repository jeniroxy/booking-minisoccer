# Manual Booking di Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memungkinkan semua role admin membuat booking baru (langsung `confirmed`, multi-slot) dari halaman `/admin` lewat FAB + modal.

**Architecture:** Satu komponen client (FAB + modal) memanggil dua route baru — `GET /api/admin/bookings/available` (slot kosong + harga efektif) dan `POST /api/admin/bookings/create` (insert N booking confirmed + efek confirm). Logika harga diekstrak ke helper murni yang diuji unit; efek confirm (Google Calendar + voucher follow-up) diekstrak dari route `[id]` ke helper bersama agar tidak duplikat.

**Tech Stack:** Next.js App Router (route handlers), Supabase (admin client), React client component + Tailwind, lucide-react, Vitest.

## Global Constraints

- **JANGAN jalankan `next build` / `npm run build` selama dev server aktif** (merusak cache `.next`). Verifikasi pakai `npx tsc --noEmit` dan `npx vitest run`.
- Semua route baru auth via `requireAdminSession()` dari `@/lib/supabase/server`; **semua role** boleh akses (tidak ada gating `auth.role === 'admin'`).
- Timezone Jakarta untuk derivasi tanggal "hari ini": `new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })`.
- Status booking manual selalu `confirmed`, set `confirmed_by = auth.userId`, `confirmed_at = new Date().toISOString()`.
- Voucher follow-up dibuat **maksimal 1x per (team_name, booking_date)** — gunakan dedup yang sudah ada.
- Ikuti gaya UI `VoucherManager.tsx` (FAB hijau + modal dark) persis.

---

### Task 1: Helper murni perhitungan harga slot (`lib/manual-booking.ts`)

**Files:**
- Create: `lib/manual-booking.ts`
- Test: `lib/__tests__/manual-booking.test.ts`

**Interfaces:**
- Consumes: `getEffectivePrice`, `getStudentPrice` dari `@/lib/schedule`; `TimeSlot`, `SlotPriceOverride` dari `@/lib/types`.
- Produces:
  ```ts
  // harga efektif satu slot pada tanggal tertentu untuk kategori tertentu
  export function effectiveSlotPrice(
    slot: TimeSlot,
    date: string,
    overrides: SlotPriceOverride[],
    customerType: 'umum' | 'pelajar'
  ): number

  // harga per slot (urut sesuai input slots). Jika totalOverride diberikan & != jumlah,
  // selisih (bisa negatif) dialokasikan ke slot pertama. totalOverride null/undefined = pakai jumlah apa adanya.
  export function allocateSlotPrices(
    slots: TimeSlot[],
    date: string,
    overrides: SlotPriceOverride[],
    customerType: 'umum' | 'pelajar',
    totalOverride?: number | null
  ): number[]
  ```

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/manual-booking.test.ts
import { describe, it, expect } from 'vitest'
import { effectiveSlotPrice, allocateSlotPrices } from '@/lib/manual-booking'
import type { TimeSlot, SlotPriceOverride } from '@/lib/types'

const slot = (id: string, price: number): TimeSlot => ({
  id, start_hour: 19, end_hour: 20, price, is_active: true, created_at: '',
})

describe('effectiveSlotPrice', () => {
  it('returns base price for umum without override', () => {
    expect(effectiveSlotPrice(slot('s1', 100000), '2026-07-01', [], 'umum')).toBe(100000)
  })

  it('applies price override when present', () => {
    const ov: SlotPriceOverride[] = [{ id: 'o1', date: '2026-07-01', time_slot_id: 's1', price: 80000, created_at: '' }]
    expect(effectiveSlotPrice(slot('s1', 100000), '2026-07-01', ov, 'umum')).toBe(80000)
  })

  it('applies student discount on top of effective price', () => {
    // 150000 > MAX_STUDENT_PRICE(125000) -> 150000-50000=100000, floored at 125000 => 125000
    expect(effectiveSlotPrice(slot('s1', 150000), '2026-07-01', [], 'pelajar')).toBe(125000)
  })
})

describe('allocateSlotPrices', () => {
  const slots = [slot('s1', 100000), slot('s2', 120000)]

  it('sums effective prices per slot when no total override', () => {
    expect(allocateSlotPrices(slots, '2026-07-01', [], 'umum')).toEqual([100000, 120000])
  })

  it('allocates positive difference to first slot', () => {
    // base sum = 220000, total override 200000 -> diff -20000 to first slot
    expect(allocateSlotPrices(slots, '2026-07-01', [], 'umum', 200000)).toEqual([80000, 120000])
  })

  it('ignores total override equal to sum', () => {
    expect(allocateSlotPrices(slots, '2026-07-01', [], 'umum', 220000)).toEqual([100000, 120000])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/manual-booking.test.ts`
Expected: FAIL — "Failed to resolve import '@/lib/manual-booking'" / function not defined.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/manual-booking.ts
import { getEffectivePrice, getStudentPrice } from '@/lib/schedule'
import type { TimeSlot, SlotPriceOverride } from '@/lib/types'

export function effectiveSlotPrice(
  slot: TimeSlot,
  date: string,
  overrides: SlotPriceOverride[],
  customerType: 'umum' | 'pelajar'
): number {
  const base = getEffectivePrice(slot, date, overrides)
  return customerType === 'pelajar' ? getStudentPrice(base) : base
}

export function allocateSlotPrices(
  slots: TimeSlot[],
  date: string,
  overrides: SlotPriceOverride[],
  customerType: 'umum' | 'pelajar',
  totalOverride?: number | null
): number[] {
  const prices = slots.map(s => effectiveSlotPrice(s, date, overrides, customerType))
  if (totalOverride == null || prices.length === 0) return prices
  const sum = prices.reduce((a, b) => a + b, 0)
  const diff = totalOverride - sum
  if (diff !== 0) prices[0] = prices[0] + diff
  return prices
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/manual-booking.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/manual-booking.ts lib/__tests__/manual-booking.test.ts
git commit -m "feat: add manual booking price allocation helper"
```

---

### Task 2: Ekstrak efek confirm ke helper bersama (`lib/booking-confirm.ts`)

Refactor murni (perilaku tidak berubah): pindahkan logika Google Calendar + voucher follow-up dari `app/api/admin/bookings/[id]/route.ts:121-185` ke helper, lalu panggil helper dari PATCH.

**Files:**
- Create: `lib/booking-confirm.ts`
- Modify: `app/api/admin/bookings/[id]/route.ts:121-185`
- Test: (manual — refactor; verifikasi typecheck + suite existing)

**Interfaces:**
- Consumes: `createCalendarEvent`, `deleteCalendarEvent` dari `@/lib/google-calendar`; `SupabaseClient` (admin) dari pemanggil.
- Produces:
  ```ts
  // Menjalankan efek confirm untuk satu booking yang sudah ter-insert/ter-update sebagai confirmed.
  // - hapus event lama (jika ada google_event_id), buat event baru, simpan google_event_id.
  // - buat voucher follow-up 50K bila belum ada untuk (team_name, booking_date).
  // Mengembalikan info voucher bila baru dibuat (untuk ditempel ke respons), else null.
  export async function applyConfirmSideEffects(
    supabase: SupabaseClient,
    booking: {
      id: string
      team_name: string
      booking_date: string
      google_event_id: string | null
      time_slots: { start_hour: number; end_hour: number } | null
    }
  ): Promise<{ code: string; valid_until: string } | null>
  ```

- [ ] **Step 1: Buat helper**

```ts
// lib/booking-confirm.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { createCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar'

export async function applyConfirmSideEffects(
  supabase: SupabaseClient,
  booking: {
    id: string
    team_name: string
    booking_date: string
    google_event_id: string | null
    time_slots: { start_hour: number; end_hour: number } | null
  }
): Promise<{ code: string; valid_until: string } | null> {
  if (!booking.time_slots) return null

  // Calendar: hapus event lama (jika ada), buat event confirmed baru
  if (booking.google_event_id) {
    await deleteCalendarEvent(booking.google_event_id)
  }
  const eventId = await createCalendarEvent({
    bookingId: booking.id,
    teamName: booking.team_name,
    date: booking.booking_date,
    startHour: booking.time_slots.start_hour,
    endHour: booking.time_slots.end_hour,
    status: 'confirmed',
  })
  if (eventId) {
    await supabase.from('bookings').update({ google_event_id: eventId }).eq('id', booking.id)
  }

  // Voucher follow-up: dedup per (team, tanggal)
  const { data: existingVoucher } = await supabase
    .from('bookings')
    .select('followup_voucher_id')
    .ilike('team_name', booking.team_name)
    .eq('booking_date', booking.booking_date)
    .neq('status', 'cancelled')
    .not('followup_voucher_id', 'is', null)
    .limit(1)

  if (existingVoucher && existingVoucher.length > 0) return null

  const voucherCode = `MAINLAGI-${booking.team_name.replace(/\s+/g, '').toUpperCase().slice(0, 10)}-${Date.now().toString(36).toUpperCase()}`
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const validUntilDate = new Date(today + 'T00:00:00+07:00')
  validUntilDate.setDate(validUntilDate.getDate() + 14)
  const validUntil = validUntilDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const { data: voucher } = await supabase
    .from('vouchers')
    .insert({
      code: voucherCode,
      name: `Follow-up ${booking.team_name}`,
      discount_type: 'nominal',
      discount_value: 50000,
      max_usage: 1,
      valid_from: today,
      valid_until: validUntil,
      is_active: true,
    })
    .select('id, code, valid_until')
    .single()

  if (!voucher) return null

  await supabase.from('bookings').update({ followup_voucher_id: voucher.id }).eq('id', booking.id)
  return { code: voucher.code, valid_until: voucher.valid_until }
}
```

- [ ] **Step 2: Ganti blok confirm di `[id]/route.ts`**

Di `app/api/admin/bookings/[id]/route.ts`, ganti seluruh blok `else if (status === 'confirmed' && data.time_slots) { ... }` (baris ~121-185) dengan pemanggilan helper. Tambahkan import di atas:

```ts
import { applyConfirmSideEffects } from '@/lib/booking-confirm'
```

Ganti blok menjadi:

```ts
  } else if (status === 'confirmed' && data.time_slots) {
    const voucher = await applyConfirmSideEffects(supabase, {
      id: data.id,
      team_name: data.team_name,
      booking_date: data.booking_date,
      google_event_id: data.google_event_id,
      time_slots: data.time_slots,
    })
    if (voucher) {
      // followup_voucher_id & google_event_id sudah di-set oleh helper di DB; tempelkan info voucher untuk klien
      data._followup_voucher = { code: voucher.code, valid_until: voucher.valid_until }
    }
  }
```

Catatan: `select('*, time_slots(start_hour, end_hour)')` pada PATCH sudah memuat `google_event_id` (via `*`), jadi `data.google_event_id` tersedia. Pastikan tidak ada referensi ke variabel lama yang terhapus.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: tidak ada error baru terkait file ini.

- [ ] **Step 4: Jalankan suite unit existing (pastikan tidak ada regresi)**

Run: `npx vitest run`
Expected: semua test lama tetap PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/booking-confirm.ts app/api/admin/bookings/\[id\]/route.ts
git commit -m "refactor: extract confirm side-effects into shared helper"
```

---

### Task 3: Route ketersediaan slot (`GET /api/admin/bookings/available`)

**Files:**
- Create: `app/api/admin/bookings/available/route.ts`
- Test: (manual — route handler)

**Interfaces:**
- Consumes: `requireAdminSession` dari `@/lib/supabase/server`; `createAdminClient` dari `@/lib/supabase/admin`; `getSlotStatus`, `getEffectivePrice` dari `@/lib/schedule`.
- Produces: respons JSON `{ slots: { id: string; start_hour: number; end_hour: number; price: number }[] }` (price = harga efektif **umum**; diskon pelajar dihitung di klien).

- [ ] **Step 1: Implementasi route**

```ts
// app/api/admin/bookings/available/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSlotStatus, getEffectivePrice } from '@/lib/schedule'
import type { Booking, BlockedDate, SlotPriceOverride } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const date = request.nextUrl.searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date (YYYY-MM-DD) is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const [{ data: slots }, { data: bookings }, { data: blocked }, { data: overrides }] = await Promise.all([
    supabase.from('time_slots').select('*').eq('is_active', true).order('start_hour'),
    supabase.from('bookings').select('*').eq('booking_date', date),
    supabase.from('blocked_dates').select('*').eq('date', date),
    supabase.from('slot_price_overrides').select('*').eq('date', date),
  ])

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const available = (slots ?? [])
    .filter(slot => getSlotStatus(slot, date, (bookings ?? []) as Booking[], (blocked ?? []) as BlockedDate[], todayStr).status === 'available')
    .map(slot => ({
      id: slot.id,
      start_hour: slot.start_hour,
      end_hour: slot.end_hour,
      price: getEffectivePrice(slot, date, (overrides ?? []) as SlotPriceOverride[]),
    }))

  return NextResponse.json({ slots: available })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: tidak ada error pada file ini.

- [ ] **Step 3: Verifikasi manual (dev server sudah jalan di :3005)**

Login admin di browser, lalu di console browser (cookie ikut terkirim):
```js
fetch('/api/admin/bookings/available?date=2026-07-01').then(r => r.json()).then(console.log)
```
Expected: `{ slots: [...] }` berisi slot kosong dengan `price`. Bandingkan dengan halaman /jadwal tanggal sama — slot yang sudah dibooking tidak muncul.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/bookings/available/route.ts
git commit -m "feat: add admin available-slots endpoint for manual booking"
```

---

### Task 4: Route pembuatan booking manual (`POST /api/admin/bookings/create`)

**Files:**
- Create: `app/api/admin/bookings/create/route.ts`
- Test: (manual — route handler)

**Interfaces:**
- Consumes: `requireAdminSession`, `createAdminClient`, `allocateSlotPrices` (Task 1), `applyConfirmSideEffects` (Task 2), `getSlotStatus` dari `@/lib/schedule`.
- Produces: respons JSON `{ bookings: BookingWithSlot[] }` (HTTP 201) atau `{ error, conflicts? }`.

- [ ] **Step 1: Implementasi route**

```ts
// app/api/admin/bookings/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSlotStatus } from '@/lib/schedule'
import { allocateSlotPrices } from '@/lib/manual-booking'
import { applyConfirmSideEffects } from '@/lib/booking-confirm'
import type { Booking, BlockedDate, SlotPriceOverride, TimeSlot } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { team_name, booking_date, time_slot_ids, customer_type, phone, total_price } = body as {
    team_name?: string
    booking_date?: string
    time_slot_ids?: string[]
    customer_type?: 'umum' | 'pelajar'
    phone?: string
    total_price?: number
  }

  if (!team_name?.trim() || !booking_date || !Array.isArray(time_slot_ids) || time_slot_ids.length === 0) {
    return NextResponse.json(
      { error: 'team_name, booking_date, and at least one time_slot_id are required' },
      { status: 400 }
    )
  }

  const type: 'umum' | 'pelajar' = customer_type === 'pelajar' ? 'pelajar' : 'umum'
  const supabase = createAdminClient()

  // Ambil slot terpilih + konteks tanggal
  const [{ data: allSlots }, { data: bookings }, { data: blocked }, { data: overrides }] = await Promise.all([
    supabase.from('time_slots').select('*').in('id', time_slot_ids),
    supabase.from('bookings').select('*').eq('booking_date', booking_date),
    supabase.from('blocked_dates').select('*').eq('date', booking_date),
    supabase.from('slot_price_overrides').select('*').eq('date', booking_date),
  ])

  const selectedSlots = (allSlots ?? []) as TimeSlot[]
  if (selectedSlots.length !== time_slot_ids.length) {
    return NextResponse.json({ error: 'One or more time slots not found' }, { status: 400 })
  }

  // Re-validasi tiap slot masih available (anti race-condition)
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const conflicts = selectedSlots.filter(
    slot => getSlotStatus(slot, booking_date, (bookings ?? []) as Booking[], (blocked ?? []) as BlockedDate[], todayStr).status !== 'available'
  )
  if (conflicts.length > 0) {
    return NextResponse.json(
      { error: 'Sebagian slot sudah tidak tersedia', conflicts: conflicts.map(s => s.id) },
      { status: 409 }
    )
  }

  // Urutkan slot sesuai jam untuk alokasi harga yang stabil
  selectedSlots.sort((a, b) => a.start_hour - b.start_hour)
  const prices = allocateSlotPrices(selectedSlots, booking_date, (overrides ?? []) as SlotPriceOverride[], type, total_price ?? null)

  const nowIso = new Date().toISOString()
  const rows = selectedSlots.map((slot, i) => ({
    team_name: team_name.trim(),
    booking_date,
    time_slot_id: slot.id,
    status: 'confirmed' as const,
    customer_type: type,
    confirmed_by: auth.userId,
    confirmed_at: nowIso,
    total_price: prices[i],
    ...(phone?.trim() ? { phone: phone.trim() } : {}),
  }))

  const { data: inserted, error } = await supabase
    .from('bookings')
    .insert(rows)
    .select('*, time_slots(*)')

  if (error || !inserted) {
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }

  // Efek confirm: Calendar per booking + voucher follow-up sekali per sesi (best-effort)
  for (const b of inserted) {
    try {
      await applyConfirmSideEffects(supabase, {
        id: b.id,
        team_name: b.team_name,
        booking_date: b.booking_date,
        google_event_id: b.google_event_id,
        time_slots: b.time_slots,
      })
    } catch (e) {
      console.error('confirm side-effects failed for booking', b.id, e)
    }
  }

  // Tempel nama confirmer untuk klien
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('name')
    .eq('user_id', auth.userId)
    .single()
  const withConfirmer = inserted.map(b => ({
    ...b,
    confirmed_by_user: adminUser ? { name: adminUser.name } : null,
  }))

  return NextResponse.json({ bookings: withConfirmer }, { status: 201 })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: tidak ada error pada file ini.

- [ ] **Step 3: Verifikasi manual (dev server :3005, login admin)**

Di console browser:
```js
fetch('/api/admin/bookings/create', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ team_name: 'Test Manual', booking_date: '2026-07-01', time_slot_ids: ['<id-slot-kosong>'], customer_type: 'umum' })
}).then(r => r.json()).then(console.log)
```
Expected: `{ bookings: [...] }` status 201; booking muncul `confirmed` di halaman /admin setelah refresh; tepat 1 voucher follow-up `MAINLAGI-...` di /admin/vouchers; slot tsebelumnya hilang dari hasil `/available`.
Lalu uji konflik: kirim ulang dengan slot yang sama → Expected 409 `{ error, conflicts: [...] }`, tidak ada insert.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/bookings/create/route.ts
git commit -m "feat: add manual booking create endpoint (confirmed, multi-slot)"
```

---

### Task 5: Komponen FAB + modal (`ManualBookingButton`)

**Files:**
- Create: `components/admin/ManualBookingButton.tsx`
- Test: (manual — UI)

**Interfaces:**
- Consumes: route `GET /api/admin/bookings/available`, `POST /api/admin/bookings/create`; `useRouter` dari `next/navigation`; ikon `Plus`, `X` dari `lucide-react`; `getStudentPrice`, `formatHour` dari `@/lib/schedule`.
- Produces: `export function ManualBookingButton()` (default export tidak perlu). Komponen client mandiri; setelah sukses memanggil `router.refresh()`.

- [ ] **Step 1: Implementasi komponen**

```tsx
// components/admin/ManualBookingButton.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { getStudentPrice, formatHour } from '@/lib/schedule'

type AvailableSlot = { id: string; start_hour: number; end_hour: number; price: number }

function todayJakarta(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

function ManualBookingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [teamName, setTeamName] = useState('')
  const [date, setDate] = useState(todayJakarta())
  const [customerType, setCustomerType] = useState<'umum' | 'pelajar'>('umum')
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [phone, setPhone] = useState('')
  const [totalEdited, setTotalEdited] = useState(false)
  const [totalPrice, setTotalPrice] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const priceFor = useCallback(
    (s: AvailableSlot) => (customerType === 'pelajar' ? getStudentPrice(s.price) : s.price),
    [customerType]
  )

  // Fetch slot kosong saat tanggal berubah
  useEffect(() => {
    let active = true
    setLoadingSlots(true)
    setSelected([])
    fetch(`/api/admin/bookings/available?date=${date}`)
      .then(r => r.json())
      .then(d => { if (active) setSlots(d.slots ?? []) })
      .catch(() => { if (active) setSlots([]) })
      .finally(() => { if (active) setLoadingSlots(false) })
    return () => { active = false }
  }, [date])

  // Auto-hitung total dari slot terpilih (kecuali user sudah edit manual)
  useEffect(() => {
    if (totalEdited) return
    const sum = slots.filter(s => selected.includes(s.id)).reduce((acc, s) => acc + priceFor(s), 0)
    setTotalPrice(selected.length ? String(sum) : '')
  }, [selected, slots, priceFor, totalEdited])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const toggleSlot = (id: string) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))

  const handleSave = async () => {
    if (!teamName.trim()) { setError('Nama tim wajib diisi'); return }
    if (selected.length === 0) { setError('Pilih minimal satu jam'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_name: teamName.trim(),
        booking_date: date,
        time_slot_ids: selected,
        customer_type: customerType,
        phone: phone.trim() || undefined,
        total_price: totalEdited && totalPrice ? parseInt(totalPrice) : undefined,
      }),
    })
    if (res.ok) {
      onCreated()
    } else {
      const b = await res.json().catch(() => ({}))
      setError(b.error ?? 'Gagal menyimpan booking')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-slate-900/50 border border-slate-800/80 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-100">Tambah Booking Manual</h2>
            <p className="text-xs text-slate-500 mt-0.5">Buat booking baru (langsung confirmed)</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-1 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Nama Tim</label>
            <input
              type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Garuda FC" autoFocus
              className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">Tanggal</label>
              <input
                type="date" value={date} min={todayJakarta()} onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all [color-scheme:dark]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">Kategori</label>
              <div className="flex gap-2">
                {(['umum', 'pelajar'] as const).map(t => (
                  <button
                    key={t} type="button" onClick={() => setCustomerType(t)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      customerType === t ? 'bg-green-500/15 ring-1 ring-green-500/30 text-green-400' : 'bg-slate-900/80 ring-1 ring-slate-700 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {t === 'umum' ? 'Umum' : 'Pelajar'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Pilih Jam</label>
            {loadingSlots ? (
              <p className="text-xs text-slate-500 py-2">Memuat slot…</p>
            ) : slots.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">Tidak ada slot kosong di tanggal ini</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {slots.map(s => {
                  const on = selected.includes(s.id)
                  return (
                    <button
                      key={s.id} type="button" onClick={() => toggleSlot(s.id)}
                      className={`flex flex-col items-start px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        on ? 'bg-green-500/15 ring-1 ring-green-500/30 text-green-400' : 'bg-slate-900/80 ring-1 ring-slate-700 text-slate-300 hover:text-slate-100'
                      }`}
                    >
                      <span>{formatHour(s.start_hour)}–{formatHour(s.end_hour)}</span>
                      <span className="text-[11px] font-medium opacity-80">Rp {priceFor(s).toLocaleString('id-ID')}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Total Harga</label>
            <input
              type="number" value={totalPrice}
              onChange={e => { setTotalEdited(true); setTotalPrice(e.target.value) }}
              placeholder="0"
              className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">No. HP (opsional)</label>
            <input
              type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxxxx"
              className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-400 bg-slate-800/50 hover:bg-slate-800 active:bg-slate-700 transition-colors">Batal</button>
            <button
              onClick={handleSave} disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-bold bg-green-500 text-green-950 hover:bg-green-400 active:bg-green-600 disabled:opacity-40 transition-colors shadow-lg shadow-green-500/20"
            >
              {saving ? 'Menyimpan…' : 'Tambah'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ManualBookingButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleCreated = () => {
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      {open && <ManualBookingModal onClose={() => setOpen(false)} onCreated={handleCreated} />}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 rounded-full bg-green-500 text-green-950 shadow-lg shadow-green-500/30 flex items-center justify-center hover:bg-green-400 active:scale-95 transition-all"
          aria-label="Tambah booking manual"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      )}
    </>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: tidak ada error pada file ini.

- [ ] **Step 3: Commit**

```bash
git add components/admin/ManualBookingButton.tsx
git commit -m "feat: add manual booking FAB + modal component"
```

---

### Task 6: Render FAB di halaman admin

**Files:**
- Modify: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `ManualBookingButton` dari `@/components/admin/ManualBookingButton` (Task 5).

- [ ] **Step 1: Tambahkan import dan render komponen**

Di `app/admin/page.tsx`, tambahkan import:
```ts
import { ManualBookingButton } from '@/components/admin/ManualBookingButton'
```
Lalu di dalam `<main>...</main>`, setelah blok `<div className="max-w-[1200px] ...">...</div>`, tambahkan:
```tsx
        <ManualBookingButton />
```
Sehingga FAB tampil melayang di atas konten untuk semua role.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: tidak ada error.

- [ ] **Step 3: Verifikasi manual end-to-end (dev :3005)**

1. Buka `/admin`, FAB hijau muncul di pojok kanan bawah.
2. Klik → modal terbuka, slot kosong termuat untuk hari ini.
3. Ganti tanggal → daftar slot ter-refresh, pilihan ter-reset.
4. Pilih kategori Pelajar → harga slot menyesuaikan diskon.
5. Centang 2 slot → Total Harga = jumlah keduanya; edit total manual → angka tidak ditimpa lagi.
6. Isi nama, submit → modal tertutup, booking baru muncul `confirmed` (tab Akan Main), 1 voucher follow-up dibuat.
7. Buka modal lagi, tanggal sama → slot yang barusan dibooking sudah hilang dari pilihan.

- [ ] **Step 4: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat: render manual booking FAB on admin page"
```

---

## Catatan Eksekusi

- Urutan task: 1 → 2 → 3 → 4 → 5 → 6 (Task 4 bergantung pada 1 & 2; Task 5 pada 3 & 4; Task 6 pada 5).
- Karena route handler tidak punya harness test otomatis di repo ini, verifikasinya manual via dev server (sudah jalan di :3005) — **jangan** `next build`.
- Satu-satunya logika dengan unit test otomatis adalah helper harga (Task 1); jaga agar tetap hijau.
