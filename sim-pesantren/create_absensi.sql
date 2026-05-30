-- ==========================================
-- SISTEM INFORMASI MANAJEMEN PESANTREN (SIM Pesantren)
-- Migration: Create Table 'absensi'
-- Supabase / PostgreSQL
-- ==========================================

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.absensi (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_jadwal UUID REFERENCES public.jadwal_pelajaran(id) ON DELETE CASCADE NOT NULL,
    id_santri UUID REFERENCES public.santri(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT CHECK (status IN ('Hadir', 'Sakit', 'Izin', 'Alpha')) NOT NULL DEFAULT 'Hadir',
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_absensi_santri_jadwal UNIQUE (id_jadwal, id_santri, tanggal)
);

-- 2. Enable RLS
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Allow public select for absensi" ON public.absensi;
DROP POLICY IF EXISTS "Allow public all for absensi" ON public.absensi;

CREATE POLICY "Allow public select for absensi" ON public.absensi FOR SELECT USING (true);
CREATE POLICY "Allow public all for absensi" ON public.absensi FOR ALL USING (true);

-- 4. Comment on table
COMMENT ON TABLE public.absensi IS 'Tabel Pencatatan Absensi KBM Santri Harian';
