-- =====================================================================
-- Schema: Tabel Kepegawaian (pegawai)
-- Jalankan di Supabase SQL Editor
-- =====================================================================

-- 0. Drop tabel lama jika ada (hapus schema lama yang tidak lengkap)
DROP TABLE IF EXISTS public.pegawai CASCADE;

-- 1. Buat tabel pegawai
CREATE TABLE IF NOT EXISTS public.pegawai (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nip                 TEXT UNIQUE,
  nama_lengkap        TEXT NOT NULL,
  gelar_depan         TEXT,
  gelar_belakang      TEXT,
  jabatan             TEXT NOT NULL CHECK (jabatan IN (
                        'Ustadz', 'Ustadzah', 'Guru Formal', 'Guru Non-Formal',
                        'Pengasuh', 'Administrasi', 'Tenaga Kebersihan', 'Keamanan', 'Lainnya'
                      )),
  jenis_kelamin       TEXT CHECK (jenis_kelamin IN ('L', 'P')),
  tempat_lahir        TEXT,
  tanggal_lahir       DATE,
  alamat              TEXT,
  no_hp               TEXT,
  email               TEXT,
  foto_url            TEXT,
  pendidikan_terakhir TEXT,
  spesialisasi        TEXT,
  tanggal_bergabung   DATE,
  status              TEXT NOT NULL DEFAULT 'Aktif'
                        CHECK (status IN ('Aktif', 'Tidak Aktif', 'Cuti')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.pegawai ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy: allow all for now (sesuaikan dengan kebutuhan autentikasi)
CREATE POLICY "Allow public read pegawai"
  ON public.pegawai FOR SELECT USING (true);

CREATE POLICY "Allow public insert pegawai"
  ON public.pegawai FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update pegawai"
  ON public.pegawai FOR UPDATE USING (true);

CREATE POLICY "Allow public delete pegawai"
  ON public.pegawai FOR DELETE USING (true);

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_pegawai_jabatan ON public.pegawai(jabatan);
CREATE INDEX IF NOT EXISTS idx_pegawai_status  ON public.pegawai(status);

-- 5. Sample data (opsional)
INSERT INTO public.pegawai (nama_lengkap, gelar_depan, gelar_belakang, jabatan, jenis_kelamin, no_hp, email, spesialisasi, pendidikan_terakhir, tanggal_bergabung, status)
VALUES
  ('Ahmad Fatih Mubarok',   'Ustadz', 'S.Ag.',  'Ustadz',      'L', '081234567890', 'fatih@pesantren.id',   'Tafsir Al-Qur''an', 'S1 Ushuluddin',      '2019-08-01', 'Aktif'),
  ('Budi Santoso',           NULL,     'S.Pd.',  'Guru Formal', 'L', '082233445566', 'budi@pesantren.id',    'Matematika',         'S1 Pendidikan MIPA', '2020-01-15', 'Aktif'),
  ('Siti Maryam',            'Ustadzah',NULL,    'Ustadzah',    'P', '083344556677', NULL,                   'Fiqih Wanita',       'S1 Syariah',         '2021-03-10', 'Aktif'),
  ('Hilman Hakim',           'Ustadz', 'M.Ag.',  'Pengasuh',    'L', '084455667788', 'hilman@pesantren.id',  'Fiqih & Nahwu',      'S2 Hukum Islam',     '2018-06-01', 'Aktif'),
  ('Rizky Pratama',          NULL,     NULL,     'Administrasi','L', '085566778899', 'rizky@pesantren.id',   NULL,                 'D3 Manajemen',       '2022-07-01', 'Aktif')
ON CONFLICT DO NOTHING;

-- 6. Verify
SELECT id, nama_lengkap, jabatan, status FROM public.pegawai ORDER BY nama_lengkap;
