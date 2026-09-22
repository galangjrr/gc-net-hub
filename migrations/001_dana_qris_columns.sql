-- DANA QRIS Integration: Add columns to bookings table
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'kasir';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dana_partner_ref text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dana_reference_no text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dana_qr_content text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dana_payment_verified boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dana_paid_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dana_paid_amount numeric;

-- Index for webhook lookups by partner reference
CREATE INDEX IF NOT EXISTS idx_bookings_dana_partner_ref ON bookings (dana_partner_ref) WHERE dana_partner_ref IS NOT NULL;

-- Verify
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'bookings' AND column_name LIKE 'dana_%'
ORDER BY ordinal_position;
