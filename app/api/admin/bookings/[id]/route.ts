import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { status, phone, total_price, booking_date, time_slot_id, customer_type } = body as {
    status?: string
    phone?: string
    total_price?: number
    booking_date?: string
    time_slot_id?: string
    customer_type?: 'umum' | 'pelajar'
  }

  // Field-level update (no status change) — admin only
  if (!status && (phone !== undefined || total_price !== undefined || booking_date !== undefined || time_slot_id !== undefined || customer_type !== undefined)) {
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const supabase = createAdminClient()
    const updates: Record<string, unknown> = {}
    if (phone !== undefined) updates.phone = phone.trim() || null
    if (total_price !== undefined) updates.total_price = total_price
    if (booking_date !== undefined) updates.booking_date = booking_date
    if (time_slot_id !== undefined) updates.time_slot_id = time_slot_id
    if (customer_type !== undefined) updates.customer_type = customer_type

    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', params.id)
      .select('*, time_slots(id, start_hour, end_hour, price), used_voucher:voucher_id(code, discount_type, discount_value)')
      .single()
    if (error) return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
    return NextResponse.json(data)
  }

  if (!status || !['confirmed', 'cancelled'].includes(status)) {
    return NextResponse.json(
      { error: 'status must be confirmed or cancelled' },
      { status: 400 }
    )
  }

  // Cancel requires admin role
  if (status === 'cancelled' && auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const updates: Record<string, unknown> = { status }
  if (status === 'confirmed') {
    updates.confirmed_by = auth.userId
    updates.confirmed_at = new Date().toISOString()
  } else if (status === 'cancelled') {
    updates.confirmed_by = null
    updates.confirmed_at = null
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', params.id)
    .select('*, time_slots(start_hour, end_hour)')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }

  // Attach confirmer name for client refresh
  if (status === 'confirmed' && auth.userId) {
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('name')
      .eq('user_id', auth.userId)
      .single()
    if (adminUser) {
      ;(data as Record<string, unknown>).confirmed_by_user = { name: adminUser.name }
    }
  }

  // Sync to Google Calendar
  if (status === 'cancelled') {
    if (data.google_event_id) {
      await deleteCalendarEvent(data.google_event_id)
    }
    // Delete associated follow-up voucher
    if (data.followup_voucher_id) {
      // Clear followup_voucher_id on all bookings referencing this voucher
      await supabase
        .from('bookings')
        .update({ followup_voucher_id: null })
        .eq('followup_voucher_id', data.followup_voucher_id)

      // Delete the voucher; if FK constraint (voucher already used), deactivate instead
      const { error: delErr } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', data.followup_voucher_id)

      if (delErr) {
        await supabase
          .from('vouchers')
          .update({ is_active: false })
          .eq('id', data.followup_voucher_id)
      }
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

    // Auto-generate follow-up voucher (skip if already generated for this booking session)
    const { data: existingVoucher } = await supabase
      .from('bookings')
      .select('followup_voucher_id')
      .ilike('team_name', data.team_name)
      .eq('booking_date', data.booking_date)
      .neq('status', 'cancelled')
      .not('followup_voucher_id', 'is', null)
      .limit(1)

    if (existingVoucher && existingVoucher.length > 0) {
      return NextResponse.json(data)
    }

    const voucherCode = `MAINLAGI-${data.team_name.replace(/\s+/g, '').toUpperCase().slice(0, 10)}-${Date.now().toString(36).toUpperCase()}`
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    const validFrom = today
    const validUntilDate = new Date(today + 'T00:00:00+07:00')
    validUntilDate.setDate(validUntilDate.getDate() + 14)
    const validUntil = validUntilDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

    const { data: voucher } = await supabase
      .from('vouchers')
      .insert({
        code: voucherCode,
        name: `Follow-up ${data.team_name}`,
        discount_type: 'nominal',
        discount_value: 50000,
        max_usage: 1,
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
  const auth = await requireAdminSession()
  if (auth.error) return auth.error
  if (auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
