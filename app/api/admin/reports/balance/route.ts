import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'finance'])
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  const supabase = createAdminClient()

  const [
    { data: bookings },
    { data: revenueEntries },
    { data: psSessions },
    { data: expenseEntries },
    { data: capitalExpenses },
  ] = await Promise.all([
    supabase.from('bookings').select('booking_date, total_price')
      .eq('status', 'confirmed')
      .gte('booking_date', yearStart)
      .lte('booking_date', yearEnd),
    supabase.from('revenue_entries').select('*')
      .gte('date', yearStart)
      .lte('date', yearEnd),
    supabase.from('ps_sessions').select('started_at, final_amount')
      .eq('status', 'completed')
      .gte('started_at', `${yearStart}T00:00:00+07:00`)
      .lte('started_at', `${yearEnd}T23:59:59+07:00`),
    supabase.from('expense_entries').select('date, amount')
      .gte('date', yearStart)
      .lte('date', yearEnd),
    supabase.from('capital_expenses').select('date, amount')
      .gte('date', yearStart)
      .lte('date', yearEnd),
  ])

  // Build monthly balance
  const months: { month: number; revenue: number; expenses: number; capital: number; balance: number; cumulative: number }[] = []
  let cumulative = 0

  for (let m = 1; m <= 12; m++) {
    const mStr = String(m).padStart(2, '0')
    const mStart = `${year}-${mStr}-01`
    const mEnd = m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, '0')}-01`

    // Revenue
    let revenue = 0
    for (const b of bookings ?? []) {
      if (b.booking_date >= mStart && b.booking_date < mEnd) {
        revenue += b.total_price || 0
      }
    }
    for (const s of psSessions ?? []) {
      const dateStr = new Date(s.started_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
      if (dateStr >= mStart && dateStr < mEnd) {
        revenue += s.final_amount || 0
      }
    }
    for (const r of revenueEntries ?? []) {
      if (r.date >= mStart && r.date < mEnd) {
        revenue += r.amount
      }
    }

    // Expenses
    let expenses = 0
    for (const e of expenseEntries ?? []) {
      if (e.date >= mStart && e.date < mEnd) {
        expenses += e.amount
      }
    }

    // Capital
    let capital = 0
    for (const c of capitalExpenses ?? []) {
      if (c.date >= mStart && c.date < mEnd) {
        capital += c.amount
      }
    }

    const balance = revenue - expenses - capital
    cumulative += balance

    months.push({ month: m, revenue, expenses, capital, balance, cumulative })
  }

  const totalRevenue = months.reduce((s, m) => s + m.revenue, 0)
  const totalExpenses = months.reduce((s, m) => s + m.expenses, 0)
  const totalCapital = months.reduce((s, m) => s + m.capital, 0)

  // All-time totals (across all years)
  const [
    { data: allBookings },
    { data: allRevenue },
    { data: allPsSessions },
    { data: allExpenses },
    { data: allCapital },
  ] = await Promise.all([
    supabase.from('bookings').select('total_price').eq('status', 'confirmed'),
    supabase.from('revenue_entries').select('amount'),
    supabase.from('ps_sessions').select('final_amount').eq('status', 'completed'),
    supabase.from('expense_entries').select('amount'),
    supabase.from('capital_expenses').select('amount'),
  ])

  const allTimeRevenue =
    (allBookings ?? []).reduce((s, b) => s + (b.total_price || 0), 0) +
    (allRevenue ?? []).reduce((s, r) => s + r.amount, 0) +
    (allPsSessions ?? []).reduce((s, p) => s + (p.final_amount || 0), 0)
  const allTimeExpenses = (allExpenses ?? []).reduce((s, e) => s + e.amount, 0)
  const allTimeCapital = (allCapital ?? []).reduce((s, c) => s + c.amount, 0)
  const allTimeBalance = allTimeRevenue - allTimeExpenses - allTimeCapital

  return NextResponse.json({
    year,
    months,
    total_revenue: totalRevenue,
    total_expenses: totalExpenses,
    total_capital: totalCapital,
    final_balance: cumulative,
    all_time_balance: allTimeBalance,
  })
}
