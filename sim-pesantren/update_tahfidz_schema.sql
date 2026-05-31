-- =========================================================================
-- SQL MIGRATION: UPDATE TAHFIDZ SCHEMA & CREATE HADITS/MATAN REFERENCE TABLES
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

-- 1. Create Reference Tables for Hadits & Matan
CREATE TABLE IF NOT EXISTS public.ref_hadits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_kitab TEXT NOT NULL UNIQUE,
    jumlah_hadits INTEGER NOT NULL CHECK (jumlah_hadits > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ref_matan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_kitab TEXT NOT NULL UNIQUE,
    jumlah_bait INTEGER NOT NULL CHECK (jumlah_bait > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for ref_hadits and ref_matan
ALTER TABLE public.ref_hadits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_matan ENABLE ROW LEVEL SECURITY;

-- Select Policies for ref_hadits and ref_matan
DROP POLICY IF EXISTS "Allow public select for ref_hadits" ON public.ref_hadits;
CREATE POLICY "Allow public select for ref_hadits" ON public.ref_hadits FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public select for ref_matan" ON public.ref_matan;
CREATE POLICY "Allow public select for ref_matan" ON public.ref_matan FOR SELECT USING (true);

-- Management Policies for ref_hadits and ref_matan (Admin and Pengasuh can manage)
DROP POLICY IF EXISTS "Allow admin and pengasuh manage ref_hadits" ON public.ref_hadits;
CREATE POLICY "Allow admin and pengasuh manage ref_hadits" ON public.ref_hadits
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pengasuh')
        )
    );

DROP POLICY IF EXISTS "Allow admin and pengasuh manage ref_matan" ON public.ref_matan;
CREATE POLICY "Allow admin and pengasuh manage ref_matan" ON public.ref_matan
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pengasuh')
        )
    );

-- Seed initial data for ref_hadits
INSERT INTO public.ref_hadits (nama_kitab, jumlah_hadits)
VALUES 
    ('Arba''in Nawawi', 42),
    ('Riyadhus Shalihin', 1896)
ON CONFLICT (nama_kitab) DO UPDATE SET jumlah_hadits = EXCLUDED.jumlah_hadits;

-- Seed initial data for ref_matan
INSERT INTO public.ref_matan (nama_kitab, jumlah_bait)
VALUES 
    ('Tuhfatul Athfal', 61),
    ('Al-Jazariyah', 109)
ON CONFLICT (nama_kitab) DO UPDATE SET jumlah_bait = EXCLUDED.jumlah_bait;


-- 2. Add New Columns to public.presensi_tahfidz
ALTER TABLE public.presensi_tahfidz ADD COLUMN IF NOT EXISTS tipe_setoran TEXT NOT NULL DEFAULT 'quran';
ALTER TABLE public.presensi_tahfidz ADD COLUMN IF NOT EXISTS penyimak TEXT;
ALTER TABLE public.presensi_tahfidz ADD COLUMN IF NOT EXISTS jenis_setoran TEXT;
ALTER TABLE public.presensi_tahfidz ADD COLUMN IF NOT EXISTS ayat_mulai INTEGER;
ALTER TABLE public.presensi_tahfidz ADD COLUMN IF NOT EXISTS catatan TEXT;
ALTER TABLE public.presensi_tahfidz ADD COLUMN IF NOT EXISTS kitab_hadits_matan TEXT;
ALTER TABLE public.presensi_tahfidz ADD COLUMN IF NOT EXISTS hadits_ke INTEGER;
ALTER TABLE public.presensi_tahfidz ADD COLUMN IF NOT EXISTS jilid_tahsin INTEGER;
ALTER TABLE public.presensi_tahfidz ADD COLUMN IF NOT EXISTS halaman_tahsin INTEGER;
ALTER TABLE public.presensi_tahfidz ADD COLUMN IF NOT EXISTS materi_ujian TEXT;
ALTER TABLE public.presensi_tahfidz ADD COLUMN IF NOT EXISTS nilai_custom TEXT;

-- Make existing nilai_custom column values default to nilai_kelancaran where appropriate
UPDATE public.presensi_tahfidz SET nilai_custom = nilai_kelancaran::text WHERE nilai_custom IS NULL;
