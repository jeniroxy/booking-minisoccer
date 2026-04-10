import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'finance'])
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year')

  const supabase = createAdminClient()
  let query = supabase
    .from('capital_expenses')
    .select('*')
    .order('date', { ascending: false })

  if (year) {
    query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch capital expenses' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin', 'finance'])
  if (auth.error) return auth.error

  const body = await request.json()
  const { date, description, amount, notes, section } = body

  if (!date || !description || !amount) {
    return NextResponse.json({ error: 'date, description, and amount required' }, { status: 400 })
  }

  const sectionValue = section === 'kantin' ? 'kantin' : 'mini_soccer'

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('capital_expenses')
    .insert({
      date,
      description: description.trim(),
      amount: parseInt(amount),
      notes: notes || null,
      section: sectionValue,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to save capital expense' }, { status: 500 })
  }
  return NextResponse.json(data)
}
