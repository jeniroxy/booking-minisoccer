-- supabase/migrations/001_initial.sql

-- Time slots: template of daily operating hours
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_hour INT NOT NULL CHECK (start_hour >= 0 AND start_hour < 24),
  end_hour INT NOT NULL CHECK (end_hour > start_hour AND end_hour <= 24),
  price INT NOT NULL CHECK (price > 0),
  is_active BOOL NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bookings: one row per booking request
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL,
  booking_date DATE NOT NULL,
  time_slot_id UUID NOT NULL REFERENCES time_slots(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blocked dates: admin blocks a day or specific slot
CREATE TABLE blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time_slot_id UUID REFERENCES time_slots(id), -- NULL = full day block
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_bookings_date_slot ON bookings(booking_date, time_slot_id);
CREATE INDEX idx_blocked_dates_date ON blocked_dates(date);

-- Row Level Security
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

-- time_slots: public read
CREATE POLICY "time_slots_public_read" ON time_slots
  FOR SELECT USING (true);

-- bookings: public can read (needed for schedule display) and insert pending only
CREATE POLICY "bookings_public_read" ON bookings
  FOR SELECT USING (true);

CREATE POLICY "bookings_public_insert_pending" ON bookings
  FOR INSERT WITH CHECK (status = 'pending');

-- blocked_dates: public read
CREATE POLICY "blocked_dates_public_read" ON blocked_dates
  FOR SELECT USING (true);

-- Seed: default time slots 06:00 - 23:00
INSERT INTO time_slots (start_hour, end_hour, price) VALUES
  (6,  7,  80000),
  (7,  8,  80000),
  (8,  9,  80000),
  (9,  10, 80000),
  (10, 11, 80000),
  (11, 12, 80000),
  (12, 13, 90000),
  (13, 14, 90000),
  (14, 15, 90000),
  (15, 16, 90000),
  (16, 17, 100000),
  (17, 18, 100000),
  (18, 19, 100000),
  (19, 20, 100000),
  (20, 21, 120000),
  (21, 22, 120000),
  (22, 23, 120000);
