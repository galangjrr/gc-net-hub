-- 012: What the customer actually paid online.
-- The online price depends on the channel (QRIS 0,7%, GoPay 2%), so the paket price alone no longer
-- tells the total. Filled from Midtrans gross_amount when the order settles; null for cash and older rows.

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS paid_amount integer;
