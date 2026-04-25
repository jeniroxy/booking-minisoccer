import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateBookingsForSchedule } from '@/lib/recurring'

export async function POST() {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const supabase = createAdminClient()

  const fromDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const to = new Date(fromDate + 'T00:00:00+07:00')
  to.setDate(to.getDate() + 27)
  const toDate = to.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const { data: schedules } = await supabase
    .from('recurring_schedules')
    .select('*, time_slots(start_hour, end_hour, price)')
    .eq('is_active', true)

  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ synced: 0 })
  }

  for (const schedule of schedules) {
    await generateBookingsForSchedule(supabase, schedule, fromDate, toDate)
  }

  return NextResponse.json({ ok: true, schedules: schedules.length })
}
