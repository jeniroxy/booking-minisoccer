// app/api/admin/bookings/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSlotStatus } from '@/lib/schedule'
import { allocateSlotPrices } from '@/lib/manual-booking'
import { applyConfirmSideEffects } from '@/lib/booking-confirm'
import type { Booking, BlockedDate, SlotPriceOverride, TimeSlot } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { team_name, booking_date, time_slot_ids, customer_type, phone, total_price } = body as {
    team_name?: string
    booking_date?: string
    time_slot_ids?: string[]
    customer_type?: 'umum' | 'pelajar'
    phone?: string
    total_price?: number
  }

  if (!team_name?.trim() || !booking_date || !Array.isArray(time_slot_ids) || time_slot_ids.length === 0) {
    return NextResponse.json(
      { error: 'team_name, booking_date, and at least one time_slot_id are required' },
      { status: 400 }
    )
  }

  const type: 'umum' | 'pelajar' = customer_type === 'pelajar' ? 'pelajar' : 'umum'
  const supabase = createAdminClient()

  // Ambil slot terpilih + konteks tanggal
  const [{ data: allSlots }, { data: bookings }, { data: blocked }, { data: overrides }] = await Promise.all([
    supabase.from('time_slots').select('*').in('id', time_slot_ids),
    supabase.from('bookings').select('*').eq('booking_date', booking_date),
    supabase.from('blocked_dates').select('*').eq('date', booking_date),
    supabase.from('slot_price_overrides').select('*').eq('date', booking_date),
  ])

  const selectedSlots = (allSlots ?? []) as TimeSlot[]
  if (selectedSlots.length !== time_slot_ids.length) {
    return NextResponse.json({ error: 'One or more time slots not found' }, { status: 400 })
  }

  // Re-validasi tiap slot masih available (anti race-condition)
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const conflicts = selectedSlots.filter(
    slot => getSlotStatus(slot, booking_date, (bookings ?? []) as Booking[], (blocked ?? []) as BlockedDate[], todayStr).status !== 'available'
  )
  if (conflicts.length > 0) {
    return NextResponse.json(
      { error: 'Sebagian slot sudah tidak tersedia', conflicts: conflicts.map(s => s.id) },
      { status: 409 }
    )
  }

  // Urutkan slot sesuai jam untuk alokasi harga yang stabil
  selectedSlots.sort((a, b) => a.start_hour - b.start_hour)
  const prices = allocateSlotPrices(selectedSlots, booking_date, (overrides ?? []) as SlotPriceOverride[], type, total_price ?? null)

  const nowIso = new Date().toISOString()
  const rows = selectedSlots.map((slot, i) => ({
    team_name: team_name.trim(),
    booking_date,
    time_slot_id: slot.id,
    status: 'confirmed' as const,
    customer_type: type,
    confirmed_by: auth.userId,
    confirmed_at: nowIso,
    total_price: prices[i],
    ...(phone?.trim() ? { phone: phone.trim() } : {}),
  }))

  const { data: inserted, error } = await supabase
    .from('bookings')
    .insert(rows)
    .select('*, time_slots(*)')

  if (error || !inserted) {
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }

  // Efek confirm: Calendar per booking + voucher follow-up sekali per sesi (best-effort)
  for (const b of inserted) {
    try {
      await applyConfirmSideEffects(supabase, {
        id: b.id,
        team_name: b.team_name,
        booking_date: b.booking_date,
        google_event_id: b.google_event_id,
        time_slots: b.time_slots,
      })
    } catch (e) {
      console.error('confirm side-effects failed for booking', b.id, e)
    }
  }

  return NextResponse.json({ bookings: inserted }, { status: 201 })
}
