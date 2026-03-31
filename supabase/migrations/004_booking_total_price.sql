-- Add total_price column to bookings to store final price after discounts
ALTER TABLE bookings ADD COLUMN total_price INT;
