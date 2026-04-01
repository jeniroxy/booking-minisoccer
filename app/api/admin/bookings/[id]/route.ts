import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar'

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
  if (status === 'cancelled') {
    if (data.google_event_id) {
      await deleteCalendarEvent(data.google_event_id)
    }
  } else if (status === 'confirmed' && data.time_slots) {
    // Delete old pending event, then create new confirmed event
    if (data.google_event_id) {
      await deleteCalendarEvent(data.google_event_id)
    }
    const eventId = await createCalendarEvent({
      bookingId: data.id,
      teamName: data.team_name,
      date: data.booking_date,
      startHour: data.time_slots.start_hour,
      endHour: data.time_slots.end_hour,
      status: 'confirmed',
    })
    if (eventId) {
      await supabase
        .from('bookings')
        .update({ google_event_id: eventId })
        .eq('id', data.id)
    }

    // Auto-generate follow-up voucher only if total booking >= 200K
    const { data: allSlots } = await supabase
      .from('bookings')
      .select('total_price, followup_voucher_id')
      .eq('team_name', data.team_name)
      .eq('booking_date', data.booking_date)
      .neq('status', 'cancelled')

    const bookingTotal = (allSlots ?? []).reduce((sum, b) => sum + (b.total_price ?? 0), 0)
    const alreadyHasVoucher = (allSlots ?? []).some(b => b.followup_voucher_id)

    if (bookingTotal < 200000 || alreadyHasVoucher) {
      return NextResponse.json(data)
    }

    const voucherCode = `MAINLAGI-${data.team_name.replace(/\s+/g, '').toUpperCase().slice(0, 10)}-${Date.now().toString(36).toUpperCase()}`
    const validFrom = data.booking_date
    const validUntilDate = new Date(data.booking_date)
    validUntilDate.setDate(validUntilDate.getDate() + 14)
    const validUntil = validUntilDate.toISOString().split('T')[0]

    const { data: voucher } = await supabase
      .from('vouchers')
      .insert({
        code: voucherCode,
        name: `Follow-up ${data.team_name}`,
        discount_type: 'nominal',
        discount_value: 50000,
        valid_from: validFrom,
        valid_until: validUntil,
        is_active: true,
      })
      .select('id, code, valid_until')
      .single()

    if (voucher) {
      await supabase
        .from('bookings')
        .update({ followup_voucher_id: voucher.id })
        .eq('id', data.id)
      data.followup_voucher_id = voucher.id
      data._followup_voucher = { code: voucher.code, valid_until: voucher.valid_until }
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
