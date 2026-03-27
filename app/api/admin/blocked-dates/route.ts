import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const authError = await requireAdminSession()
  if (authError) return authError

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('blocked_dates').select('*').order('date')

  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminSession()
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { date, time_slot_id, reason } = body as {
    date: string
    time_slot_id?: string | null
    reason?: string
  }

  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blocked_dates')
    .insert({ date, time_slot_id: time_slot_id ?? null, reason: reason ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
