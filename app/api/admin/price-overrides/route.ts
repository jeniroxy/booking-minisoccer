import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const authError = await requireAdminSession()
  if (authError) return authError

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('slot_price_overrides')
    .select('*, time_slots(start_hour, end_hour)')
    .order('date')
    .order('time_slot_id')

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

  const { date, time_slot_id, price } = body as {
    date: string
    time_slot_id: string
    price: number
  }

  if (!date || !time_slot_id || !price) {
    return NextResponse.json({ error: 'date, time_slot_id, and price are required' }, { status: 400 })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
  }

  if (typeof price !== 'number' || price <= 0) {
    return NextResponse.json({ error: 'price must be a positive number' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('slot_price_overrides')
    .upsert({ date, time_slot_id, price }, { onConflict: 'date,time_slot_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to save override' }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
