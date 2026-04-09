import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function getMonday(d: Date): string {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - ((day + 6) % 7))
  return date.toISOString().split('T')[0]
}

export async function GET() {
  const auth = await requireRole(['admin', 'finance'])
  if (auth.error) return auth.error

  try {
    const supabase = createAdminClient()
    const now = new Date()
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const yearStart = `${year}-01-01`
    const monthStart = `${year}-${month}-01`
    const weekStart = getMonday(now)
    const weekEndDate = new Date(weekStart + 'T00:00:00')
    weekEndDate.setDate(weekEndDate.getDate() + 6)
    const weekEndStr = weekEndDate.toISOString().split('T')[0]

    const [
      { data: bookings },
      { data: revenueEntries },
      { data: psSessions },
      { data: expenseEntries },
      { data: capitalExpenses },
    ] = await Promise.all([
      supabase.from('bookings').select('booking_date, total_price').eq('status', 'confirmed'),
      supabase.from('revenue_entries').select('date, amount, category'),
      supabase.from('ps_sessions').select('started_at, final_amount').eq('status', 'completed'),
      supabase.from('expense_entries').select('date, amount, expense_categories(name)'),
      supabase.from('capital_expenses').select('date, amount'),
    ])

    const calcPeriod = (from: string, to: string) => {
      let revenue = 0
      let expenses = 0
      let capital = 0

      for (const b of bookings ?? []) {
        if (b.booking_date >= from && b.booking_date <= to) revenue += b.total_price || 0
      }
      for (const s of psSessions ?? []) {
        const d = new Date(s.started_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
        if (d >= from && d <= to) revenue += s.final_amount || 0
      }
      for (const r of revenueEntries ?? []) {
        if (r.date >= from && r.date <= to) revenue += r.amount
      }
      for (const e of expenseEntries ?? []) {
        if (e.date >= from && e.date <= to) expenses += e.amount
      }
      for (const c of capitalExpenses ?? []) {
        if (c.date >= from && c.date <= to) capital += c.amount
      }

      return { revenue, expenses, capital, net: revenue - expenses - capital }
    }

    const allTime = calcPeriod('0000-01-01', '9999-12-31')
    const thisYear = calcPeriod(yearStart, `${year}-12-31`)
    const thisMonth = calcPeriod(monthStart, `${year}-${month}-31`)
    const thisWeek = calcPeriod(weekStart, weekEndStr)
    const todayData = calcPeriod(today, today)

    // Last 12 months breakdown
    const last12Months: { year: number; month: number; revenue: number; expenses: number; net: number }[] = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mYear = d.getFullYear()
      const mMonth = d.getMonth() + 1
      const mStr = String(mMonth).padStart(2, '0')
      const mStart = `${mYear}-${mStr}-01`
      const mNextMonth = mMonth === 12
        ? `${mYear + 1}-01-01`
        : `${mYear}-${String(mMonth + 1).padStart(2, '0')}-01`
      const mEnd = new Date(new Date(mNextMonth).getTime() - 86400000).toISOString().split('T')[0]
      const period = calcPeriod(mStart, mEnd)
      last12Months.push({ year: mYear, month: mMonth, revenue: period.revenue, expenses: period.expenses + period.capital, net: period.net })
    }

    // Mini Soccer this month breakdown by category
    const mEnd = `${year}-${month}-31`
    const catBreakdown: Record<string, number> = {}
    let msExpenses = 0
    let msCapital = 0

    // Bookings = mini_soccer
    for (const b of bookings ?? []) {
      if (b.booking_date >= monthStart && b.booking_date <= mEnd) {
        catBreakdown['mini_soccer'] = (catBreakdown['mini_soccer'] || 0) + (b.total_price || 0)
      }
    }
    // PS sessions
    for (const s of psSessions ?? []) {
      const d = new Date(s.started_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
      if (d >= monthStart && d <= mEnd) {
        catBreakdown['ps'] = (catBreakdown['ps'] || 0) + (s.final_amount || 0)
      }
    }
    // Revenue entries (non-kantin)
    for (const r of revenueEntries ?? []) {
      if (r.date >= monthStart && r.date <= mEnd && r.category !== 'kantin') {
        catBreakdown[r.category] = (catBreakdown[r.category] || 0) + r.amount
      }
    }
    // Expenses (non-kantin)
    for (const e of expenseEntries ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const catName = ((e as any).expense_categories?.name as string) ?? ''
      const isKantin = catName.toLowerCase().includes('kantin')
      if (e.date >= monthStart && e.date <= mEnd && !isKantin) {
        msExpenses += e.amount
      }
    }
    for (const c of capitalExpenses ?? []) {
      if (c.date >= monthStart && c.date <= mEnd) msCapital += c.amount
    }

    const msRevenue = Object.values(catBreakdown).reduce((a, b) => a + b, 0)

    // Kantin this month: revenue kantin - expense kantin
    let kantinRevenue = 0
    let kantinExpenses = 0
    for (const r of revenueEntries ?? []) {
      if (r.category === 'kantin' && r.date >= monthStart && r.date <= `${year}-${month}-31`) {
        kantinRevenue += r.amount
      }
    }
    for (const e of expenseEntries ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const catName = ((e as any).expense_categories?.name as string) ?? ''
      if (catName.toLowerCase().includes('kantin') && e.date >= monthStart && e.date <= `${year}-${month}-31`) {
        kantinExpenses += e.amount
      }
    }

    return NextResponse.json({
      all_time: allTime,
      this_year: thisYear,
      this_month: thisMonth,
      this_week: thisWeek,
      today: todayData,
      minisoccer_month: { revenue: msRevenue, expenses: msExpenses + msCapital, net: msRevenue - msExpenses - msCapital, categories: catBreakdown },
      kantin_month: { revenue: kantinRevenue, expenses: kantinExpenses, net: kantinRevenue - kantinExpenses },
      last_12_months: last12Months,
    })
  } catch (err) {
    console.error('Dashboard API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
