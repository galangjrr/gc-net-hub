-- 009: Pay-first booking checkout.
-- Only paid bookings take a queue spot, ordered by paid_at. Unpaid ones expire:
-- online after 15 minutes, kasir after 30 minutes (see src/lib/booking-rules.ts).
-- Additive only: no existing data is changed except backfilling paid_at for already-paid rows.

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'kasir';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS invoice_sent_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_method_check CHECK (payment_method IN ('online', 'kasir'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE public.bookings SET paid_at = created_at WHERE payment_status = 'paid' AND paid_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_unpaid_created ON public.bookings (created_at) WHERE payment_status = 'unpaid';
