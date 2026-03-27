import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const authError = await requireAdminSession()
  if (authError) return authError

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('time_slots').select('*').order('start_hour')

  if (error) return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 })
  return NextResponse.json(data)
}
