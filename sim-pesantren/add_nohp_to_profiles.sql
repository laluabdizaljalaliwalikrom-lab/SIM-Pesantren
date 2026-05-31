-- ==========================================================================
-- SQL MIGRATION: FIX COLUMNS AND POLICIES FOR TABLE 'public.profiles'
-- Run this script inside your Supabase Dashboard SQL Editor (https://supabase.com)
-- to resolve column altering issues and ensure full compatibility with custom roles.
-- ==========================================================================

-- 1. Drop ALL policies that depend on public.profiles or its 'role' column
-- We will recreate them with robust, recursive-safe, and text-compatible definitions.

-- profiles
DROP POLICY IF EXISTS "Users can view own profile"                  ON public.profiles;
DROP POLICY IF EXISTS "Admin and Pengasuh can view all profiles"    ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile name"           ON public.profiles;
DROP POLICY IF EXISTS "Admin full access to profiles"               ON public.profiles;
DROP POLICY IF EXISTS "Admin full access profiles"                  ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"                ON public.profiles;

-- kamar
DROP POLICY IF EXISTS "Authenticated users can view kamar"          ON public.kamar;
DROP POLICY IF EXISTS "Authenticated can view kamar"                ON public.kamar;
DROP POLICY IF EXISTS "Admin and Pengasuh can manage kamar"         ON public.kamar;
DROP POLICY IF EXISTS "Admin full access kamar"                     ON public.kamar;

-- santri
DROP POLICY IF EXISTS "Wali santri can view their own santri"       ON public.santri;
DROP POLICY IF EXISTS "Wali can view own santri"                    ON public.santri;
DROP POLICY IF EXISTS "Admin and Pengasuh can view all santri"      ON public.santri;
DROP POLICY IF EXISTS "Admin and Pengasuh can manage santri"        ON public.santri;
DROP POLICY IF EXISTS "Admin full access santri"                    ON public.santri;

-- presensi_tahfidz
DROP POLICY IF EXISTS "Admin and Pengasuh can manage tahfidz"       ON public.presensi_tahfidz;
DROP POLICY IF EXISTS "Wali santri can view their own child's tahfidz" ON public.presensi_tahfidz;

-- pembayaran
DROP POLICY IF EXISTS "Wali santri can view own child's payments"   ON public.pembayaran;
DROP POLICY IF EXISTS "Admin and Pengasuh can view all payments"    ON public.pembayaran;
DROP POLICY IF EXISTS "Only admin can insert/update/delete payments" ON public.pembayaran;
DROP POLICY IF EXISTS "Only admin can modify payments"              ON public.pembayaran;
DROP POLICY IF EXISTS "Only admin can manage payments"              ON public.pembayaran;

-- perizinan
DROP POLICY IF EXISTS "Admin and Pengasuh can manage perizinan"     ON public.perizinan;
DROP POLICY IF EXISTS "Wali santri can view own child's perizinan"  ON public.perizinan;

-- master_biaya
DROP POLICY IF EXISTS "Allow public select for master_biaya"        ON public.master_biaya;
DROP POLICY IF EXISTS "Allow admin manage master_biaya"             ON public.master_biaya;

-- tagihan
DROP POLICY IF EXISTS "Wali santri can view own child's bills"      ON public.tagihan;
DROP POLICY IF EXISTS "Admin and Pengasuh can view all bills"       ON public.tagihan;
DROP POLICY IF EXISTS "Only admin can manage tagihan"               ON public.tagihan;

-- app_roles
DROP POLICY IF EXISTS "Allow public select for app_roles"           ON public.app_roles;
DROP POLICY IF EXISTS "Allow admin manage app_roles"                ON public.app_roles;
DROP POLICY IF EXISTS "Authenticated can view app_roles"            ON public.app_roles;
DROP POLICY IF EXISTS "Admin full access app_roles"                 ON public.app_roles;

-- role_permissions
DROP POLICY IF EXISTS "Allow public select for role_permissions"    ON public.role_permissions;
DROP POLICY IF EXISTS "Allow admin manage role_permissions"         ON public.role_permissions;
DROP POLICY IF EXISTS "Authenticated can view role_permissions"     ON public.role_permissions;
DROP POLICY IF EXISTS "Admin full access role_permissions"          ON public.role_permissions;


-- 2. Alter table columns safely
-- Add no_hp column if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS no_hp TEXT;

-- Convert role column to TEXT so it can store custom role names dynamically
ALTER TABLE public.profiles ALTER COLUMN role TYPE TEXT USING role::text;


-- 3. Update/Recreate security helper functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- 4. Update the handle_new_user trigger function (avoiding ENUM cast)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, nama_lengkap, role, no_hp)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', 'Pengguna Baru'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'wali_santri'),
        NEW.raw_user_meta_data->>'no_hp'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        nama_lengkap = EXCLUDED.nama_lengkap,
        role = EXCLUDED.role,
        no_hp = EXCLUDED.no_hp;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role;


