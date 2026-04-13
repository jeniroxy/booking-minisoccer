import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'finance'])
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
  const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`

  const supabase = createAdminClient()

  const [
    { data: bookings },
    { data: revenueEntries },
    { data: psSessions },
    { data: expenseEntries },
  ] = await Promise.all([
    supabase.from('bookings').select('booking_date, total_price, time_slots(end_hour)')
      .eq('status', 'confirmed')
      .gte('booking_date', monthStart)
      .lt('booking_date', nextMonth),
    supabase.from('revenue_entries').select('*')
      .gte('date', monthStart)
      .lt('date', nextMonth),
    supabase.from('ps_sessions').select('started_at, final_amount')
      .eq('status', 'completed')
      .gte('started_at', `${monthStart}T00:00:00+07:00`)
      .lt('started_at', `${nextMonth}T00:00:00+07:00`),
    supabase.from('expense_entries').select('*, expense_categories(name)')
      .gte('date', monthStart)
      .lt('date', nextMonth),
  ])

  // Build daily breakdown
  const lastDay = new Date(new Date(nextMonth).getTime() - 86400000)
  const daysInMonth = lastDay.getDate()
  const days: Record<string, Record<string, number>> = {}

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days[dateStr] = { mini_soccer: 0, kantin: 0, ps: 0, sewa_sepatu: 0, photography: 0 }
  }

  // Populate bookings (only count finished ones)
  const now = new Date()
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const jakartaHour = parseInt(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false }))
  for (const b of bookings ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const endHour = (b as any).time_slots?.end_hour ?? 24
    const done = b.booking_date < todayStr || (b.booking_date === todayStr && jakartaHour >= endHour)
    if (done && days[b.booking_date]) {
      days[b.booking_date].mini_soccer += b.total_price || 0
    }
  }

  // Populate PS sessions
  for (const s of psSessions ?? []) {
    const dateStr = new Date(s.started_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    if (days[dateStr]) {
      days[dateStr].ps += s.final_amount || 0
    }
  }

  // Populate revenue entries
  for (const r of revenueEntries ?? []) {
    if (days[r.date] && days[r.date][r.category] !== undefined) {
      days[r.date][r.category] += r.amount
    }
  }

  // Expenses by category + daily expenses
  const expensesByCategory: Record<string, number> = {}
  const expensesByDay: Record<string, Record<string, number>> = {}
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    expensesByDay[dateStr] = { mini_soccer: 0, kantin: 0 }
  }
  for (const e of expenseEntries ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const catName = ((e as any).expense_categories?.name as string) ?? 'Lainnya'
    expensesByCategory[catName] = (expensesByCategory[catName] || 0) + e.amount
    if (expensesByDay[e.date]) {
      if (catName.toLowerCase().includes('kantin')) {
        expensesByDay[e.date].kantin += e.amount
      } else {
        expensesByDay[e.date].mini_soccer += e.amount
      }
    }
  }

  const totalRevenue = Object.values(days).reduce((sum, d) =>
    sum + Object.values(d).reduce((s, v) => s + v, 0), 0)
  const totalExpenses = Object.values(expensesByCategory).reduce((sum, v) => sum + v, 0)

  return NextResponse.json({
    year,
    month,
    days,
    expenses_by_day: expensesByDay,
    expenses_by_category: expensesByCategory,
    total_revenue: totalRevenue,
    total_expenses: totalExpenses,
    balance: totalRevenue - totalExpenses,
  })
}
