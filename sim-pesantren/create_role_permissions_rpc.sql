-- ==========================================================================
-- SQL MIGRATION: TRANSACTIONAL RPC FOR UPDATING ROLE PERMISSIONS
-- Jalankan script ini di SQL Editor Dashboard Supabase Anda.
--
-- Fungsi ini membungkus operasi DELETE + INSERT dalam satu transaksi atomik.
-- Jika INSERT gagal karena alasan apapun, DELETE akan di-rollback otomatis.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.update_role_permissions(
  p_role_id       UUID,
  p_permissions   JSONB   -- Array of {feature, can_view, can_create, can_edit, can_delete}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role_name   TEXT;
  v_perm        JSONB;
  v_count       INTEGER := 0;
BEGIN
  -- 1. Validasi: role_id wajib ada
  SELECT name INTO v_role_name FROM public.app_roles WHERE id = p_role_id;
  IF v_role_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Role tidak ditemukan.'
    );
  END IF;

  -- 2. Proteksi: Super Admin tidak boleh dimodifikasi
  IF v_role_name = 'Super Admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Hak akses Super Admin tidak dapat dimodifikasi.'
    );
  END IF;

  -- 3. DELETE semua permission untuk role ini (step 1 transaksi)
  DELETE FROM public.role_permissions WHERE id_role = p_role_id;

  -- 4. INSERT baris baru berdasarkan array yang dikirim UI
  FOR v_perm IN SELECT * FROM jsonb_array_elements(p_permissions) LOOP
    INSERT INTO public.role_permissions (
      id_role,
      feature,
      can_view,
      can_create,
      can_edit,
      can_delete
    ) VALUES (
      p_role_id,
      v_perm->>'feature',
      COALESCE((v_perm->>'can_view')::BOOLEAN,   false),
      COALESCE((v_perm->>'can_create')::BOOLEAN, false),
      COALESCE((v_perm->>'can_edit')::BOOLEAN,   false),
      COALESCE((v_perm->>'can_delete')::BOOLEAN, false)
    );
    v_count := v_count + 1;
  END LOOP;

  -- 5. Kembalikan hasil sukses
  RETURN jsonb_build_object(
    'success',        true,
    'message',        format('Berhasil menyimpan %s hak akses untuk role "%s".', v_count, v_role_name),
    'updated_count',  v_count
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback otomatis dilakukan oleh PostgreSQL, kembalikan pesan error
    RETURN jsonb_build_object(
      'success', false,
      'message', format('Transaksi gagal: %s', SQLERRM)
    );
END;
$$;

-- Berikan hak EXECUTE ke authenticated user (admin will be gated in server action)
GRANT EXECUTE ON FUNCTION public.update_role_permissions(UUID, JSONB) TO authenticated;
