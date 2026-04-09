-- supabase/migrations/011_seed_historical_financial_data.sql
-- Seed historical financial data from Google Spreadsheet rekap pemasukan 2025
-- Source: https://docs.google.com/spreadsheets/d/1eb7ktH-Wq8eqgUZ8_MhZ4QyfBQHUUvq0SBVL0TZuA0o

-- ============================================================
-- 1. Revenue entries: Mini Soccer 2025 (monthly totals on 1st)
-- ============================================================
INSERT INTO revenue_entries (date, category, amount, notes) VALUES
  ('2025-03-01', 'mini_soccer', 6957000,  'Rekap bulanan Maret 2025 dari spreadsheet'),
  ('2025-04-01', 'mini_soccer', 16388000, 'Rekap bulanan April 2025 dari spreadsheet'),
  ('2025-05-01', 'mini_soccer', 15643000, 'Rekap bulanan Mei 2025 dari spreadsheet'),
  ('2025-06-01', 'mini_soccer', 14057500, 'Rekap bulanan Juni 2025 dari spreadsheet'),
  ('2025-07-01', 'mini_soccer', 14019000, 'Rekap bulanan Juli 2025 dari spreadsheet'),
  ('2025-08-01', 'mini_soccer', 18595000, 'Rekap bulanan Agustus 2025 dari spreadsheet'),
  ('2025-09-01', 'mini_soccer', 18062000, 'Rekap bulanan September 2025 dari spreadsheet'),
  ('2025-10-01', 'mini_soccer', 20182000, 'Rekap bulanan Oktober 2025 dari spreadsheet'),
  ('2025-11-01', 'mini_soccer', 20398500, 'Rekap bulanan November 2025 dari spreadsheet'),
  ('2025-12-01', 'mini_soccer', 18144000, 'Rekap bulanan Desember 2025 dari spreadsheet')
ON CONFLICT (date, category) DO UPDATE SET amount = EXCLUDED.amount, notes = EXCLUDED.notes, updated_at = now();

-- ============================================================
-- 2. Revenue entries: Kantin 2025 (monthly totals on 1st)
-- ============================================================
INSERT INTO revenue_entries (date, category, amount, notes) VALUES
  ('2025-04-01', 'kantin', 3348000,  'Rekap bulanan April 2025 dari spreadsheet'),
  ('2025-05-01', 'kantin', 1640000,  'Rekap bulanan Mei 2025 dari spreadsheet'),
  ('2025-06-01', 'kantin', 1683500,  'Rekap bulanan Juni 2025 dari spreadsheet'),
  ('2025-07-01', 'kantin', 4743000,  'Rekap bulanan Juli 2025 dari spreadsheet'),
  ('2025-08-01', 'kantin', 2621000,  'Rekap bulanan Agustus 2025 dari spreadsheet'),
  ('2025-09-01', 'kantin', 4370000,  'Rekap bulanan September 2025 dari spreadsheet'),
  ('2025-10-01', 'kantin', 2719000,  'Rekap bulanan Oktober 2025 dari spreadsheet'),
  ('2025-11-01', 'kantin', 4859500,  'Rekap bulanan November 2025 dari spreadsheet'),
  ('2025-12-01', 'kantin', 2748000,  'Rekap bulanan Desember 2025 dari spreadsheet')
ON CONFLICT (date, category) DO UPDATE SET amount = EXCLUDED.amount, notes = EXCLUDED.notes, updated_at = now();

-- ============================================================
-- 3. Expense categories
-- ============================================================
INSERT INTO expense_categories (name, is_active, sort_order) VALUES
  ('Operasional', true, 1),
  ('Operasional Kantin', true, 2)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 4. Expense entries: Mini Soccer monthly expenses 2025
-- ============================================================
INSERT INTO expense_entries (date, expense_category_id, amount, description)
SELECT date_val, ec.id, amount_val, desc_val
FROM (VALUES
  ('2025-04-01'::date, 6826000,  'Pengeluaran bulanan April 2025'),
  ('2025-05-01'::date, 7845000,  'Pengeluaran bulanan Mei 2025'),
  ('2025-06-01'::date, 7384000,  'Pengeluaran bulanan Juni 2025'),
  ('2025-07-01'::date, 8560000,  'Pengeluaran bulanan Juli 2025'),
  ('2025-08-01'::date, 12283000, 'Pengeluaran bulanan Agustus 2025'),
  ('2025-09-01'::date, 6646000,  'Pengeluaran bulanan September 2025'),
  ('2025-10-01'::date, 3277000,  'Pengeluaran bulanan Oktober 2025'),
  ('2025-11-01'::date, 4188000,  'Pengeluaran bulanan November 2025'),
  ('2025-12-01'::date, 5218000,  'Pengeluaran bulanan Desember 2025')
) AS v(date_val, amount_val, desc_val)
CROSS JOIN expense_categories ec
WHERE ec.name = 'Operasional';

-- ============================================================
-- 5. Expense entries: Kantin monthly expenses 2025
-- ============================================================
INSERT INTO expense_entries (date, expense_category_id, amount, description)
SELECT date_val, ec.id, amount_val, desc_val
FROM (VALUES
  ('2025-01-01'::date, 22000000, 'Pengeluaran kantin Januari 2025 (modal awal)'),
  ('2025-07-01'::date, 2000000,  'Pengeluaran kantin Juli 2025'),
  ('2025-08-01'::date, 2000000,  'Pengeluaran kantin Agustus 2025'),
  ('2025-09-01'::date, 2000000,  'Pengeluaran kantin September 2025'),
  ('2025-10-01'::date, 12000000, 'Pengeluaran kantin Oktober 2025'),
  ('2025-11-01'::date, 2000000,  'Pengeluaran kantin November 2025'),
  ('2025-12-01'::date, 2000000,  'Pengeluaran kantin Desember 2025')
) AS v(date_val, amount_val, desc_val)
CROSS JOIN expense_categories ec
WHERE ec.name = 'Operasional Kantin';

-- ============================================================
-- 6. Capital expenses: Pembelian tanah 2025
-- ============================================================
INSERT INTO capital_expenses (date, description, amount, notes) VALUES
  ('2025-08-18', 'Beli Tanah', 20000000, 'Pembelian tanah 18 Agustus 2025'),
  ('2025-12-14', 'Beli Tanah', 20000000, 'Pembelian tanah 14 Desember 2025');
