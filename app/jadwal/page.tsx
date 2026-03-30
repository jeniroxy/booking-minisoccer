import { createClient } from '@/lib/supabase/server'
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid'

export default async function JadwalPage() {
  const startDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const endObj = new Date(startDate + 'T00:00:00')
  endObj.setDate(endObj.getDate() + 29)
  const endDate = endObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const supabase = createClient()

  const [slotsRes, bookingsRes, blockedRes, overridesRes] = await Promise.all([
    supabase.from('time_slots').select('*').eq('is_active', true).order('start_hour'),
    supabase.from('bookings').select('*').gte('booking_date', startDate).lte('booking_date', endDate),
    supabase.from('blocked_dates').select('*').gte('date', startDate).lte('date', endDate),
    supabase.from('slot_price_overrides').select('*').gte('date', startDate).lte('date', endDate),
  ])

  return (
    <ScheduleGrid
      initialData={{
        slots: slotsRes.data ?? [],
        bookings: bookingsRes.data ?? [],
        blockedDates: blockedRes.data ?? [],
        priceOverrides: overridesRes.data ?? [],
      }}
      initialStartDate={startDate}
    />
  )
}
