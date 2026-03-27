# Booking Mini Soccer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 14 mini soccer field booking web app with monthly timetable schedule, WhatsApp booking redirect, and admin panel for managing bookings and time slots.

**Architecture:** Monolith Next.js 14 App Router. Public schedule page uses Server Components for initial data fetch and a Client Component for the interactive timetable grid (sticky time column, horizontal-scrolling date columns). Booking: user clicks slot → modal → POST /api/bookings (status: pending, blocks slot immediately) → redirect to WhatsApp. Admin pages: Server Components + client mutation calls to /api/admin/* routes protected by Supabase Auth middleware.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase (`@supabase/ssr` + `@supabase/supabase-js`), Vitest, Vercel

---

## File Structure

```
booking-minisoccer/
├── app/
│   ├── layout.tsx                         # Root layout (Inter font, metadata)
│   ├── page.tsx                           # Landing page
│   ├── globals.css
│   ├── jadwal/
│   │   └── page.tsx                       # Schedule page (Server Component)
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx                   # Admin login (Client Component)
│   │   ├── page.tsx                       # Admin dashboard (Server Component)
│   │   └── slots/
│   │       └── page.tsx                   # Slot management (Server Component)
│   └── api/
│       ├── schedule/
│       │   └── route.ts                   # GET ?year&month → slots+bookings+blocked
│       ├── bookings/
│       │   └── route.ts                   # POST create booking
│       └── admin/
│           ├── bookings/[id]/
│           │   └── route.ts               # PATCH update booking status
│           ├── slots/
│           │   ├── route.ts               # GET all slots
│           │   └── [id]/route.ts          # PATCH update slot price/active
│           └── blocked-dates/
│               ├── route.ts               # GET list, POST create
│               └── [id]/route.ts          # DELETE remove
├── components/
│   ├── schedule/
│   │   ├── ScheduleGrid.tsx               # Interactive timetable (Client Component)
│   │   └── BookingModal.tsx               # Booking form modal (Client Component)
│   └── admin/
│       ├── BookingTable.tsx               # Booking list + filter + confirm/cancel
│       ├── SlotManager.tsx                # Slot price/active editor
│       └── BlockDateManager.tsx           # Blocked date CRUD
├── lib/
│   ├── types.ts                           # Shared TypeScript interfaces
│   ├── schedule.ts                        # Pure functions: getSlotStatus, getDaysInMonth, formatters
│   ├── booking.ts                         # buildWAUrl, formatDateLabel
│   ├── utils.ts                           # cn() from shadcn
│   └── supabase/
│       ├── client.ts                      # Browser client (createBrowserClient)
│       ├── server.ts                      # Server client (createServerClient + getServerSession)
│       └── admin.ts                       # Service role client (bypasses RLS)
├── middleware.ts                           # Protect /admin/* routes
├── vitest.config.ts
└── supabase/
    └── migrations/
        └── 001_initial.sql
```

---

## Task 1: Project Setup

**Files:**
- Create: `package.json` (via npx)
- Create: `vitest.config.ts`
- Create: `.env.local`

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd /Users/zains/Projects/Booking-minisoccer
npx create-next-app@14 . --typescript --tailwind --app --src-dir=no --import-alias="@/*" --eslint
```

When prompted, confirm overwriting the workspace file.

- [ ] **Step 2: Install Supabase + animation packages**

```bash
npm install @supabase/supabase-js @supabase/ssr tailwindcss-animate class-variance-authority clsx tailwind-merge lucide-react
```

- [ ] **Step 3: Install Vitest**

```bash
npm install -D vitest @vitejs/plugin-react
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 5: Add test script to package.json**

Edit `package.json` scripts section:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 6: Init shadcn/ui**

```bash
npx shadcn@latest init
```

Choose: Default style, Slate base color, yes to CSS variables.

- [ ] **Step 7: Add required shadcn components**

```bash
npx shadcn@latest add button badge input label dialog tabs
```

- [ ] **Step 8: Create .env.local**

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_ADMIN_WA_NUMBER=6281400842380
EOF
```

Fill in actual Supabase project values from https://supabase.com/dashboard.

- [ ] **Step 9: Verify setup**

```bash
npm run dev
```

Expected: Server starts at http://localhost:3000 with default Next.js page.

- [ ] **Step 10: Commit**

```bash
git init
git add .
git commit -m "feat: initial Next.js 14 project setup with shadcn/ui and Supabase"
```

---

## Task 2: Database Schema

**Files:**
- Create: `supabase/migrations/001_initial.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/001_initial.sql

-- Time slots: template of daily operating hours
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_hour INT NOT NULL CHECK (start_hour >= 0 AND start_hour < 24),
  end_hour INT NOT NULL CHECK (end_hour > start_hour AND end_hour <= 24),
  price INT NOT NULL CHECK (price > 0),
  is_active BOOL NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bookings: one row per booking request
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL,
  booking_date DATE NOT NULL,
  time_slot_id UUID NOT NULL REFERENCES time_slots(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blocked dates: admin blocks a day or specific slot
CREATE TABLE blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time_slot_id UUID REFERENCES time_slots(id), -- NULL = full day block
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_bookings_date_slot ON bookings(booking_date, time_slot_id);
CREATE INDEX idx_blocked_dates_date ON blocked_dates(date);

-- Row Level Security
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

-- time_slots: public read
CREATE POLICY "time_slots_public_read" ON time_slots
  FOR SELECT USING (true);

-- bookings: public can read (needed for schedule display) and insert pending only
CREATE POLICY "bookings_public_read" ON bookings
  FOR SELECT USING (true);

CREATE POLICY "bookings_public_insert_pending" ON bookings
  FOR INSERT WITH CHECK (status = 'pending');

-- blocked_dates: public read
CREATE POLICY "blocked_dates_public_read" ON blocked_dates
  FOR SELECT USING (true);

-- Seed: default time slots 08:00 - 22:00
INSERT INTO time_slots (start_hour, end_hour, price) VALUES
  (8,  9,  80000),
  (9,  10, 80000),
  (10, 11, 80000),
  (11, 12, 80000),
  (12, 13, 90000),
  (13, 14, 90000),
  (14, 15, 90000),
  (15, 16, 90000),
  (16, 17, 100000),
  (17, 18, 100000),
  (18, 19, 100000),
  (19, 20, 100000),
  (20, 21, 120000),
  (21, 22, 120000);
```

- [ ] **Step 2: Run migration in Supabase dashboard**

Go to Supabase Dashboard → SQL Editor → paste the content of `supabase/migrations/001_initial.sql` → Run.

Verify: Tables `time_slots`, `bookings`, `blocked_dates` created. `time_slots` has 14 rows of seed data.

- [ ] **Step 3: Create admin user in Supabase Auth**

Go to Supabase Dashboard → Authentication → Users → Add user.
Enter email and password for the admin account.

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: database schema with RLS policies and seed time slots"
```

---

## Task 3: Core Types & Supabase Clients

**Files:**
- Create: `lib/types.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admin.ts`

- [ ] **Step 1: Create shared types**

```typescript
// lib/types.ts
export interface TimeSlot {
  id: string
  start_hour: number
  end_hour: number
  price: number
  is_active: boolean
  created_at: string
}

export interface Booking {
  id: string
  team_name: string
  booking_date: string   // 'YYYY-MM-DD'
  time_slot_id: string
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: string
}

export interface BlockedDate {
  id: string
  date: string           // 'YYYY-MM-DD'
  time_slot_id: string | null  // null = full day block
  reason: string | null
  created_at: string
}

export type SlotStatus = 'available' | 'pending' | 'confirmed' | 'blocked' | 'past'

export interface ScheduleData {
  slots: TimeSlot[]
  bookings: Booking[]
  blockedDates: BlockedDate[]
}

export type BookingWithSlot = Booking & { time_slots: TimeSlot }
```

- [ ] **Step 2: Create browser Supabase client**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Create server Supabase client**

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function getServerSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
```

- [ ] **Step 4: Create service role (admin) client**

```typescript
// lib/supabase/admin.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/
git commit -m "feat: shared types and Supabase client helpers"
```

---

## Task 4: Schedule Logic (TDD)

**Files:**
- Create: `lib/schedule.ts`
- Create: `lib/__tests__/schedule.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// lib/__tests__/schedule.test.ts
import { describe, it, expect } from 'vitest'
import {
  getSlotStatus,
  getDaysInMonth,
  formatHour,
  formatPrice,
  formatDayHeader,
  toDateString,
} from '../schedule'
import type { TimeSlot, Booking, BlockedDate } from '../types'

const slot: TimeSlot = {
  id: 'slot-1',
  start_hour: 9,
  end_hour: 10,
  price: 80000,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

describe('getSlotStatus', () => {
  it('returns past for date before today', () => {
    const { status } = getSlotStatus(slot, '2024-01-01', [], [], '2026-03-27')
    expect(status).toBe('past')
  })

  it('returns available for future unblocked unbooked slot', () => {
    const { status } = getSlotStatus(slot, '2026-03-28', [], [], '2026-03-27')
    expect(status).toBe('available')
  })

  it('returns blocked for full-day block (time_slot_id null)', () => {
    const blocked: BlockedDate[] = [
      { id: 'b1', date: '2026-03-28', time_slot_id: null, reason: null, created_at: '' },
    ]
    const { status } = getSlotStatus(slot, '2026-03-28', [], blocked, '2026-03-27')
    expect(status).toBe('blocked')
  })

  it('returns blocked for slot-specific block', () => {
    const blocked: BlockedDate[] = [
      { id: 'b1', date: '2026-03-28', time_slot_id: 'slot-1', reason: null, created_at: '' },
    ]
    const { status } = getSlotStatus(slot, '2026-03-28', [], blocked, '2026-03-27')
    expect(status).toBe('blocked')
  })

  it('returns available when a different slot is blocked on same date', () => {
    const blocked: BlockedDate[] = [
      { id: 'b1', date: '2026-03-28', time_slot_id: 'slot-99', reason: null, created_at: '' },
    ]
    const { status } = getSlotStatus(slot, '2026-03-28', [], blocked, '2026-03-27')
    expect(status).toBe('available')
  })

  it('returns pending for a pending booking', () => {
    const bookings: Booking[] = [
      { id: 'bk1', team_name: 'A', booking_date: '2026-03-28', time_slot_id: 'slot-1', status: 'pending', created_at: '' },
    ]
    const { status, bookingId } = getSlotStatus(slot, '2026-03-28', bookings, [], '2026-03-27')
    expect(status).toBe('pending')
    expect(bookingId).toBe('bk1')
  })

  it('returns confirmed for a confirmed booking', () => {
    const bookings: Booking[] = [
      { id: 'bk1', team_name: 'A', booking_date: '2026-03-28', time_slot_id: 'slot-1', status: 'confirmed', created_at: '' },
    ]
    const { status } = getSlotStatus(slot, '2026-03-28', bookings, [], '2026-03-27')
    expect(status).toBe('confirmed')
  })

  it('returns available when booking is cancelled (slot freed)', () => {
    const bookings: Booking[] = [
      { id: 'bk1', team_name: 'A', booking_date: '2026-03-28', time_slot_id: 'slot-1', status: 'cancelled', created_at: '' },
    ]
    const { status } = getSlotStatus(slot, '2026-03-28', bookings, [], '2026-03-27')
    expect(status).toBe('available')
  })

  it('blocked takes precedence over booking check', () => {
    const blocked: BlockedDate[] = [
      { id: 'b1', date: '2026-03-28', time_slot_id: null, reason: null, created_at: '' },
    ]
    const bookings: Booking[] = [
      { id: 'bk1', team_name: 'A', booking_date: '2026-03-28', time_slot_id: 'slot-1', status: 'pending', created_at: '' },
    ]
    const { status } = getSlotStatus(slot, '2026-03-28', bookings, blocked, '2026-03-27')
    expect(status).toBe('blocked')
  })
})

describe('getDaysInMonth', () => {
  it('returns 31 days for March 2026', () => {
    expect(getDaysInMonth(2026, 3)).toHaveLength(31)
  })

  it('returns 28 days for February 2026 (non-leap)', () => {
    expect(getDaysInMonth(2026, 2)).toHaveLength(28)
  })

  it('returns 29 days for February 2024 (leap year)', () => {
    expect(getDaysInMonth(2024, 2)).toHaveLength(29)
  })

  it('first element of March 2026 is March 1', () => {
    const days = getDaysInMonth(2026, 3)
    expect(days[0].getDate()).toBe(1)
    expect(days[0].getMonth()).toBe(2) // 0-indexed
  })
})

describe('formatHour', () => {
  it('pads single-digit hour with zero', () => {
    expect(formatHour(8)).toBe('08:00')
  })

  it('does not pad two-digit hour', () => {
    expect(formatHour(14)).toBe('14:00')
  })
})

describe('formatPrice', () => {
  it('formats price with Rp prefix', () => {
    const result = formatPrice(80000)
    expect(result).toContain('Rp')
    expect(result).toContain('80')
  })

  it('formats 120000 correctly', () => {
    const result = formatPrice(120000)
    expect(result).toContain('120')
  })
})

describe('toDateString', () => {
  it('returns YYYY-MM-DD from a Date object', () => {
    const d = new Date(2026, 2, 27) // March 27 2026
    expect(toDateString(d)).toBe('2026-03-27')
  })
})

describe('formatDayHeader', () => {
  it('returns abbreviated Indonesian day name with date number', () => {
    const sunday = new Date(2026, 2, 1) // March 1, 2026 is Sunday
    expect(formatDayHeader(sunday)).toBe('Min 1')
  })

  it('returns Sen for Monday', () => {
    const monday = new Date(2026, 2, 2) // March 2, 2026 is Monday
    expect(formatDayHeader(monday)).toBe('Sen 2')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: FAIL — "Cannot find module '../schedule'"

- [ ] **Step 3: Implement lib/schedule.ts**

```typescript
// lib/schedule.ts
import type { TimeSlot, Booking, BlockedDate, SlotStatus } from './types'

export function getSlotStatus(
  slot: TimeSlot,
  date: string,
  bookings: Booking[],
  blockedDates: BlockedDate[],
  todayStr: string
): { status: SlotStatus; bookingId?: string } {
  // 1. Past check
  if (date < todayStr) return { status: 'past' }
  if (date === todayStr) {
    const nowHour = new Date().getHours()
    if (slot.end_hour <= nowHour) return { status: 'past' }
  }

  // 2. Blocked check (full-day or slot-specific)
  const isBlocked = blockedDates.some(
    bd => bd.date === date && (bd.time_slot_id === null || bd.time_slot_id === slot.id)
  )
  if (isBlocked) return { status: 'blocked' }

  // 3. Booking check (ignore cancelled)
  const booking = bookings.find(
    b => b.booking_date === date && b.time_slot_id === slot.id && b.status !== 'cancelled'
  )
  if (booking) {
    return { status: booking.status as 'pending' | 'confirmed', bookingId: booking.id }
  }

  return { status: 'available' }
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const date = new Date(year, month - 1, 1)
  while (date.getMonth() === month - 1) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

export function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function formatDayHeader(date: Date): string {
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  return `${days[date.getDay()]} ${date.getDate()}`
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price)
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected: All 16 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/schedule.ts lib/__tests__/schedule.test.ts
git commit -m "feat: schedule logic with getSlotStatus and date/format helpers (TDD)"
```

---

## Task 5: Booking Logic (TDD)

**Files:**
- Create: `lib/booking.ts`
- Create: `lib/__tests__/booking.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// lib/__tests__/booking.test.ts
import { describe, it, expect } from 'vitest'
import { buildWAUrl, formatDateLabel } from '../booking'

describe('buildWAUrl', () => {
  it('returns a wa.me URL with the correct phone number', () => {
    const url = buildWAUrl({
      teamName: 'Tim Garuda',
      dateLabel: 'Rabu, 27 Mar 2026',
      startHour: 9,
      endHour: 10,
      price: 80000,
      waNumber: '6281400842380',
    })
    expect(url).toMatch(/^https:\/\/wa\.me\/6281400842380/)
  })

  it('encodes the message as a query param', () => {
    const url = buildWAUrl({
      teamName: 'Tim Garuda',
      dateLabel: 'Rabu, 27 Mar 2026',
      startHour: 9,
      endHour: 10,
      price: 80000,
      waNumber: '6281400842380',
    })
    expect(url).toContain('?text=')
    expect(url).toContain('Tim%20Garuda')
  })

  it('pads single-digit hours in the time range', () => {
    const url = buildWAUrl({
      teamName: 'T',
      dateLabel: 'Sen, 30 Mar 2026',
      startHour: 8,
      endHour: 9,
      price: 80000,
      waNumber: '6281400842380',
    })
    // 08:00-09:00 encoded is 08%3A00-09%3A00
    expect(url).toContain('08%3A00-09%3A00')
  })

  it('includes Rp price in the message', () => {
    const url = buildWAUrl({
      teamName: 'T',
      dateLabel: 'Sab, 28 Mar 2026',
      startHour: 20,
      endHour: 21,
      price: 120000,
      waNumber: '6281400842380',
    })
    expect(url).toContain('Rp')
    expect(url).toContain('120')
  })
})

describe('formatDateLabel', () => {
  it('returns a human-readable Indonesian date string', () => {
    const d = new Date(2026, 2, 27) // March 27, 2026
    const label = formatDateLabel(d)
    expect(label).toContain('2026')
    expect(label.length).toBeGreaterThan(5)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: FAIL — "Cannot find module '../booking'"

- [ ] **Step 3: Implement lib/booking.ts**

```typescript
// lib/booking.ts

export function buildWAUrl(params: {
  teamName: string
  dateLabel: string
  startHour: number
  endHour: number
  price: number
  waNumber: string
}): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const timeRange = `${pad(params.startHour)}:00-${pad(params.endHour)}:00`
  const priceFormatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(params.price)

  const message = [
    'Halo Admin MiniSoccer!',
    'Saya ingin booking lapangan.',
    '',
    `Nama Tim: ${params.teamName}`,
    `Tanggal: ${params.dateLabel}`,
    `Jam: ${timeRange}`,
    `Harga: ${priceFormatted}`,
    '',
    'Mohon konfirmasi ketersediaan. Terima kasih!',
  ].join('\n')

  return `https://wa.me/${params.waNumber}?text=${encodeURIComponent(message)}`
}

export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/booking.ts lib/__tests__/booking.test.ts
git commit -m "feat: booking WA URL builder and date formatter (TDD)"
```

---

## Task 6: Middleware (Admin Auth Protection)

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create middleware.ts**

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '!/admin/login'],
}
```

- [ ] **Step 2: Verify middleware matcher syntax**

The matcher above has a bug — Next.js matchers use regex, not negation prefix. Replace with:

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Skip login page
  if (request.nextUrl.pathname === '/admin/login') {
    return NextResponse.next()
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: Next.js middleware protecting /admin/* routes"
```

---

## Task 7: API Routes — Public Schedule & Booking

**Files:**
- Create: `app/api/schedule/route.ts`
- Create: `app/api/bookings/route.ts`

- [ ] **Step 1: Create GET /api/schedule**

```typescript
// app/api/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
  }

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const supabase = createClient()

  const [slotsRes, bookingsRes, blockedRes] = await Promise.all([
    supabase
      .from('time_slots')
      .select('*')
      .eq('is_active', true)
      .order('start_hour'),
    supabase
      .from('bookings')
      .select('*')
      .gte('booking_date', startDate)
      .lte('booking_date', endDate),
    supabase
      .from('blocked_dates')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate),
  ])

  if (slotsRes.error || bookingsRes.error || blockedRes.error) {
    return NextResponse.json({ error: 'Failed to fetch schedule data' }, { status: 500 })
  }

  return NextResponse.json({
    slots: slotsRes.data,
    bookings: bookingsRes.data,
    blockedDates: blockedRes.data,
  })
}
```

- [ ] **Step 2: Create POST /api/bookings**

```typescript
// app/api/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { team_name, booking_date, time_slot_id } = body as Record<string, string>

  if (!team_name?.trim() || !booking_date || !time_slot_id) {
    return NextResponse.json(
      { error: 'team_name, booking_date, and time_slot_id are required' },
      { status: 400 }
    )
  }

  const supabase = createClient()

  // Guard against double-booking: check for existing non-cancelled booking
  const { data: existing } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('booking_date', booking_date)
    .eq('time_slot_id', time_slot_id)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'Slot is already booked or pending' },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      team_name: team_name.trim(),
      booking_date,
      time_slot_id,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/
git commit -m "feat: public API routes for schedule fetch and booking creation"
```

---

## Task 8: API Routes — Admin

**Files:**
- Create: `app/api/admin/bookings/[id]/route.ts`
- Create: `app/api/admin/slots/route.ts`
- Create: `app/api/admin/slots/[id]/route.ts`
- Create: `app/api/admin/blocked-dates/route.ts`
- Create: `app/api/admin/blocked-dates/[id]/route.ts`

- [ ] **Step 1: Create auth helper for admin routes**

Add to `lib/supabase/server.ts` (append at the end):

```typescript
// Add to lib/supabase/server.ts
export async function requireAdminSession(): Promise<Response | null> {
  const session = await getServerSession()
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return null
}
```

- [ ] **Step 2: PATCH /api/admin/bookings/[id]**

```typescript
// app/api/admin/bookings/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdminSession()
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { status } = body as { status: string }
  if (!['confirmed', 'cancelled'].includes(status)) {
    return NextResponse.json(
      { error: 'status must be confirmed or cancelled' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

- [ ] **Step 3: GET + PATCH /api/admin/slots**

```typescript
// app/api/admin/slots/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const authError = await requireAdminSession()
  if (authError) return authError

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('time_slots')
    .select('*')
    .order('start_hour')

  if (error) return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 })
  return NextResponse.json(data)
}
```

```typescript
// app/api/admin/slots/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdminSession()
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates = body as { price?: number; is_active?: boolean }

  // Only allow price and is_active updates
  const allowed: Record<string, unknown> = {}
  if (updates.price !== undefined) {
    if (typeof updates.price !== 'number' || updates.price <= 0) {
      return NextResponse.json({ error: 'price must be a positive number' }, { status: 400 })
    }
    allowed.price = updates.price
  }
  if (updates.is_active !== undefined) {
    allowed.is_active = Boolean(updates.is_active)
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('time_slots')
    .update(allowed)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to update slot' }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 4: GET + POST /api/admin/blocked-dates and DELETE**

```typescript
// app/api/admin/blocked-dates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const authError = await requireAdminSession()
  if (authError) return authError

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blocked_dates')
    .select('*')
    .order('date')

  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminSession()
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { date, time_slot_id, reason } = body as {
    date: string
    time_slot_id?: string | null
    reason?: string
  }

  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blocked_dates')
    .insert({ date, time_slot_id: time_slot_id ?? null, reason: reason ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

```typescript
// app/api/admin/blocked-dates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdminSession()
  if (authError) return authError

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('blocked_dates')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/
git commit -m "feat: admin API routes for bookings, slots, and blocked-dates"
```

---

## Task 9: ScheduleGrid Component

**Files:**
- Create: `components/schedule/ScheduleGrid.tsx`

- [ ] **Step 1: Create ScheduleGrid.tsx**

```tsx
// components/schedule/ScheduleGrid.tsx
'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  getSlotStatus,
  getDaysInMonth,
  toDateString,
  formatHour,
  formatPrice,
  formatDayHeader,
} from '@/lib/schedule'
import type { TimeSlot, ScheduleData, SlotStatus } from '@/lib/types'
import { BookingModal } from './BookingModal'

interface SelectedSlot {
  slot: TimeSlot
  date: Date
}

interface ScheduleGridProps {
  initialData: ScheduleData
  initialYear: number
  initialMonth: number
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export function ScheduleGrid({ initialData, initialYear, initialMonth }: ScheduleGridProps) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [data, setData] = useState<ScheduleData>(initialData)
  const [loading, setLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null)

  const today = new Date()
  const todayStr = toDateString(today)
  const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const days = getDaysInMonth(year, month)

  const handleMonthChange = useCallback(
    async (direction: 1 | -1) => {
      let ny = year
      let nm = month + direction
      if (nm > 12) { nm = 1; ny++ }
      if (nm < 1) { nm = 12; ny-- }

      const targetYM = `${ny}-${String(nm).padStart(2, '0')}`
      if (targetYM < currentYM) return

      setLoading(true)
      try {
        const res = await fetch(`/api/schedule?year=${ny}&month=${nm}`)
        const newData: ScheduleData = await res.json()
        setData(newData)
        setYear(ny)
        setMonth(nm)
      } finally {
        setLoading(false)
      }
    },
    [year, month, currentYM]
  )

  const handleBookingSuccess = useCallback(
    (bookingId: string) => {
      if (!selectedSlot) return
      const newBooking = {
        id: bookingId,
        team_name: '',
        booking_date: toDateString(selectedSlot.date),
        time_slot_id: selectedSlot.slot.id,
        status: 'pending' as const,
        created_at: new Date().toISOString(),
      }
      setData(prev => ({ ...prev, bookings: [...prev.bookings, newBooking] }))
      setSelectedSlot(null)
    },
    [selectedSlot]
  )

  const thisYM = `${year}-${String(month).padStart(2, '0')}`
  const isPrevDisabled = thisYM <= currentYM

  return (
    <div className="flex flex-col gap-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => handleMonthChange(-1)}
          disabled={isPrevDisabled}
          aria-label="Bulan sebelumnya"
          className="w-9 h-9 flex items-center justify-center rounded-full text-xl text-slate-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ‹
        </button>
        <h2 className="text-xl font-bold text-slate-800">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <button
          onClick={() => handleMonthChange(1)}
          aria-label="Bulan berikutnya"
          className="w-9 h-9 flex items-center justify-center rounded-full text-xl text-slate-600 hover:bg-gray-100 transition-colors"
        >
          ›
        </button>
      </div>

      {/* Timetable */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Memuat jadwal...
          </div>
        ) : (
          <table className="border-collapse min-w-max w-full">
            <thead>
              <tr>
                {/* Sticky jam header cell */}
                <th className="sticky left-0 z-20 bg-white min-w-[88px] px-3 py-2.5 border-b border-r border-gray-200 text-xs text-gray-400 font-normal text-center">
                  Jam
                </th>
                {days.map(day => {
                  const dateStr = toDateString(day)
                  const isToday = dateStr === todayStr
                  return (
                    <th
                      key={dateStr}
                      className={cn(
                        'min-w-[104px] px-2 py-2.5 border-b border-r border-gray-200 text-xs font-semibold text-center',
                        isToday
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-slate-600'
                      )}
                    >
                      {formatDayHeader(day)}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {data.slots.map(slot => (
                <tr key={slot.id}>
                  {/* Sticky jam column */}
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 border-b border-r border-gray-200 text-xs text-gray-500 text-center whitespace-nowrap">
                    {formatHour(slot.start_hour)}–{formatHour(slot.end_hour)}
                  </td>
                  {days.map(day => {
                    const dateStr = toDateString(day)
                    const { status } = getSlotStatus(
                      slot,
                      dateStr,
                      data.bookings,
                      data.blockedDates,
                      todayStr
                    )
                    return (
                      <SlotCell
                        key={dateStr}
                        status={status}
                        price={slot.price}
                        onClick={
                          status === 'available'
                            ? () => setSelectedSlot({ slot, date: day })
                            : undefined
                        }
                      />
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-1 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-white border border-blue-300" />
          Tersedia
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-500" />
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-300" />
          Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-300" />
          Tutup
        </span>
      </div>

      {/* Booking Modal */}
      {selectedSlot && (
        <BookingModal
          slot={selectedSlot.slot}
          date={selectedSlot.date}
          isOpen
          onClose={() => setSelectedSlot(null)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  )
}

function SlotCell({
  status,
  price,
  onClick,
}: {
  status: SlotStatus
  price: number
  onClick?: () => void
}) {
  const base = 'px-2 py-2 border-b border-r border-gray-200 text-center text-xs font-medium h-[52px] min-w-[104px] align-middle'

  const variants: Record<SlotStatus, string> = {
    available: 'bg-white text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors',
    pending: 'bg-yellow-50 text-yellow-700 cursor-not-allowed',
    confirmed: 'bg-blue-500 text-white cursor-not-allowed',
    blocked: 'bg-gray-100 text-gray-400 cursor-not-allowed',
    past: 'bg-gray-50 text-gray-300 cursor-not-allowed',
  }

  const labels: Partial<Record<SlotStatus, string>> = {
    pending: 'PENDING',
    confirmed: 'BOOKED',
    blocked: 'TUTUP',
    past: '—',
  }

  return (
    <td className={cn(base, variants[status])} onClick={onClick}>
      {status === 'available' ? formatPrice(price) : labels[status]}
    </td>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/schedule/ScheduleGrid.tsx
git commit -m "feat: ScheduleGrid timetable component with sticky jam column"
```

---

## Task 10: BookingModal Component

**Files:**
- Create: `components/schedule/BookingModal.tsx`

- [ ] **Step 1: Create BookingModal.tsx**

```tsx
// components/schedule/BookingModal.tsx
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { buildWAUrl, formatDateLabel } from '@/lib/booking'
import { formatHour, formatPrice } from '@/lib/schedule'
import type { TimeSlot } from '@/lib/types'

interface BookingModalProps {
  slot: TimeSlot
  date: Date
  isOpen: boolean
  onClose: () => void
  onSuccess: (bookingId: string) => void
}

export function BookingModal({
  slot,
  date,
  isOpen,
  onClose,
  onSuccess,
}: BookingModalProps) {
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClose = () => {
    setTeamName('')
    setError('')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) {
      setError('Nama tim wajib diisi')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_name: teamName.trim(),
          booking_date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
          time_slot_id: slot.id,
        }),
      })

      if (res.status === 409) {
        setError('Slot ini sudah dipesan. Silakan pilih slot lain.')
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError('Gagal membuat booking. Silakan coba lagi.')
        setLoading(false)
        return
      }

      const booking = await res.json()
      onSuccess(booking.id)

      const waUrl = buildWAUrl({
        teamName: teamName.trim(),
        dateLabel: formatDateLabel(date),
        startHour: slot.start_hour,
        endHour: slot.end_hour,
        price: slot.price,
        waNumber: process.env.NEXT_PUBLIC_ADMIN_WA_NUMBER!,
      })
      window.open(waUrl, '_blank')

      setTeamName('')
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.')
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">
            Booking Lapangan
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {/* Team Name Input */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-name" className="text-sm font-medium text-slate-600">
              Nama Tim
            </Label>
            <Input
              id="team-name"
              placeholder="Masukkan nama tim..."
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              className="rounded-xl border-gray-200 focus:border-blue-400"
              autoFocus
            />
          </div>

          {/* Booking Details */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <DetailRow label="Tanggal" value={formatDateLabel(date)} />
            <DetailRow
              label="Jam"
              value={`${formatHour(slot.start_hour)} – ${formatHour(slot.end_hour)}`}
            />
            <DetailRow
              label="Harga"
              value={formatPrice(slot.price)}
              valueClassName="font-bold text-blue-600"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 -mt-1">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 rounded-full border-gray-200"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              {loading ? 'Memproses...' : '📱 Booking via WhatsApp'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DetailRow({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium text-slate-800 ${valueClassName ?? ''}`}>{value}</span>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/schedule/BookingModal.tsx
git commit -m "feat: BookingModal form with WA redirect"
```

---

## Task 11: Schedule Page & Layout

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `app/jadwal/page.tsx`

- [ ] **Step 1: Update root layout with Inter font**

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Booking Mini Soccer',
  description: 'Booking lapangan mini soccer online',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-gray-50 text-slate-800`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Create schedule page (Server Component)**

```tsx
// app/jadwal/page.tsx
import { createClient } from '@/lib/supabase/server'
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid'
import Link from 'next/link'

export default async function JadwalPage() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const supabase = createClient()

  const [slotsRes, bookingsRes, blockedRes] = await Promise.all([
    supabase.from('time_slots').select('*').eq('is_active', true).order('start_hour'),
    supabase.from('bookings').select('*').gte('booking_date', startDate).lte('booking_date', endDate),
    supabase.from('blocked_dates').select('*').gte('date', startDate).lte('date', endDate),
  ])

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-lg text-blue-500">
            ⚽ MiniSoccer
          </Link>
          <span className="text-sm text-gray-500">Jadwal &amp; Booking</span>
        </div>
      </nav>

      <div className="max-w-screen-xl mx-auto py-6 px-4">
        <ScheduleGrid
          initialData={{
            slots: slotsRes.data ?? [],
            bookings: bookingsRes.data ?? [],
            blockedDates: blockedRes.data ?? [],
          }}
          initialYear={year}
          initialMonth={month}
        />
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx app/globals.css app/jadwal/
git commit -m "feat: schedule page with ScheduleGrid and sticky navbar"
```

---

## Task 12: Landing Page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Create landing page**

```tsx
// app/page.tsx
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-screen-xl mx-auto">
          <span className="font-bold text-lg text-blue-500">⚽ MiniSoccer</span>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-lg">
          ⚽
        </div>
        <h1 className="text-4xl font-bold text-slate-800 mb-3">
          Booking Lapangan<br />Mini Soccer
        </h1>
        <p className="text-gray-500 max-w-sm mb-8 text-lg">
          Cek jadwal kosong dan booking lapangan dalam hitungan detik. Konfirmasi via WhatsApp.
        </p>
        <Link
          href="/jadwal"
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3.5 rounded-full transition-colors text-base shadow-sm"
        >
          Lihat Jadwal
        </Link>
      </div>

      {/* Info Cards */}
      <div className="max-w-screen-md mx-auto w-full px-4 pb-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: '📅', title: 'Jadwal Real-time', desc: 'Lihat ketersediaan slot langsung.' },
          { icon: '📱', title: 'Booking via WA', desc: 'Konfirmasi mudah lewat WhatsApp.' },
          { icon: '✅', title: 'DP & Konfirmasi', desc: 'Admin proses DP dan konfirmasi cepat.' },
        ].map(card => (
          <div key={card.title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="text-2xl mb-2">{card.icon}</div>
            <h3 className="font-semibold text-slate-800 mb-1">{card.title}</h3>
            <p className="text-sm text-gray-500">{card.desc}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: landing page with hero and feature cards"
```

---

## Task 13: Admin Login Page

**Files:**
- Create: `app/admin/login/page.tsx`

- [ ] **Step 1: Create admin login page (Client Component)**

```tsx
// app/admin/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError('Email atau password salah')
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⚽</div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Login</h1>
          <p className="text-sm text-gray-500 mt-1">MiniSoccer Dashboard</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-600">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="rounded-xl border-gray-200"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-600">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="rounded-xl border-gray-200"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="rounded-full bg-blue-500 hover:bg-blue-600 mt-2"
            >
              {loading ? 'Masuk...' : 'Masuk'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/login/
git commit -m "feat: admin login page with Supabase Auth"
```

---

## Task 14: Admin Dashboard — BookingTable

**Files:**
- Create: `components/admin/BookingTable.tsx`
- Create: `app/admin/page.tsx`

- [ ] **Step 1: Create BookingTable component**

```tsx
// components/admin/BookingTable.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatHour, formatPrice } from '@/lib/schedule'
import type { BookingWithSlot } from '@/lib/types'

type Filter = 'all' | 'pending' | 'confirmed' | 'cancelled'

export function BookingTable({ initialBookings }: { initialBookings: BookingWithSlot[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const router = useRouter()

  const filtered = initialBookings.filter(
    b => filter === 'all' || b.status === filter
  )

  const updateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    setLoadingId(id)
    await fetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLoadingId(null)
    router.refresh()
  }

  const filterLabels: Record<Filter, string> = {
    all: 'Semua',
    pending: 'Pending',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
  }

  const statusBadge = (status: string) => {
    if (status === 'pending')
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-0">Pending</Badge>
    if (status === 'confirmed')
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">Confirmed</Badge>
    return <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 border-0">Cancelled</Badge>
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Filter tabs */}
      <div className="flex gap-2 p-4 border-b border-gray-100">
        {(['all', 'pending', 'confirmed', 'cancelled'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Tanggal', 'Jam', 'Nama Tim', 'Harga', 'Status', 'Aksi'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                  Tidak ada booking
                </td>
              </tr>
            )}
            {filtered.map(booking => (
              <tr key={booking.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-700">{booking.booking_date}</td>
                <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                  {booking.time_slots
                    ? `${formatHour(booking.time_slots.start_hour)}–${formatHour(booking.time_slots.end_hour)}`
                    : '–'}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-slate-800">{booking.team_name}</td>
                <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                  {booking.time_slots ? formatPrice(booking.time_slots.price) : '–'}
                </td>
                <td className="px-4 py-3">{statusBadge(booking.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {booking.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(booking.id, 'confirmed')}
                        disabled={loadingId === booking.id}
                        className="rounded-full h-7 px-3 text-xs bg-green-500 hover:bg-green-600"
                      >
                        Confirm
                      </Button>
                    )}
                    {booking.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(booking.id, 'cancelled')}
                        disabled={loadingId === booking.id}
                        className="rounded-full h-7 px-3 text-xs text-red-500 border-red-200 hover:bg-red-50"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create admin dashboard page (Server Component)**

```tsx
// app/admin/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BookingTable } from '@/components/admin/BookingTable'
import type { BookingWithSlot } from '@/lib/types'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/admin/login')

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, time_slots(*)')
    .order('booking_date', { ascending: false })

  const handleSignOut = async () => {
    'use server'
    const supabaseServer = createClient()
    await supabaseServer.auth.signOut()
    redirect('/admin/login')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-screen-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg text-blue-500">⚽ Admin</span>
            <Link href="/admin/slots" className="text-sm text-gray-500 hover:text-blue-500 transition-colors">
              Kelola Slot
            </Link>
          </div>
          <form action={handleSignOut}>
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              Keluar
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-screen-lg mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard Booking</h1>
        <BookingTable initialBookings={(bookings ?? []) as BookingWithSlot[]} />
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/BookingTable.tsx app/admin/page.tsx
git commit -m "feat: admin dashboard with booking table, filter, and confirm/cancel actions"
```

---

## Task 15: Admin Slot & Blocked Date Management

**Files:**
- Create: `components/admin/SlotManager.tsx`
- Create: `components/admin/BlockDateManager.tsx`
- Create: `app/admin/slots/page.tsx`

- [ ] **Step 1: Create SlotManager component**

```tsx
// components/admin/SlotManager.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatHour } from '@/lib/schedule'
import type { TimeSlot } from '@/lib/types'

export function SlotManager({ initialSlots }: { initialSlots: TimeSlot[] }) {
  const [slots, setSlots] = useState(initialSlots)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const router = useRouter()

  const startEdit = (slot: TimeSlot) => {
    setEditingId(slot.id)
    setEditPrice(String(slot.price))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditPrice('')
  }

  const savePrice = async (slotId: string) => {
    const price = parseInt(editPrice)
    if (isNaN(price) || price <= 0) return

    setSavingId(slotId)
    const res = await fetch(`/api/admin/slots/${slotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price }),
    })

    if (res.ok) {
      const updated = await res.json()
      setSlots(prev => prev.map(s => (s.id === slotId ? updated : s)))
      setEditingId(null)
    }
    setSavingId(null)
  }

  const toggleActive = async (slot: TimeSlot) => {
    setSavingId(slot.id)
    const res = await fetch(`/api/admin/slots/${slot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !slot.is_active }),
    })

    if (res.ok) {
      const updated = await res.json()
      setSlots(prev => prev.map(s => (s.id === slot.id ? updated : s)))
    }
    setSavingId(null)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <h2 className="font-semibold text-slate-800">Jam Operasional</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Atur harga per slot dan aktifkan/nonaktifkan slot.
        </p>
      </div>
      <div className="divide-y divide-gray-50">
        {slots.map(slot => (
          <div
            key={slot.id}
            className={`flex items-center justify-between px-4 py-3 ${
              !slot.is_active ? 'opacity-50' : ''
            }`}
          >
            <div className="text-sm font-medium text-slate-700 min-w-[120px]">
              {formatHour(slot.start_hour)} – {formatHour(slot.end_hour)}
            </div>

            {editingId === slot.id ? (
              <div className="flex items-center gap-2 flex-1 justify-center">
                <span className="text-sm text-gray-500">Rp</span>
                <Input
                  type="number"
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value)}
                  className="w-28 h-8 rounded-lg text-sm"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={() => savePrice(slot.id)}
                  disabled={savingId === slot.id}
                  className="h-8 px-3 text-xs rounded-full bg-blue-500 hover:bg-blue-600"
                >
                  Simpan
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelEdit}
                  className="h-8 px-3 text-xs rounded-full"
                >
                  Batal
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-1 justify-center">
                <span className="text-sm font-semibold text-blue-600">
                  Rp {slot.price.toLocaleString('id-ID')}
                </span>
                <button
                  onClick={() => startEdit(slot)}
                  className="text-xs text-gray-400 hover:text-blue-500 transition-colors"
                >
                  Edit
                </button>
              </div>
            )}

            <button
              onClick={() => toggleActive(slot)}
              disabled={savingId === slot.id}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                slot.is_active
                  ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600'
                  : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-600'
              }`}
            >
              {slot.is_active ? 'Aktif' : 'Nonaktif'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create BlockDateManager component**

```tsx
// components/admin/BlockDateManager.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatHour } from '@/lib/schedule'
import type { BlockedDate, TimeSlot } from '@/lib/types'

interface BlockDateManagerProps {
  initialBlocked: BlockedDate[]
  slots: TimeSlot[]
}

export function BlockDateManager({ initialBlocked, slots }: BlockDateManagerProps) {
  const [blocked, setBlocked] = useState(initialBlocked)
  const [date, setDate] = useState('')
  const [blockType, setBlockType] = useState<'full' | 'specific'>('full')
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const addBlock = async () => {
    if (!date) return
    setSaving(true)

    const body: Record<string, unknown> = { date }
    if (blockType === 'specific' && selectedSlotId) {
      body.time_slot_id = selectedSlotId
    }

    const res = await fetch('/api/admin/blocked-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const newBlock: BlockedDate = await res.json()
      setBlocked(prev => [...prev, newBlock])
      setDate('')
      setSelectedSlotId('')
      setBlockType('full')
    }
    setSaving(false)
  }

  const removeBlock = async (id: string) => {
    setDeletingId(id)
    await fetch(`/api/admin/blocked-dates/${id}`, { method: 'DELETE' })
    setBlocked(prev => prev.filter(b => b.id !== id))
    setDeletingId(null)
  }

  const slotLabel = (bd: BlockedDate) => {
    if (!bd.time_slot_id) return 'Seluruh hari'
    const slot = slots.find(s => s.id === bd.time_slot_id)
    return slot ? `${formatHour(slot.start_hour)}–${formatHour(slot.end_hour)}` : '–'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <h2 className="font-semibold text-slate-800">Blokir Tanggal</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Blokir seluruh hari atau jam tertentu agar tidak bisa dipesan.
        </p>
      </div>

      {/* Add block form */}
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="flex gap-3 items-end">
          <div className="flex flex-col gap-1.5 flex-1">
            <Label className="text-xs text-gray-500">Tanggal</Label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="rounded-xl border-gray-200 text-sm h-9"
            />
          </div>
          <Button
            onClick={addBlock}
            disabled={saving || !date}
            className="rounded-full h-9 px-5 text-sm bg-blue-500 hover:bg-blue-600"
          >
            {saving ? 'Menyimpan...' : '+ Blokir'}
          </Button>
        </div>

        {/* Block type */}
        <div className="flex gap-3">
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input
              type="radio"
              name="blockType"
              value="full"
              checked={blockType === 'full'}
              onChange={() => setBlockType('full')}
              className="accent-blue-500"
            />
            Seluruh hari
          </label>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input
              type="radio"
              name="blockType"
              value="specific"
              checked={blockType === 'specific'}
              onChange={() => setBlockType('specific')}
              className="accent-blue-500"
            />
            Jam tertentu
          </label>
        </div>

        {blockType === 'specific' && (
          <select
            value={selectedSlotId}
            onChange={e => setSelectedSlotId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl text-sm px-3 py-2 bg-white text-slate-700"
          >
            <option value="">Pilih jam...</option>
            {slots.map(s => (
              <option key={s.id} value={s.id}>
                {formatHour(s.start_hour)} – {formatHour(s.end_hour)}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Blocked list */}
      {blocked.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-400">Belum ada tanggal yang diblokir</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {blocked.map(bd => (
            <div key={bd.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-sm font-medium text-slate-800">{bd.date}</span>
                <span className="text-xs text-gray-400 ml-2">{slotLabel(bd)}</span>
              </div>
              <button
                onClick={() => removeBlock(bd.id)}
                disabled={deletingId === bd.id}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                {deletingId === bd.id ? '...' : 'Hapus'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create admin slots page (Server Component)**

```tsx
// app/admin/slots/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SlotManager } from '@/components/admin/SlotManager'
import { BlockDateManager } from '@/components/admin/BlockDateManager'

export default async function AdminSlotsPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/admin/login')

  const [slotsRes, blockedRes] = await Promise.all([
    supabase.from('time_slots').select('*').order('start_hour'),
    supabase.from('blocked_dates').select('*').order('date'),
  ])

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-screen-lg mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-blue-500 transition-colors">
            ← Dashboard
          </Link>
          <span className="font-bold text-lg text-blue-500">Kelola Slot</span>
        </div>
      </nav>

      <div className="max-w-screen-lg mx-auto py-8 px-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SlotManager initialSlots={slotsRes.data ?? []} />
        <BlockDateManager
          initialBlocked={blockedRes.data ?? []}
          slots={slotsRes.data ?? []}
        />
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Run all tests to verify nothing broken**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/admin/ app/admin/slots/
git commit -m "feat: admin slot manager and blocked date manager"
```

---

## Task 16: Final Build & Deploy

**Files:** None (build verification)

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 2: Check TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Production build**

```bash
npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 4: Test locally**

```bash
npm start
```

Manual verification checklist:
1. Visit `http://localhost:3000` → landing page renders
2. Click "Lihat Jadwal" → `/jadwal` opens with timetable grid
3. Timetable shows jam column sticky on left, dates scroll right
4. Today's date header is blue
5. Click an available slot → modal opens with correct date/time/price
6. Enter team name → click "Booking via WhatsApp" → new tab opens with `wa.me/6281400842380?text=...`
7. Slot now shows PENDING in the grid
8. Visit `http://localhost:3000/admin` → redirects to `/admin/login`
9. Log in with admin credentials → dashboard shows bookings
10. Click "Confirm" on a pending booking → status changes to Confirmed
11. Return to `/jadwal` → slot shows BOOKED
12. Visit `/admin/slots` → can edit slot price and toggle active/inactive
13. Add a blocked date → visit `/jadwal` and verify slot shows TUTUP

- [ ] **Step 5: Deploy to Vercel**

```bash
npx vercel --prod
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_ADMIN_WA_NUMBER` = `6281400842380`

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete mini soccer booking web app"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Monthly timetable with horizontal scroll → Task 9 (ScheduleGrid)
- ✅ Sticky jam column → Task 9 (ScheduleGrid CSS sticky)
- ✅ Per-slot pricing with different prices → Task 2 (DB seed), Task 8 (admin PATCH slot)
- ✅ Available slot shows price → Task 9 (SlotCell `available` state)
- ✅ Booked slot shows BOOKED label → Task 9 (SlotCell `confirmed` state)
- ✅ Pending slot shows PENDING, blocks double-booking → Task 7 (POST /api/bookings), Task 9
- ✅ Today's date highlighted → Task 9 (isToday → blue header)
- ✅ Booking modal with team name + date/time/price → Task 10
- ✅ Submit → POST /api/bookings → WA redirect → Task 10
- ✅ WA message format with team name, date, time, price → Task 5 (buildWAUrl)
- ✅ WA number `6281400842380` → Task 1 (.env), Task 10 (BookingModal)
- ✅ Admin login via Supabase Auth → Task 13
- ✅ Admin dashboard: list bookings, filter, confirm/cancel → Task 14
- ✅ Admin confirm → slot becomes BOOKED → Task 8 + Task 9
- ✅ Admin cancel → slot becomes available → Task 8 + Task 9
- ✅ Admin set slot prices → Task 15 (SlotManager)
- ✅ Admin block date (full day or specific slot) → Task 15 (BlockDateManager)
- ✅ Blocked slot shows TUTUP → Task 9
- ✅ /admin/* protected by middleware → Task 6
- ✅ Clean minimal light mode design (blue accent, Inter, rounded) → Task 9-15
