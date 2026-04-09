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
  let query = supabase
    .from('expense_entries')
    .select('*, expense_categories(name)')
    .order('date', { ascending: false })

  if (date) {
    query = query.eq('date', date)
  } else if (from && to) {
    query = query.gte('date', from).lte('date', to)
  }

  const { data, error } = await query.limit(200)
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin', 'finance'])
  if (auth.error) return auth.error

  const body = await request.json()
  const { date, expense_category_id, amount, description } = body

  if (!date || !expense_category_id || amount === undefined) {
    return NextResponse.json({ error: 'date, expense_category_id, and amount required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('expense_entries')
    .insert({
      date,
      expense_category_id,
      amount: parseInt(amount),
      description: description || null,
    })
    .select('*, expense_categories(name)')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to save expense' }, { status: 500 })
  }
  return NextResponse.json(data)
}
