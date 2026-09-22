-- Migrasi: Pembuatan Tabel Staff Resmi GC-Net (Pengganti hack lama di tabel inventory)
-- Jalankan di SQL Editor Supabase Dashboard

-- 1. Buat tabel staff khusus
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator', -- 'owner', 'admin', 'operator'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index untuk pencarian cepat saat login
CREATE INDEX IF NOT EXISTS idx_staff_username ON public.staff (username);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- 4. KUNCI TOTAL: DILARANG ADA AKSES PUBLIK
-- Tanpa policy SELECT/INSERT/UPDATE untuk public, tabel ini otomatis terisolasi 100%
-- Hanya Next.js backend via supabaseAdmin (Service Role Key) yang bisa membaca dan memvalidasi password staff.
