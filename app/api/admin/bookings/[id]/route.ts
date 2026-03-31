import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar'

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
    .select('*, time_slots(start_hour, end_hour)')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }

  // Sync to Google Calendar
  if (data.google_event_id) {
    if (status === 'cancelled') {
      await deleteCalendarEvent(data.google_event_id)
    } else {
      await updateCalendarEvent(data.google_event_id, {
        teamName: data.team_name,
        status,
      })
    }
  } else if (data.time_slots) {
    // No calendar event yet — create one
    const eventId = await createCalendarEvent({
      bookingId: data.id,
      teamName: data.team_name,
      date: data.booking_date,
      startHour: data.time_slots.start_hour,
      endHour: data.time_slots.end_hour,
      status,
    })
    if (eventId) {
      await supabase
        .from('bookings')
        .update({ google_event_id: eventId })
        .eq('id', data.id)
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdminSession()
  if (authError) return authError

  const supabase = createAdminClient()

  // Get booking first to check for calendar event
  const { data: booking } = await supabase
    .from('bookings')
    .select('google_event_id')
    .eq('id', params.id)
    .single()

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 })
  }

  // Remove from Google Calendar
  if (booking?.google_event_id) {
    await deleteCalendarEvent(booking.google_event_id)
  }

  return new NextResponse(null, { status: 204 })
}
