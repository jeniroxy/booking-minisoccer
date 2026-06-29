// app/api/admin/bookings/available/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSlotStatus, getEffectivePrice } from '@/lib/schedule'
import type { Booking, BlockedDate, SlotPriceOverride } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const date = request.nextUrl.searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date (YYYY-MM-DD) is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const [{ data: slots }, { data: bookings }, { data: blocked }, { data: overrides }] = await Promise.all([
    supabase.from('time_slots').select('*').eq('is_active', true).order('start_hour'),
    supabase.from('bookings').select('*').eq('booking_date', date),
    supabase.from('blocked_dates').select('*').eq('date', date),
    supabase.from('slot_price_overrides').select('*').eq('date', date),
  ])

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const available = (slots ?? [])
    .filter(slot => getSlotStatus(slot, date, (bookings ?? []) as Booking[], (blocked ?? []) as BlockedDate[], todayStr).status === 'available')
    .map(slot => ({
      id: slot.id,
      start_hour: slot.start_hour,
      end_hour: slot.end_hour,
      price: getEffectivePrice(slot, date, (overrides ?? []) as SlotPriceOverride[]),
    }))

  return NextResponse.json({ slots: available })
}
