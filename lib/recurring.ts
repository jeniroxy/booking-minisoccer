import { createAdminClient } from '@/lib/supabase/admin'
import { getStudentPrice } from '@/lib/schedule'

type SupabaseClient = ReturnType<typeof createAdminClient>

export interface RecurringConflict {
  date: string
  existingTeam: string | null
}

export function getDatesForDayOfWeek(
  dayOfWeek: number,
  fromDate: string,
  toDate: string
): string[] {
  const dates: string[] = []
  const [fy, fm, fd] = fromDate.split('-').map(Number)
  const [ty, tm, td] = toDate.split('-').map(Number)
  const current = new Date(fy, fm - 1, fd)
  const end = new Date(ty, tm - 1, td)

  // Advance to first matching day of week
  while (current.getDay() !== dayOfWeek && current <= end) {
    current.setDate(current.getDate() + 1)
  }

  while (current <= end) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    current.setDate(current.getDate() + 7)
  }

  return dates
}

export async function generateBookingsForSchedule(
  supabase: SupabaseClient,
  schedule: {
    id: string
    team_name: string
    phone: string | null
    customer_type: 'umum' | 'pelajar'
    time_slot_id: string
    day_of_week: number
    time_slots: { start_hour: number; end_hour: number; price: number }
  },
  fromDate: string,
  toDate: string
): Promise<RecurringConflict[]> {
  const dates = getDatesForDayOfWeek(schedule.day_of_week, fromDate, toDate)
  const conflicts: RecurringConflict[] = []

  for (const date of dates) {
    const { data: existing } = await supabase
      .from('bookings')
      .select('team_name, recurring_schedule_id')
      .eq('booking_date', date)
      .eq('time_slot_id', schedule.time_slot_id)
      .neq('status', 'cancelled')
      .maybeSingle()

    if (existing) {
      // Already booked by this same schedule — skip silently
      if (existing.recurring_schedule_id === schedule.id) continue
      // Conflict with another booking
      conflicts.push({ date, existingTeam: existing.team_name })
      continue
    }

    const price =
      schedule.customer_type === 'pelajar'
        ? getStudentPrice(schedule.time_slots.price)
        : schedule.time_slots.price

    await supabase.from('bookings').insert({
      team_name: schedule.team_name,
      phone: schedule.phone,
      booking_date: date,
      time_slot_id: schedule.time_slot_id,
      status: 'confirmed',
      customer_type: schedule.customer_type,
      total_price: price,
      recurring_schedule_id: schedule.id,
    })
  }

  return conflicts
}
