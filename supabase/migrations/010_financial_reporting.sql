-- supabase/migrations/010_financial_reporting.sql

-- Revenue entries: daily manual revenue input per category
CREATE TABLE revenue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('mini_soccer', 'kantin', 'ps', 'sewa_sepatu', 'photography')),
  amount INT NOT NULL CHECK (amount >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date, category)
);

-- Expense categories: user-defined (listrik, gaji, maintenance, etc.)
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOL NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expense entries: daily expense tracking per category
CREATE TABLE expense_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  expense_category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
  amount INT NOT NULL CHECK (amount >= 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Capital expenses: large expenses from cumulative balance
CREATE TABLE capital_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount INT NOT NULL CHECK (amount > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_revenue_entries_date ON revenue_entries(date);
CREATE INDEX idx_revenue_entries_category ON revenue_entries(category);
CREATE INDEX idx_expense_entries_date ON expense_entries(date);
CREATE INDEX idx_expense_entries_category ON expense_entries(expense_category_id);
CREATE INDEX idx_capital_expenses_date ON capital_expenses(date);

-- Row Level Security (admin-only for all financial tables)
ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "revenue_entries_admin_only" ON revenue_entries
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "expense_categories_admin_only" ON expense_categories
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "expense_entries_admin_only" ON expense_entries
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "capital_expenses_admin_only" ON capital_expenses
  FOR ALL USING (auth.role() = 'authenticated');
