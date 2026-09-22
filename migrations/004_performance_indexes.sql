-- Migrasi Optimasi Performa & Query Speed (B-Tree Indexes)
-- Jalankan di SQL Editor Supabase Dashboard

-- 1. Index pencarian antrean cepat berdasarkan status dan waktu dibuat
CREATE INDEX IF NOT EXISTS idx_bookings_status_created 
ON public.bookings (status, created_at DESC);

-- 2. Index pencarian booking per PC untuk mendeteksi PC sibuk/antrean
CREATE INDEX IF NOT EXISTS idx_bookings_pc_id_status 
ON public.bookings (pc_id, status);

-- 3. Index pencarian status PC dan timer habis sewa
CREATE INDEX IF NOT EXISTS idx_pcs_status_empty_time 
ON public.pcs (status, expected_empty_time);

-- 4. Index filter kategori produk inventory F&B
CREATE INDEX IF NOT EXISTS idx_inventory_category 
ON public.inventory (category);
