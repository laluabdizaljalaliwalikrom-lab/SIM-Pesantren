-- =========================================================================
-- SQL MIGRATION: CREATE USER ROLE & PERMISSION MATRIX TABLES
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

-- 1. Create app_roles Table
CREATE TABLE IF NOT EXISTS public.app_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on app_roles
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policy for app_roles
CREATE POLICY "Allow public select for app_roles" ON public.app_roles FOR SELECT USING (true);
CREATE POLICY "Allow admin manage app_roles" ON public.app_roles FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 2. Create role_permissions Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_role UUID REFERENCES public.app_roles(id) ON DELETE CASCADE NOT NULL,
    feature TEXT NOT NULL, -- e.g. 'Santri', 'Keuangan', 'Akademik'
    can_view BOOLEAN DEFAULT FALSE,
    can_create BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraint to make sure one feature mapping per role
    CONSTRAINT unique_role_feature_permission UNIQUE (id_role, feature)
);

-- Enable RLS on role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy for role_permissions
CREATE POLICY "Allow public select for role_permissions" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "Allow admin manage role_permissions" ON public.role_permissions FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. Seed initial default roles
INSERT INTO public.app_roles (name, description) VALUES
    ('Super Admin', 'Akses penuh ke semua fitur dan pengaturan sistem.'),
    ('Pengasuh', 'Mengelola data santri, perizinan, dan progres hafalan tahfidz.'),
    ('Bendahara', 'Mengelola master biaya, billing tagihan, dan pembayaran kasir.'),
    ('Wali Santri', 'Melihat profil anak, riwayat tahfidz, dan tagihan anak.')
ON CONFLICT (name) DO NOTHING;

-- 4. Seed default permissions for roles
DO $$
DECLARE
  v_admin_id UUID;
  v_pengasuh_id UUID;
  v_bendahara_id UUID;
  v_wali_id UUID;
BEGIN
  -- Get IDs
  SELECT id INTO v_admin_id FROM public.app_roles WHERE name = 'Super Admin';
  SELECT id INTO v_pengasuh_id FROM public.app_roles WHERE name = 'Pengasuh';
  SELECT id INTO v_bendahara_id FROM public.app_roles WHERE name = 'Bendahara';
  SELECT id INTO v_wali_id FROM public.app_roles WHERE name = 'Wali Santri';

  -- Seed Super Admin Permissions (All Features, All Access)
  IF v_admin_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (id_role, feature, can_view, can_create, can_edit, can_delete) VALUES
      (v_admin_id, 'Santri', TRUE, TRUE, TRUE, TRUE),
      (v_admin_id, 'Keuangan', TRUE, TRUE, TRUE, TRUE),
      (v_admin_id, 'Akademik', TRUE, TRUE, TRUE, TRUE)
    ON CONFLICT ON CONSTRAINT unique_role_feature_permission DO NOTHING;
  END IF;

  -- Seed Pengasuh Permissions
  IF v_pengasuh_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (id_role, feature, can_view, can_create, can_edit, can_delete) VALUES
      (v_pengasuh_id, 'Santri', TRUE, TRUE, TRUE, FALSE),
      (v_pengasuh_id, 'Keuangan', FALSE, FALSE, FALSE, FALSE),
      (v_pengasuh_id, 'Akademik', TRUE, TRUE, TRUE, TRUE)
    ON CONFLICT ON CONSTRAINT unique_role_feature_permission DO NOTHING;
  END IF;

  -- Seed Bendahara Permissions
  IF v_bendahara_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (id_role, feature, can_view, can_create, can_edit, can_delete) VALUES
      (v_bendahara_id, 'Santri', TRUE, FALSE, FALSE, FALSE),
      (v_bendahara_id, 'Keuangan', TRUE, TRUE, TRUE, TRUE),
      (v_bendahara_id, 'Akademik', FALSE, FALSE, FALSE, FALSE)
    ON CONFLICT ON CONSTRAINT unique_role_feature_permission DO NOTHING;
  END IF;

  -- Seed Wali Santri Permissions
  IF v_wali_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (id_role, feature, can_view, can_create, can_edit, can_delete) VALUES
      (v_wali_id, 'Santri', TRUE, FALSE, FALSE, FALSE),
      (v_wali_id, 'Keuangan', TRUE, FALSE, FALSE, FALSE),
      (v_wali_id, 'Akademik', TRUE, FALSE, FALSE, FALSE)
    ON CONFLICT ON CONSTRAINT unique_role_feature_permission DO NOTHING;
  END IF;
END $$;
