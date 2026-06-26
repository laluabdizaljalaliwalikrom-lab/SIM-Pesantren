-- =========================================================================
-- SQL MIGRATION: CREATE PPDB SCHEMA
-- Tabel untuk sistem Penerimaan Peserta Didik Baru
-- Idempotent — aman dijalankan berulang kali
-- =========================================================================

-- 1. Create ENUM types
DO $$ BEGIN
    CREATE TYPE jalur_pendaftaran AS ENUM ('reguler', 'prestasi', 'afirmasi');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE jenis_afirmasi AS ENUM ('yatim', 'piatu', 'yatim_piatu', 'dhuafa');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE status_pendaftaran AS ENUM (
        'MENUNGGU_VERIFIKASI',
        'LOLOS_ADMIN',
        'DITOLAK',
        'MENUNGGU_SELEKSI',
        'DITERIMA',
        'TIDAK_DITERIMA',
        'MENUNGGU_PEMBAYARAN',
        'LUNAS',
        'SUDAH_DAFTAR_ULANG'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create gelombang_pendaftaran
CREATE TABLE IF NOT EXISTS public.gelombang_pendaftaran (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    kuota INTEGER NOT NULL CHECK (kuota > 0),
    id_tahun_ajaran UUID REFERENCES public.tahun_ajaran(id) ON DELETE SET NULL,
    aktif BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create calon_santri
CREATE TABLE IF NOT EXISTS public.calon_santri (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    -- Data dasar
    nama_lengkap VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    no_hp VARCHAR(20) NOT NULL,
    -- Data diri (dilengkapi di dashboard)
    tempat_lahir VARCHAR(255),
    tanggal_lahir DATE,
    jenis_kelamin CHAR(1) CHECK (jenis_kelamin IN ('L', 'P')),
    nik VARCHAR(20),
    nisn VARCHAR(20),
    alamat TEXT,
    asal_sekolah VARCHAR(255),
    -- Data orang tua
    nama_ayah VARCHAR(255),
    nama_ibu VARCHAR(255),
    pekerjaan_ayah VARCHAR(255),
    pekerjaan_ibu VARCHAR(255),
    penghasilan_ayah VARCHAR(50),
    penghasilan_ibu VARCHAR(50),
    no_hp_ortu VARCHAR(20),
    -- Jalur pendaftaran
    jalur_pendaftaran jalur_pendaftaran NOT NULL DEFAULT 'reguler',
    jenis_afirmasi jenis_afirmasi,
    jenis_prestasi VARCHAR(255),
    -- Gelombang
    id_gelombang UUID REFERENCES public.gelombang_pendaftaran(id) ON DELETE SET NULL,
    -- Dokumen (URLs)
    foto_url TEXT,
    scan_akte TEXT,
    scan_kk TEXT,
    scan_kip TEXT,
    surat_keterangan TEXT,
    -- Status
    status status_pendaftaran NOT NULL DEFAULT 'MENUNGGU_VERIFIKASI',
    -- Catatan admin
    catatan_admin TEXT,
    -- Referensi ke santri setelah daftar ulang
    id_santri UUID REFERENCES public.santri(id) ON DELETE SET NULL,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_calon_santri_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calon_santri_updated_at ON public.calon_santri;
CREATE TRIGGER trigger_calon_santri_updated_at
    BEFORE UPDATE ON public.calon_santri
    FOR EACH ROW
    EXECUTE FUNCTION update_calon_santri_updated_at();

-- 4. Create biaya_ppdb
CREATE TABLE IF NOT EXISTS public.biaya_ppdb (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_gelombang UUID NOT NULL REFERENCES public.gelombang_pendaftaran(id) ON DELETE CASCADE,
    nama_biaya VARCHAR(255) NOT NULL,
    nominal_reguler INTEGER NOT NULL CHECK (nominal_reguler >= 0),
    nominal_prestasi INTEGER NOT NULL CHECK (nominal_prestasi >= 0),
    nominal_afirmasi INTEGER NOT NULL CHECK (nominal_afirmasi >= 0),
    wajib BOOLEAN DEFAULT true NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create hasil_seleksi
CREATE TABLE IF NOT EXISTS public.hasil_seleksi (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_calon_santri UUID NOT NULL REFERENCES public.calon_santri(id) ON DELETE CASCADE,
    -- Tes tulis
    nilai_tes_tulis INTEGER CHECK (nilai_tes_tulis >= 0 AND nilai_tes_tulis <= 100),
    -- Tes baca Quran
    nilai_baca_quran INTEGER CHECK (nilai_baca_quran >= 0 AND nilai_baca_quran <= 100),
    -- Wawancara
    nilai_wawancara INTEGER CHECK (nilai_wawancara >= 0 AND nilai_wawancara <= 100),
    -- Nilai akhir (kalkulasi otomatis atau manual)
    nilai_akhir DECIMAL(5,2),
    -- Status kelulusan
    lulus BOOLEAN,
    -- Jadwal tes
    tanggal_tes DATE,
    jam_tes TIME,
    ruang_tes VARCHAR(50),
    -- Pewawancara/penguji
    id_penguji UUID REFERENCES public.pegawai(id) ON DELETE SET NULL,
    -- Catatan
    catatan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Satu calon hanya punya satu hasil seleksi
    UNIQUE(id_calon_santri)
);

-- Trigger untuk auto-update updated_at
DROP TRIGGER IF EXISTS trigger_hasil_seleksi_updated_at ON public.hasil_seleksi;
CREATE TRIGGER trigger_hasil_seleksi_updated_at
    BEFORE UPDATE ON public.hasil_seleksi
    FOR EACH ROW
    EXECUTE FUNCTION update_calon_santri_updated_at();

-- 6. Create pengumuman_ppdb
CREATE TABLE IF NOT EXISTS public.pengumuman_ppdb (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_gelombang UUID NOT NULL REFERENCES public.gelombang_pendaftaran(id) ON DELETE CASCADE,
    judul VARCHAR(255) NOT NULL,
    konten TEXT,
    file_url TEXT,
    tanggal_terbit DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Enable RLS
ALTER TABLE public.gelombang_pendaftaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calon_santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biaya_ppdb ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hasil_seleksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengumuman_ppdb ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies

-- gelombang_pendaftaran — public read for active, authenticated manage
DROP POLICY IF EXISTS "Allow public select active gelombang" ON public.gelombang_pendaftaran;
CREATE POLICY "Allow public select active gelombang" ON public.gelombang_pendaftaran
    FOR SELECT USING (aktif = true);

DROP POLICY IF EXISTS "Allow authenticated manage gelombang" ON public.gelombang_pendaftaran;
CREATE POLICY "Allow authenticated manage gelombang" ON public.gelombang_pendaftaran
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Super Admin')
    );

-- calon_santri — user can read/write own data, admin can read/write all
DROP POLICY IF EXISTS "Allow calon_santri select own" ON public.calon_santri;
CREATE POLICY "Allow calon_santri select own" ON public.calon_santri
    FOR SELECT USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Allow calon_santri update own" ON public.calon_santri;
CREATE POLICY "Allow calon_santri update own" ON public.calon_santri
    FOR UPDATE USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Allow admin select all calon_santri" ON public.calon_santri;
CREATE POLICY "Allow admin select all calon_santri" ON public.calon_santri
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
    );

-- Allow calon santri to insert own record during registration
DROP POLICY IF EXISTS "Allow calon_santri insert own" ON public.calon_santri;
CREATE POLICY "Allow calon_santri insert own" ON public.calon_santri
    FOR INSERT WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Allow admin manage calon_santri" ON public.calon_santri;
CREATE POLICY "Allow admin manage calon_santri" ON public.calon_santri
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Super Admin')
    );

-- biaya_ppdb — public read, admin manage
DROP POLICY IF EXISTS "Allow public select biaya_ppdb" ON public.biaya_ppdb;
CREATE POLICY "Allow public select biaya_ppdb" ON public.biaya_ppdb
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin manage biaya_ppdb" ON public.biaya_ppdb;
CREATE POLICY "Allow admin manage biaya_ppdb" ON public.biaya_ppdb
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Super Admin')
    );

-- hasil_seleksi — admin only
DROP POLICY IF EXISTS "Allow admin manage hasil_seleksi" ON public.hasil_seleksi;
CREATE POLICY "Allow admin manage hasil_seleksi" ON public.hasil_seleksi
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
    );

