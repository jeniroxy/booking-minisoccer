# Schedule Page UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign halaman `/jadwal` dari tabel horizontal 30-hari menjadi single-day dark-mode mobile-first UI dengan scrollable date strip, slot grid 2 kolom, nama tim pada slot booked/pending, floating bar, dan bottom sheet booking.

**Architecture:** `ScheduleGrid` menjadi orchestrator yang compose 4 komponen baru: `DateNav` (strip + month picker), `SlotGrid` (grid slot satu hari), `FloatingBar` (sticky CTA), `BookingSheet` (bottom sheet form). State management tetap di `ScheduleGrid` via React hooks. API tidak berubah.

**Tech Stack:** Next.js 14 App Router, React hooks, Tailwind CSS (slate/green palette), Vitest, Supabase

---

## File Structure

**Create:**
- `components/schedule/DateNav.tsx` — date strip scrollable + month picker dropdown
- `components/schedule/SlotGrid.tsx` — 2-column dark slot grid untuk satu hari
- `components/schedule/FloatingBar.tsx` — floating booking summary bar
- `components/schedule/BookingSheet.tsx` — bottom sheet form (replaces BookingModal)

**Modify:**
- `lib/schedule.ts` — tambah `formatFullDate`, `formatDayShort`, update `getSlotStatus` return type
- `lib/__tests__/schedule.test.ts` — tests untuk fungsi baru
- `components/schedule/ScheduleGrid.tsx` — rewrite sebagai orchestrator
- `app/jadwal/page.tsx` — dark background, hapus nav lama

**Unchanged:** `lib/types.ts` (sudah punya `team_name`), `lib/booking.ts`, semua API routes

---

## Task 1: Update lib/schedule.ts — helper functions baru + team_name di getSlotStatus

**Files:**
- Modify: `lib/schedule.ts`
- Test: `lib/__tests__/schedule.test.ts`

- [ ] **Step 1.1: Tulis failing tests untuk fungsi baru**

Tambahkan di akhir `lib/__tests__/schedule.test.ts`:

```typescript
describe('formatDayShort', () => {
  it('returns 3-letter day name in Indonesian', () => {
    // 2026-03-29 is Sunday (Minggu) — day index 0
    expect(formatDayShort(new Date('2026-03-30T00:00:00'))).toBe('Sen')
    expect(formatDayShort(new Date('2026-03-31T00:00:00'))).toBe('Sel')
    expect(formatDayShort(new Date('2026-04-01T00:00:00'))).toBe('Rab')
  })
})

describe('formatFullDate', () => {
  it('returns full Indonesian date label', () => {
    expect(formatFullDate(new Date('2026-03-30T00:00:00'))).toBe('Senin, 30 Mar 2026')
    expect(formatFullDate(new Date('2026-03-29T00:00:00'))).toBe('Minggu, 29 Mar 2026')
  })
})

describe('getSlotStatus with teamName', () => {
  it('returns teamName for confirmed booking', () => {
    const booking: Booking = {
      id: 'b1',
      team_name: 'FC Garuda',
      booking_date: '2026-03-30',
      time_slot_id: 'slot-1',
      status: 'confirmed',
      created_at: '2026-01-01T00:00:00Z',
    }
    const result = getSlotStatus(slot, '2026-03-30', [booking], [], '2026-03-29')
    expect(result.status).toBe('confirmed')
    expect(result.teamName).toBe('FC Garuda')
  })

  it('returns teamName for pending booking', () => {
    const booking: Booking = {
      id: 'b2',
      team_name: 'Bintang FC',
      booking_date: '2026-03-30',
      time_slot_id: 'slot-1',
      status: 'pending',
      created_at: '2026-01-01T00:00:00Z',
    }
    const result = getSlotStatus(slot, '2026-03-30', [booking], [], '2026-03-29')
    expect(result.teamName).toBe('Bintang FC')
  })
})
```

- [ ] **Step 1.2: Jalankan test untuk verifikasi gagal**

```bash
cd /Users/zains/Projects/Booking-minisoccer
npx vitest run lib/__tests__/schedule.test.ts
```

Expected: FAIL — `formatDayShort` not found, `formatFullDate` not found, `teamName` undefined

- [ ] **Step 1.3: Implementasi di lib/schedule.ts**

