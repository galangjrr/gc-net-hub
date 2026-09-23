-- Migrasi: Pembuatan Tabel Chat Messages Realtime GC-Net
-- Jalankan di SQL Editor Supabase Dashboard (https://supabase.com/dashboard/project/wbuqekmigjqnrtxwkgjx/sql)

-- 1. Buat tabel chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL DEFAULT 'member', -- 'member', 'operator'
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN NOT NULL DEFAULT false
);

-- 2. Index untuk query cepat berdasarkan waktu dan pengirim
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages (created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages (sender_id);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. Policy RLS untuk akses publik (member dan kasir)
CREATE POLICY "Allow public read chat_messages" ON public.chat_messages
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert chat_messages" ON public.chat_messages
    FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 5. Aktifkan Supabase Realtime untuk tabel chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
