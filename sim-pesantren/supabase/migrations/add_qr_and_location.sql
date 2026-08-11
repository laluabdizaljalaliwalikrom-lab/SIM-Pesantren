-- ==========================================
-- SIM Pesantren
-- Migration: Add QR code & geofencing columns
-- ==========================================

-- 1. Add qr_code_url to pegawai
ALTER TABLE public.pegawai ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- 2. Add geofencing columns to pesantren_profile
ALTER TABLE public.pesantren_profile ADD COLUMN IF NOT EXISTS jam_batas_masuk TIME DEFAULT '07:30';
ALTER TABLE public.pesantren_profile ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE public.pesantren_profile ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE public.pesantren_profile ADD COLUMN IF NOT EXISTS radius_meter INTEGER DEFAULT 500;

COMMENT ON COLUMN public.pegawai.qr_code_url IS 'Data URL (base64) QR code pegawai untuk absensi';
COMMENT ON COLUMN public.pesantren_profile.jam_batas_masuk IS 'Jam batas waktu masuk pegawai (di atas ini = terlambat)';
COMMENT ON COLUMN public.pesantren_profile.latitude IS 'Latitude pusat lokasi pesantren untuk geofencing';
COMMENT ON COLUMN public.pesantren_profile.longitude IS 'Longitude pusat lokasi pesantren untuk geofencing';
COMMENT ON COLUMN public.pesantren_profile.radius_meter IS 'Radius geofencing dalam meter';
