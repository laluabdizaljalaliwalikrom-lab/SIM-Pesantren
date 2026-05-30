-- =========================================================================
-- SQL MIGRATION: ADD MODUL GEDUNG AND INTEGRATE WITH KAMAR
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

-- 1. Create table 'gedung'
CREATE TABLE IF NOT EXISTS public.gedung (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_gedung TEXT NOT NULL,
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on 'gedung'
ALTER TABLE public.gedung ENABLE ROW LEVEL SECURITY;

-- Enable public CRUD access policies on 'gedung'
DROP POLICY IF EXISTS "Allow public select for gedung" ON public.gedung;
DROP POLICY IF EXISTS "Allow public insert for gedung" ON public.gedung;
DROP POLICY IF EXISTS "Allow public update for gedung" ON public.gedung;
DROP POLICY IF EXISTS "Allow public delete for gedung" ON public.gedung;

CREATE POLICY "Allow public select for gedung" ON public.gedung FOR SELECT USING (true);
CREATE POLICY "Allow public insert for gedung" ON public.gedung FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for gedung" ON public.gedung FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete for gedung" ON public.gedung FOR DELETE USING (true);

-- 2. Add 'id_gedung' column to 'kamar' table if not exists
ALTER TABLE public.kamar
  ADD COLUMN IF NOT EXISTS id_gedung UUID REFERENCES public.gedung(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.kamar.id_gedung IS 'Referensi ke tabel gedung (asrama)';

-- 3. Row-Level Security (RLS) policies for table 'kamar'
ALTER TABLE public.kamar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select for kamar" ON public.kamar;
DROP POLICY IF EXISTS "Allow public insert for kamar" ON public.kamar;
DROP POLICY IF EXISTS "Allow public update for kamar" ON public.kamar;
DROP POLICY IF EXISTS "Allow public delete for kamar" ON public.kamar;

CREATE POLICY "Allow public select for kamar" ON public.kamar FOR SELECT USING (true);
CREATE POLICY "Allow public insert for kamar" ON public.kamar FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for kamar" ON public.kamar FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete for kamar" ON public.kamar FOR DELETE USING (true);

