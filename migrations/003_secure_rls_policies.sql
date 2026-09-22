-- 1. AKTIFKAN RLS PADA SEMUA TABEL UTAMA
ALTER TABLE IF EXISTS public.pcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pakets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings ENABLE ROW LEVEL SECURITY;

-- 2. TABEL PCS: Publik boleh BACA (agar status PC muncul di web), modifikasi hanya via Service Role / Backend
DROP POLICY IF EXISTS "Allow public read pcs" ON public.pcs;
CREATE POLICY "Allow public read pcs" ON public.pcs 
FOR SELECT USING (true);

-- 3. TABEL PAKETS: Publik boleh BACA daftar harga paket
DROP POLICY IF EXISTS "Allow public read pakets" ON public.pakets;
CREATE POLICY "Allow public read pakets" ON public.pakets 
FOR SELECT USING (true);

-- 4. TABEL BOOKINGS: 
-- Publik boleh BACA antrean untuk melihat status antrean di web
DROP POLICY IF EXISTS "Allow public read bookings" ON public.bookings;
CREATE POLICY "Allow public read bookings" ON public.bookings 
FOR SELECT USING (true);

-- Publik boleh MEMBUAT booking baru (status awal 'pending')
DROP POLICY IF EXISTS "Allow public insert bookings" ON public.bookings;
CREATE POLICY "Allow public insert bookings" ON public.bookings 
FOR INSERT WITH CHECK (true);

-- PERHATIKAN: TIDAK ADA POLICY UPDATE ATAU DELETE UNTUK PUBLIK DI TABEL BOOKINGS!
-- Artinya, user dari browser TIDAK BISA mengubah status booking jadi active atau menghapusnya.
-- Perubahan status HANYA bisa dilakukan oleh kasir/admin lewat endpoint Next.js backend kita.

-- 5. TABEL INVENTORY: Publik boleh BACA produk F&B (makanan/minuman), tapi sembunyikan staff_account
DROP POLICY IF EXISTS "Allow public read inventory products" ON public.inventory;
CREATE POLICY "Allow public read inventory products" ON public.inventory 
FOR SELECT USING (category != 'staff_account');

-- 6. TABEL SETTINGS: Publik boleh BACA pengaturan tampilan warnet
DROP POLICY IF EXISTS "Allow public read settings" ON public.settings;
CREATE POLICY "Allow public read settings" ON public.settings 
FOR SELECT USING (true);
