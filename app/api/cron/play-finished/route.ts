import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToAdmins } from '@/lib/push'
import { formatHour } from '@/lib/schedule'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const now = new Date()
  const jakartaDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const jakartaHour = parseInt(
    now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false })
  )

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, team_name, booking_date, notified_finished, time_slots(start_hour, end_hour)')
    .eq('booking_date', jakartaDate)
    .eq('status', 'confirmed')
    .eq('notified_finished', false)

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ message: 'No finished bookings', checked: 0 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finished = bookings.filter((b: any) => b.time_slots?.end_hour <= jakartaHour)

  for (const booking of finished) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slot = (booking as any).time_slots
    await sendPushToAdmins(
      {
        title: 'Waktu Main Selesai!',
        body: `${booking.team_name} — ${formatHour(slot.start_hour)}-${formatHour(slot.end_hour)}`,
        url: '/admin',
      },
      'notify_play_finished'
    )

    await supabase
      .from('bookings')
      .update({ notified_finished: true })
      .eq('id', booking.id)
  }

  return NextResponse.json({ message: 'OK', notified: finished.length })
}
