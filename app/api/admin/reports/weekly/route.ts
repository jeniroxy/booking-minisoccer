import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'finance'])
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const weekStart = searchParams.get('week_start')

  if (!weekStart) {
    return NextResponse.json({ error: 'week_start required' }, { status: 400 })
  }

  // Calculate week end (7 days)
  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const weekEnd = end.toISOString().split('T')[0]

  const supabase = createAdminClient()

  // Fetch all data in parallel
  const [
    { data: bookings },
    { data: revenueEntries },
    { data: psSessions },
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select('booking_date, total_price')
      .eq('status', 'confirmed')
      .gte('booking_date', weekStart)
      .lte('booking_date', weekEnd),
    supabase
      .from('revenue_entries')
      .select('*')
      .gte('date', weekStart)
      .lte('date', weekEnd),
    supabase
      .from('ps_sessions')
      .select('started_at, final_amount')
      .eq('status', 'completed')
      .gte('started_at', `${weekStart}T00:00:00+07:00`)
      .lte('started_at', `${weekEnd}T23:59:59+07:00`),
  ])

  // Build daily breakdown
  const days: Record<string, Record<string, number>> = {}
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    days[dateStr] = { mini_soccer: 0, kantin: 0, ps: 0, sewa_sepatu: 0, photography: 0 }
  }

  // Mini soccer from bookings
  for (const b of bookings ?? []) {
    if (days[b.booking_date]) {
      days[b.booking_date].mini_soccer += b.total_price || 0
    }
  }

  // PS from sessions
  for (const s of psSessions ?? []) {
    const dateStr = new Date(s.started_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    if (days[dateStr]) {
      days[dateStr].ps += s.final_amount || 0
    }
  }

  // Manual revenue entries (additive)
  for (const r of revenueEntries ?? []) {
    if (days[r.date]) {
      days[r.date][r.category] += r.amount
    }
  }

  return NextResponse.json({
    week_start: weekStart,
    week_end: weekEnd,
    days,
  })
}
