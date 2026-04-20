import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateBookingsForSchedule } from '@/lib/recurring'
import { sendPushToAdmins } from '@/lib/push'
import { formatHour } from '@/lib/schedule'

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

function getWindow(): { fromDate: string; toDate: string } {
  const fromDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const to = new Date(fromDate + 'T00:00:00+07:00')
  to.setDate(to.getDate() + 27)
  const toDate = to.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  return { fromDate, toDate }
}

export async function GET() {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('recurring_schedules')
    .select('*, time_slots(start_hour, end_hour, price)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { team_name, phone, customer_type, time_slot_id, day_of_week } = body as {
    team_name: string
    phone?: string
    customer_type: 'umum' | 'pelajar'
    time_slot_id: string
    day_of_week: number
  }

  if (!team_name?.trim() || !time_slot_id || day_of_week === undefined) {
    return NextResponse.json({ error: 'team_name, time_slot_id, day_of_week required' }, { status: 400 })
  }
  if (!['umum', 'pelajar'].includes(customer_type)) {
    return NextResponse.json({ error: 'Invalid customer_type' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: slot } = await supabase
    .from('time_slots')
    .select('start_hour, end_hour, price')
    .eq('id', time_slot_id)
    .single()

  if (!slot) return NextResponse.json({ error: 'Invalid time_slot_id' }, { status: 400 })

  const { data: schedule, error } = await supabase
    .from('recurring_schedules')
    .insert({
      team_name: team_name.trim(),
      phone: phone?.trim() || null,
      customer_type,
      time_slot_id,
      day_of_week,
      created_by: auth.userId,
    })
    .select('*')
    .single()

  if (error || !schedule) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }

  const { fromDate, toDate } = getWindow()
  const conflicts = await generateBookingsForSchedule(
    supabase,
    { ...schedule, time_slots: slot },
    fromDate,
    toDate
  )

  for (const conflict of conflicts) {
    await sendPushToAdmins(
      {
        title: 'Konflik Jadwal Tetap',
        body: `${schedule.team_name} — ${HARI[schedule.day_of_week]}, ${conflict.date} ${formatHour(slot.start_hour)}: dipakai ${conflict.existingTeam ?? '?'}`,
        url: '/admin',
      },
      'notify_recurring_conflict'
    )
  }

  return NextResponse.json({
    schedule: { ...schedule, time_slots: slot },
    conflicts: conflicts.length,
  })
}
