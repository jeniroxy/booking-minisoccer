// scripts/delete-seeded-data.mjs
// Delete all historical financial data seeded from spreadsheet
// Usage: node scripts/delete-seeded-data.mjs

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function deleteSeededData() {
  console.log('=== Deleting seeded historical data ===\n')

  // 1. Delete revenue entries with spreadsheet notes
  console.log('1. Deleting seeded revenue entries...')
  const { data: revDeleted, error: revErr } = await supabase
    .from('revenue_entries')
    .delete()
    .like('notes', '%dari spreadsheet%')
    .select('id, date, category, amount')

  if (revErr) console.error('  ERROR:', revErr.message)
  else {
    for (const r of revDeleted || []) {
      console.log(`  ✓ Deleted ${r.date} ${r.category}: Rp${r.amount.toLocaleString('id-ID')}`)
    }
    console.log(`  Total: ${revDeleted?.length || 0} revenue entries deleted`)
  }

  // 2. Delete expense entries with seeded descriptions
  console.log('\n2. Deleting seeded expense entries...')
  const { data: expDeleted, error: expErr } = await supabase
    .from('expense_entries')
    .delete()
    .or('description.like.%Pengeluaran bulanan%,description.like.%Pengeluaran kantin%')
    .select('id, date, amount, description')

  if (expErr) console.error('  ERROR:', expErr.message)
  else {
    for (const e of expDeleted || []) {
      console.log(`  ✓ Deleted ${e.date}: Rp${e.amount.toLocaleString('id-ID')} - ${e.description}`)
    }
    console.log(`  Total: ${expDeleted?.length || 0} expense entries deleted`)
  }

  // 3. Delete capital expenses (Beli Tanah)
  console.log('\n3. Deleting seeded capital expenses...')
  const { data: capDeleted, error: capErr } = await supabase
    .from('capital_expenses')
    .delete()
    .eq('description', 'Beli Tanah')
    .select('id, date, amount, description')

  if (capErr) console.error('  ERROR:', capErr.message)
  else {
    for (const c of capDeleted || []) {
      console.log(`  ✓ Deleted ${c.date}: Rp${c.amount.toLocaleString('id-ID')} - ${c.description}`)
    }
    console.log(`  Total: ${capDeleted?.length || 0} capital expenses deleted`)
  }

  // 4. Verification
  console.log('\n=== Remaining data ===')
  const { count: revCount } = await supabase.from('revenue_entries').select('*', { count: 'exact', head: true })
  const { count: expCount } = await supabase.from('expense_entries').select('*', { count: 'exact', head: true })
  const { count: capCount } = await supabase.from('capital_expenses').select('*', { count: 'exact', head: true })
  console.log(`Revenue entries: ${revCount}`)
  console.log(`Expense entries: ${expCount}`)
  console.log(`Capital expenses: ${capCount}`)

  console.log('\n=== Done! ===')
}

deleteSeededData().catch(console.error)
