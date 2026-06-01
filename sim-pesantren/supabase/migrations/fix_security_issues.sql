-- =========================================================================
-- SECURITY FIXES: Storage RLS, Function Security, dan Best Practices
-- Jalankan script ini di Supabase Dashboard SQL Editor.
-- =========================================================================

-- ═════════════════════════════════════════════════════════════════════════
-- FIX 1: Storage Buckets — Restrict INSERT/UPDATE/DELETE ke authenticated
-- Public SELECT tetap diizinkan untuk menampilkan foto.
-- ═════════════════════════════════════════════════════════════════════════

-- ─── FOTO-SANTRI ──────────────────────────────────────────────────────────
-- Public SELECT OK (foto perlu ditampilkan di landing page / profil)
DROP POLICY IF EXISTS "Allow public select for foto-santri" ON storage.objects;
CREATE POLICY "Allow public select for foto-santri" ON storage.objects 
    FOR SELECT TO public USING (bucket_id = 'foto-santri');

-- INSERT/UPDATE/DELETE hanya untuk authenticated users
DROP POLICY IF EXISTS "Allow public insert for foto-santri" ON storage.objects;
CREATE POLICY "Allow authenticated insert for foto-santri" ON storage.objects 
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'foto-santri');

DROP POLICY IF EXISTS "Allow public update for foto-santri" ON storage.objects;
CREATE POLICY "Allow authenticated update for foto-santri" ON storage.objects 
    FOR UPDATE TO authenticated USING (bucket_id = 'foto-santri') WITH CHECK (bucket_id = 'foto-santri');

DROP POLICY IF EXISTS "Allow public delete for foto-santri" ON storage.objects;
CREATE POLICY "Allow authenticated delete for foto-santri" ON storage.objects 
    FOR DELETE TO authenticated USING (bucket_id = 'foto-santri');

-- ─── FOTO-PEGAWAI ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow public select for foto-pegawai" ON storage.objects;
CREATE POLICY "Allow public select for foto-pegawai" ON storage.objects 
    FOR SELECT TO public USING (bucket_id = 'foto-pegawai');

DROP POLICY IF EXISTS "Allow public insert for foto-pegawai" ON storage.objects;
CREATE POLICY "Allow authenticated insert for foto-pegawai" ON storage.objects 
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'foto-pegawai');

DROP POLICY IF EXISTS "Allow public update for foto-pegawai" ON storage.objects;
CREATE POLICY "Allow authenticated update for foto-pegawai" ON storage.objects 
    FOR UPDATE TO authenticated USING (bucket_id = 'foto-pegawai') WITH CHECK (bucket_id = 'foto-pegawai');

DROP POLICY IF EXISTS "Allow public delete for foto-pegawai" ON storage.objects;
CREATE POLICY "Allow authenticated delete for foto-pegawai" ON storage.objects 
    FOR DELETE TO authenticated USING (bucket_id = 'foto-pegawai');

-- ─── FOTO-PESANTREN ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow public select for foto-pesantren" ON storage.objects;
CREATE POLICY "Allow public select for foto-pesantren" ON storage.objects 
    FOR SELECT TO public USING (bucket_id = 'foto-pesantren');

DROP POLICY IF EXISTS "Allow public insert for foto-pesantren" ON storage.objects;
CREATE POLICY "Allow authenticated insert for foto-pesantren" ON storage.objects 
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'foto-pesantren');

DROP POLICY IF EXISTS "Allow public update for foto-pesantren" ON storage.objects;
CREATE POLICY "Allow authenticated update for foto-pesantren" ON storage.objects 
    FOR UPDATE TO authenticated USING (bucket_id = 'foto-pesantren') WITH CHECK (bucket_id = 'foto-pesantren');

DROP POLICY IF EXISTS "Allow public delete for foto-pesantren" ON storage.objects;
CREATE POLICY "Allow authenticated delete for foto-pesantren" ON storage.objects 
    FOR DELETE TO authenticated USING (bucket_id = 'foto-pesantren');


-- ═════════════════════════════════════════════════════════════════════════
-- FIX 2: update_role_permissions — Tambah SET search_path & admin check
-- SECURITY DEFINER tanpa search_path bisa kena SQL injection via search_path
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
  -- Cek bahwa caller adalah admin (defense-in-depth)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
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

  -- Refresh materialized view agar data permission langsung up-to-date
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
-- FIX 3: Materialized View — Tambah trigger auto-refresh
-- ═════════════════════════════════════════════════════════════════════════

-- Buat function untuk refresh materialized view
CREATE OR REPLACE FUNCTION public.refresh_app_role_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.app_role_permissions;
  RETURN NULL;
END;
$$;

-- Trigger ketika role_permissions berubah
DROP TRIGGER IF EXISTS trg_refresh_app_role_permissions ON public.role_permissions;
CREATE TRIGGER trg_refresh_app_role_permissions
  AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.refresh_app_role_permissions();

-- Trigger ketika app_roles berubah
DROP TRIGGER IF EXISTS trg_refresh_app_role_permissions_roles ON public.app_roles;
CREATE TRIGGER trg_refresh_app_role_permissions_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.app_roles
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.refresh_app_role_permissions();


-- ═════════════════════════════════════════════════════════════════════════
-- FIX 4: is_admin() — Sudah aman (SET search_path = public), pastikan 
-- GRANT sudah benar
-- ═════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT, TEXT) TO authenticated;


-- ═════════════════════════════════════════════════════════════════════════
-- FIX 5: Revoke hak istimewa yang tidak perlu dari anon/public
-- ═════════════════════════════════════════════════════════════════════════

-- Pastikan semua fungsi RPC hanya bisa dipanggil oleh authenticated
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
