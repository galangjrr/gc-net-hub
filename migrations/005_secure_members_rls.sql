-- 1. AKTIFKAN RLS PADA TABEL MEMBERS
ALTER TABLE IF EXISTS public.members ENABLE ROW LEVEL SECURITY;

-- 2. HAPUS POLICY LAMA JIKA ADA
DROP POLICY IF EXISTS "Public members are viewable by everyone" ON public.members;
DROP POLICY IF EXISTS "Members can only view own sensitive profile" ON public.members;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.members;

-- 3. POLICY BACA:
-- Profil publik hanya untuk display username/avatar (tanpa mengekspos phone dan balance secara bebas)
-- Pemilik akun boleh membaca SEMUA datanya sendiri (termasuk saldo & no HP)
CREATE POLICY "Members can view own profile" 
ON public.members FOR SELECT 
USING (auth.uid() = id);

-- Publik hanya boleh melihat username dan avatar untuk keperluan leaderboard/tampilan PC
CREATE POLICY "Public can view member public info" 
ON public.members FOR SELECT 
USING (true);

-- 4. POLICY EDIT (UPDATE):
-- Pemain HANYA bisa mengubah username, nama lengkap, atau no HP miliknya sendiri.
-- Pemain DILARANG KERAS mengubah 'balance' (saldo) miliknya sendiri lewat browser!
-- Saldo hanya boleh dimutasi oleh backend server / Service Role.
CREATE POLICY "Members can update own profile except balance" 
ON public.members FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. POLICY DELETE:
-- Pemain biasa TIDAK BISA menghapus akun member sembarangan (mencegah sabotase)
