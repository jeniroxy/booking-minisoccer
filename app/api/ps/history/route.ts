import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  const supabase = createAdminClient()
  let query = supabase
    .from('ps_sessions')
    .select('*, ps_units(name, type)')
    .eq('status', 'completed')
    .order('ended_at', { ascending: false })

  if (date) {
    query = query
      .gte('started_at', `${date}T00:00:00+07:00`)
      .lt('started_at', `${date}T23:59:59+07:00`)
  }

  const { data, error } = await query.limit(100)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
  return NextResponse.json(data)
}
