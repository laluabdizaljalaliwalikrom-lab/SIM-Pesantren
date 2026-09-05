-- =========================================================================
-- SQL MIGRATION: RESET DATA MODULAR RPC (ATOMIC & SAFE DATA PURGE)
-- Jalankan script ini di SQL Editor Dashboard Supabase Anda.
-- =========================================================================

-- 1. FUNGSI UNTUK MEMBACA JUMLAH DATA PER MODUL (LIVE COUNT PREVIEW)
CREATE OR REPLACE FUNCTION public.get_reset_data_counts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_role TEXT;
  
  -- Counts
  v_santri_count BIGINT := 0;
  v_pegawai_count BIGINT := 0;
  v_keuangan_count BIGINT := 0;
  v_asrama_count BIGINT := 0;
  v_akademik_count BIGINT := 0;
  v_presensi_count BIGINT := 0;
  v_tahfidz_count BIGINT := 0;
  v_ppdb_count BIGINT := 0;
  v_broadcast_count BIGINT := 0;
BEGIN
  -- Validasi role: Hanya Super Admin / Admin
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS NULL OR (v_role != 'Super Admin' AND v_role != 'admin') THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Super Admin yang berhak mengakses fungsi ini.';
  END IF;

  -- 1. Santri
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'santri') THEN
    SELECT COUNT(*) INTO v_santri_count FROM public.santri;
  END IF;

  -- 2. Pegawai
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pegawai') THEN
    SELECT COUNT(*) INTO v_pegawai_count FROM public.pegawai;
  END IF;

  -- 3. Keuangan (Tagihan + Pembayaran)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tagihan') THEN
    SELECT COUNT(*) + (SELECT COUNT(*) FROM public.pembayaran) INTO v_keuangan_count FROM public.tagihan;
  END IF;

  -- 4. Asrama (Kamar + Gedung)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'kamar') THEN
    SELECT COUNT(*) + (SELECT COUNT(*) FROM public.gedung) INTO v_asrama_count FROM public.kamar;
  END IF;

  -- 5. Akademik (Kelas + Mapel + Jadwal + Nilai)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'kelas') THEN
    SELECT COUNT(*) + (SELECT COUNT(*) FROM public.mapel) + (SELECT COUNT(*) FROM public.jadwal_pelajaran) + (SELECT COUNT(*) FROM public.nilai)
    INTO v_akademik_count FROM public.kelas;
  END IF;

  -- 6. Presensi & Pelanggaran
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'absensi_santri') THEN
    SELECT COUNT(*) + (SELECT COUNT(*) FROM public.absensi_pegawai) + (SELECT COUNT(*) FROM public.absensi_sholat) + (SELECT COUNT(*) FROM public.perizinan) + (SELECT COUNT(*) FROM public.pelanggaran_santri)
    INTO v_presensi_count FROM public.absensi_santri;
  END IF;

  -- 7. Tahfidz
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'presensi_tahfidz') THEN
    SELECT COUNT(*) INTO v_tahfidz_count FROM public.presensi_tahfidz;
  END IF;

  -- 8. PPDB
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calon_santri') THEN
    SELECT COUNT(*) + (SELECT COUNT(*) FROM public.gelombang_pendaftaran) INTO v_ppdb_count FROM public.calon_santri;
  END IF;

  -- 9. Broadcast
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'broadcast_messages') THEN
    SELECT COUNT(*) + (SELECT COUNT(*) FROM public.broadcast_recipients) INTO v_broadcast_count FROM public.broadcast_messages;
  END IF;

  v_result := jsonb_build_object(
    'santri', v_santri_count,
    'pegawai', v_pegawai_count,
    'keuangan', v_keuangan_count,
    'asrama', v_asrama_count,
    'akademik', v_akademik_count,
    'presensi', v_presensi_count,
    'tahfidz', v_tahfidz_count,
    'ppdb', v_ppdb_count,
    'broadcast', v_broadcast_count
  );

  RETURN v_result;
END;
$$;


