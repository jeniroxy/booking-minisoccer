import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const fmt = (n) => `Rp ${n.toLocaleString('id-ID')}`

// Bookings April 2026
const { data: bookings } = await supabase.from('bookings')
  .select('booking_date, total_price, status')
  .gte('booking_date', '2026-04-01').lt('booking_date', '2026-05-01')
  .eq('status', 'confirmed').order('booking_date')
const bookingTotal = bookings?.reduce((s, b) => s + (b.total_price || 0), 0) ?? 0
console.log(`\nBookings (Mini Soccer): ${fmt(bookingTotal)} (${bookings?.length} entries)`)
bookings?.forEach(b => console.log(`  ${b.date ?? b.booking_date}: ${fmt(b.total_price)}`))

// PS Sessions April 2026
const { data: ps } = await supabase.from('ps_sessions')
  .select('started_at, final_amount')
  .gte('started_at', '2026-04-01T00:00:00+07:00')
  .lt('started_at', '2026-05-01T00:00:00+07:00')
  .eq('status', 'completed')
const psTotal = ps?.reduce((s, p) => s + (p.final_amount || 0), 0) ?? 0
console.log(`\nPS Sessions: ${fmt(psTotal)} (${ps?.length} entries)`)

// Revenue entries April 2026
const { data: rev } = await supabase.from('revenue_entries')
  .select('date, category, amount, description')
  .gte('date', '2026-04-01').lt('date', '2026-05-01').order('date')
const revByCategory = {}
rev?.forEach(r => { revByCategory[r.category] = (revByCategory[r.category] || 0) + r.amount })
const revTotal = Object.values(revByCategory).reduce((s, v) => s + v, 0)
console.log(`\nRevenue Entries: ${fmt(revTotal)}`)
Object.entries(revByCategory).forEach(([cat, amt]) => console.log(`  ${cat}: ${fmt(amt)}`))
if (rev?.length) {
  console.log('  Detail:')
  rev.forEach(r => console.log(`    ${r.date} [${r.category}] ${r.description ?? ''}: ${fmt(r.amount)}`))
}

// Expense entries April 2026
const { data: exp } = await supabase.from('expense_entries')
  .select('date, amount, description, expense_categories(name)')
  .gte('date', '2026-04-01').lt('date', '2026-05-01').order('date')
const expTotal = exp?.reduce((s, e) => s + e.amount, 0) ?? 0
console.log(`\nExpense Entries: ${fmt(expTotal)}`)
exp?.forEach(e => console.log(`  ${e.date} [${e.expense_categories?.name}] ${e.description ?? ''}: ${fmt(e.amount)}`))

// Capital expenses April 2026
const { data: cap } = await supabase.from('capital_expenses')
  .select('date, amount, description, section')
  .gte('date', '2026-04-01').lt('date', '2026-05-01').order('date')
const capTotal = cap?.reduce((s, c) => s + c.amount, 0) ?? 0
console.log(`\nCapital Expenses: ${fmt(capTotal)}`)
cap?.forEach(c => console.log(`  ${c.date} [${c.section ?? 'ms'}] ${c.description}: ${fmt(c.amount)}`))

// Summary
const totalRev = bookingTotal + psTotal + revTotal
const totalExp = expTotal + capTotal
console.log(`\n========== SUMMARY APRIL 2026 ==========`)
console.log(`Total Masuk : ${fmt(totalRev)}`)
console.log(`Total Keluar: ${fmt(totalExp)}`)
console.log(`Net         : ${fmt(totalRev - totalExp)}`)
