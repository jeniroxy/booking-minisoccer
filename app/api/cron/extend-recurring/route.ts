import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateBookingsForSchedule } from '@/lib/recurring'
import { sendPushToAdmins } from '@/lib/push'
import { formatHour } from '@/lib/schedule'

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
    return NextResponse.json({ message: 'No active schedules', conflicts: 0 })
  }

  let totalConflicts = 0

  for (const schedule of schedules) {
    const conflicts = await generateBookingsForSchedule(supabase, schedule, fromDate, toDate)
    totalConflicts += conflicts.length

    for (const conflict of conflicts) {
      await sendPushToAdmins(
        {
          title: 'Konflik Jadwal Tetap',
          body: `${schedule.team_name} — ${HARI[schedule.day_of_week]}, ${conflict.date} ${formatHour(schedule.time_slots!.start_hour)}: dipakai ${conflict.existingTeam ?? '?'}`,
          url: '/admin',
        },
        'notify_recurring_conflict'
      )
    }
  }

  return NextResponse.json({ message: 'OK', conflicts: totalConflicts })
}
