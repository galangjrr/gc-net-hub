-- Migrasi: Pembuatan Tabel Members Terintegrasi Supabase Auth & Persiapan GC-Hub Desktop
-- Jalankan di SQL Editor Supabase Dashboard

-- 1. Buat tabel members
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    balance NUMERIC DEFAULT 0,
    gc_user_id TEXT UNIQUE, -- Persiapan mapping ke SQLite Users.UserId di GC-Hub Desktop
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_members_username ON public.members (username);
CREATE INDEX IF NOT EXISTS idx_members_gc_user_id ON public.members (gc_user_id);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- 4. Policy RLS:
-- Siapapun yang terautentikasi bisa membaca data profil publik (username, avatar)
CREATE POLICY "Public members are viewable by everyone" 
ON public.members FOR SELECT 
USING (true);

-- User hanya bisa update profil mereka sendiri
CREATE POLICY "Users can update their own profile" 
ON public.members FOR UPDATE 
USING (auth.uid() = id);

-- 5. Trigger otomatis: saat user register via auth.users, buat record di public.members
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  raw_username TEXT;
BEGIN
  -- Ambil username dari user_metadata jika ada, kalau tidak ambil dari bagian depan email
  raw_username := COALESCE(
    new.raw_user_meta_data->>'username', 
    SPLIT_PART(new.email, '@', 1)
  );

  INSERT INTO public.members (id, email, username, full_name, phone)
  VALUES (
    new.id,
    new.email,
    raw_username,
    COALESCE(new.raw_user_meta_data->>'full_name', raw_username),
    new.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pasang trigger ke auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Tambahkan relasi member_id di tabel bookings (opsional nullable untuk backwards-compatibility)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES public.members(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_member_id ON public.bookings (member_id);
