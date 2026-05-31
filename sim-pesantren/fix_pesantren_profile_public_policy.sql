-- =========================================================================
-- SQL MIGRATION: ALLOW PUBLIC SELECT FOR PESANTREN PROFILE
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

-- 1. Hapus policy SELECT lama yang membatasi hanya untuk user terautentikasi
DROP POLICY IF EXISTS "RLS: View Pesantren Profile" ON public.pesantren_profile;

-- 2. Buat policy SELECT baru yang memperbolehkan akses publik (anon & guest)
-- agar informasi logo, nama, alamat, dan kontak dapat dimuat di landing page publik.
CREATE POLICY "RLS: View Pesantren Profile" ON public.pesantren_profile
    FOR SELECT TO public USING (true);
