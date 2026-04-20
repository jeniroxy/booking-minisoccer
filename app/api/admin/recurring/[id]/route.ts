import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateBookingsForSchedule } from '@/lib/recurring'
import { sendPushToAdmins } from '@/lib/push'
import { formatHour } from '@/lib/schedule'

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const { is_active } = await request.json() as { is_active: boolean }
  const supabase = createAdminClient()

  const { data: schedule, error } = await supabase
    .from('recurring_schedules')
    .update({ is_active })
    .eq('id', params.id)
    .select('*, time_slots(start_hour, end_hour, price)')
    .single()

  if (error || !schedule) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Re-generate missing bookings when reactivating
  if (is_active) {
    const fromDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    const to = new Date(fromDate + 'T00:00:00+07:00')
    to.setDate(to.getDate() + 27)
    const toDate = to.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

    const conflicts = await generateBookingsForSchedule(supabase, schedule, fromDate, toDate)
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

  return NextResponse.json(schedule)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('recurring_schedules')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
