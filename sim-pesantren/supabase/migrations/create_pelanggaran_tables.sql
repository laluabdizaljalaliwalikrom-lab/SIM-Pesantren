-- =========================================================================
-- SQL MIGRATION: CREATE DISCIPLINE/INFRACTION TABLES (PELANGGARAN)
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

-- 1. Table: Master Jenis Pelanggaran
CREATE TABLE IF NOT EXISTS public.master_pelanggaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_pelanggaran TEXT NOT NULL UNIQUE,
    kategori VARCHAR(10) CHECK (kategori IN ('Ringan', 'Sedang', 'Berat')) NOT NULL,
    poin INTEGER DEFAULT 0 CHECK (poin >= 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on master table
ALTER TABLE public.master_pelanggaran ENABLE ROW LEVEL SECURITY;

-- Enable Public RLS Policies
DROP POLICY IF EXISTS "Allow public select for master_pelanggaran" ON public.master_pelanggaran;
DROP POLICY IF EXISTS "Allow public all for master_pelanggaran" ON public.master_pelanggaran;

CREATE POLICY "Allow public select for master_pelanggaran" ON public.master_pelanggaran FOR SELECT USING (true);
CREATE POLICY "Allow public all for master_pelanggaran" ON public.master_pelanggaran FOR ALL USING (true);


-- 2. Table: Catatan Pelanggaran Santri
CREATE TABLE IF NOT EXISTS public.pelanggaran_santri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_santri UUID REFERENCES public.santri(id) ON DELETE CASCADE NOT NULL,
    id_pelanggaran UUID REFERENCES public.master_pelanggaran(id) ON DELETE RESTRICT NOT NULL,
    catatan TEXT,
    id_pelapor UUID REFERENCES public.pegawai(id) ON DELETE SET NULL,
    tanggal TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on infraction records table
ALTER TABLE public.pelanggaran_santri ENABLE ROW LEVEL SECURITY;

-- Enable Public RLS Policies
DROP POLICY IF EXISTS "Allow public select for pelanggaran_santri" ON public.pelanggaran_santri;
DROP POLICY IF EXISTS "Allow public all for pelanggaran_santri" ON public.pelanggaran_santri;

CREATE POLICY "Allow public select for pelanggaran_santri" ON public.pelanggaran_santri FOR SELECT USING (true);
CREATE POLICY "Allow public all for pelanggaran_santri" ON public.pelanggaran_santri FOR ALL USING (true);


-- 3. Seed initial master data (only if empty)
INSERT INTO public.master_pelanggaran (nama_pelanggaran, kategori, poin)
VALUES
    ('Terlambat Sholat Berjamaah', 'Ringan', 2),
    ('Tidur Saat Jam Pelajaran KBM', 'Ringan', 3),
    ('Membuang Sampah Sembarangan', 'Ringan', 3),
    ('Keluar Kompleks Asrama Tanpa Izin (Kabur Singkat)', 'Sedang', 15),
    ('Membawa HP / Gadget Ilegal', 'Sedang', 25),
    ('Merokok di Lingkungan Pesantren', 'Sedang', 30),
    ('Perkelahian / Baku Hantam', 'Berat', 50),
    ('Pencurian Barang Milik Teman', 'Berat', 75),
    ('Meninggalkan Pesantren Tanpa Izin > 24 Jam', 'Berat', 100)
ON CONFLICT (nama_pelanggaran) DO NOTHING;

COMMENT ON TABLE public.master_pelanggaran IS 'Tabel Master Poin Kategori Pelanggaran Santri';
COMMENT ON TABLE public.pelanggaran_santri IS 'Tabel Transaksi Log Catatan Pelanggaran Santri Harian';
