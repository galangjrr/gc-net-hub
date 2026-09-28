-- 008: The publishable (anon) key ships in the browser bundle, so anything it can read or write is public.
-- Every booking, log, settings and member write already goes through Next.js API routes with the secret key
-- (service role bypasses RLS), so the public key only needs: read pcs, pakets, inventory (catalog shown on
-- the site, realtime on pcs) and a member reading their own profile after Supabase Auth login.
--
-- Found open on 2026-09-28 with the public key alone:
--   * members: email, phone and balance of every member readable ("Public can view member public info")
--   * members: a logged-in member could PATCH their own balance (UPDATE policy checked only the row owner)
--   * logs: all revenue rows with player names readable
--   * bookings: anyone could insert fake bookings

ALTER TABLE IF EXISTS public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.members  ENABLE ROW LEVEL SECURITY;

-- Policy names differ between the old hardening scripts, so drop whatever exists on these tables.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('bookings', 'logs', 'settings')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

-- Members keep only "read my own row". Profile edits go through /api/member/profile.
DROP POLICY IF EXISTS "Public can view member public info" ON public.members;
DROP POLICY IF EXISTS "Public members are viewable by everyone" ON public.members;
DROP POLICY IF EXISTS "Members can update own profile except balance" ON public.members;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.members;
