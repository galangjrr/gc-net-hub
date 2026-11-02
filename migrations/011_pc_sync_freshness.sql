-- 011: Freshness stamp for the GBilling watcher feed.
-- The booking page trusts PC timers only while this is recent; stale = watcher/internet down,
-- so the UI flags times as not-live instead of showing a confidently wrong number.

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS pc_synced_at timestamptz;
