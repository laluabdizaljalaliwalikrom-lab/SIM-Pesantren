-- =========================================================================
-- SQL MIGRATION: ADD FOTO PIMPINAN TO PESANTREN PROFILE
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

-- 1. Tambahkan kolom foto_pimpinan_url ke public.pesantren_profile jika belum ada
ALTER TABLE public.pesantren_profile ADD COLUMN IF NOT EXISTS foto_pimpinan_url TEXT;

-- Berikan komentar pada kolom untuk kejelasan
COMMENT ON COLUMN public.pesantren_profile.foto_pimpinan_url IS 'URL foto pimpinan pesantren yang disimpan di Supabase Storage';
