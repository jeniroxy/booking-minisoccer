-- supabase/migrations/009_ps_rental.sql

-- PS Units: each physical PlayStation console
CREATE TABLE ps_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PS4', 'PS5')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOL NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PS Pricing Rules: flexible pricing (hourly, package, promo)
CREATE TABLE ps_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('PS4', 'PS5', 'all')),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('hourly', 'package', 'promo')),
  price INT NOT NULL CHECK (price > 0),
  duration_minutes INT,
  day_types TEXT[] NOT NULL DEFAULT '{weekday,weekend}',
  valid_from DATE,
  valid_until DATE,
  priority INT NOT NULL DEFAULT 0,
  is_active BOOL NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
);

-- PS Sessions: active and completed sessions with timer state
CREATE TABLE ps_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ps_unit_id UUID NOT NULL REFERENCES ps_units(id),
  customer_name TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paused_at TIMESTAMPTZ,
  total_paused_seconds INT NOT NULL DEFAULT 0,
  ended_at TIMESTAMPTZ,
  pricing_rule_id UUID REFERENCES ps_pricing_rules(id),
  duration_minutes INT,
  base_amount INT,
  discount_amount INT NOT NULL DEFAULT 0,
  final_amount INT,
  payment_method TEXT CHECK (payment_method IS NULL OR payment_method IN ('cash', 'transfer', 'qris')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PS Bookings: advance reservations from public page
CREATE TABLE ps_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ps_unit_id UUID NOT NULL REFERENCES ps_units(id),
  customer_name TEXT NOT NULL,
  phone TEXT,
  booking_date DATE NOT NULL,
  start_hour INT NOT NULL CHECK (start_hour >= 0 AND start_hour < 24),
  duration_hours INT NOT NULL DEFAULT 1 CHECK (duration_hours >= 1 AND duration_hours <= 12),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  pricing_rule_id UUID REFERENCES ps_pricing_rules(id),
  estimated_amount INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ps_unit_id, booking_date, start_hour)
);

-- Indexes
CREATE INDEX idx_ps_sessions_unit ON ps_sessions(ps_unit_id);
CREATE INDEX idx_ps_sessions_status ON ps_sessions(status);
CREATE INDEX idx_ps_sessions_started ON ps_sessions(started_at);
CREATE INDEX idx_ps_bookings_date ON ps_bookings(booking_date, ps_unit_id);

-- Row Level Security
ALTER TABLE ps_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE ps_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ps_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ps_bookings ENABLE ROW LEVEL SECURITY;

-- ps_units: public read
CREATE POLICY "ps_units_public_read" ON ps_units
  FOR SELECT USING (true);

-- ps_pricing_rules: public read
CREATE POLICY "ps_pricing_rules_public_read" ON ps_pricing_rules
  FOR SELECT USING (true);

-- ps_sessions: public read (for availability display)
CREATE POLICY "ps_sessions_public_read" ON ps_sessions
  FOR SELECT USING (true);

-- ps_bookings: public read + insert pending
CREATE POLICY "ps_bookings_public_read" ON ps_bookings
  FOR SELECT USING (true);

CREATE POLICY "ps_bookings_public_insert_pending" ON ps_bookings
  FOR INSERT WITH CHECK (status = 'pending');

-- Seed: 7 default PS units
INSERT INTO ps_units (name, type, display_order) VALUES
  ('PS 1', 'PS4', 1),
  ('PS 2', 'PS4', 2),
  ('PS 3', 'PS4', 3),
  ('PS 4', 'PS4', 4),
  ('PS 5', 'PS4', 5),
  ('PS 6', 'PS4', 6),
  ('PS 7', 'PS4', 7);

-- Seed: default pricing rules
INSERT INTO ps_pricing_rules (name, unit_type, rule_type, price, duration_minutes, day_types, priority) VALUES
  ('Per Jam Weekday', 'all', 'hourly', 15000, NULL, '{weekday}', 0),
  ('Per Jam Weekend', 'all', 'hourly', 20000, NULL, '{weekend}', 1),
  ('Paket 3 Jam', 'all', 'package', 40000, 180, '{weekday,weekend}', 5),
  ('Paket 5 Jam', 'all', 'package', 60000, 300, '{weekday,weekend}', 5);
