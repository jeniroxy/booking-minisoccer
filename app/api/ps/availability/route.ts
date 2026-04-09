import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()

  const { data: units, error: unitsErr } = await supabase
    .from('ps_units')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  if (unitsErr) {
    return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 })
  }

  // Get active sessions for occupied status
  const { data: sessions } = await supabase
    .from('ps_sessions')
    .select('ps_unit_id, started_at, status')
    .in('status', ['active', 'paused'])

  // Get today's bookings
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const { data: bookings } = await supabase
    .from('ps_bookings')
    .select('ps_unit_id, start_hour, duration_hours, status')
    .eq('booking_date', today)
    .in('status', ['pending', 'confirmed'])

  // Get pricing rules for display
  const { data: pricing } = await supabase
    .from('ps_pricing_rules')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false })

  return NextResponse.json({
    units,
    sessions: sessions || [],
    bookings: bookings || [],
    pricing: pricing || [],
  })
}
