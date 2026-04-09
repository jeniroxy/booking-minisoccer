import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'finance'])
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  const supabase = createAdminClient()

  const [
    { data: bookings },
    { data: revenueEntries },
    { data: psSessions },
  ] = await Promise.all([
    supabase.from('bookings').select('booking_date, total_price')
      .eq('status', 'confirmed')
      .gte('booking_date', yearStart)
      .lte('booking_date', yearEnd),
    supabase.from('revenue_entries').select('*')
      .gte('date', yearStart)
      .lte('date', yearEnd),
    supabase.from('ps_sessions').select('started_at, final_amount')
      .eq('status', 'completed')
      .gte('started_at', `${yearStart}T00:00:00+07:00`)
      .lte('started_at', `${yearEnd}T23:59:59+07:00`),
  ])

  // Build monthly breakdown
  const months: Record<number, Record<string, number>> = {}
  for (let m = 1; m <= 12; m++) {
    months[m] = { mini_soccer: 0, kantin: 0, ps: 0, sewa_sepatu: 0, photography: 0 }
  }

  for (const b of bookings ?? []) {
    const m = parseInt(b.booking_date.split('-')[1])
    months[m].mini_soccer += b.total_price || 0
  }

  for (const s of psSessions ?? []) {
    const dateStr = new Date(s.started_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    const m = parseInt(dateStr.split('-')[1])
    months[m].ps += s.final_amount || 0
  }

  for (const r of revenueEntries ?? []) {
    const m = parseInt(r.date.split('-')[1])
    months[m][r.category] += r.amount
  }

  return NextResponse.json({ year, months })
}
