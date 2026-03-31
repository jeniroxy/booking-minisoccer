-- Track which voucher was used on a booking (for single-use per team validation)
ALTER TABLE bookings ADD COLUMN voucher_id UUID REFERENCES vouchers(id);
