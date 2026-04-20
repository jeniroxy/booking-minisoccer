# Jadwal Tetap (Recurring Bookings) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin dapat membuat jadwal tetap (recurring) agar booking otomatis di-generate confirmed untuk 4 minggu ke depan, dengan notif push jika ada konflik slot.

**Architecture:** Tabel `recurring_schedules` menyimpan pola (tim, hari, slot). Generate dilakukan saat simpan (POST) dan cron mingguan. Logic generate di-extract ke `lib/recurring.ts` agar bisa dipakai oleh API route dan cron. Conflict = skip + push notif.

**Tech Stack:** Next.js App Router, Supabase (admin client), Vercel Cron, web-push

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/019_recurring_schedules.sql`

- [ ] **Step 1: Buat migration file**

```sql
-- supabase/migrations/019_recurring_schedules.sql

CREATE TABLE recurring_schedules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name     TEXT NOT NULL,
  phone         TEXT,
  customer_type TEXT NOT NULL DEFAULT 'umum' CHECK (customer_type IN ('umum', 'pelajar')),
  time_slot_id  UUID NOT NULL REFERENCES time_slots(id),
  day_of_week   INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Minggu, 6=Sabtu
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_day ON recurring_schedules(day_of_week);
CREATE INDEX idx_recurring_slot ON recurring_schedules(time_slot_id);

ALTER TABLE bookings
  ADD COLUMN recurring_schedule_id UUID REFERENCES recurring_schedules(id) ON DELETE SET NULL;

ALTER TABLE notification_settings
  ADD COLUMN notify_recurring_conflict BOOL NOT NULL DEFAULT true;
```

- [ ] **Step 2: Jalankan migration di Supabase dashboard**

Buka Supabase SQL Editor, paste isi file, run. Verifikasi tabel `recurring_schedules` muncul dan kolom `recurring_schedule_id` ada di `bookings`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/019_recurring_schedules.sql
git commit -m "feat: add recurring_schedules migration"
```

---

## Task 2: Types & Push Update

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/push.ts`

- [ ] **Step 1: Tambah `RecurringSchedule` dan update `Booking` di `lib/types.ts`**

Tambahkan setelah interface `Booking` (setelah baris `created_at: string`):

```typescript
// Di dalam interface Booking, tambah field baru:
  recurring_schedule_id?: string | null
```

Tambahkan interface baru di bawah `BookingWithSlot`:

```typescript
export interface RecurringSchedule {
  id: string
  team_name: string
  phone: string | null
  customer_type: 'umum' | 'pelajar'
  time_slot_id: string
  day_of_week: number // 0=Minggu, 1=Senin, ..., 6=Sabtu
  is_active: boolean
  created_by: string | null
  created_at: string
  time_slots?: { start_hour: number; end_hour: number; price: number }
}
```

- [ ] **Step 2: Tambah `'notify_recurring_conflict'` ke union type di `lib/push.ts`**

Di `lib/push.ts` line 16, ubah parameter `type`:

```typescript
export async function sendPushToAdmins(
  payload: NotificationPayload,
  type: 'notify_new_booking' | 'notify_play_finished' | 'notify_recurring_conflict'
) {
```

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts lib/push.ts
git commit -m "feat: add RecurringSchedule type and notify_recurring_conflict push type"
```

---

## Task 3: `lib/recurring.ts` — Generate Logic

**Files:**
- Create: `lib/recurring.ts`
- Create: `lib/__tests__/recurring.test.ts`

- [ ] **Step 1: Tulis failing test dulu**

```typescript
// lib/__tests__/recurring.test.ts
import { getDatesForDayOfWeek } from '../recurring'

describe('getDatesForDayOfWeek', () => {
  it('returns all matching weekdays in range', () => {
    // 2026-04-20 is a Monday (day 1)
    // Rabu (3) dalam range Mon Apr 20 – Sun May 17
    const dates = getDatesForDayOfWeek(3, '2026-04-20', '2026-05-17')
    expect(dates).toEqual(['2026-04-22', '2026-04-29', '2026-05-06', '2026-05-13'])
  })

  it('returns empty array if no matching day in range', () => {
    // Single day range, no matching day
    const dates = getDatesForDayOfWeek(5, '2026-04-20', '2026-04-20')
    expect(dates).toEqual([])
  })

  it('includes fromDate itself if it matches the day', () => {
    // 2026-04-22 is a Wednesday (day 3)
    const dates = getDatesForDayOfWeek(3, '2026-04-22', '2026-04-22')
    expect(dates).toEqual(['2026-04-22'])
  })
})
```

- [ ] **Step 2: Jalankan test — harus fail**

```bash
npx jest lib/__tests__/recurring.test.ts
```

Expected: FAIL — `getDatesForDayOfWeek` not found

- [ ] **Step 3: Buat `lib/recurring.ts`**

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { getStudentPrice } from '@/lib/schedule'

type SupabaseClient = ReturnType<typeof createAdminClient>

export interface RecurringConflict {
  date: string
  existingTeam: string | null
}

export function getDatesForDayOfWeek(
  dayOfWeek: number,
  fromDate: string,
  toDate: string
): string[] {
  const dates: string[] = []
  const [fy, fm, fd] = fromDate.split('-').map(Number)
  const [ty, tm, td] = toDate.split('-').map(Number)
  const current = new Date(fy, fm - 1, fd)
  const end = new Date(ty, tm - 1, td)

  // Advance to first matching day of week
  while (current.getDay() !== dayOfWeek && current <= end) {
    current.setDate(current.getDate() + 1)
  }

  while (current <= end) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    current.setDate(current.getDate() + 7)
  }

  return dates
}

