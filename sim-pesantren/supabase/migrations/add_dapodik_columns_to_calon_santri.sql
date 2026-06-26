-- =========================================================================
-- SQL MIGRATION: ADD MISSING DAPODIK COLUMNS TO TABLE 'public.calon_santri'
-- Run this script inside your Supabase Dashboard SQL Editor to ensure
-- all complete candidate fields can be successfully saved to the database.
-- =========================================================================

ALTER TABLE public.calon_santri
  -- Identitas Pribadi
  ADD COLUMN IF NOT EXISTS no_kk VARCHAR(20),
  ADD COLUMN IF NOT EXISTS agama VARCHAR(50) DEFAULT 'Islam',
  ADD COLUMN IF NOT EXISTS anak_ke INTEGER,
  ADD COLUMN IF NOT EXISTS jml_saudara_kandung INTEGER,

  -- Alamat & Kontak
  ADD COLUMN IF NOT EXISTS rt VARCHAR(10),
  ADD COLUMN IF NOT EXISTS rw VARCHAR(10),
  ADD COLUMN IF NOT EXISTS dusun VARCHAR(100),
  ADD COLUMN IF NOT EXISTS kelurahan VARCHAR(100),
  ADD COLUMN IF NOT EXISTS kecamatan VARCHAR(100),
  ADD COLUMN IF NOT EXISTS kode_pos VARCHAR(10),
  ADD COLUMN IF NOT EXISTS jenis_tinggal VARCHAR(100) DEFAULT 'Bersama Orang Tua',
  ADD COLUMN IF NOT EXISTS alat_transportasi VARCHAR(100),
  ADD COLUMN IF NOT EXISTS jarak_ke_sekolah VARCHAR(50),

  -- Data Orang Tua (Lengkap)
  ADD COLUMN IF NOT EXISTS tahun_lahir_ayah INTEGER,
  ADD COLUMN IF NOT EXISTS pendidikan_ayah VARCHAR(100),
  ADD COLUMN IF NOT EXISTS nik_ayah VARCHAR(20),
  
  ADD COLUMN IF NOT EXISTS tahun_lahir_ibu INTEGER,
  ADD COLUMN IF NOT EXISTS pendidikan_ibu VARCHAR(100),
  ADD COLUMN IF NOT EXISTS nik_ibu VARCHAR(20),
  
  ADD COLUMN IF NOT EXISTS nama_wali VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tahun_lahir_wali INTEGER,
  ADD COLUMN IF NOT EXISTS pendidikan_wali VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pekerjaan_wali VARCHAR(255),
  ADD COLUMN IF NOT EXISTS penghasilan_wali VARCHAR(100),
  ADD COLUMN IF NOT EXISTS nik_wali VARCHAR(20),

  -- Data Penunjang
  ADD COLUMN IF NOT EXISTS no_registrasi_akta_lahir VARCHAR(100),
  ADD COLUMN IF NOT EXISTS skhun VARCHAR(100),
  ADD COLUMN IF NOT EXISTS penerima_kip_kps BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bank VARCHAR(100),
  ADD COLUMN IF NOT EXISTS no_rekening VARCHAR(100),
  ADD COLUMN IF NOT EXISTS layak_pip BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS alasan_layak_pip TEXT,

  -- Fisik
  ADD COLUMN IF NOT EXISTS berat_badan INTEGER,
  ADD COLUMN IF NOT EXISTS tinggi_badan INTEGER,
  ADD COLUMN IF NOT EXISTS lingkar_kepala INTEGER;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
