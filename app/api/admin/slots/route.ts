import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const auth = await requireRole(['admin'])
  if (auth.error) return auth.error

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('time_slots').select('*').order('start_hour')

  if (error) return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 })
  return NextResponse.json(data)
}
