-- ==========================================================================
-- SQL MIGRATION: ENFORCE MATRIX-BASED ROW LEVEL SECURITY (RLS)
-- Run this script inside your Supabase Dashboard SQL Editor (https://supabase.com)
-- to block unauthorized INSERT, UPDATE, and DELETE operations based on the role matrix.
-- ==========================================================================

-- 1. Create a dynamic has_permission helper function
CREATE OR REPLACE FUNCTION public.has_permission(p_feature TEXT, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_role_id UUID;
  v_has_access BOOLEAN := FALSE;
BEGIN
  -- Dapatkan role user yang sedang terautentikasi
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  
  -- Jika tidak login, tidak punya akses
  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Super Admin (role = 'admin') bypass semua pengecekan (selalu TRUE)
  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Dapatkan id_role dari app_roles berdasarkan nama role
  SELECT id INTO v_role_id FROM public.app_roles WHERE name = v_role;
  IF v_role_id IS NULL THEN
    -- Fallback pemetaan nama default (jika role di profiles tersimpan versi huruf kecil)
    IF v_role = 'pengasuh' THEN
      SELECT id INTO v_role_id FROM public.app_roles WHERE name = 'Pengasuh';
    ELSIF v_role = 'wali_santri' THEN
      SELECT id INTO v_role_id FROM public.app_roles WHERE name = 'Wali Santri';
    END IF;
  END IF;

  IF v_role_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Periksa permission spesifik di tabel role_permissions
  IF p_action = 'view' THEN
    SELECT can_view INTO v_has_access FROM public.role_permissions 
    WHERE id_role = v_role_id AND LOWER(feature) = LOWER(p_feature);
  ELSIF p_action = 'create' THEN
    SELECT can_create INTO v_has_access FROM public.role_permissions 
    WHERE id_role = v_role_id AND LOWER(feature) = LOWER(p_feature);
  ELSIF p_action = 'edit' THEN
    SELECT can_edit INTO v_has_access FROM public.role_permissions 
    WHERE id_role = v_role_id AND LOWER(feature) = LOWER(p_feature);
  ELSIF p_action = 'delete' THEN
    SELECT can_delete INTO v_has_access FROM public.role_permissions 
    WHERE id_role = v_role_id AND LOWER(feature) = LOWER(p_feature);
  END IF;

  RETURN COALESCE(v_has_access, FALSE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_permission(TEXT, TEXT) TO authenticated;


-- 2. Drop existing unsafe public policies on all target tables

-- santri
DROP POLICY IF EXISTS "Allow public select for santri" ON public.santri;
DROP POLICY IF EXISTS "Allow public insert for santri" ON public.santri;
DROP POLICY IF EXISTS "Allow public update for santri" ON public.santri;
DROP POLICY IF EXISTS "Allow public delete for santri" ON public.santri;
DROP POLICY IF EXISTS "Admin full access santri" ON public.santri;
DROP POLICY IF EXISTS "Wali can view own santri" ON public.santri;

-- pegawai
DROP POLICY IF EXISTS "Allow public read pegawai" ON public.pegawai;
DROP POLICY IF EXISTS "Allow public insert pegawai" ON public.pegawai;
DROP POLICY IF EXISTS "Allow public update pegawai" ON public.pegawai;
DROP POLICY IF EXISTS "Allow public delete pegawai" ON public.pegawai;

-- kamar
DROP POLICY IF EXISTS "Allow public select for kamar" ON public.kamar;
DROP POLICY IF EXISTS "Allow public update for kamar" ON public.kamar;
DROP POLICY IF EXISTS "Allow public delete for kamar" ON public.kamar;
DROP POLICY IF EXISTS "Authenticated can view kamar" ON public.kamar;
DROP POLICY IF EXISTS "Admin full access kamar" ON public.kamar;

-- gedung
DROP POLICY IF EXISTS "Allow public select for gedung" ON public.gedung;
DROP POLICY IF EXISTS "Allow public update for gedung" ON public.gedung;
DROP POLICY IF EXISTS "Allow public delete for gedung" ON public.gedung;

-- sekolah
DROP POLICY IF EXISTS "Allow public select for sekolah" ON public.sekolah;
DROP POLICY IF EXISTS "Allow public update for sekolah" ON public.sekolah;
DROP POLICY IF EXISTS "Allow public delete for sekolah" ON public.sekolah;

-- kelas
DROP POLICY IF EXISTS "Allow public select for kelas" ON public.kelas;
DROP POLICY IF EXISTS "Allow public update for kelas" ON public.kelas;
DROP POLICY IF EXISTS "Allow public delete for kelas" ON public.kelas;

-- mata_pelajaran
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mata_pelajaran') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow public select for mata_pelajaran" ON public.mata_pelajaran';
    EXECUTE 'DROP POLICY IF EXISTS "Allow public all for mata_pelajaran" ON public.mata_pelajaran';
  END IF;
END $$;

-- jadwal_pelajaran
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jadwal_pelajaran') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow public select for jadwal_pelajaran" ON public.jadwal_pelajaran';
    EXECUTE 'DROP POLICY IF EXISTS "Allow public all for jadwal_pelajaran" ON public.jadwal_pelajaran';
  END IF;
END $$;

-- nilai
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'nilai') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow public select for nilai_akademik" ON public.nilai';
    EXECUTE 'DROP POLICY IF EXISTS "Allow public update for nilai_akademik" ON public.nilai';
    EXECUTE 'DROP POLICY IF EXISTS "Allow public delete for nilai_akademik" ON public.nilai';
  END IF;
END $$;

-- master_biaya
DROP POLICY IF EXISTS "Allow public select for master_biaya" ON public.master_biaya;
DROP POLICY IF EXISTS "Allow admin manage master_biaya" ON public.master_biaya;

-- tagihan
DROP POLICY IF EXISTS "Wali santri can view own child's bills" ON public.tagihan;
DROP POLICY IF EXISTS "Admin and Pengasuh can view all bills" ON public.tagihan;
DROP POLICY IF EXISTS "Only admin can manage tagihan" ON public.tagihan;

-- pembayaran
DROP POLICY IF EXISTS "Wali santri can view own child's payments" ON public.pembayaran;
DROP POLICY IF EXISTS "Admin and Pengasuh can view all payments" ON public.pembayaran;
DROP POLICY IF EXISTS "Only admin can insert/update/delete payments" ON public.pembayaran;
DROP POLICY IF EXISTS "Only admin can modify payments" ON public.pembayaran;
DROP POLICY IF EXISTS "Only admin can manage payments" ON public.pembayaran;

-- perizinan
DROP POLICY IF EXISTS "Admin and Pengasuh can manage perizinan" ON public.perizinan;
DROP POLICY IF EXISTS "Wali santri can view own child's perizinan" ON public.perizinan;
DROP POLICY IF EXISTS "Allow public select for perizinan" ON public.perizinan;
DROP POLICY IF EXISTS "Allow public update for perizinan" ON public.perizinan;
DROP POLICY IF EXISTS "Allow public delete for perizinan" ON public.perizinan;


-- 3. Recreate clean RLS policies checking permissions matrix dynamically

-- ─── SANTRI ───────────────────────────────────────────────────────────────
CREATE POLICY "RLS: View Santri" ON public.santri FOR SELECT TO authenticated
    USING (public.has_permission('Santri', 'view') OR id_wali = auth.uid());

CREATE POLICY "RLS: Create Santri" ON public.santri FOR INSERT TO authenticated
    WITH CHECK (public.has_permission('Santri', 'create'));

CREATE POLICY "RLS: Edit Santri" ON public.santri FOR UPDATE TO authenticated
    USING (public.has_permission('Santri', 'edit'))
    WITH CHECK (public.has_permission('Santri', 'edit'));

CREATE POLICY "RLS: Delete Santri" ON public.santri FOR DELETE TO authenticated
    USING (public.has_permission('Santri', 'delete'));

-- ─── PEGAWAI ──────────────────────────────────────────────────────────────
CREATE POLICY "RLS: View Pegawai" ON public.pegawai FOR SELECT TO authenticated
    USING (public.has_permission('Kepegawaian', 'view'));

CREATE POLICY "RLS: Create Pegawai" ON public.pegawai FOR INSERT TO authenticated
    WITH CHECK (public.has_permission('Kepegawaian', 'create'));

CREATE POLICY "RLS: Edit Pegawai" ON public.pegawai FOR UPDATE TO authenticated
    USING (public.has_permission('Kepegawaian', 'edit'));

CREATE POLICY "RLS: Delete Pegawai" ON public.pegawai FOR DELETE TO authenticated
    USING (public.has_permission('Kepegawaian', 'delete'));

-- ─── ASRAMA (KAMAR & GEDUNG) ────────────────────────────────────────────────
CREATE POLICY "RLS: View Kamar" ON public.kamar FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "RLS: Manage Kamar (Create)" ON public.kamar FOR INSERT TO authenticated
    WITH CHECK (public.has_permission('Asrama', 'create'));

CREATE POLICY "RLS: Manage Kamar (Edit)" ON public.kamar FOR UPDATE TO authenticated
    USING (public.has_permission('Asrama', 'edit'));

CREATE POLICY "RLS: Manage Kamar (Delete)" ON public.kamar FOR DELETE TO authenticated
    USING (public.has_permission('Asrama', 'delete'));

CREATE POLICY "RLS: View Gedung" ON public.gedung FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "RLS: Manage Gedung (Create)" ON public.gedung FOR INSERT TO authenticated
    WITH CHECK (public.has_permission('Asrama', 'create'));

CREATE POLICY "RLS: Manage Gedung (Edit)" ON public.gedung FOR UPDATE TO authenticated
    USING (public.has_permission('Asrama', 'edit'));

CREATE POLICY "RLS: Manage Gedung (Delete)" ON public.gedung FOR DELETE TO authenticated
    USING (public.has_permission('Asrama', 'delete'));

-- ─── AKADEMIK (SEKOLAH, KELAS, MAPEL, JADWAL, NILAI) ────────────────────────
CREATE POLICY "RLS: View Sekolah" ON public.sekolah FOR SELECT TO authenticated USING (true);
CREATE POLICY "RLS: Manage Sekolah (Create)" ON public.sekolah FOR INSERT TO authenticated WITH CHECK (public.has_permission('Akademik', 'create'));
CREATE POLICY "RLS: Manage Sekolah (Edit)" ON public.sekolah FOR UPDATE TO authenticated USING (public.has_permission('Akademik', 'edit'));
CREATE POLICY "RLS: Manage Sekolah (Delete)" ON public.sekolah FOR DELETE TO authenticated USING (public.has_permission('Akademik', 'delete'));

CREATE POLICY "RLS: View Kelas" ON public.kelas FOR SELECT TO authenticated USING (true);
CREATE POLICY "RLS: Manage Kelas (Create)" ON public.kelas FOR INSERT TO authenticated WITH CHECK (public.has_permission('Akademik', 'create'));
CREATE POLICY "RLS: Manage Kelas (Edit)" ON public.kelas FOR UPDATE TO authenticated USING (public.has_permission('Akademik', 'edit'));
CREATE POLICY "RLS: Manage Kelas (Delete)" ON public.kelas FOR DELETE TO authenticated USING (public.has_permission('Akademik', 'delete'));

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mata_pelajaran') THEN
    EXECUTE 'CREATE POLICY "RLS: View Mapel" ON public.mata_pelajaran FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "RLS: Manage Mapel (Create)" ON public.mata_pelajaran FOR INSERT TO authenticated WITH CHECK (public.has_permission(''Akademik'', ''create''))';
    EXECUTE 'CREATE POLICY "RLS: Manage Mapel (Edit)" ON public.mata_pelajaran FOR UPDATE TO authenticated USING (public.has_permission(''Akademik'', ''edit''))';
    EXECUTE 'CREATE POLICY "RLS: Manage Mapel (Delete)" ON public.mata_pelajaran FOR DELETE TO authenticated USING (public.has_permission(''Akademik'', ''delete''))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jadwal_pelajaran') THEN
    EXECUTE 'CREATE POLICY "RLS: View Jadwal" ON public.jadwal_pelajaran FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "RLS: Manage Jadwal (Create)" ON public.jadwal_pelajaran FOR INSERT TO authenticated WITH CHECK (public.has_permission(''Akademik'', ''create''))';
    EXECUTE 'CREATE POLICY "RLS: Manage Jadwal (Edit)" ON public.jadwal_pelajaran FOR UPDATE TO authenticated USING (public.has_permission(''Akademik'', ''edit''))';
    EXECUTE 'CREATE POLICY "RLS: Manage Jadwal (Delete)" ON public.jadwal_pelajaran FOR DELETE TO authenticated USING (public.has_permission(''Akademik'', ''delete''))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'nilai') THEN
    EXECUTE 'CREATE POLICY "RLS: View Nilai" ON public.nilai FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "RLS: Manage Nilai (Create)" ON public.nilai FOR INSERT TO authenticated WITH CHECK (public.has_permission(''Akademik'', ''create''))';
    EXECUTE 'CREATE POLICY "RLS: Manage Nilai (Edit)" ON public.nilai FOR UPDATE TO authenticated USING (public.has_permission(''Akademik'', ''edit''))';
    EXECUTE 'CREATE POLICY "RLS: Manage Nilai (Delete)" ON public.nilai FOR DELETE TO authenticated USING (public.has_permission(''Akademik'', ''delete''))';
  END IF;
END $$;

-- ─── KEUANGAN (MASTER_BIAYA, TAGIHAN, PEMBAYARAN) ───────────────────────────
CREATE POLICY "RLS: View Master Biaya" ON public.master_biaya FOR SELECT TO authenticated USING (true);
CREATE POLICY "RLS: Manage Master Biaya (Create)" ON public.master_biaya FOR INSERT TO authenticated WITH CHECK (public.has_permission('Keuangan', 'create'));
CREATE POLICY "RLS: Manage Master Biaya (Edit)" ON public.master_biaya FOR UPDATE TO authenticated USING (public.has_permission('Keuangan', 'edit'));
CREATE POLICY "RLS: Manage Master Biaya (Delete)" ON public.master_biaya FOR DELETE TO authenticated USING (public.has_permission('Keuangan', 'delete'));

CREATE POLICY "RLS: View Tagihan" ON public.tagihan FOR SELECT TO authenticated
    USING (public.has_permission('Keuangan', 'view') OR EXISTS (SELECT 1 FROM public.santri WHERE santri.id = tagihan.id_santri AND santri.id_wali = auth.uid()));

CREATE POLICY "RLS: Manage Tagihan (Create)" ON public.tagihan FOR INSERT TO authenticated WITH CHECK (public.has_permission('Keuangan', 'create'));
CREATE POLICY "RLS: Manage Tagihan (Edit)" ON public.tagihan FOR UPDATE TO authenticated USING (public.has_permission('Keuangan', 'edit'));
CREATE POLICY "RLS: Manage Tagihan (Delete)" ON public.tagihan FOR DELETE TO authenticated USING (public.has_permission('Keuangan', 'delete'));

CREATE POLICY "RLS: View Pembayaran" ON public.pembayaran FOR SELECT TO authenticated
    USING (public.has_permission('Keuangan', 'view') OR EXISTS (SELECT 1 FROM public.santri WHERE santri.id = pembayaran.id_santri AND santri.id_wali = auth.uid()));

CREATE POLICY "RLS: Manage Pembayaran (Create)" ON public.pembayaran FOR INSERT TO authenticated WITH CHECK (public.has_permission('Keuangan', 'create'));
CREATE POLICY "RLS: Manage Pembayaran (Edit)" ON public.pembayaran FOR UPDATE TO authenticated USING (public.has_permission('Keuangan', 'edit'));
CREATE POLICY "RLS: Manage Pembayaran (Delete)" ON public.pembayaran FOR DELETE TO authenticated USING (public.has_permission('Keuangan', 'delete'));

-- ─── PERIZINAN ─────────────────────────────────────────────────────────────
CREATE POLICY "RLS: View Perizinan" ON public.perizinan FOR SELECT TO authenticated
    USING (public.has_permission('Perizinan', 'view') OR EXISTS (SELECT 1 FROM public.santri WHERE santri.id = perizinan.id_santri AND santri.id_wali = auth.uid()));

CREATE POLICY "RLS: Manage Perizinan (Create)" ON public.perizinan FOR INSERT TO authenticated WITH CHECK (public.has_permission('Perizinan', 'create'));
CREATE POLICY "RLS: Manage Perizinan (Edit)" ON public.perizinan FOR UPDATE TO authenticated USING (public.has_permission('Perizinan', 'edit'));
CREATE POLICY "RLS: Manage Perizinan (Delete)" ON public.perizinan FOR DELETE TO authenticated USING (public.has_permission('Perizinan', 'delete'));