export async function generateBookingsForSchedule(
  supabase: SupabaseClient,
  schedule: {
    id: string
    team_name: string
    phone: string | null
    customer_type: 'umum' | 'pelajar'
    time_slot_id: string
    day_of_week: number
    time_slots: { start_hour: number; end_hour: number; price: number }
  },
  fromDate: string,
  toDate: string
): Promise<RecurringConflict[]> {
  const dates = getDatesForDayOfWeek(schedule.day_of_week, fromDate, toDate)
  const conflicts: RecurringConflict[] = []

  for (const date of dates) {
    const { data: existing } = await supabase
      .from('bookings')
      .select('team_name, recurring_schedule_id')
      .eq('booking_date', date)
      .eq('time_slot_id', schedule.time_slot_id)
      .neq('status', 'cancelled')
      .maybeSingle()

    if (existing) {
      // Already booked by this same schedule — skip silently
      if (existing.recurring_schedule_id === schedule.id) continue
      // Conflict with another booking
      conflicts.push({ date, existingTeam: existing.team_name })
      continue
    }

    const price =
      schedule.customer_type === 'pelajar'
        ? getStudentPrice(schedule.time_slots.price)
        : schedule.time_slots.price

    await supabase.from('bookings').insert({
      team_name: schedule.team_name,
      phone: schedule.phone,
      booking_date: date,
      time_slot_id: schedule.time_slot_id,
      status: 'confirmed',
      customer_type: schedule.customer_type,
      total_price: price,
      recurring_schedule_id: schedule.id,
    })
  }

  return conflicts
}
```

- [ ] **Step 4: Jalankan test — harus pass**

```bash
npx jest lib/__tests__/recurring.test.ts
```

Expected: PASS — 3 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/recurring.ts lib/__tests__/recurring.test.ts
git commit -m "feat: add recurring booking generate logic with tests"
```

---

## Task 4: API Route — GET + POST `/api/admin/recurring`

**Files:**
- Create: `app/api/admin/recurring/route.ts`

- [ ] **Step 1: Buat file**