-- 2. FUNGSI UTAMA EKSEKUSI RESET DATA MODULAR (ATOMIC TRANSACTION)
CREATE OR REPLACE FUNCTION public.execute_reset_data(
  p_modules TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  v_user_name TEXT;
  v_deleted_summary JSONB := '{}'::jsonb;
BEGIN
  -- 1. Validasi role Super Admin
  SELECT role, nama_lengkap INTO v_role, v_user_name 
  FROM public.profiles 
  WHERE id = auth.uid();

  IF v_role IS NULL OR (v_role != 'Super Admin' AND v_role != 'admin') THEN
    RAISE EXCEPTION 'Operasi dibatalkan: Hanya akun Super Admin yang memiliki wewenang untuk mereset basis data.';
  END IF;

  IF p_modules IS NULL OR array_length(p_modules, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tidak ada modul yang dipilih untuk di-reset.');
  END IF;

  -- 2. Loop & Eksekusi Penghapusan per Modul dengan Urutan Constraint yang Aman

  -- A. MODUL TAHFIDZ
  IF 'tahfidz' = ANY(p_modules) THEN
    DELETE FROM public.presensi_tahfidz;
    v_deleted_summary := jsonb_set(v_deleted_summary, '{tahfidz}', 'true'::jsonb);
  END IF;

  -- B. MODUL PRESENSI & KEDISIPLINAN
  IF 'presensi' = ANY(p_modules) THEN
    DELETE FROM public.absensi_sholat;
    DELETE FROM public.absensi_santri;
    DELETE FROM public.absensi_pegawai;
    DELETE FROM public.absensi;
    DELETE FROM public.perizinan;
    DELETE FROM public.pelanggaran_santri;
    v_deleted_summary := jsonb_set(v_deleted_summary, '{presensi}', 'true'::jsonb);
  END IF;

  -- C. MODUL KEUANGAN (TRANSAKSI KASIR & TAGIHAN)
  IF 'keuangan' = ANY(p_modules) THEN
    DELETE FROM public.pembayaran;
    DELETE FROM public.pembayaran_group;
    DELETE FROM public.tagihan;
    v_deleted_summary := jsonb_set(v_deleted_summary, '{keuangan}', 'true'::jsonb);
  END IF;

  -- D. MODUL AKADEMIK (NILAI, JADWAL, MAPEL, KELAS, SEKOLAH)
  IF 'akademik' = ANY(p_modules) THEN
    DELETE FROM public.nilai;
    DELETE FROM public.absensi;
    DELETE FROM public.jadwal_pelajaran;
    
    -- Lepaskan relasi kelas dari santri terlebih dahulu agar tidak Foreign Key Error
    UPDATE public.santri SET id_kelas_formal = NULL, id_kelas_non_formal = NULL;
    
    DELETE FROM public.kelas;
    DELETE FROM public.mapel;
    -- Lepaskan relasi sekolah dari pegawai
    UPDATE public.pegawai SET id_sekolah = NULL;
    DELETE FROM public.sekolah;
    v_deleted_summary := jsonb_set(v_deleted_summary, '{akademik}', 'true'::jsonb);
  END IF;

  -- E. MODUL ASRAMA (KAMAR & GEDUNG)
  IF 'asrama' = ANY(p_modules) THEN
    DELETE FROM public.log_perpindahan_kamar;
    -- Lepaskan relasi kamar pada santri
    UPDATE public.santri SET id_kamar = NULL;
    DELETE FROM public.kamar;
    DELETE FROM public.gedung;
    v_deleted_summary := jsonb_set(v_deleted_summary, '{asrama}', 'true'::jsonb);
  END IF;

  -- F. MODUL PPDB (CALON SANTRI & GELOMBANG)
  IF 'ppdb' = ANY(p_modules) THEN
    DELETE FROM public.hasil_seleksi;
    DELETE FROM public.biaya_ppdb;
    DELETE FROM public.pengumuman_ppdb;
    DELETE FROM public.calon_santri;
    DELETE FROM public.gelombang_pendaftaran;
    v_deleted_summary := jsonb_set(v_deleted_summary, '{ppdb}', 'true'::jsonb);
  END IF;

  -- G. MODUL BROADCAST (RIWAYAT SIARAN WA/EMAIL)
  IF 'broadcast' = ANY(p_modules) THEN
    DELETE FROM public.broadcast_recipients;
    DELETE FROM public.broadcast_messages;
    v_deleted_summary := jsonb_set(v_deleted_summary, '{broadcast}', 'true'::jsonb);
  END IF;

  -- H. MODUL SANTRI & KESISWAAN (INCLUSIVE PURGE SEMUA DEPENDENSI SANTRI)
  IF 'santri' = ANY(p_modules) THEN
    -- Hapus semua dependensi santri yang belum terhapus
    DELETE FROM public.presensi_tahfidz;
    DELETE FROM public.absensi_sholat;
    DELETE FROM public.absensi_santri;
    DELETE FROM public.absensi;
    DELETE FROM public.perizinan;
    DELETE FROM public.pelanggaran_santri;
    DELETE FROM public.nilai;
    DELETE FROM public.pembayaran;
    DELETE FROM public.pembayaran_group;
    DELETE FROM public.tagihan;
    DELETE FROM public.log_perpindahan_kamar;
    
    -- Lepaskan id_santri dari calon_santri PPDB jika ada
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'calon_santri' AND column_name = 'id_santri') THEN
      UPDATE public.calon_santri SET id_santri = NULL;
    END IF;

    -- Hapus penerima broadcast santri
    DELETE FROM public.broadcast_recipients WHERE tipe_penerima IN ('Santri', 'Wali Santri');

    -- Hapus data master santri
    DELETE FROM public.santri;
    v_deleted_summary := jsonb_set(v_deleted_summary, '{santri}', 'true'::jsonb);
  END IF;

  -- I. MODUL PEGAWAI & STAF
  IF 'pegawai' = ANY(p_modules) THEN
    DELETE FROM public.absensi_pegawai;
    
    -- Lepaskan foreign key guru di jadwal & ustadz di tahfidz & penguji ppdb
    UPDATE public.jadwal_pelajaran SET id_guru = NULL;
    UPDATE public.pelanggaran_santri SET id_pelapor = NULL;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hasil_seleksi' AND column_name = 'id_penguji') THEN
      UPDATE public.hasil_seleksi SET id_penguji = NULL;
    END IF;

    -- Hapus penerima broadcast pegawai
    DELETE FROM public.broadcast_recipients WHERE tipe_penerima = 'Pegawai';

    -- Hapus data master pegawai
    DELETE FROM public.pegawai;
    v_deleted_summary := jsonb_set(v_deleted_summary, '{pegawai}', 'true'::jsonb);
  END IF;

  -- 3. Catat ke tabel audit_logs jika tabel tersedia
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    INSERT INTO public.audit_logs (
      user_id,
      user_name,
      user_role,
      action,
      module,
      description,
      new_data
    ) VALUES (
      auth.uid(),
      COALESCE(v_user_name, 'Super Admin'),
      COALESCE(v_role, 'Super Admin'),
      'DELETE',
      'Settings',
      'Mengeksekusi Reset Data Modular: ' || array_to_string(p_modules, ', '),
      v_deleted_summary
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Berhasil mereset modul data terpilih secara aman.',
    'modules', p_modules,
    'details', v_deleted_summary
  );

EXCEPTION WHEN OTHERS THEN
  -- Jika terjadi error tak terduga, PostgreSQL akan otomatis me-rollback seluruh statement
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Gagal mengeksekusi reset: ' || SQLERRM
  );
END;
$$;

-- Berikan izin eksekusi ke authenticated user (validasi Super Admin tetap ditegakkan di dalam fungsi)
GRANT EXECUTE ON FUNCTION public.get_reset_data_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_reset_data(TEXT[]) TO authenticated;

