-- Link auto-generated follow-up voucher to booking
ALTER TABLE bookings ADD COLUMN followup_voucher_id UUID REFERENCES vouchers(id);