```typescript
// app/api/admin/recurring/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateBookingsForSchedule } from '@/lib/recurring'
import { sendPushToAdmins } from '@/lib/push'
import { formatHour } from '@/lib/schedule'

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

function getWindow(): { fromDate: string; toDate: string } {
  const fromDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const to = new Date(fromDate + 'T00:00:00+07:00')
  to.setDate(to.getDate() + 27)
  const toDate = to.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  return { fromDate, toDate }
}

export async function GET(_request: NextRequest) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('recurring_schedules')
    .select('*, time_slots(start_hour, end_hour, price)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { team_name, phone, customer_type, time_slot_id, day_of_week } = body as {
    team_name: string
    phone?: string
    customer_type: 'umum' | 'pelajar'
    time_slot_id: string
    day_of_week: number
  }

  if (!team_name?.trim() || !time_slot_id || day_of_week === undefined) {
    return NextResponse.json({ error: 'team_name, time_slot_id, day_of_week required' }, { status: 400 })
  }
  if (!['umum', 'pelajar'].includes(customer_type)) {
    return NextResponse.json({ error: 'Invalid customer_type' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: slot } = await supabase
    .from('time_slots')
    .select('start_hour, end_hour, price')
    .eq('id', time_slot_id)
    .single()

  if (!slot) return NextResponse.json({ error: 'Invalid time_slot_id' }, { status: 400 })

  const { data: schedule, error } = await supabase
    .from('recurring_schedules')
    .insert({
      team_name: team_name.trim(),
      phone: phone?.trim() || null,
      customer_type,
      time_slot_id,
      day_of_week,
      created_by: auth.userId,
    })
    .select('*')
    .single()

  if (error || !schedule) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }

  const { fromDate, toDate } = getWindow()
  const conflicts = await generateBookingsForSchedule(
    supabase,
    { ...schedule, time_slots: slot },
    fromDate,
    toDate
  )

  for (const conflict of conflicts) {
    await sendPushToAdmins(
      {
        title: 'Konflik Jadwal Tetap',
        body: `${schedule.team_name} — ${HARI[schedule.day_of_week]}, ${conflict.date} ${formatHour(slot.start_hour)}: dipakai ${conflict.existingTeam ?? '?'}`,
        url: '/admin',
      },
      'notify_recurring_conflict'
    )
  }

  return NextResponse.json({
    schedule: { ...schedule, time_slots: slot },
    conflicts: conflicts.length,
  })
}
```

- [ ] **Step 2: Test manual — GET**

Dengan dev server running (`npm run dev`), buka browser ke `http://localhost:3000/admin`. Buka DevTools → Network. Tab Jadwal Tetap belum ada, tapi pastikan tidak ada TypeScript error di terminal.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/recurring/route.ts
git commit -m "feat: add GET+POST /api/admin/recurring"
```

---

## Task 5: API Route — PATCH + DELETE `/api/admin/recurring/[id]`

**Files:**
- Create: `app/api/admin/recurring/[id]/route.ts`

- [ ] **Step 1: Buat file**

```typescript
// app/api/admin/recurring/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateBookingsForSchedule } from '@/lib/recurring'
import { sendPushToAdmins } from '@/lib/push'
import { formatHour } from '@/lib/schedule'

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const { is_active } = await request.json() as { is_active: boolean }
  const supabase = createAdminClient()

  const { data: schedule, error } = await supabase
    .from('recurring_schedules')
    .update({ is_active })
    .eq('id', params.id)
    .select('*, time_slots(start_hour, end_hour, price)')
    .single()

  if (error || !schedule) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Re-generate missing bookings when reactivating
  if (is_active) {
    const fromDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    const to = new Date(fromDate + 'T00:00:00+07:00')
    to.setDate(to.getDate() + 27)
    const toDate = to.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

    const conflicts = await generateBookingsForSchedule(supabase, schedule, fromDate, toDate)
    for (const conflict of conflicts) {
      await sendPushToAdmins(
        {
          title: 'Konflik Jadwal Tetap',
          body: `${schedule.team_name} — ${HARI[schedule.day_of_week]}, ${conflict.date} ${formatHour(schedule.time_slots!.start_hour)}: dipakai ${conflict.existingTeam ?? '?'}`,
          url: '/admin',
        },
        'notify_recurring_conflict'
      )
    }
  }

  return NextResponse.json(schedule)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('recurring_schedules')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/admin/recurring/[id]/route.ts"
git commit -m "feat: add PATCH+DELETE /api/admin/recurring/[id]"
```

---

## Task 6: Cron + vercel.json

**Files:**
- Create: `app/api/cron/extend-recurring/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Buat cron route**

