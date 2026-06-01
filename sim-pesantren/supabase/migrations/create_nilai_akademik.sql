-- ==========================================
-- SISTEM INFORMASI MANAJEMEN PESANTREN (SIM Pesantren)
-- Migration: Create Table 'nilai_akademik'
-- Supabase / PostgreSQL
-- ==========================================

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.nilai_akademik (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_santri UUID REFERENCES public.santri(id) ON DELETE CASCADE NOT NULL,
    id_kelas UUID REFERENCES public.kelas(id) ON DELETE CASCADE NOT NULL,
    mata_pelajaran TEXT NOT NULL,
    nilai NUMERIC NOT NULL CHECK (nilai >= 0 AND nilai <= 100),
    catatan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (id_santri, id_kelas, mata_pelajaran)
);

-- 2. Enable RLS
ALTER TABLE public.nilai_akademik ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Allow public select for nilai_akademik" ON public.nilai_akademik;
DROP POLICY IF EXISTS "Allow public upsert for nilai_akademik" ON public.nilai_akademik;
DROP POLICY IF EXISTS "Allow public update for nilai_akademik" ON public.nilai_akademik;
DROP POLICY IF EXISTS "Allow public delete for nilai_akademik" ON public.nilai_akademik;

CREATE POLICY "Allow public select for nilai_akademik" ON public.nilai_akademik FOR SELECT USING (true);
CREATE POLICY "Allow public upsert for nilai_akademik" ON public.nilai_akademik FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for nilai_akademik" ON public.nilai_akademik FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete for nilai_akademik" ON public.nilai_akademik FOR DELETE USING (true);

-- 4. Comment on table
COMMENT ON TABLE public.nilai_akademik IS 'Menyimpan riwayat nilai akademik santri per kelas dan mata pelajaran';
