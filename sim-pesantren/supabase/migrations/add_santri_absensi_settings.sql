-- ==========================================
-- Migration: Add Santri Attendance Setting Columns to pesantren_profile
-- ==========================================

ALTER TABLE public.pesantren_profile 
ADD COLUMN IF NOT EXISTS jam_batas_masuk_santri TEXT DEFAULT '07:00';

ALTER TABLE public.pesantren_profile 
ADD COLUMN IF NOT EXISTS jam_batas_pulang_santri TEXT DEFAULT '14:00';

COMMENT ON COLUMN public.pesantren_profile.jam_batas_masuk_santri IS 'Jam batas toleransi masuk santri (Hadir vs Terlambat)';
COMMENT ON COLUMN public.pesantren_profile.jam_batas_pulang_santri IS 'Jam minimal checkout/absen pulang santri';
