-- Add customer_type column to bookings table
-- Fixes bug where category was derived from price (voucher discounts made Umum look like Pelajar)

ALTER TABLE bookings
  ADD COLUMN customer_type TEXT NOT NULL DEFAULT 'umum'
  CHECK (customer_type IN ('umum', 'pelajar'));

-- Backfill: bookings with student verification → 'pelajar'
UPDATE bookings
SET customer_type = 'pelajar'
WHERE LOWER(team_name) IN (
  SELECT DISTINCT LOWER(team_name) FROM student_verifications
);

-- Backfill: bookings without voucher where price < slot price → 'pelajar'
-- (no voucher means the discount came from student pricing, not a voucher)
UPDATE bookings b
SET customer_type = 'pelajar'
FROM time_slots ts
WHERE b.time_slot_id = ts.id
  AND b.voucher_id IS NULL
  AND b.total_price IS NOT NULL
  AND b.total_price < ts.price
  AND b.customer_type = 'umum';
