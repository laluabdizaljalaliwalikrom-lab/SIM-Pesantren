-- ==========================================
-- SIM Pesantren
-- Migration: Add jam_batas_pulang to pesantren_profile
-- ==========================================

ALTER TABLE public.pesantren_profile ADD COLUMN IF NOT EXISTS jam_batas_pulang TIME DEFAULT '12:00';

COMMENT ON COLUMN public.pesantren_profile.jam_batas_pulang IS 'Jam minimal absen pulang (scan keluar sebelum jam ini ditolak)';
