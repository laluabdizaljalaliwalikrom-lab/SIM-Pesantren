-- ==========================================================================
-- MIGRATION: Add id_role FK to profiles, sync role from app_roles
-- After this migration, use profiles.id_role instead of profiles.role
-- profiles.role TEXT is kept in sync via trigger for backward-compatible RLS
-- ==========================================================================

-- 1. Add id_role column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id_role UUID REFERENCES public.app_roles(id) ON DELETE SET NULL;

-- 2. Migrate existing data: map profiles.role (TEXT) to app_roles.id
UPDATE public.profiles p
SET id_role = r.id
FROM public.app_roles r
WHERE p.id_role IS NULL
  AND (
    (p.role = 'admin' AND r.name = 'Super Admin')
    OR (p.role = 'pengasuh' AND r.name = 'Pengasuh')
    OR (p.role = 'wali_santri' AND r.name = 'Wali Santri')
    OR (p.role = r.name)
  );

-- 3. Create trigger function to sync role from app_roles.name when id_role changes
CREATE OR REPLACE FUNCTION public.sync_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id_role IS NOT NULL THEN
    SELECT name INTO NEW.role FROM public.app_roles WHERE id = NEW.id_role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply trigger on INSERT and UPDATE of id_role
DROP TRIGGER IF EXISTS trg_sync_profile_role ON public.profiles;
CREATE TRIGGER trg_sync_profile_role
  BEFORE INSERT OR UPDATE OF id_role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_role();

-- 5. Update handle_new_user function to use id_role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id UUID;
  v_role_name TEXT;
BEGIN
  v_role_name := COALESCE(NEW.raw_user_meta_data->>'role', 'wali_santri');

  -- Map legacy enum values to app_roles.name
  IF v_role_name = 'admin' THEN
    v_role_name := 'Super Admin';
  ELSIF v_role_name = 'pengasuh' THEN
    v_role_name := 'Pengasuh';
  ELSIF v_role_name = 'wali_santri' THEN
    v_role_name := 'Wali Santri';
  END IF;

  -- Look up app_roles.id
  SELECT id INTO v_role_id FROM public.app_roles WHERE name = v_role_name;

  INSERT INTO public.profiles (id, nama_lengkap, role, id_role, no_hp, foto_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', NEW.raw_user_meta_data->>'nama', ''),
    v_role_name,
    v_role_id,
    NEW.raw_user_meta_data->>'no_hp',
    NEW.raw_user_meta_data->>'foto_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    nama_lengkap = EXCLUDED.nama_lengkap,
    role = EXCLUDED.role,
    id_role = EXCLUDED.id_role,
    no_hp = COALESCE(EXCLUDED.no_hp, profiles.no_hp),
    foto_url = COALESCE(EXCLUDED.foto_url, profiles.foto_url);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON public.profiles (id_role);

-- 7. Ensure existing rows have role synced (the trigger won't fire for existing NULL id_role)
--    This covers any remaining rows that weren't matched in step 2
UPDATE public.profiles p
SET id_role = r.id
FROM public.app_roles r
WHERE p.id_role IS NULL
  AND (
    (p.role = 'admin' AND r.name = 'Super Admin')
    OR (p.role = 'pengasuh' AND r.name = 'Pengasuh')
    OR (p.role = 'wali_santri' AND r.name = 'Wali Santri')
    OR (p.role = r.name)
  );

-- 8. Sync role text for any remaining profiles
UPDATE public.profiles p
SET role = r.name
FROM public.app_roles r
WHERE p.id_role = r.id
  AND (p.role IS NULL OR p.role != r.name);