Tambahkan setelah `formatDayHeader`:

```typescript
const FULL_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export function formatDayShort(date: Date): string {
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  return days[date.getDay()]
}

export function formatFullDate(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  return `${FULL_DAYS[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}
```

Update return type dan body `getSlotStatus` — tambahkan `teamName`:

```typescript
export function getSlotStatus(
  slot: TimeSlot,
  date: string,
  bookings: Booking[],
  blockedDates: BlockedDate[],
  todayStr: string
): { status: SlotStatus; bookingId?: string; teamName?: string } {
  // 1. Past check
  if (date < todayStr) return { status: 'past' }
  if (date === todayStr) {
    const nowHour = new Date().getHours()
    if (slot.end_hour <= nowHour) return { status: 'past' }
  }

  // 2. Blocked check
  const isBlocked = blockedDates.some(
    bd => bd.date === date && (bd.time_slot_id === null || bd.time_slot_id === slot.id)
  )
  if (isBlocked) return { status: 'blocked' }

  // 3. Booking check
  const booking = bookings.find(
    b => b.booking_date === date && b.time_slot_id === slot.id && b.status !== 'cancelled'
  )
  if (booking) {
    return {
      status: booking.status as 'pending' | 'confirmed',
      bookingId: booking.id,
      teamName: booking.team_name,
    }
  }

  return { status: 'available' }
}
```

Juga update import di tests agar include fungsi baru:

```typescript
import {
  getSlotStatus,
  getDaysInMonth,
  get30Days,
  formatHour,
  formatPrice,
  formatDayHeader,
  formatDayShort,
  formatFullDate,
  toDateString,
} from '../schedule'
```

- [ ] **Step 1.4: Jalankan test untuk verifikasi lulus**

```bash
npx vitest run lib/__tests__/schedule.test.ts
```

Expected: All tests PASS

- [ ] **Step 1.5: Commit**

```bash
git add lib/schedule.ts lib/__tests__/schedule.test.ts
git commit -m "feat: add formatDayShort, formatFullDate helpers and teamName to getSlotStatus"
```

---

## Task 2: Create FloatingBar component

**Files:**
- Create: `components/schedule/FloatingBar.tsx`

- [ ] **Step 2.1: Buat file FloatingBar.tsx**

```typescript
// components/schedule/FloatingBar.tsx
'use client'

import { formatPrice, formatHour } from '@/lib/schedule'
import type { TimeSlot } from '@/lib/types'
import { STUDENT_DISCOUNT } from '@/lib/schedule'

interface FloatingBarProps {
  slots: TimeSlot[]
  date: string          // 'YYYY-MM-DD'
  isStudent: boolean
  onPesan: () => void
  onCancel: () => void
}

export function FloatingBar({ slots, date, isStudent, onPesan, onCancel }: FloatingBarProps) {
  const sorted = [...slots].sort((a, b) => a.start_hour - b.start_hour)
  const slotPrice = (s: TimeSlot) => Math.max(0, s.price - (isStudent ? STUDENT_DISCOUNT : 0))
  const total = sorted.reduce((sum, s) => sum + slotPrice(s), 0)
  const dur = sorted.length

  const [, month, day] = date.split('-')
  const months = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  const dateLabel = `${parseInt(day)} ${months[parseInt(month)]}`

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-lg">
      <div className="bg-green-500 rounded-2xl px-4 py-3 flex items-center justify-between shadow-[0_4px_24px_rgba(34,197,94,0.4)]">
        <div>
          <p className="text-[13px] font-bold text-green-950">
            {dur} jam · {formatPrice(total)}
          </p>
          <p className="text-[10px] font-medium text-green-800 mt-0.5">
            {dateLabel} · {formatHour(sorted[0].start_hour)} – {formatHour(sorted[sorted.length - 1].end_hour)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPesan}
            className="bg-green-950 text-green-400 rounded-xl px-[18px] py-2.5 text-[13px] font-bold whitespace-nowrap"
          >
            Pesan Sekarang
          </button>
          <button
            onClick={onCancel}
            aria-label="Batal pilih"
            className="text-green-800 hover:text-green-950 text-base font-bold"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2.2: Commit**

```bash
git add components/schedule/FloatingBar.tsx
git commit -m "feat: add FloatingBar component with dark green styling"
```

---

## Task 3: Create BookingSheet component (bottom sheet)

**Files:**
- Create: `components/schedule/BookingSheet.tsx`

- [ ] **Step 3.1: Buat BookingSheet.tsx**

```typescript
// components/schedule/BookingSheet.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { buildWAUrl, formatDateLabel } from '@/lib/booking'
import { formatHour, formatPrice, STUDENT_DISCOUNT } from '@/lib/schedule'
import type { TimeSlot } from '@/lib/types'

interface BookingSheetProps {
  slots: TimeSlot[]
  date: Date
  isStudent: boolean
  isOpen: boolean
  onClose: () => void
  onSuccess: (bookingIds: string[]) => void
}

export function BookingSheet({ slots, date, isStudent, isOpen, onClose, onSuccess }: BookingSheetProps) {
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const sorted = [...slots].sort((a, b) => a.start_hour - b.start_hour)
  const slotPrice = (s: TimeSlot) => Math.max(0, s.price - (isStudent ? STUDENT_DISCOUNT : 0))
  const totalPrice = sorted.reduce((sum, s) => sum + slotPrice(s), 0)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    } else {
      setTeamName('')
      setError('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) {
      setError('Nama tim wajib diisi')
      return
    }

    setLoading(true)
    setError('')

    try {
      const bookingDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      const results = await Promise.all(
        sorted.map(slot =>
          fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team_name: teamName.trim(), booking_date: bookingDate, time_slot_id: slot.id }),
          })
        )
      )

      const failed = results.find(r => !r.ok)
      if (failed) {
        setError(failed.status === 409
          ? 'Salah satu slot sudah dipesan. Silakan pilih ulang.'
          : 'Gagal membuat booking. Silakan coba lagi.')
        setLoading(false)
        return
      }

      const bookings = await Promise.all(results.map(r => r.json()))
      onSuccess(bookings.map((b: { id: string }) => b.id))

      const waUrl = buildWAUrl({
        teamName: teamName.trim(),
        dateLabel: formatDateLabel(date),
        startHour: sorted[0].start_hour,
        endHour: sorted[sorted.length - 1].end_hour,
        totalPrice,
        isStudent,
        waNumber: process.env.NEXT_PUBLIC_ADMIN_WA_NUMBER!,
      })
      window.open(waUrl, '_blank')
      setTeamName('')
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.')
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-800 rounded-t-[20px] border-t border-slate-700 p-4 mx-auto max-w-lg">
        {/* Handle */}
        <div className="w-9 h-1 bg-slate-600 rounded-full mx-auto mb-4" />

        <h2 className="text-[13px] font-bold text-slate-100 mb-3">Konfirmasi Booking</h2>

        {/* Summary */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 mb-3 space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-500">Tanggal</span>
            <span className="text-slate-200 font-medium">{formatDateLabel(date)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-500">Jam</span>
            <span className="text-slate-200 font-medium">
              {formatHour(sorted[0].start_hour)} – {formatHour(sorted[sorted.length - 1].end_hour)}
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-500">Durasi</span>
            <span className="text-slate-200 font-medium">{sorted.length} jam</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-500">Kategori</span>
            <span className={`font-medium ${isStudent ? 'text-green-400' : 'text-slate-200'}`}>
              {isStudent ? 'Pelajar (diskon Rp50.000/jam)' : 'Umum'}
            </span>
          </div>
          <div className="border-t border-slate-700 pt-1.5 flex justify-between text-[13px]">
            <span className="font-semibold text-slate-200">Total</span>
            <span className="font-bold text-green-400">{formatPrice(totalPrice)}</span>
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={inputRef}
            type="text"
            placeholder="Nama tim kamu..."
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-[12px] text-slate-100 placeholder-slate-500 outline-none focus:border-green-500"
          />

          {error && <p className="text-[11px] text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl py-2.5 text-[12px] font-medium text-slate-500"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2.5] bg-gradient-to-r from-green-500 to-green-600 rounded-xl py-2.5 text-[12px] font-bold text-green-950 disabled:opacity-50"
            >
              {loading ? 'Memproses...' : '📲 Booking via WhatsApp'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
```

- [ ] **Step 3.2: Commit**

```bash
git add components/schedule/BookingSheet.tsx
git commit -m "feat: add BookingSheet bottom sheet component (replaces dialog modal)"
```

---

## Task 4: Create DateNav component

**Files:**
- Create: `components/schedule/DateNav.tsx`

- [ ] **Step 4.1: Buat DateNav.tsx**

```typescript
// components/schedule/DateNav.tsx
'use client'

import { useRef, useEffect, useState } from 'react'
import { toDateString, formatDayShort } from '@/lib/schedule'
import { cn } from '@/lib/utils'
import type { Booking } from '@/lib/types'

interface DateNavProps {
  days: Date[]                 // 30 days array dari ScheduleGrid
  todayStr: string
  selectedDate: string
  bookings: Booking[]          // untuk dot indicator hari yang ada booking
  onSelectDate: (dateStr: string) => void
  onShift: (dir: 1 | -1) => void
  isShiftDisabled: boolean     // true saat di window pertama (dari hari ini)
}

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function getMonthLabel(days: Date[]): string {
  const first = days[0]
  const last = days[days.length - 1]
  if (first.getMonth() === last.getMonth()) {
    return `${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`
  }
  return `${SHORT_MONTHS[first.getMonth()]} – ${SHORT_MONTHS[last.getMonth()]} ${last.getFullYear()}`
}

function getAvailableMonths(days: Date[]): number[] {
  return [...new Set(days.map(d => d.getMonth()))]
}

export function DateNav({
  days,
  todayStr,
  selectedDate,
  onSelectDate,
  bookings,
  onShift,
  isShiftDisabled,
}: DateNavProps) {
  const stripRef = useRef<HTMLDivElement>(null)
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const availableMonths = getAvailableMonths(days)

  const hasActiveBooking = (dateStr: string) =>
    bookings.some(b => b.booking_date === dateStr && b.status !== 'cancelled')

  // Scroll selected date into view
  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const selectedEl = strip.querySelector('[data-selected="true"]') as HTMLElement
    if (selectedEl) {
      selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [selectedDate])

  const handleMonthSelect = (monthIndex: number) => {
    const target = days.find(d => d.getMonth() === monthIndex)
    if (target) {
      onSelectDate(toDateString(target))
    }
    setMonthPickerOpen(false)
  }

  return (
    <div className="bg-slate-950 border-b border-slate-800 px-3.5 pt-2.5 pb-2.5 relative">
      {/* Header row: month button + arrows */}
      <div className="flex items-center justify-between mb-2.5">
        {/* Month picker button */}
        <button
          onClick={() => setMonthPickerOpen(o => !o)}
          className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-100"
        >
          {getMonthLabel(days)}
          <span className={cn('text-slate-500 text-[9px] transition-transform', monthPickerOpen && 'rotate-180')}>▼</span>
        </button>

        {/* Nav arrows */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onShift(-1)}
            disabled={isShiftDisabled}
            className="w-7 h-7 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-lg text-slate-400 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ‹
          </button>
          {isShiftDisabled ? (
            <button disabled className="px-2.5 h-7 bg-slate-800 border border-slate-700 rounded-lg text-[9px] font-bold text-green-500 opacity-30 cursor-not-allowed">
              HARI INI
            </button>
          ) : (
            <button
              onClick={() => {
                onShift(-1)
              }}
              className="px-2.5 h-7 bg-slate-800 border border-slate-700 rounded-lg text-[9px] font-bold text-green-500"
            >
              HARI INI
            </button>
          )}
          <button
            onClick={() => onShift(1)}
            className="w-7 h-7 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-lg text-slate-400 text-sm"
          >
            ›
          </button>
        </div>
      </div>

      {/* Month picker dropdown */}
      {monthPickerOpen && (
        <div className="absolute top-[52px] left-3.5 right-3.5 bg-slate-800 border border-slate-700 rounded-2xl p-3 z-50 shadow-2xl">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center mb-2.5">Pilih Bulan</p>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_NAMES.map((name, i) => {
              const isAvailable = availableMonths.includes(i)
              const isCurrent = days[0].getMonth() === i || days.find(d => d.getMonth() === i) !== undefined
              const isSelected = days.find(d => d.getMonth() === i && toDateString(d) === selectedDate) !== undefined
              return (
                <button
                  key={i}
                  disabled={!isAvailable}
                  onClick={() => handleMonthSelect(i)}
                  className={cn(
                    'py-2 rounded-lg border text-[11px] font-medium transition-colors',
                    !isAvailable && 'opacity-25 cursor-not-allowed bg-slate-900 border-slate-700 text-slate-500',
                    isAvailable && !isSelected && 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700',
                    isSelected && 'bg-green-500 border-green-500 text-green-950 font-bold',
                  )}
                >
                  {name.slice(0, 3)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Date strip — scrollable */}
      <div
        ref={stripRef}
        className="flex gap-1 overflow-x-auto pb-0.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {days.map(day => {
          const dateStr = toDateString(day)
          const isToday = dateStr === todayStr
          const isActive = dateStr === selectedDate
          const hasDot = hasActiveBooking(dateStr)
          return (
            <button
              key={dateStr}
              data-selected={isActive}
              onClick={() => onSelectDate(dateStr)}
              className="flex-shrink-0 w-11 flex flex-col items-center gap-1 py-0.5"
            >
              <span className={cn(
                'text-[8px] font-medium uppercase tracking-wider',
                isActive ? 'text-green-400' : 'text-slate-500'
              )}>
                {formatDayShort(day)}
              </span>
              <span className={cn(
                'w-9 h-9 flex items-center justify-center rounded-xl text-[13px] font-medium transition-colors',
                isActive && 'bg-green-500 text-green-950 font-bold',
                !isActive && isToday && 'bg-slate-800 text-slate-300 border border-slate-700',
                !isActive && !isToday && 'text-slate-500 hover:text-slate-300'
              )}>
                {day.getDate()}
              </span>
              {/* Dot merah = ada booking aktif */}
              <span className={cn(
                'w-1 h-1 rounded-full',
                hasDot ? (isActive ? 'bg-green-950' : 'bg-red-500') : 'bg-transparent'
              )} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4.2: Commit**

```bash
git add components/schedule/DateNav.tsx
git commit -m "feat: add DateNav component with scrollable date strip and month picker"
```

---

## Task 5: Create SlotGrid component

**Files:**
- Create: `components/schedule/SlotGrid.tsx`

- [ ] **Step 5.1: Buat SlotGrid.tsx**

```typescript
// components/schedule/SlotGrid.tsx
'use client'

import { cn } from '@/lib/utils'
import { getSlotStatus, formatHour, formatPrice, formatFullDate, STUDENT_DISCOUNT } from '@/lib/schedule'
import type { TimeSlot, Booking, BlockedDate, SlotStatus } from '@/lib/types'

interface Selection {
  date: string
  slots: TimeSlot[]
}

interface SlotGridProps {
  slots: TimeSlot[]
  date: string           // 'YYYY-MM-DD' hari yang ditampilkan
  bookings: Booking[]
  blockedDates: BlockedDate[]
  todayStr: string
  isStudent: boolean
  selection: Selection | null
  onSlotClick: (slot: TimeSlot) => void
}

interface SlotCardProps {
  slot: TimeSlot
  status: SlotStatus
  teamName?: string
  price: number
  isSelected: boolean
  onClick?: () => void
}

function SlotCard({ slot, status, teamName, price, isSelected, onClick }: SlotCardProps) {
  if (status === 'past') return null   // slot lama tidak ditampilkan

  const timeLabel = `${formatHour(slot.start_hour)} – ${formatHour(slot.end_hour)}`

  if (status === 'available') {
    return (
      <button
        onClick={onClick}
        className={cn(
          'bg-slate-800 border-[1.5px] rounded-xl p-2.5 text-left transition-all',
          isSelected
            ? 'bg-green-900 border-green-500 ring-1 ring-green-500/30'
            : 'border-slate-700 hover:border-green-500 hover:bg-slate-700/50'
        )}
      >
        <p className={cn('text-[10px] mb-1', isSelected ? 'text-green-300' : 'text-slate-500')}>
          {timeLabel}
        </p>
        <p className={cn('text-[22px] font-extrabold leading-none tracking-tight', isSelected ? 'text-green-400' : 'text-green-500')}>
          {formatPrice(price)}
          {isSelected && (
            <span className="absolute top-2 right-2 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-[8px] font-bold text-green-950">✓</span>
          )}
        </p>
      </button>
    )
  }

  if (status === 'confirmed') {
    return (
      <div className="bg-[#120a0a] border border-red-500/20 rounded-xl p-2.5 cursor-not-allowed">
        <p className="text-[10px] text-red-900 mb-1.5">{timeLabel}</p>
        <span className="inline-flex items-center gap-1 bg-red-500/32 border border-red-500/40 rounded-md px-1.5 py-0.5 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
          <span className="text-[8px] font-bold text-red-300 uppercase tracking-wider">Booked</span>
        </span>
        {teamName && (
          <p className="text-[11px] font-semibold text-slate-400 truncate">{teamName}</p>
        )}
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="bg-[#1c1a07] border border-yellow-700/50 rounded-xl p-2.5 cursor-not-allowed opacity-70">
        <p className="text-[10px] text-red-900/50 mb-1.5">{timeLabel}</p>
        <span className="inline-flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/35 rounded-md px-1.5 py-0.5 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
          <span className="text-[8px] font-bold text-yellow-400 uppercase tracking-wider">Pending</span>
        </span>
        {teamName && (
          <p className="text-[11px] font-semibold text-slate-500 truncate">{teamName}</p>
        )}
      </div>
    )
  }

  // blocked
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5 cursor-not-allowed opacity-35">
      <p className="text-[10px] text-slate-600 mb-1">{timeLabel}</p>
      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Tutup</p>
    </div>
  )
}

export function SlotGrid({
  slots,
  date,
  bookings,
  blockedDates,
  todayStr,
  isStudent,
  selection,
  onSlotClick,
}: SlotGridProps) {
  const slotPrice = (s: TimeSlot) => Math.max(0, s.price - (isStudent ? STUDENT_DISCOUNT : 0))
  const activeDate = new Date(date + 'T00:00:00')

  const visibleSlots = slots.filter(s => {
    const { status } = getSlotStatus(s, date, bookings, blockedDates, todayStr)
    return status !== 'past'
  })

  const availableCount = visibleSlots.filter(s => {
    const { status } = getSlotStatus(s, date, bookings, blockedDates, todayStr)
    return status === 'available'
  }).length

  return (
    <div className="px-3.5 pb-32">
      {/* Day label + count */}
      <div className="flex items-center justify-between py-2.5">
        <p className="text-[12px] font-semibold text-slate-100">
          {formatFullDate(activeDate)}
          {todayStr === date && <span className="text-slate-500 font-normal"> · Hari ini</span>}
        </p>
        <span className="text-[9px] text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">
          {availableCount} tersedia
        </span>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-2 gap-2 relative">
        {slots.map(slot => {
          const { status, teamName } = getSlotStatus(slot, date, bookings, blockedDates, todayStr)
          const isSelected = selection?.date === date && selection.slots.some(s => s.id === slot.id)
          return (
            <div key={slot.id} className="relative">
              <SlotCard
                slot={slot}
                status={status}
                teamName={teamName}
                price={slotPrice(slot)}
                isSelected={isSelected}
                onClick={status === 'available' ? () => onSlotClick(slot) : undefined}
              />
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-800">
        {[
          { color: 'bg-green-500', label: 'Tersedia' },
          { color: 'bg-green-900 border border-green-500', label: 'Dipilih' },
          { color: 'bg-red-500/32 border border-red-500/40', label: 'Booked' },
          { color: 'bg-yellow-500/20 border border-yellow-500/35', label: 'Pending' },
          { color: 'bg-slate-800 border border-slate-700 opacity-35', label: 'Tutup' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-sm inline-block', color)} />
            <span className="text-[9px] text-slate-500">{label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5.2: Commit**

```bash
git add components/schedule/SlotGrid.tsx
git commit -m "feat: add SlotGrid 2-column dark component with team name on booked/pending slots"
```

---

## Task 6: Rewrite ScheduleGrid.tsx — orchestrator

**Files:**
- Modify: `components/schedule/ScheduleGrid.tsx`

- [ ] **Step 6.1: Rewrite ScheduleGrid.tsx**

```typescript
// components/schedule/ScheduleGrid.tsx
'use client'

import { useState, useCallback } from 'react'
import { get30Days, toDateString } from '@/lib/schedule'
import type { TimeSlot, ScheduleData } from '@/lib/types'
import { DateNav } from './DateNav'
import { SlotGrid } from './SlotGrid'
import { FloatingBar } from './FloatingBar'
import { BookingSheet } from './BookingSheet'

interface Selection {
  date: string
  slots: TimeSlot[]
}

interface ScheduleGridProps {
  initialData: ScheduleData
  initialStartDate: string
}

export function ScheduleGrid({ initialData, initialStartDate }: ScheduleGridProps) {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const [startDate, setStartDate] = useState(initialStartDate)
  const [data, setData] = useState<ScheduleData>(initialData)
  const [loading, setLoading] = useState(false)
  const [isStudent, setIsStudent] = useState(false)
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [bookingOpen, setBookingOpen] = useState(false)

  const days = get30Days(new Date(startDate + 'T00:00:00'))

  const isPrevDisabled = startDate <= todayStr

  const handleShift = useCallback(
    async (direction: 1 | -1) => {
      if (direction === -1 && isPrevDisabled) {
        // "HARI INI" — reset to today without fetching if already in initial window
        setSelectedDate(todayStr)
        setStartDate(initialStartDate)
        return
      }

      const current = new Date(startDate + 'T00:00:00')
      current.setDate(current.getDate() + direction * 30)
      const newStart = toDateString(current)
      if (newStart < todayStr) return

      setLoading(true)
      try {
        const res = await fetch(`/api/schedule?startDate=${newStart}`)
        const newData: ScheduleData = await res.json()
        setData(newData)
        setStartDate(newStart)
        setSelectedDate(newStart)
        setSelection(null)
      } finally {
        setLoading(false)
      }
    },
    [startDate, todayStr, isPrevDisabled, initialStartDate]
  )

  const handleSlotClick = useCallback((slot: TimeSlot) => {
    setSelection(prev => {
      if (!prev || prev.date !== selectedDate) {
        return { date: selectedDate, slots: [slot] }
      }

      const sorted = [...prev.slots].sort((a, b) => a.start_hour - b.start_hour)
      const first = sorted[0]
      const last = sorted[sorted.length - 1]

      if (slot.id === first.id || slot.id === last.id) {
        const filtered = prev.slots.filter(s => s.id !== slot.id)
        return filtered.length > 0 ? { date: selectedDate, slots: filtered } : null
      }
      if (slot.start_hour === last.end_hour) return { date: selectedDate, slots: [...prev.slots, slot] }
      if (slot.end_hour === first.start_hour) return { date: selectedDate, slots: [slot, ...prev.slots] }
      return { date: selectedDate, slots: [slot] }
    })
  }, [selectedDate])

  const handleBookingSuccess = useCallback(
    (bookingIds: string[]) => {
      if (!selection) return
      const sorted = [...selection.slots].sort((a, b) => a.start_hour - b.start_hour)
      setData(prev => ({
        ...prev,
        bookings: [
          ...prev.bookings,
          ...sorted.map((slot, i) => ({
            id: bookingIds[i],
            team_name: '',
            booking_date: selection.date,
            time_slot_id: slot.id,
            status: 'pending' as const,
            created_at: new Date().toISOString(),
          })),
        ],
      }))
      setSelection(null)
      setBookingOpen(false)
    },
    [selection]
  )

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-700 rounded-[10px] flex items-center justify-center text-base">⚽</div>
          <div>
            <p className="text-[14px] font-bold text-slate-100 leading-tight">Mini Soccer</p>
            <p className="text-[9px] text-slate-500">Jadwal & Booking</p>
          </div>
        </div>
        {/* Toggle Umum / Pelajar */}
        <div className="flex bg-slate-800 rounded-3xl p-[3px]">
          <button
            onClick={() => setIsStudent(false)}
            className={`px-4 py-[7px] rounded-3xl text-[12px] font-bold transition-colors ${
              !isStudent ? 'bg-green-500 text-green-950' : 'text-slate-500'
            }`}
          >
            Umum
          </button>
          <button
            onClick={() => setIsStudent(true)}
            className={`px-4 py-[7px] rounded-3xl text-[12px] font-bold transition-colors ${
              isStudent ? 'bg-green-500 text-green-950' : 'text-slate-500'
            }`}
          >
            Pelajar
          </button>
        </div>
      </header>

      {/* Date navigation */}
      <DateNav
        days={days}
        todayStr={todayStr}
        selectedDate={selectedDate}
        bookings={data.bookings}
        onSelectDate={(d) => {
          setSelectedDate(d)
          if (selection?.date !== d) setSelection(null)
        }}
        onShift={handleShift}
        isShiftDisabled={isPrevDisabled}
      />

      {/* Slot grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
          Memuat jadwal...
        </div>
      ) : (
        <SlotGrid
          slots={data.slots}
          date={selectedDate}
          bookings={data.bookings}
          blockedDates={data.blockedDates}
          todayStr={todayStr}
          isStudent={isStudent}
          selection={selection}
          onSlotClick={handleSlotClick}
        />
      )}

      {/* Floating bar */}
      {selection && (
        <FloatingBar
          slots={selection.slots}
          date={selection.date}
          isStudent={isStudent}
          onPesan={() => setBookingOpen(true)}
          onCancel={() => setSelection(null)}
        />
      )}

      {/* Bottom sheet */}
      {selection && (
        <BookingSheet
          slots={selection.slots}
          date={new Date(selection.date + 'T00:00:00')}
          isStudent={isStudent}
          isOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 6.2: Jalankan dev server dan cek di browser**

```bash
npm run dev
```

Buka `http://localhost:3000/jadwal` di DevTools > mobile view (375px).

Expected: Halaman tampil dark, header hijau, date strip scrollable, slot grid 2 kolom.

- [ ] **Step 6.3: Commit**

```bash
git add components/schedule/ScheduleGrid.tsx
git commit -m "feat: rewrite ScheduleGrid as dark mobile orchestrator composing DateNav, SlotGrid, FloatingBar, BookingSheet"
```

---

## Task 7: Update app/jadwal/page.tsx

**Files:**
- Modify: `app/jadwal/page.tsx`

- [ ] **Step 7.1: Update page.tsx**

Hapus nav lama dan wrapper padding (ScheduleGrid sekarang mengelola layout-nya sendiri):

```typescript
import { createClient } from '@/lib/supabase/server'
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid'

export default async function JadwalPage() {
  const startDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const endObj = new Date(startDate + 'T00:00:00')
  endObj.setDate(endObj.getDate() + 29)
  const endDate = endObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const supabase = createClient()

  const [slotsRes, bookingsRes, blockedRes] = await Promise.all([
    supabase.from('time_slots').select('*').eq('is_active', true).order('start_hour'),
    supabase.from('bookings').select('*').gte('booking_date', startDate).lte('booking_date', endDate),
    supabase.from('blocked_dates').select('*').gte('date', startDate).lte('date', endDate),
  ])

  return (
    <ScheduleGrid
      initialData={{
        slots: slotsRes.data ?? [],
        bookings: bookingsRes.data ?? [],
        blockedDates: blockedRes.data ?? [],
      }}
      initialStartDate={startDate}
    />
  )
}
```

- [ ] **Step 7.2: Commit**

```bash
git add app/jadwal/page.tsx
git commit -m "feat: simplify jadwal page - remove old nav, ScheduleGrid owns full layout"
```

---

## Task 8: Verifikasi akhir

- [ ] **Step 8.1: Jalankan full test suite**

```bash
npx vitest run
```

Expected: All tests PASS

- [ ] **Step 8.2: Cek manual di mobile view (DevTools 375px)**

Checklist:
- [ ] Header sticky: logo + toggle Umum/Pelajar muncul di atas
- [ ] Toggle Umum ↔ Pelajar → harga slot berubah
- [ ] Strip tanggal bisa di-scroll horizontal, mulai dari hari ini
- [ ] Tap tanggal → slot grid update ke hari itu
- [ ] Month picker button terbuka/tutup dengan benar
- [ ] Slot AVAILABLE: harga `90K` besar tanpa "Rp"
- [ ] Tap slot → selected state (hijau, checkmark)
- [ ] Slot BOOKED: badge merah transparan + nama tim
- [ ] Slot PENDING: badge kuning + nama tim redup
- [ ] Floating bar muncul saat ada selection: "X jam · YK" + tombol "Pesan Sekarang"
- [ ] Tap "Pesan Sekarang" → bottom sheet slide dari bawah
- [ ] Input nama tim, tap "Booking via WhatsApp" → redirect WA

- [ ] **Step 8.3: Commit final**

```bash
git add -A
git commit -m "feat: complete schedule page dark mode mobile redesign"
```
