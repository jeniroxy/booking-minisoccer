# WA Confirmation Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When admin clicks "Confirm" on a pending booking, the browser automatically opens WhatsApp pre-filled with a confirmation message to the customer.

**Architecture:** Add `buildConfirmUrl` as a pure function in `lib/booking.ts` (testable, consistent with `buildWAUrl`). In `BookingTable.tsx`, call it after a successful confirm PATCH and auto-open the URL with `window.open`. No API changes needed — all data is already in the component's state.

**Tech Stack:** Next.js 14 App Router, TypeScript, Vitest (node environment)

---

## File Structure

| File | Change |
|---|---|
| `lib/booking.ts` | Add `buildConfirmUrl` function |
| `lib/__tests__/booking.test.ts` | Add tests for `buildConfirmUrl` |
| `components/admin/BookingTable.tsx` | Call `buildConfirmUrl` + `window.open` after confirm |

---

## Task 1: `buildConfirmUrl` — pure function + tests

**Files:**
- Modify: `lib/booking.ts`
- Modify: `lib/__tests__/booking.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/__tests__/booking.test.ts`:

```ts
import { buildConfirmUrl } from '../booking'

const baseBooking = {
  phone: '08123456789',
  team_name: 'Tim Garuda',
  booking_date: '2026-04-05',
  time_slots: { start_hour: 8, end_hour: 9, id: '1', price: 150000, is_active: true, created_at: '' },
  total_price: 150000,
}

describe('buildConfirmUrl', () => {
  it('returns null when phone is null', () => {
    expect(buildConfirmUrl({ ...baseBooking, phone: null })).toBeNull()
  })

  it('returns null when phone is empty string', () => {
    expect(buildConfirmUrl({ ...baseBooking, phone: '' })).toBeNull()
  })

  it('returns a whatsapp:// URL with digits-only phone', () => {
    const url = buildConfirmUrl(baseBooking)
    expect(url).toMatch(/^whatsapp:\/\/send\?phone=08123456789/)
  })

  it('strips non-digit characters from phone', () => {
    const url = buildConfirmUrl({ ...baseBooking, phone: '+62 812-3456-789' })
    expect(url).toMatch(/^whatsapp:\/\/send\?phone=62812345678/)
  })

  it('includes team name in message', () => {
    const url = buildConfirmUrl(baseBooking)!
    expect(decodeURIComponent(url)).toContain('Tim Garuda')
  })

  it('includes zero-padded time range in message', () => {
    const url = buildConfirmUrl(baseBooking)!
    expect(decodeURIComponent(url)).toContain('08:00–09:00')
  })

  it('includes price in message', () => {
    const url = buildConfirmUrl(baseBooking)!
    expect(decodeURIComponent(url)).toContain('150')
  })

  it('uses total_price when available, falls back to time_slots.price', () => {
    const url = buildConfirmUrl({ ...baseBooking, total_price: null })!
    expect(decodeURIComponent(url)).toContain('150')
  })

  it('includes the Sundanese closing phrase', () => {
    const url = buildConfirmUrl(baseBooking)!
    expect(decodeURIComponent(url)).toContain('Di antos kasumpingana')
  })

  it('includes the 15-minute tolerance note', () => {
    const url = buildConfirmUrl(baseBooking)!
    expect(decodeURIComponent(url)).toContain('Toleransi waktu 15 menit')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/__tests__/booking.test.ts
```

Expected: several FAIL with "buildConfirmUrl is not a function" or similar import error.

- [ ] **Step 3: Implement `buildConfirmUrl` in `lib/booking.ts`**

Append to `lib/booking.ts`:

```ts
export function buildConfirmUrl(booking: {
  phone: string | null
  team_name: string
  booking_date: string
  time_slots: { start_hour: number; end_hour: number; price: number } | null
  total_price: number | null
}): string | null {
  if (!booking.phone) return null
  const phone = booking.phone.replace(/\D/g, '')

  const [year, month, day] = booking.booking_date.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  const dateLabel = dateObj.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const pad = (n: number) => String(n).padStart(2, '0')
  const timeRange = booking.time_slots
    ? `${pad(booking.time_slots.start_hour)}:00–${pad(booking.time_slots.end_hour)}:00`
    : '–'

  const price = booking.total_price ?? booking.time_slots?.price ?? 0
  const priceFormatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price)

  const lines = [
    `Tos di booking ya a, atas nama ${booking.team_name} 🎉`,
    `📅 ${dateLabel} · ${timeRange}`,
    `💰 ${priceFormatted}`,
    'Di antos kasumpingana! ⚽',
    'Toleransi waktu 15 menit, lebih dari 15 menit waktu akan langsung dimulai.',
  ]

  return `whatsapp://send?phone=${phone}&text=${encodeURIComponent(lines.join('\n'))}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/__tests__/booking.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/booking.ts lib/__tests__/booking.test.ts
git commit -m "feat: add buildConfirmUrl for WA booking confirmation message"
```

---

## Task 2: Auto-open WA after admin confirms booking

**Files:**
- Modify: `components/admin/BookingTable.tsx`

- [ ] **Step 1: Add import for `buildConfirmUrl`**

In `components/admin/BookingTable.tsx`, find the existing import line:

```ts
import { formatHour, formatPrice } from '@/lib/schedule'
```

Replace with:

```ts
import { formatHour, formatPrice } from '@/lib/schedule'
import { buildConfirmUrl } from '@/lib/booking'
```

- [ ] **Step 2: Update `updateStatus` to auto-open WA on confirm**

Find the `updateStatus` function:

```ts
  const updateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    setLoadingId(id)
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    }
    setLoadingId(null)
  }
```

Replace with:

```ts
  const updateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    setLoadingId(id)
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
      if (status === 'confirmed') {
        const booking = bookings.find(b => b.id === id)
        if (booking) {
          const waUrl = buildConfirmUrl(booking)
          if (waUrl) window.open(waUrl, '_blank')
        }
      }
    }
    setLoadingId(null)
  }
```

- [ ] **Step 3: Manual smoke test**

1. Jalankan dev server: `npm run dev`
2. Buka `/admin` di browser
3. Pastikan ada booking dengan status pending dan nomor HP terisi
4. Klik tombol "Confirm"
5. Verifikasi: WA terbuka (browser/app) dengan pesan pre-filled berisi nama tim, tanggal, jam, harga, dan teks "Di antos kasumpingana"
6. Verifikasi: row booking berubah status jadi "Confirmed"
7. Ulangi dengan booking yang tidak punya nomor HP — confirm tetap berhasil tanpa error

- [ ] **Step 4: Commit**

```bash
git add components/admin/BookingTable.tsx
git commit -m "feat: auto-open WA confirmation message when admin confirms booking"
```
