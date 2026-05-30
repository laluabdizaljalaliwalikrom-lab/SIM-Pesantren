-- =========================================================================
-- SQL MIGRATION: CREATE TABLE ABSENSI SHOLAT 5 WAKTU
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.absensi_sholat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_santri UUID REFERENCES public.santri(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE DEFAULT CURRENT_DATE NOT NULL,
    waktu_sholat VARCHAR(10) CHECK (waktu_sholat IN ('Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya')) NOT NULL,
    status VARCHAR(15) CHECK (status IN ('Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpha')) DEFAULT 'Hadir' NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    id_musyrif UUID REFERENCES public.pegawai(id) ON DELETE SET NULL,
    CONSTRAINT unique_absensi_sholat_santri_waktu UNIQUE (id_santri, tanggal, waktu_sholat)
);

-- Enable RLS
ALTER TABLE public.absensi_sholat ENABLE ROW LEVEL SECURITY;

-- Enable Public Policies
DROP POLICY IF EXISTS "Allow public select for absensi_sholat" ON public.absensi_sholat;
DROP POLICY IF EXISTS "Allow public all for absensi_sholat" ON public.absensi_sholat;

CREATE POLICY "Allow public select for absensi_sholat" ON public.absensi_sholat FOR SELECT USING (true);
CREATE POLICY "Allow public all for absensi_sholat" ON public.absensi_sholat FOR ALL USING (true);

COMMENT ON TABLE public.absensi_sholat IS 'Tabel Absensi Kehadiran Sholat Jamaah 5 Waktu';