-- pengumuman_ppdb — public read, admin manage
DROP POLICY IF EXISTS "Allow public select pengumuman_ppdb" ON public.pengumuman_ppdb;
CREATE POLICY "Allow public select pengumuman_ppdb" ON public.pengumuman_ppdb
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin manage pengumuman_ppdb" ON public.pengumuman_ppdb;
CREATE POLICY "Allow admin manage pengumuman_ppdb" ON public.pengumuman_ppdb
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Super Admin')
    );

-- 9. Performance indexes for frequently-queried columns
CREATE INDEX IF NOT EXISTS idx_calon_santri_status ON public.calon_santri(status);
CREATE INDEX IF NOT EXISTS idx_calon_santri_id_gelombang ON public.calon_santri(id_gelombang);
CREATE INDEX IF NOT EXISTS idx_calon_santri_auth_user_id ON public.calon_santri(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_biaya_ppdb_id_gelombang ON public.biaya_ppdb(id_gelombang);
CREATE INDEX IF NOT EXISTS idx_hasil_seleksi_id_calon_santri ON public.hasil_seleksi(id_calon_santri);
CREATE INDEX IF NOT EXISTS idx_pengumuman_ppdb_id_gelombang ON public.pengumuman_ppdb(id_gelombang);
CREATE INDEX IF NOT EXISTS idx_gelombang_pendaftaran_aktif ON public.gelombang_pendaftaran(aktif);

-- 10. Seed initial data for role_permissions feature
INSERT INTO public.role_permissions (id_role, feature, can_view, can_create, can_edit, can_delete)
SELECT r.id, 'PPDB', true, true, true, true
FROM public.app_roles r
WHERE r.name = 'Super Admin'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.id_role = r.id AND rp.feature = 'PPDB'
  );

-- Seed 'PPDB' for all other roles (view-only by default)
INSERT INTO public.role_permissions (id_role, feature, can_view, can_create, can_edit, can_delete)
SELECT r.id, 'PPDB', true, false, false, false
FROM public.app_roles r
WHERE r.name != 'Super Admin'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.id_role = r.id AND rp.feature = 'PPDB'
  );
