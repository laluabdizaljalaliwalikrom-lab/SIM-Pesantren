-- ==========================================
-- SIM Pesantren
-- Migration: Add nuptk column (Dapodik)
-- ==========================================

-- Kolom NUPTK untuk identitas unik pegawai Dapodik
-- (terpisah dari NIP; dipakai untuk pencocokan data saat import Dapodik)
ALTER TABLE public.pegawai ADD COLUMN IF NOT EXISTS nuptk TEXT UNIQUE;

COMMENT ON COLUMN public.pegawai.nuptk IS 'Nomor Unik Pendidik dan Tenaga Kependidikan (Dapodik)';