```typescript
// app/api/cron/extend-recurring/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateBookingsForSchedule } from '@/lib/recurring'
import { sendPushToAdmins } from '@/lib/push'
import { formatHour } from '@/lib/schedule'

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const fromDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const to = new Date(fromDate + 'T00:00:00+07:00')
  to.setDate(to.getDate() + 27)
  const toDate = to.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const { data: schedules } = await supabase
    .from('recurring_schedules')
    .select('*, time_slots(start_hour, end_hour, price)')
    .eq('is_active', true)

  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ message: 'No active schedules', conflicts: 0 })
  }

  let totalConflicts = 0

  for (const schedule of schedules) {
    const conflicts = await generateBookingsForSchedule(supabase, schedule, fromDate, toDate)
    totalConflicts += conflicts.length

    for (const conflict of conflicts) {
      await sendPushToAdmins(
        {
          title: 'Konflik Jadwal Tetap',
          body: `${schedule.team_name} — ${HARI[schedule.day_of_week]}, ${conflict.date} ${formatHour(schedule.time_slots!.start_hour)}: dipakai ${conflict.existingTeam ?? '?'}`,
          url: '/admin',
        },
        'notify_recurring_conflict'
      )
    }
  }

  return NextResponse.json({ message: 'OK', conflicts: totalConflicts })
}
```

- [ ] **Step 2: Update `vercel.json`**

```json
{
  "crons": [
    {
      "path": "/api/cron/play-finished",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/cleanup-vouchers",
      "schedule": "0 17 * * *"
    },
    {
      "path": "/api/cron/extend-recurring",
      "schedule": "0 17 * * 0"
    }
  ]
}
```

(`0 17 * * 0` = Minggu 17:00 UTC = Senin 00:00 WIB)

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/extend-recurring/route.ts vercel.json
git commit -m "feat: add weekly extend-recurring cron job"
```

---

## Task 7: `RecurringScheduleTab` Component

**Files:**
- Create: `components/admin/RecurringScheduleTab.tsx`

- [ ] **Step 1: Buat komponen**

```tsx
// components/admin/RecurringScheduleTab.tsx
'use client'

