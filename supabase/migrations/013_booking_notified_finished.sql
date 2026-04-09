-- Track whether "play time finished" notification was sent
ALTER TABLE bookings ADD COLUMN notified_finished BOOL NOT NULL DEFAULT false;
