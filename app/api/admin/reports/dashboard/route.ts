import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getMonday(d: Date): string {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - ((day + 6) % 7))
  return date.toISOString().split('T')[0]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll(query: any): Promise<any[]> {
  const PAGE = 1000
  let page = 0
  const results: unknown[] = []
  while (true) {
    const { data, error } = await query.range(page * PAGE, (page + 1) * PAGE - 1)
    if (error) throw error
    results.push(...(data ?? []))
    if (!data || data.length < PAGE) break
    page++
  }
  return results
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
      bookings,
      revenueEntries,
      psSessions,
      expenseEntries,
      capitalExpenses,
    ] = await Promise.all([
      fetchAll(supabase.from('bookings').select('booking_date, total_price, time_slots(end_hour)').eq('status', 'confirmed')),
      fetchAll(supabase.from('revenue_entries').select('date, amount, category').gte('date', '2025-01-01')),
      fetchAll(supabase.from('ps_sessions').select('started_at, final_amount').eq('status', 'completed')),
      fetchAll(supabase.from('expense_entries').select('date, amount, expense_categories(name)').gte('date', '2025-01-01')),
      fetchAll(supabase.from('capital_expenses').select('date, amount, description, section').gte('date', '2025-01-01')),
    ])

    const isKantinCapital = (c: { section?: string | null; description?: string | null }) =>
      c.section === 'kantin' || (!c.section && (c.description || '').toLowerCase().includes('kantin'))

    // Only count bookings where play time has finished
    const jakartaHour = parseInt(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isBookingDone = (b: any) => {
      const endHour = b.time_slots?.end_hour ?? 24
      if (b.booking_date < today) return true
      if (b.booking_date === today && jakartaHour >= endHour) return true
      return false
    }
    const doneBookings = (bookings ?? []).filter(isBookingDone)

    const calcPeriod = (from: string, to: string) => {
      let revenue = 0
      let expenses = 0
      let capital = 0

      for (const b of doneBookings) {
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

    // All-time uses all confirmed bookings (not just done), since money is collected upfront
    const calcAllTime = () => {
      let revenue = 0
      let expenses = 0
      let capital = 0
      for (const b of bookings ?? []) revenue += b.total_price || 0
      for (const s of psSessions ?? []) revenue += s.final_amount || 0
      for (const r of revenueEntries ?? []) revenue += r.amount
      for (const e of expenseEntries ?? []) expenses += e.amount
      for (const c of capitalExpenses ?? []) capital += c.amount
      return { revenue, expenses, capital, net: revenue - expenses - capital }
    }
    const allTime = calcAllTime()
    const thisYear = calcPeriod(yearStart, today)
    const thisMonth = calcPeriod(monthStart, `${year}-${month}-31`)
    const thisWeek = calcPeriod(weekStart, weekEndStr)
    const todayData = calcPeriod(today, today)

    // Monthly breakdown from March 2025 up to current month, newest first
    // (excludes capital expenses — only operational income)
    const last12Months: { year: number; month: number; revenue: number; expenses: number; net: number }[] = []
    const START_YEAR = 2025
    const START_MONTH = 3
    const cursor = new Date(now.getFullYear(), now.getMonth(), 1)
    const endCursor = new Date(START_YEAR, START_MONTH - 1, 1)
    while (cursor >= endCursor) {
      const mYear = cursor.getFullYear()
      const mMonth = cursor.getMonth() + 1
      const mStr = String(mMonth).padStart(2, '0')
      const mStart = `${mYear}-${mStr}-01`
      const mNextMonth = mMonth === 12
        ? `${mYear + 1}-01-01`
        : `${mYear}-${String(mMonth + 1).padStart(2, '0')}-01`
      const mEnd = new Date(new Date(mNextMonth).getTime() - 86400000).toISOString().split('T')[0]
      const period = calcPeriod(mStart, mEnd)
      last12Months.push({
        year: mYear,
        month: mMonth,
        revenue: period.revenue,
        expenses: period.expenses,
        net: period.revenue - period.expenses,
      })
      cursor.setMonth(cursor.getMonth() - 1)
    }

    // Mini Soccer this month breakdown by category
    const mEnd = `${year}-${month}-31`
    const catBreakdown: Record<string, number> = {}
    let msExpenses = 0
    let msCapital = 0

    // Bookings = mini_soccer
    for (const b of doneBookings) {
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

    // All-time cutoff: only include data up to end of March 2026
    const ALL_TIME_CUTOFF = '2026-03-31'

    // All-time Mini Soccer (bookings + PS + non-kantin revenue_entries - non-kantin expenses - non-kantin capital)
    let msAllRevenue = 0
    let msAllExpenses = 0
    let msAllCapital = 0
    for (const b of doneBookings) {
      if (b.booking_date <= ALL_TIME_CUTOFF) msAllRevenue += b.total_price || 0
    }
    for (const s of psSessions ?? []) {
      const d = new Date(s.started_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
      if (d <= ALL_TIME_CUTOFF) msAllRevenue += s.final_amount || 0
    }
    for (const r of revenueEntries ?? []) {
      if (r.category !== 'kantin' && r.date <= ALL_TIME_CUTOFF) msAllRevenue += r.amount
    }
    for (const e of expenseEntries ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const catName = ((e as any).expense_categories?.name as string) ?? ''
      if (!catName.toLowerCase().includes('kantin') && e.date <= ALL_TIME_CUTOFF) msAllExpenses += e.amount
    }
    for (const c of capitalExpenses ?? []) {
      if (c.date <= ALL_TIME_CUTOFF && !isKantinCapital(c)) msAllCapital += c.amount
    }

    // All-time Kantin
    let kAllRevenue = 0
    let kAllExpenses = 0
    let kAllCapital = 0
    for (const r of revenueEntries ?? []) {
      if (r.category === 'kantin' && r.date <= ALL_TIME_CUTOFF) kAllRevenue += r.amount
    }
    for (const e of expenseEntries ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const catName = ((e as any).expense_categories?.name as string) ?? ''
      if (catName.toLowerCase().includes('kantin') && e.date <= ALL_TIME_CUTOFF) kAllExpenses += e.amount
    }
    for (const c of capitalExpenses ?? []) {
      if (c.date <= ALL_TIME_CUTOFF && isKantinCapital(c)) kAllCapital += c.amount
    }

    return NextResponse.json({
      all_time: allTime,
      this_year: thisYear,
      this_month: thisMonth,
      this_week: thisWeek,
      today: todayData,
      minisoccer_month: { revenue: msRevenue, expenses: msExpenses + msCapital, net: msRevenue - msExpenses - msCapital, categories: catBreakdown },
      kantin_month: { revenue: kantinRevenue, expenses: kantinExpenses, net: kantinRevenue - kantinExpenses },
      minisoccer_all_time: { revenue: msAllRevenue, expenses: msAllExpenses, capital: msAllCapital, net: msAllRevenue - msAllExpenses - msAllCapital },
      kantin_all_time: { revenue: kAllRevenue, expenses: kAllExpenses, capital: kAllCapital, net: kAllRevenue - kAllExpenses - kAllCapital },
      last_12_months: last12Months,
      capital_expenses_list: [...capitalExpenses]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(c => ({ date: c.date, description: c.description, amount: c.amount, section: c.section })),
      _debug: {
        v: 2,
        counts: {
          bookings: bookings.length,
          revenue_entries: revenueEntries.length,
          ps_sessions: psSessions.length,
          expense_entries: expenseEntries.length,
          capital_expenses: capitalExpenses.length,
        },
      },
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('Dashboard API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
