// scripts/seed-historical-data.mjs
// Seed historical financial data from Google Spreadsheet rekap pemasukan 2025
// Usage: node scripts/seed-historical-data.mjs

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function seed() {
  console.log('=== Seeding historical financial data ===\n')

  // 1. Revenue entries: Mini Soccer 2025
  console.log('1. Inserting Mini Soccer revenue 2025...')
  const miniSoccerRevenue = [
    { date: '2025-03-01', category: 'mini_soccer', amount: 6957000,  notes: 'Rekap bulanan Maret 2025 dari spreadsheet' },
    { date: '2025-04-01', category: 'mini_soccer', amount: 16388000, notes: 'Rekap bulanan April 2025 dari spreadsheet' },
    { date: '2025-05-01', category: 'mini_soccer', amount: 15643000, notes: 'Rekap bulanan Mei 2025 dari spreadsheet' },
    { date: '2025-06-01', category: 'mini_soccer', amount: 14057500, notes: 'Rekap bulanan Juni 2025 dari spreadsheet' },
    { date: '2025-07-01', category: 'mini_soccer', amount: 14019000, notes: 'Rekap bulanan Juli 2025 dari spreadsheet' },
    { date: '2025-08-01', category: 'mini_soccer', amount: 18595000, notes: 'Rekap bulanan Agustus 2025 dari spreadsheet' },
    { date: '2025-09-01', category: 'mini_soccer', amount: 18062000, notes: 'Rekap bulanan September 2025 dari spreadsheet' },
    { date: '2025-10-01', category: 'mini_soccer', amount: 20182000, notes: 'Rekap bulanan Oktober 2025 dari spreadsheet' },
    { date: '2025-11-01', category: 'mini_soccer', amount: 20398500, notes: 'Rekap bulanan November 2025 dari spreadsheet' },
    { date: '2025-12-01', category: 'mini_soccer', amount: 18144000, notes: 'Rekap bulanan Desember 2025 dari spreadsheet' },
  ]

  for (const entry of miniSoccerRevenue) {
    const { error } = await supabase.from('revenue_entries').upsert(entry, { onConflict: 'date,category' })
    if (error) console.error(`  ERROR ${entry.date}:`, error.message)
    else console.log(`  ✓ ${entry.date}: Rp${entry.amount.toLocaleString('id-ID')}`)
  }

  // 2. Revenue entries: Kantin 2025
  console.log('\n2. Inserting Kantin revenue 2025...')
  const kantinRevenue = [
    { date: '2025-04-01', category: 'kantin', amount: 3348000,  notes: 'Rekap bulanan April 2025 dari spreadsheet' },
    { date: '2025-05-01', category: 'kantin', amount: 1640000,  notes: 'Rekap bulanan Mei 2025 dari spreadsheet' },
    { date: '2025-06-01', category: 'kantin', amount: 1683500,  notes: 'Rekap bulanan Juni 2025 dari spreadsheet' },
    { date: '2025-07-01', category: 'kantin', amount: 4743000,  notes: 'Rekap bulanan Juli 2025 dari spreadsheet' },
    { date: '2025-08-01', category: 'kantin', amount: 2621000,  notes: 'Rekap bulanan Agustus 2025 dari spreadsheet' },
    { date: '2025-09-01', category: 'kantin', amount: 4370000,  notes: 'Rekap bulanan September 2025 dari spreadsheet' },
    { date: '2025-10-01', category: 'kantin', amount: 2719000,  notes: 'Rekap bulanan Oktober 2025 dari spreadsheet' },
    { date: '2025-11-01', category: 'kantin', amount: 4859500,  notes: 'Rekap bulanan November 2025 dari spreadsheet' },
    { date: '2025-12-01', category: 'kantin', amount: 2748000,  notes: 'Rekap bulanan Desember 2025 dari spreadsheet' },
  ]

  for (const entry of kantinRevenue) {
    const { error } = await supabase.from('revenue_entries').upsert(entry, { onConflict: 'date,category' })
    if (error) console.error(`  ERROR ${entry.date}:`, error.message)
    else console.log(`  ✓ ${entry.date}: Rp${entry.amount.toLocaleString('id-ID')}`)
  }

  // 3. Create expense categories
  console.log('\n3. Creating expense categories...')
  const categories = [
    { name: 'Operasional', is_active: true, sort_order: 1 },
    { name: 'Operasional Kantin', is_active: true, sort_order: 2 },
  ]

  const categoryIds = {}
  for (const cat of categories) {
    // Try insert, if exists fetch the existing one
    const { data, error } = await supabase.from('expense_categories').upsert(cat, { onConflict: 'name' }).select().single()
    if (error) {
      // Fetch existing
      const { data: existing } = await supabase.from('expense_categories').select().eq('name', cat.name).single()
      if (existing) {
        categoryIds[cat.name] = existing.id
        console.log(`  ✓ ${cat.name}: ${existing.id} (already exists)`)
      } else {
        console.error(`  ERROR ${cat.name}:`, error.message)
      }
    } else {
      categoryIds[cat.name] = data.id
      console.log(`  ✓ ${cat.name}: ${data.id}`)
    }
  }

  // 4. Expense entries: Mini Soccer monthly expenses 2025
  console.log('\n4. Inserting Mini Soccer expenses 2025...')
  const operasionalId = categoryIds['Operasional']
  if (!operasionalId) {
    console.error('  ERROR: Operasional category not found!')
  } else {
    const miniSoccerExpenses = [
      { date: '2025-04-01', expense_category_id: operasionalId, amount: 6826000,  description: 'Pengeluaran bulanan April 2025' },
      { date: '2025-05-01', expense_category_id: operasionalId, amount: 7845000,  description: 'Pengeluaran bulanan Mei 2025' },
      { date: '2025-06-01', expense_category_id: operasionalId, amount: 7384000,  description: 'Pengeluaran bulanan Juni 2025' },
      { date: '2025-07-01', expense_category_id: operasionalId, amount: 8560000,  description: 'Pengeluaran bulanan Juli 2025' },
      { date: '2025-08-01', expense_category_id: operasionalId, amount: 12283000, description: 'Pengeluaran bulanan Agustus 2025' },
      { date: '2025-09-01', expense_category_id: operasionalId, amount: 6646000,  description: 'Pengeluaran bulanan September 2025' },
      { date: '2025-10-01', expense_category_id: operasionalId, amount: 3277000,  description: 'Pengeluaran bulanan Oktober 2025' },
      { date: '2025-11-01', expense_category_id: operasionalId, amount: 4188000,  description: 'Pengeluaran bulanan November 2025' },
      { date: '2025-12-01', expense_category_id: operasionalId, amount: 5218000,  description: 'Pengeluaran bulanan Desember 2025' },
    ]

    for (const entry of miniSoccerExpenses) {
      const { error } = await supabase.from('expense_entries').insert(entry)
      if (error) console.error(`  ERROR ${entry.date}:`, error.message)
      else console.log(`  ✓ ${entry.date}: Rp${entry.amount.toLocaleString('id-ID')}`)
    }
  }

  // 5. Expense entries: Kantin monthly expenses 2025
  console.log('\n5. Inserting Kantin expenses 2025...')
  const kantinId = categoryIds['Operasional Kantin']
  if (!kantinId) {
    console.error('  ERROR: Operasional Kantin category not found!')
  } else {
    const kantinExpenses = [
      { date: '2025-01-01', expense_category_id: kantinId, amount: 22000000, description: 'Pengeluaran kantin Januari 2025 (modal awal)' },
      { date: '2025-07-01', expense_category_id: kantinId, amount: 2000000,  description: 'Pengeluaran kantin Juli 2025' },
      { date: '2025-08-01', expense_category_id: kantinId, amount: 2000000,  description: 'Pengeluaran kantin Agustus 2025' },
      { date: '2025-09-01', expense_category_id: kantinId, amount: 2000000,  description: 'Pengeluaran kantin September 2025' },
      { date: '2025-10-01', expense_category_id: kantinId, amount: 12000000, description: 'Pengeluaran kantin Oktober 2025' },
      { date: '2025-11-01', expense_category_id: kantinId, amount: 2000000,  description: 'Pengeluaran kantin November 2025' },
      { date: '2025-12-01', expense_category_id: kantinId, amount: 2000000,  description: 'Pengeluaran kantin Desember 2025' },
    ]

    for (const entry of kantinExpenses) {
      const { error } = await supabase.from('expense_entries').insert(entry)
      if (error) console.error(`  ERROR ${entry.date}:`, error.message)
      else console.log(`  ✓ ${entry.date}: Rp${entry.amount.toLocaleString('id-ID')}`)
    }
  }

  // 6. Capital expenses: Land purchases
  console.log('\n6. Inserting capital expenses (Beli Tanah)...')
  const capitalExpenses = [
    { date: '2025-08-18', description: 'Beli Tanah', amount: 20000000, notes: 'Pembelian tanah 18 Agustus 2025' },
    { date: '2025-12-14', description: 'Beli Tanah', amount: 20000000, notes: 'Pembelian tanah 14 Desember 2025' },
  ]

  for (const entry of capitalExpenses) {
    const { error } = await supabase.from('capital_expenses').insert(entry)
    if (error) console.error(`  ERROR ${entry.date}:`, error.message)
    else console.log(`  ✓ ${entry.date}: Rp${entry.amount.toLocaleString('id-ID')} - ${entry.description}`)
  }

  // 7. Summary verification
  console.log('\n=== Verification ===')

  const { count: revCount } = await supabase.from('revenue_entries').select('*', { count: 'exact', head: true })
  console.log(`Revenue entries: ${revCount}`)

  const { count: expCount } = await supabase.from('expense_entries').select('*', { count: 'exact', head: true })
  console.log(`Expense entries: ${expCount}`)

  const { count: capCount } = await supabase.from('capital_expenses').select('*', { count: 'exact', head: true })
  console.log(`Capital expenses: ${capCount}`)

  const { data: revTotal } = await supabase.from('revenue_entries').select('amount')
  const totalRev = revTotal?.reduce((sum, r) => sum + r.amount, 0) || 0
  console.log(`Total revenue: Rp${totalRev.toLocaleString('id-ID')}`)

  console.log('\n=== Done! ===')
}

seed().catch(console.error)
