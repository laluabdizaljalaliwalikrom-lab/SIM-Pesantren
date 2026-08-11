-- ==========================================
-- SIM Pesantren
-- Migration: Create Table 'absensi_pegawai'
-- ==========================================

CREATE TABLE IF NOT EXISTS public.absensi_pegawai (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_pegawai UUID REFERENCES public.pegawai(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam_masuk TIMESTAMP WITH TIME ZONE,
    jam_keluar TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'Hadir'
        CHECK (status IN ('Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpha')),
    keterangan TEXT,
    lokasi_lat DECIMAL(10, 8),
    lokasi_lng DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_absensi_pegawai_harian UNIQUE (id_pegawai, tanggal)
);

ALTER TABLE public.absensi_pegawai ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select for absensi_pegawai" ON public.absensi_pegawai;
DROP POLICY IF EXISTS "Allow public all for absensi_pegawai" ON public.absensi_pegawai;

CREATE POLICY "Allow public select for absensi_pegawai" ON public.absensi_pegawai FOR SELECT USING (true);
CREATE POLICY "Allow public all for absensi_pegawai" ON public.absensi_pegawai FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_absensi_pegawai_tanggal ON public.absensi_pegawai(tanggal);
CREATE INDEX IF NOT EXISTS idx_absensi_pegawai_pegawai ON public.absensi_pegawai(id_pegawai);

COMMENT ON TABLE public.absensi_pegawai IS 'Tabel Pencatatan Absensi Pegawai Harian via QR';
