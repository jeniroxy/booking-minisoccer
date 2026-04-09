import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ps_bookings')
    .select('*')
    .in('status', ['pending', 'confirmed'])
    .order('booking_date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { ps_unit_id, customer_name, phone, booking_date, start_hour, duration_hours } = body

  if (!ps_unit_id || !customer_name || !booking_date || start_hour === undefined) {
    return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
  }

  const supabase = createClient()

  // Check for conflicting bookings
  const { data: existing } = await supabase
    .from('ps_bookings')
    .select('id')
    .eq('ps_unit_id', ps_unit_id)
    .eq('booking_date', booking_date)
    .eq('start_hour', start_hour)
    .in('status', ['pending', 'confirmed'])
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'Slot sudah dibooking' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('ps_bookings')
    .insert({
      ps_unit_id,
      customer_name: customer_name.trim(),
      phone: phone || null,
      booking_date,
      start_hour,
      duration_hours: duration_hours || 1,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
  return NextResponse.json(data)
}
