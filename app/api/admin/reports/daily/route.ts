import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'finance'])
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const supabase = createAdminClient()

  // Get month range for kantin monthly calculation
  const monthStart = date.slice(0, 7) + '-01'
  const monthNum = parseInt(date.slice(5, 7))
  const yearNum = parseInt(date.slice(0, 4))
  const monthEnd = monthNum === 12
    ? `${yearNum + 1}-01-01`
    : `${yearNum}-${String(monthNum + 1).padStart(2, '0')}-01`
  const monthEndDate = new Date(new Date(monthEnd).getTime() - 86400000).toISOString().split('T')[0]

  const [
    { data: bookings },
    { data: revenueEntries },
    { data: expenseEntries },
    { data: kantinRevenueMonthly },
    { data: kantinExpensesMonthly },
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select('total_price')
      .eq('booking_date', date)
      .eq('status', 'confirmed'),
    supabase
      .from('revenue_entries')
      .select('category, amount')
      .eq('date', date),
    supabase
      .from('expense_entries')
      .select('amount, expense_categories(name)')
      .eq('date', date),
    // Kantin revenue for the whole month
    supabase
      .from('revenue_entries')
      .select('amount')
      .eq('category', 'kantin')
      .gte('date', monthStart)
      .lte('date', monthEndDate),
    // Kantin expenses for the whole month
    supabase
      .from('expense_entries')
      .select('amount, expense_categories(name)')
      .gte('date', monthStart)
      .lte('date', monthEndDate),
  ])

  const categories: Record<string, number> = {
    mini_soccer: 0,
    kantin: 0,
    ps: 0,
    sewa_sepatu: 0,
    photography: 0,
  }

  // Mini soccer from bookings
  for (const b of bookings ?? []) {
    categories.mini_soccer += b.total_price || 0
  }

  // Manual revenue entries
  for (const r of revenueEntries ?? []) {
    if (categories[r.category] !== undefined) {
      categories[r.category] += r.amount
    }
  }

  // Expenses
  let totalExpenses = 0
  let kantinExpenses = 0
  for (const e of expenseEntries ?? []) {
    totalExpenses += e.amount
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const catName = ((e as any).expense_categories?.name as string) ?? ''
    if (catName.toLowerCase().includes('kantin')) {
      kantinExpenses += e.amount
    }
  }

  const totalRevenue = Object.values(categories).reduce((s, v) => s + v, 0)

  // Kantin monthly cumulative
  let kantinMonthlyRevenue = 0
  for (const r of kantinRevenueMonthly ?? []) {
    kantinMonthlyRevenue += r.amount
  }
  let kantinMonthlyExpenses = 0
  for (const e of kantinExpensesMonthly ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const catName = ((e as any).expense_categories?.name as string) ?? ''
    if (catName.toLowerCase().includes('kantin')) {
      kantinMonthlyExpenses += e.amount
    }
  }

  return NextResponse.json({
    date,
    categories,
    total_revenue: totalRevenue,
    total_expenses: totalExpenses,
    kantin_expenses: kantinExpenses,
    kantin_monthly: {
      revenue: kantinMonthlyRevenue,
      expenses: kantinMonthlyExpenses,
      net: kantinMonthlyRevenue - kantinMonthlyExpenses,
    },
    net: totalRevenue - totalExpenses,
  })
}
