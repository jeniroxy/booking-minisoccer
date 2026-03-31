import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const teamName = req.nextUrl.searchParams.get('team_name')?.trim()
  if (!teamName) return NextResponse.json({ eligible: false })

  const supabase = createClient()

  const since = new Date()
  since.setDate(since.getDate() - 30)
  const sinceStr = since.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  // Check loyalty (booked within last 30 days)
  const { data } = await supabase
    .from('bookings')
    .select('id')
    .ilike('team_name', teamName)
    .gte('booking_date', sinceStr)
    .in('status', ['confirmed', 'pending'])
    .limit(1)

  // Check if team has ever booked before
  const { data: anyBooking } = await supabase
    .from('bookings')
    .select('id')
    .ilike('team_name', teamName)
    .in('status', ['confirmed', 'pending'])
    .limit(1)

  return NextResponse.json({
    eligible: (data?.length ?? 0) > 0,
    isNewTeam: (anyBooking?.length ?? 0) === 0,
  })
}
