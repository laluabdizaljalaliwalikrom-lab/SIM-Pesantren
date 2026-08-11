-- ==========================================
-- SIM Pesantren
-- Migration: Add 'hari_kerja' to pesantren_profile
-- Hari libur mingguan tidak dihitung sebagai Alpha
-- ==========================================

ALTER TABLE public.pesantren_profile ADD COLUMN IF NOT EXISTS hari_kerja INTEGER[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6];

COMMENT ON COLUMN public.pesantren_profile.hari_kerja IS 'Hari kerja dalam seminggu (0=Ahad/Minggu, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu). Hari yang tidak terdaftar dianggap libur mingguan.';
