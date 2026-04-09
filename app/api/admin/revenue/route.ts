import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'finance'])
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const supabase = createAdminClient()
  let query = supabase.from('revenue_entries').select('*').order('date', { ascending: false })

  if (date) {
    query = query.eq('date', date)
  } else if (from && to) {
    query = query.gte('date', from).lte('date', to)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch revenue' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin', 'finance'])
  if (auth.error) return auth.error

  const body = await request.json()
  const { date, category, amount, notes } = body

  if (!date || !category || amount === undefined) {
    return NextResponse.json({ error: 'date, category, and amount required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('revenue_entries')
    .upsert(
      { date, category, amount: parseInt(amount), notes: notes || null, updated_at: new Date().toISOString() },
      { onConflict: 'date,category' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to save revenue' }, { status: 500 })
  }
  return NextResponse.json(data)
}
