-- Add google_event_id to bookings for Google Calendar sync
ALTER TABLE bookings ADD COLUMN google_event_id TEXT;
