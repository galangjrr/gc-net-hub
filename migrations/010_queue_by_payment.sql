-- 010: Pay-first queue allows several paid players waiting for one PC, served in order of paid_at.
-- The old "one pending queue booking per PC" index let an unpaid (possibly spam) booking lock a PC,
-- and would have rejected a second player whose money had already settled.
-- One player actually seated per PC is still enforced by uq_bookings_one_active_per_pc.
--
-- Rollback: CREATE UNIQUE INDEX uq_bookings_one_pending_queue_per_pc ON public.bookings (pc_id)
--           WHERE status = 'pending' AND booking_type = 'queue' AND pc_id IS NOT NULL;

DROP INDEX IF EXISTS public.uq_bookings_one_pending_queue_per_pc;
