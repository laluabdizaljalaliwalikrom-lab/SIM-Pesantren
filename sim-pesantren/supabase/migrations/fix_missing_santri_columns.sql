-- =========================================================================
-- SQL MIGRATION: ADD MISSING COLUMNS (jenis_kelamin, tempat_lahir, alamat, foto_url) TO TABLE 'public.santri'
-- Run this script inside your Supabase Dashboard SQL Editor to resolve the missing column errors.
-- =========================================================================

-- 1. Add missing columns to 'public.santri'
ALTER TABLE public.santri
  ADD COLUMN IF NOT EXISTS jenis_kelamin TEXT CHECK (jenis_kelamin IN ('L', 'P')),
  ADD COLUMN IF NOT EXISTS tempat_lahir TEXT,
  ADD COLUMN IF NOT EXISTS alamat TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- 2. Add comments for clarity
COMMENT ON COLUMN public.santri.jenis_kelamin IS 'Jenis kelamin santri (L/P)';
COMMENT ON COLUMN public.santri.tempat_lahir IS 'Tempat lahir santri';
COMMENT ON COLUMN public.santri.alamat IS 'Alamat domisili lengkap/jalan/dusun santri';
COMMENT ON COLUMN public.santri.foto_url IS 'URL foto profil santri yang disimpan di Supabase Storage';

-- 3. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
