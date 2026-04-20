-- 019_recurring_schedules.sql

CREATE TABLE recurring_schedules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name     TEXT NOT NULL,
  phone         TEXT,
  customer_type TEXT NOT NULL DEFAULT 'umum' CHECK (customer_type IN ('umum', 'pelajar')),
  time_slot_id  UUID NOT NULL REFERENCES time_slots(id),
  day_of_week   INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Minggu, 6=Sabtu
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_day ON recurring_schedules(day_of_week);
CREATE INDEX idx_recurring_slot ON recurring_schedules(time_slot_id);

ALTER TABLE bookings
  ADD COLUMN recurring_schedule_id UUID REFERENCES recurring_schedules(id) ON DELETE SET NULL;

ALTER TABLE notification_settings
  ADD COLUMN notify_recurring_conflict BOOL NOT NULL DEFAULT true;
