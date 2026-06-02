-- ==========================================================================
-- SQL FIX: Create missing materialized view app_role_permissions
-- Run this script inside your Supabase Dashboard SQL Editor.
-- ==========================================================================

-- Buat materialized view yang direferensi oleh update_role_permissions() dan trigger
CREATE MATERIALIZED VIEW IF NOT EXISTS public.app_role_permissions AS
SELECT
  rp.id,
  ar.name AS role_name,
  rp.feature,
  rp.can_view,
  rp.can_create,
  rp.can_edit,
  rp.can_delete
FROM public.role_permissions rp
JOIN public.app_roles ar ON ar.id = rp.id_role
WITH DATA;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_role_permissions_id ON public.app_role_permissions (id);

-- Grant select to authenticated
GRANT SELECT ON public.app_role_permissions TO authenticated;
