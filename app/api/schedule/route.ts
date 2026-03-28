import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDateParam = searchParams.get('startDate') ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateParam)) {
    return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 })
  }

  const startDate = startDateParam
  const endObj = new Date(startDate + 'T00:00:00')
  endObj.setDate(endObj.getDate() + 29)
  const endDate = toDateStr(endObj)

  const supabase = createClient()

  const [slotsRes, bookingsRes, blockedRes] = await Promise.all([
    supabase.from('time_slots').select('*').eq('is_active', true).order('start_hour'),
    supabase.from('bookings').select('*').gte('booking_date', startDate).lte('booking_date', endDate),
    supabase.from('blocked_dates').select('*').gte('date', startDate).lte('date', endDate),
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