-- 5. Recreate ALL dropped policies using updated schema definitions

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin full access profiles" ON public.profiles
    FOR ALL TO authenticated USING (public.is_admin());

-- kamar
CREATE POLICY "Authenticated can view kamar" ON public.kamar
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin full access kamar" ON public.kamar
    FOR ALL TO authenticated USING (public.is_admin());

-- santri
CREATE POLICY "Wali can view own santri" ON public.santri
    FOR SELECT TO authenticated USING (id_wali = auth.uid());

CREATE POLICY "Admin full access santri" ON public.santri
    FOR ALL TO authenticated USING (public.is_admin());

-- presensi_tahfidz
CREATE POLICY "Wali santri can view their own child's tahfidz" ON public.presensi_tahfidz
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.santri
            WHERE santri.id = presensi_tahfidz.id_santri AND santri.id_wali = auth.uid()
        )
    );

CREATE POLICY "Admin and Pengasuh can manage tahfidz" ON public.presensi_tahfidz
    FOR ALL TO authenticated USING (
        public.is_admin() OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'pengasuh'
        )
    );

-- pembayaran
CREATE POLICY "Wali santri can view own child's payments" ON public.pembayaran
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.santri
            WHERE santri.id = pembayaran.id_santri AND santri.id_wali = auth.uid()
        )
    );

CREATE POLICY "Admin and Pengasuh can view all payments" ON public.pembayaran
    FOR SELECT TO authenticated USING (
        public.is_admin() OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'pengasuh'
        )
    );

CREATE POLICY "Only admin can insert/update/delete payments" ON public.pembayaran
    FOR ALL TO authenticated USING (public.is_admin());

-- perizinan
CREATE POLICY "Wali santri can view own child's perizinan" ON public.perizinan
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.santri
            WHERE santri.id = perizinan.id_santri AND santri.id_wali = auth.uid()
        )
    );

CREATE POLICY "Admin and Pengasuh can manage perizinan" ON public.perizinan
    FOR ALL TO authenticated USING (
        public.is_admin() OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'pengasuh'
        )
    );

-- master_biaya
CREATE POLICY "Allow public select for master_biaya" ON public.master_biaya
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin manage master_biaya" ON public.master_biaya
    FOR ALL TO authenticated USING (public.is_admin());

-- tagihan
CREATE POLICY "Wali santri can view own child's bills" ON public.tagihan
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.santri
            WHERE santri.id = tagihan.id_santri AND santri.id_wali = auth.uid()
        )
    );

CREATE POLICY "Admin and Pengasuh can view all bills" ON public.tagihan
    FOR SELECT TO authenticated USING (
        public.is_admin() OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'pengasuh'
        )
    );

CREATE POLICY "Only admin can manage tagihan" ON public.tagihan
    FOR ALL TO authenticated USING (public.is_admin());

-- app_roles
CREATE POLICY "Authenticated can view app_roles" ON public.app_roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin full access app_roles" ON public.app_roles
    FOR ALL TO authenticated USING (public.is_admin());

-- role_permissions
CREATE POLICY "Authenticated can view role_permissions" ON public.role_permissions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin full access role_permissions" ON public.role_permissions
    FOR ALL TO authenticated USING (public.is_admin());
