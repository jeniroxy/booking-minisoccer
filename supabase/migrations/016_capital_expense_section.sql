-- Add section column to capital_expenses to classify between mini_soccer and kantin
ALTER TABLE capital_expenses
  ADD COLUMN section TEXT NOT NULL DEFAULT 'mini_soccer'
    CHECK (section IN ('mini_soccer', 'kantin'));

CREATE INDEX idx_capital_expenses_section ON capital_expenses(section);

-- Backfill: entries with "kantin" in description are Kantin, rest are Mini Soccer
UPDATE capital_expenses SET section = 'kantin'
  WHERE lower(description) LIKE '%kantin%';
