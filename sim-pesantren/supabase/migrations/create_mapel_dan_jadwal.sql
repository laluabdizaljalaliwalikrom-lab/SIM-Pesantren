-- ==========================================
-- SISTEM INFORMASI MANAJEMEN PESANTREN (SIM Pesantren)
-- Migration: Create Tables 'mata_pelajaran' & 'jadwal_pelajaran'
-- Supabase / PostgreSQL
-- ==========================================

-- 1. Tabel Mata Pelajaran
CREATE TABLE IF NOT EXISTS public.mata_pelajaran (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kode_mapel TEXT UNIQUE NOT NULL,
    nama_mapel TEXT NOT NULL,
    kategori TEXT CHECK (kategori IN ('Diniyah/Pesantren', 'Umum', 'Kitab Kuning', 'Bahasa')) NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabel Jadwal Pelajaran
CREATE TABLE IF NOT EXISTS public.jadwal_pelajaran (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_kelas UUID REFERENCES public.kelas(id) ON DELETE CASCADE NOT NULL,
    id_mapel UUID REFERENCES public.mata_pelajaran(id) ON DELETE CASCADE NOT NULL,
    id_guru UUID REFERENCES public.pegawai(id) ON DELETE SET NULL,
    hari TEXT CHECK (hari IN ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad')) NOT NULL,
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    ruangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT jadwal_bentrok UNIQUE (id_kelas, hari, jam_mulai)
);

-- 3. Enable RLS
ALTER TABLE public.mata_pelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jadwal_pelajaran ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Allow public select for mata_pelajaran" ON public.mata_pelajaran;
DROP POLICY IF EXISTS "Allow public all for mata_pelajaran" ON public.mata_pelajaran;
DROP POLICY IF EXISTS "Allow public select for jadwal_pelajaran" ON public.jadwal_pelajaran;
DROP POLICY IF EXISTS "Allow public all for jadwal_pelajaran" ON public.jadwal_pelajaran;

CREATE POLICY "Allow public select for mata_pelajaran" ON public.mata_pelajaran FOR SELECT USING (true);
CREATE POLICY "Allow public all for mata_pelajaran" ON public.mata_pelajaran FOR ALL USING (true);
CREATE POLICY "Allow public select for jadwal_pelajaran" ON public.jadwal_pelajaran FOR SELECT USING (true);
CREATE POLICY "Allow public all for jadwal_pelajaran" ON public.jadwal_pelajaran FOR ALL USING (true);

-- 5. Comment on tables
COMMENT ON TABLE public.mata_pelajaran IS 'Tabel Master Mata Pelajaran Pesantren';
COMMENT ON TABLE public.jadwal_pelajaran IS 'Tabel Jadwal Mingguan Pembelajaran per Kelas';
