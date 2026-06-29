import type { SupabaseClient } from '@supabase/supabase-js'
import { createCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar'

export async function applyConfirmSideEffects(
  supabase: SupabaseClient,
  booking: {
    id: string
    team_name: string
    booking_date: string
    google_event_id: string | null
    time_slots: { start_hour: number; end_hour: number } | null
  }
): Promise<{ code: string; valid_until: string } | null> {
  if (!booking.time_slots) return null

  // Calendar: hapus event lama (jika ada), buat event confirmed baru
  if (booking.google_event_id) {
    await deleteCalendarEvent(booking.google_event_id)
  }
  const eventId = await createCalendarEvent({
    bookingId: booking.id,
    teamName: booking.team_name,
    date: booking.booking_date,
    startHour: booking.time_slots.start_hour,
    endHour: booking.time_slots.end_hour,
    status: 'confirmed',
  })
  if (eventId) {
    await supabase.from('bookings').update({ google_event_id: eventId }).eq('id', booking.id)
  }

  // Voucher follow-up: dedup per (team, tanggal)
  const { data: existingVoucher } = await supabase
    .from('bookings')
    .select('followup_voucher_id')
    .ilike('team_name', booking.team_name)
    .eq('booking_date', booking.booking_date)
    .neq('status', 'cancelled')
    .not('followup_voucher_id', 'is', null)
    .limit(1)

  if (existingVoucher && existingVoucher.length > 0) return null

  const voucherCode = `MAINLAGI-${booking.team_name.replace(/\s+/g, '').toUpperCase().slice(0, 10)}-${Date.now().toString(36).toUpperCase()}`
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const validUntilDate = new Date(today + 'T00:00:00+07:00')
  validUntilDate.setDate(validUntilDate.getDate() + 14)
  const validUntil = validUntilDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const { data: voucher } = await supabase
    .from('vouchers')
    .insert({
      code: voucherCode,
      name: `Follow-up ${booking.team_name}`,
      discount_type: 'nominal',
      discount_value: 50000,
      max_usage: 1,
      valid_from: today,
      valid_until: validUntil,
      is_active: true,
    })
    .select('id, code, valid_until')
    .single()

  if (!voucher) return null

  await supabase.from('bookings').update({ followup_voucher_id: voucher.id }).eq('id', booking.id)
  return { code: voucher.code, valid_until: voucher.valid_until }
}
