    -- ==========================================
    -- SIM Pesantren
    -- Migration: Add kartu_belakang_teks to pesantren_profile
    -- ==========================================

    ALTER TABLE public.pesantren_profile ADD COLUMN IF NOT EXISTS kartu_belakang_teks TEXT;

    COMMENT ON COLUMN public.pesantren_profile.kartu_belakang_teks IS 'Teks custom untuk bagian belakang kartu pegawai';
