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

  const body = await request.json() as {
    is_active?: boolean
    day_of_week?: number
    time_slot_id?: string
    custom_price?: number
  }
  const supabase = createAdminClient()

  // Toggle active
  if ('is_active' in body) {
    const { data: schedule, error } = await supabase
      .from('recurring_schedules')
      .update({ is_active: body.is_active })
      .eq('id', params.id)
      .select('*, time_slots(start_hour, end_hour, price)')
      .single()

    if (error || !schedule) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (body.is_active) {
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

  // Edit schedule fields
  const updates: Record<string, unknown> = {}
  if (body.day_of_week !== undefined) updates.day_of_week = body.day_of_week
  if (body.time_slot_id !== undefined) updates.time_slot_id = body.time_slot_id

  const { data: schedule, error } = await supabase
    .from('recurring_schedules')
    .update(updates)
    .eq('id', params.id)
    .select('*, time_slots(start_hour, end_hour, price)')
    .single()

  if (error || !schedule) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Update price on all future confirmed bookings for this schedule
  if (body.custom_price !== undefined) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    await supabase
      .from('bookings')
      .update({ total_price: body.custom_price })
      .eq('recurring_schedule_id', params.id)
      .eq('status', 'confirmed')
      .gte('booking_date', today)
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
