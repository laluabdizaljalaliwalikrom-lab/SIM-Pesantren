-- ==========================================================================
-- MIGRATION: Standardize Super Admin role name & fix legacy 'admin' references
--
-- Masalah: Setelah migrasi add_id_role_to_profiles, trigger sync_profile_role()
-- mengubah profiles.role dari 'admin' (legacy) menjadi 'Super Admin' (canonical
-- dari app_roles.name). Tapi banyak fungsi dan policy masih ngecek role = 'admin'
-- sehingga Super Admin yang sudah tersync jadi kehilangan akses.
--
-- Fix: Seragamkan semua pengecekan ke 'Super Admin' (dengan backward compat
-- untuk legacy 'admin' yang mungkin masih ada di sebagian profile).
-- ==========================================================================

-- ═════════════════════════════════════════════════════════════════════════
-- FIX 1: has_permission() — Super Admin bypass check pakai nama canonical
-- ═════════════════════════════════════════════════════════════════════════
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
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Super Admin bypass semua pengecekan (canonical: 'Super Admin', legacy: 'admin')
  IF v_role IN ('Super Admin', 'admin') THEN
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


-- ═════════════════════════════════════════════════════════════════════════
-- FIX 2: is_admin() — helper function yg dipakai policy-profile, kamar, dsb
-- ═════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Super Admin', 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- ═════════════════════════════════════════════════════════════════════════
-- FIX 3: update_role_permissions() — RPC untuk manage permission matrix
-- ═════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_role_permissions(
  p_role_id       UUID,
  p_permissions   JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role_name   TEXT;
  v_perm        JSONB;
  v_count       INTEGER := 0;
BEGIN
  -- Cek bahwa caller adalah Super Admin (canonical atau legacy)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Super Admin', 'admin')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Hanya admin yang dapat mengubah hak akses.'
    );
  END IF;

  SELECT name INTO v_role_name FROM public.app_roles WHERE id = p_role_id;
  IF v_role_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Role tidak ditemukan.');
  END IF;

  IF v_role_name = 'Super Admin' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Hak akses Super Admin tidak dapat dimodifikasi.');
  END IF;

  DELETE FROM public.role_permissions WHERE id_role = p_role_id;

  FOR v_perm IN SELECT * FROM jsonb_array_elements(p_permissions) LOOP
    INSERT INTO public.role_permissions (id_role, feature, can_view, can_create, can_edit, can_delete)
    VALUES (
      p_role_id,
      v_perm->>'feature',
      COALESCE((v_perm->>'can_view')::BOOLEAN, false),
      COALESCE((v_perm->>'can_create')::BOOLEAN, false),
      COALESCE((v_perm->>'can_edit')::BOOLEAN, false),
      COALESCE((v_perm->>'can_delete')::BOOLEAN, false)
    );
    v_count := v_count + 1;
  END LOOP;

  REFRESH MATERIALIZED VIEW CONCURRENTLY public.app_role_permissions;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Berhasil menyimpan %s hak akses untuk role "%s".', v_count, v_role_name),
    'updated_count', v_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', format('Transaksi gagal: %s', SQLERRM));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_role_permissions(UUID, JSONB) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_role_permissions(UUID, JSONB) TO authenticated;


-- ═════════════════════════════════════════════════════════════════════════
-- FIX 4: Policy pembayaran_group — tambah canonical name, logika tetap sama
-- Sebelum: role = 'admin'
-- Sesudah: role IN ('Super Admin', 'admin') ← hanya nambah canonical name
-- ═════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow admin insert pembayaran_group" ON public.pembayaran_group;

CREATE POLICY "Allow admin insert pembayaran_group"
    ON public.pembayaran_group FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('Super Admin', 'admin')
        )
    );


-- ═════════════════════════════════════════════════════════════════════════
-- FIX 5: Policy ref_hadits & ref_matan — tambah canonical name, logika tetap
-- Sebelum: role IN ('admin', 'pengasuh')
-- Sesudah: role IN ('Super Admin', 'admin', 'Pengasuh', 'pengasuh')
-- ═════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow admin and pengasuh manage ref_hadits" ON public.ref_hadits;
DROP POLICY IF EXISTS "Allow admin and pengasuh manage ref_matan" ON public.ref_matan;

CREATE POLICY "Allow admin and pengasuh manage ref_hadits" ON public.ref_hadits
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('Super Admin', 'admin', 'Pengasuh', 'pengasuh')
        )
    );

CREATE POLICY "Allow admin and pengasuh manage ref_matan" ON public.ref_matan
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('Super Admin', 'admin', 'Pengasuh', 'pengasuh')
        )
    );


-- ═════════════════════════════════════════════════════════════════════════
-- FIX 6: Policy pesantren_profile — SUDAH BENAR (double check 'admin' + 'Super Admin')
-- Tidak perlu diubah. Policy existing:
--   (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR
--   (SELECT role FROM profiles WHERE id = auth.uid()) = 'Super Admin'
-- Ini sudah mencakup canonical name. Dilewati saja.
-- ═════════════════════════════════════════════════════════════════════════
-- (tidak ada perubahan untuk pesantren_profile)


-- ═════════════════════════════════════════════════════════════════════════
-- FIX 7: Seed SEMUA fitur untuk Super Admin (beberapa fitur belum di-seed)
-- ═════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_admin_id UUID;
  v_features TEXT[] := ARRAY['Lembaga', 'Santri', 'Tahfidz', 'Kepegawaian', 'Keuangan', 'Akademik', 'Asrama', 'Perizinan', 'Pengaturan'];
  v_feat TEXT;
BEGIN
  SELECT id INTO v_admin_id FROM public.app_roles WHERE name = 'Super Admin';

  IF v_admin_id IS NOT NULL THEN
    FOREACH v_feat IN ARRAY v_features
    LOOP
      INSERT INTO public.role_permissions (id_role, feature, can_view, can_create, can_edit, can_delete)
      VALUES (v_admin_id, v_feat, TRUE, TRUE, TRUE, TRUE)
      ON CONFLICT ON CONSTRAINT unique_role_feature_permission DO NOTHING;
    END LOOP;
  END IF;
END $$;


-- ═════════════════════════════════════════════════════════════════════════
-- FIX 8: Update legacy profiles yang masih punya role = 'admin' (huruf kecil)
-- menjadi 'Super Admin' agar konsisten dengan canonical name di app_roles
-- ═════════════════════════════════════════════════════════════════════════
UPDATE public.profiles
SET role = 'Super Admin'
WHERE role = 'admin';

-- Juga update legacy pengasuh → Pengasuh, wali_santri → Wali Santri
UPDATE public.profiles
SET role = 'Pengasuh'
WHERE role = 'pengasuh';

UPDATE public.profiles
SET role = 'Wali Santri'
WHERE role = 'wali_santri';
