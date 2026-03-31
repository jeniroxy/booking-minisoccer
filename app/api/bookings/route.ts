import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCalendarEvent } from '@/lib/google-calendar'

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

  // Guard against double-booking
  const { data: existing } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('booking_date', booking_date)
    .eq('time_slot_id', time_slot_id)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Slot is already booked or pending' }, { status: 409 })
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

  // Sync to Google Calendar (non-blocking)
  const { data: slot } = await supabase
    .from('time_slots')
    .select('start_hour, end_hour')
    .eq('id', time_slot_id)
    .single()

  if (slot) {
    createCalendarEvent({
      bookingId: data.id,
      teamName: team_name.trim(),
      date: booking_date,
      startHour: slot.start_hour,
      endHour: slot.end_hour,
      status: 'pending',
    }).then(async (eventId) => {
      if (eventId) {
        await supabase
          .from('bookings')
          .update({ google_event_id: eventId })
          .eq('id', data.id)
      }
    })
  }

  return NextResponse.json(data, { status: 201 })
}
