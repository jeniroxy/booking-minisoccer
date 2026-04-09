import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PUT(request: NextRequest) {
  const auth = await requireRole(['admin', 'finance'])
  if (auth.error) return auth.error

  const { date, section, amount } = await request.json()

  if (!date || !section || amount === undefined) {
    return NextResponse.json({ error: 'date, section, and amount required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Find the expense category matching the section name
  const sectionName = section === 'mini_soccer' ? 'Mini Soccer' : 'Kantin'
  const { data: category } = await supabase
    .from('expense_categories')
    .select('id')
    .ilike('name', sectionName)
    .single()

  if (!category) {
    return NextResponse.json({ error: `Category "${sectionName}" not found` }, { status: 404 })
  }

  // Delete existing expenses for this date + category, then insert new one if amount > 0
  await supabase
    .from('expense_entries')
    .delete()
    .eq('date', date)
    .eq('expense_category_id', category.id)

  if (amount > 0) {
    const { error } = await supabase
      .from('expense_entries')
      .insert({
        date,
        expense_category_id: category.id,
        amount: parseInt(amount),
        description: null,
      })

    if (error) {
      return NextResponse.json({ error: 'Failed to save expense' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
