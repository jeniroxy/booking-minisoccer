-- supabase/migrations/002_price_overrides.sql

CREATE TABLE slot_price_overrides (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date         DATE NOT NULL,
  time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  price        INT  NOT NULL CHECK (price > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date, time_slot_id)
);

CREATE INDEX idx_price_overrides_date ON slot_price_overrides(date);

ALTER TABLE slot_price_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_overrides_public_read" ON slot_price_overrides
  FOR SELECT USING (true);
