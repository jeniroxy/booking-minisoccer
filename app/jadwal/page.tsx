import { createClient } from '@/lib/supabase/server'
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid'
import Link from 'next/link'

export default async function JadwalPage() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const supabase = createClient()

  const [slotsRes, bookingsRes, blockedRes] = await Promise.all([
    supabase.from('time_slots').select('*').eq('is_active', true).order('start_hour'),
    supabase.from('bookings').select('*').gte('booking_date', startDate).lte('booking_date', endDate),
    supabase.from('blocked_dates').select('*').gte('date', startDate).lte('date', endDate),
  ])

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-lg text-blue-500">
            ⚽ MiniSoccer
          </Link>
          <span className="text-sm text-gray-500">Jadwal &amp; Booking</span>
        </div>
      </nav>

      <div className="max-w-screen-xl mx-auto py-6 px-4">
        <ScheduleGrid
          initialData={{
            slots: slotsRes.data ?? [],
            bookings: bookingsRes.data ?? [],
            blockedDates: blockedRes.data ?? [],
          }}
          initialYear={year}
          initialMonth={month}
        />
      </div>
    </main>
  )
}
