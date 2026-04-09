import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'finance'])
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const supabase = createAdminClient()

  const [{ data: bookings }, { data: psSessions }] = await Promise.all([
    supabase
      .from('bookings')
      .select('total_price')
      .eq('booking_date', date)
      .eq('status', 'confirmed'),
    supabase
      .from('ps_sessions')
      .select('final_amount')
      .eq('status', 'completed')
      .gte('started_at', `${date}T00:00:00+07:00`)
      .lt('started_at', `${date}T23:59:59+07:00`),
  ])

  return NextResponse.json({
    mini_soccer: (bookings ?? []).reduce((sum, b) => sum + (b.total_price || 0), 0),
    ps: (psSessions ?? []).reduce((sum, s) => sum + (s.final_amount || 0), 0),
  })
}
