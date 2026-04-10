-- Track which admin confirmed each booking
ALTER TABLE bookings
  ADD COLUMN confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN confirmed_at TIMESTAMPTZ;

CREATE INDEX idx_bookings_confirmed_by ON bookings(confirmed_by);