import { useState, useEffect } from 'react'
import { formatHour } from '@/lib/schedule'
import { CustomSelect } from '@/components/ui/custom-select'
import type { RecurringSchedule, TimeSlot } from '@/lib/types'
import { Plus, Trash2 } from 'lucide-react'

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export function RecurringScheduleTab() {
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([])
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form state
  const [teamName, setTeamName] = useState('')
  const [phone, setPhone] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('1') // Senin default
  const [slotId, setSlotId] = useState('')
  const [customerType, setCustomerType] = useState<'umum' | 'pelajar'>('umum')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/recurring').then(r => r.ok ? r.json() : []),
      fetch('/api/admin/slots').then(r => r.ok ? r.json() : []),
    ]).then(([recs, sl]) => {
      setSchedules(recs)
      const activeSlots = (sl as TimeSlot[]).filter(s => s.is_active)
      setSlots(activeSlots)
      if (activeSlots.length > 0) setSlotId(activeSlots[0].id)
      setLoading(false)
    })
  }, [])

  const handleSubmit = async () => {
    if (!teamName.trim() || !slotId) return
    setSaving(true)
    const res = await fetch('/api/admin/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_name: teamName.trim(),
        phone: phone.trim() || undefined,
        customer_type: customerType,
        time_slot_id: slotId,
        day_of_week: Number(dayOfWeek),
      }),
    })
    if (res.ok) {
      const { schedule } = await res.json()
      setSchedules(prev => [schedule, ...prev])
      setShowForm(false)
      setTeamName('')
      setPhone('')
    }
    setSaving(false)
  }

  const toggleActive = async (schedule: RecurringSchedule) => {
    setTogglingId(schedule.id)
    const res = await fetch(`/api/admin/recurring/${schedule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !schedule.is_active }),
    })
    if (res.ok) {
      const updated = await res.json()
      setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s))
    }
    setTogglingId(null)
  }

  const deleteSchedule = async (schedule: RecurringSchedule) => {
    if (!confirm(`Hapus jadwal tetap "${schedule.team_name}"? Booking yang sudah dibuat tidak akan dihapus.`)) return
    setDeletingId(schedule.id)
    const res = await fetch(`/api/admin/recurring/${schedule.id}`, { method: 'DELETE' })
    if (res.ok) setSchedules(prev => prev.filter(s => s.id !== schedule.id))
    setDeletingId(null)
  }

  if (loading) {
    return <div className="py-12 text-center text-slate-500 text-sm">Memuat...</div>
  }

  return (
    <div className="space-y-3 pb-24">
      {schedules.length === 0 && !showForm && (
        <div className="py-12 text-center text-slate-500 text-sm">
          Belum ada jadwal tetap. Tekan + untuk menambah.
        </div>
      )}

      {schedules.map(s => (
        <div
          key={s.id}
          className={`rounded-2xl border p-4 flex items-center justify-between gap-3 transition-opacity ${
            s.is_active
              ? 'bg-purple-500/8 border-purple-500/20'
              : 'bg-slate-900/50 border-slate-800/50 opacity-60'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-bold text-slate-100">{s.team_name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                s.customer_type === 'pelajar'
                  ? 'bg-blue-500/15 text-blue-400'
                  : 'bg-slate-700/50 text-slate-400'
              }`}>
                {s.customer_type === 'pelajar' ? 'Pelajar' : 'Umum'}
              </span>
              {!s.is_active && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-700/50 text-slate-500">
                  Paused
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              📅 {HARI[s.day_of_week]} · {s.time_slots
                ? `${formatHour(s.time_slots.start_hour)}–${formatHour(s.time_slots.end_hour)}`
                : '–'}
            </div>
            {s.phone && (
              <div className="text-[11px] text-slate-500 mt-0.5">{s.phone}</div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => toggleActive(s)}
              disabled={togglingId === s.id}
              className="relative w-10 h-[22px] rounded-full transition-colors disabled:opacity-40"
              style={{ backgroundColor: s.is_active ? 'rgb(168 85 247 / 0.35)' : 'rgb(51 65 85 / 0.8)' }}
              role="switch"
              aria-checked={s.is_active}
            >
              <span
                className="absolute top-[3px] w-4 h-4 rounded-full transition-all"
                style={{
                  left: s.is_active ? 'calc(100% - 19px)' : '3px',
                  backgroundColor: s.is_active ? '#c084fc' : '#475569',
                }}
              />
            </button>
            <button
              onClick={() => deleteSchedule(s)}
              disabled={deletingId === s.id}
              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-colors"
              title="Hapus jadwal tetap"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}

      {showForm && (
        <div className="rounded-2xl border border-purple-500/25 bg-purple-500/5 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-200">Jadwal Tetap Baru</h3>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nama Tim</label>
            <input
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              placeholder="Nama tim..."
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">No. WhatsApp (opsional)</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0812..."
              type="tel"
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Hari</label>
              <CustomSelect
                value={dayOfWeek}
                onChange={setDayOfWeek}
                options={HARI.map((h, i) => ({ value: String(i), label: h }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Slot Jam</label>
              <CustomSelect
                value={slotId}
                onChange={setSlotId}
                options={slots.map(sl => ({
                  value: sl.id,
                  label: `${formatHour(sl.start_hour)}–${formatHour(sl.end_hour)}`,
                }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Kategori</label>
            <div className="flex gap-2">
              {(['umum', 'pelajar'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setCustomerType(t)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    customerType === t
                      ? t === 'pelajar'
                        ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                        : 'bg-slate-700/60 text-slate-200 ring-1 ring-slate-600/50'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {t === 'umum' ? 'Umum' : 'Pelajar'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={saving || !teamName.trim() || !slotId}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30 hover:bg-purple-500/30 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Menyimpan...' : 'Simpan & Generate 4 Minggu'}
            </button>
            <button
              onClick={() => { setShowForm(false); setTeamName(''); setPhone('') }}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-800/60 text-slate-400 hover:text-slate-200 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-purple-500 text-white shadow-lg hover:bg-purple-400 transition-colors flex items-center justify-center z-50 md:bottom-8 md:right-8"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/RecurringScheduleTab.tsx
git commit -m "feat: add RecurringScheduleTab component"
```

---

## Task 8: Integrasi ke `BookingTable`

**Files:**
- Modify: `components/admin/BookingTable.tsx`

- [ ] **Step 1: Tambah import `RecurringScheduleTab` di bagian atas file**

Tambahkan setelah import Lucide icons:

```typescript
import { RecurringScheduleTab } from '@/components/admin/RecurringScheduleTab'
```

- [ ] **Step 2: Tambah `'recurring'` ke `Filter` type (line 21)**

```typescript
type Filter = 'pending' | 'confirmed' | 'selesai' | 'cancelled' | 'recurring'
```

- [ ] **Step 3: Tambah entry ke `filterConfig` (setelah `cancelled`)**

```typescript
  recurring: { label: 'Jadwal Tetap', color: 'text-purple-400', activeColor: 'bg-purple-500/15 text-purple-400' },
```

- [ ] **Step 4: Tambah `recurring: 0` ke `counts` object (sekitar line 429)**

Cari blok:
```typescript
  const counts = {
    pending: ...,
    confirmed: ...,
    selesai: ...,
    cancelled: ...,
  }
```

Tambah field:
```typescript
    recurring: 0,
```

- [ ] **Step 5: Tambah `'recurring'` ke filter pills array (line 825)**

Ubah:
```typescript
{(['pending', 'confirmed', 'selesai', 'cancelled'] as Filter[]).map(f => (
```
Menjadi:
```typescript
{(['pending', 'confirmed', 'selesai', 'cancelled', 'recurring'] as Filter[]).map(f => (
```

- [ ] **Step 6: Render `RecurringScheduleTab` saat filter === 'recurring'**

Di dalam return JSX, setelah baris yang merender booking list (cari `{isDateGrouped ? (`), tambahkan kondisi di atas blok tersebut:

```typescript
      {filter === 'recurring' && <RecurringScheduleTab />}
      {filter !== 'recurring' && (isDateGrouped ? (
```

Dan tutup parenthesis di akhir blok booking list — wrap existing `{isDateGrouped ? ( ... ) : ( ... )}` dalam kondisi `filter !== 'recurring'`:

Tepatnya, ubah struktur dari:
```typescript
      {/* ── Booking list ── */}
      {isDateGrouped ? (
        ...
      ) : (
        ...
      )}
```

Menjadi:
```typescript
      {/* ── Booking list ── */}
      {filter === 'recurring' ? (
        <RecurringScheduleTab />
      ) : isDateGrouped ? (
        ...
      ) : (
        ...
      )}
```

- [ ] **Step 7: Test di browser**

Buka `http://localhost:3000/admin`. Pastikan:
- Tab "Jadwal Tetap" muncul di filter pills
- Klik tab → tampil halaman kosong dengan FAB "+" di pojok kanan bawah
- Klik "+" → form muncul dengan field Nama Tim, WA, Hari, Slot Jam, Kategori
- Tidak ada TypeScript error di terminal

- [ ] **Step 8: Commit**

```bash
git add components/admin/BookingTable.tsx
git commit -m "feat: add Jadwal Tetap tab to BookingTable"
```

---

## Task 9: End-to-End Test & Push

- [ ] **Step 1: Buat jadwal tetap pertama**

Di browser admin:
1. Klik tab "Jadwal Tetap"
2. Klik FAB "+"
3. Isi: nama tim = "Tim Test", hari = Rabu, slot jam = pilih satu, kategori = Umum
4. Klik "Simpan & Generate 4 Minggu"
5. Form menutup, kartu tim muncul di list

- [ ] **Step 2: Verifikasi booking ter-generate di tab Akan Main**

Klik tab "Akan Main". Cari bookings dengan nama "Tim Test" — harus ada (3–4 entri untuk 4 Rabu ke depan). Status harus "Confirmed".

- [ ] **Step 3: Test pause/aktifkan**

Di tab Jadwal Tetap, toggle off "Tim Test" → kartu jadi redup + badge "Paused". Toggle on → kartu kembali aktif.

- [ ] **Step 4: Test hapus**

Klik ikon 🗑 → konfirmasi dialog muncul → klik OK → kartu hilang. Booking yang sudah ter-generate di tab Akan Main tetap ada.

- [ ] **Step 5: Commit & push**

```bash
git push origin main
```

---

## Catatan Implementasi

- `getDatesForDayOfWeek` bekerja murni dengan kalender tanpa timezone (string YYYY-MM-DD diolah sebagai Date lokal). Ini cukup karena `booking_date` di DB adalah date-only field.
- Cron `extend-recurring` menggunakan full 4-week window (bukan hanya minggu ke-4), karena `generateBookingsForSchedule` sudah skip tanggal yang sudah punya booking dari schedule yang sama (`recurring_schedule_id === schedule.id`). Ini lebih robust daripada hanya check minggu ke-4.
- Booking dari jadwal tetap memiliki `voucher_id = null` — admin bisa tambahkan voucher manual via Edit Booking jika perlu.
- Saat admin delete recurring schedule, FK `ON DELETE SET NULL` memastikan `recurring_schedule_id` di bookings yang sudah ada menjadi null (tidak error).
