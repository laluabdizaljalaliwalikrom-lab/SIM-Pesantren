-- ==========================================
-- SIM Pesantren
-- Migration: Create Table 'absensi_santri' & Add QR Code to Santri
-- ==========================================

-- 1. Add qr_code_url column to santri table if not exists
ALTER TABLE public.santri ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
COMMENT ON COLUMN public.santri.qr_code_url IS 'Data URL (base64) QR code santri untuk absensi';

-- 2. Create Table absensi_santri
CREATE TABLE IF NOT EXISTS public.absensi_santri (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_santri UUID REFERENCES public.santri(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam_masuk TIMESTAMP WITH TIME ZONE,
    jam_keluar TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'Hadir'
        CHECK (status IN ('Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpha')),
    keterangan TEXT,
    lokasi_lat DECIMAL(10, 8),
    lokasi_lng DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_absensi_santri_harian UNIQUE (id_santri, tanggal)
);

ALTER TABLE public.absensi_santri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select for absensi_santri" ON public.absensi_santri;
DROP POLICY IF EXISTS "Allow public all for absensi_santri" ON public.absensi_santri;

CREATE POLICY "Allow public select for absensi_santri" ON public.absensi_santri FOR SELECT USING (true);
CREATE POLICY "Allow public all for absensi_santri" ON public.absensi_santri FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_absensi_santri_tanggal ON public.absensi_santri(tanggal);
CREATE INDEX IF NOT EXISTS idx_absensi_santri_santri ON public.absensi_santri(id_santri);

COMMENT ON TABLE public.absensi_santri IS 'Tabel Pencatatan Absensi Santri Harian via QR';
