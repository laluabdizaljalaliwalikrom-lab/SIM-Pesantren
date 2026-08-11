-- ==========================================
-- SIM Pesantren
-- Migration: Create Table 'tanggal_libur'
-- Tanggal libur untuk perhitungan absensi pegawai
-- ==========================================

CREATE TABLE IF NOT EXISTS public.tanggal_libur (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tanggal DATE NOT NULL UNIQUE,
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.tanggal_libur ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select for tanggal_libur" ON public.tanggal_libur;
DROP POLICY IF EXISTS "Allow public insert for tanggal_libur" ON public.tanggal_libur;
DROP POLICY IF EXISTS "Allow public update for tanggal_libur" ON public.tanggal_libur;
DROP POLICY IF EXISTS "Allow public delete for tanggal_libur" ON public.tanggal_libur;

CREATE POLICY "Allow public select for tanggal_libur" ON public.tanggal_libur FOR SELECT USING (true);
CREATE POLICY "Allow public insert for tanggal_libur" ON public.tanggal_libur FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for tanggal_libur" ON public.tanggal_libur FOR UPDATE USING (true);
CREATE POLICY "Allow public delete for tanggal_libur" ON public.tanggal_libur FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_tanggal_libur_tanggal ON public.tanggal_libur(tanggal);

COMMENT ON TABLE public.tanggal_libur IS 'Tabel Hari Libur Pegawai (tidak dihitung sebagai Alpha)';
