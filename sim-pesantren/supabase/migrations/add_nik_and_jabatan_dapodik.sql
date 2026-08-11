-- ==========================================
-- SIM Pesantren
-- Migration: Add nik & expand jabatan (Dapodik)
-- ==========================================

-- 1. Kolom NIK untuk identifikasi unik pegawai (dedup saat import Dapodik)
ALTER TABLE public.pegawai ADD COLUMN IF NOT EXISTS nik TEXT UNIQUE;

COMMENT ON COLUMN public.pegawai.nik IS 'Nomor Induk Kependudukan pegawai (untuk pencocokan data saat import Dapodik)';

-- 2. Perluas CHECK jabatan: gabungan jabatan pondok pesantren + jabatan Dapodik (ref.jenis_ptk)
ALTER TABLE public.pegawai DROP CONSTRAINT IF EXISTS pegawai_jabatan_check;
ALTER TABLE public.pegawai ADD CONSTRAINT pegawai_jabatan_check CHECK (jabatan IN (
  'Ustadz', 'Ustadzah', 'Guru Formal', 'Guru Non-Formal', 'Pengasuh', 'Administrasi',
  'Tenaga Kebersihan', 'Keamanan', 'Lainnya',
  'Guru Kelas', 'Guru Mapel', 'Guru BK', 'Guru Inklusi', 'Guru Pendamping', 'Guru Magang',
  'Guru TIK', 'Guru Kehormatan', 'Kepala Sekolah', 'Wakil Kepala Sekolah', 'Kepala TU',
  'Tenaga Administrasi Sekolah', 'Pustakawan', 'Kepala Perpustakaan', 'Laboran',
  'Kepala Laboratorium', 'Koordinator Laboratorium', 'Teknisi', 'Penjaga Sekolah',
  'Pesuruh', 'Tukang Kebun', 'Petugas Keamanan', 'Perawat', 'Pengemudi', 'Supervisor',
  'Operator Sekolah', 'Ketua Jurusan', 'Bendahara', 'Pembantu Bendahara'
));
