-- supabase/migrations/002_vouchers.sql

-- Vouchers table: discount codes managed by admin
CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'nominal')),
  discount_value INT NOT NULL CHECK (discount_value > 0),
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  is_active BOOL NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_range CHECK (valid_until >= valid_from)
);

CREATE INDEX idx_vouchers_code ON vouchers(code);

-- Row Level Security
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- Public can read active vouchers (needed for client-side validation)
CREATE POLICY "vouchers_public_read" ON vouchers
  FOR SELECT USING (true);
