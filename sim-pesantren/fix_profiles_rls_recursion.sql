-- ==========================================================================
-- FIX LENGKAP: RLS Policies — Hanya Super Admin punya akses penuh
-- Mengatasi "infinite recursion" di SEMUA tabel yang meng-query profiles.
--
-- Jalankan di Supabase Dashboard → SQL Editor (satu kali).
-- ==========================================================================

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 1: Fungsi helper SECURITY DEFINER (bypass RLS, tanpa rekursi)
-- ══════════════════════════════════════════════════════════════════════════

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

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 2: Hapus SEMUA policy lama yang rekursif
-- ══════════════════════════════════════════════════════════════════════════

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

-- app_roles
DROP POLICY IF EXISTS "Allow public select for app_roles"           ON public.app_roles;
DROP POLICY IF EXISTS "Allow admin manage app_roles"                ON public.app_roles;

-- role_permissions
DROP POLICY IF EXISTS "Allow public select for role_permissions"    ON public.role_permissions;
DROP POLICY IF EXISTS "Allow admin manage role_permissions"         ON public.role_permissions;

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 3: Buat policy baru — SIMPLE, TANPA REKURSI
-- ══════════════════════════════════════════════════════════════════════════

-- ─── PROFILES ─────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin full access profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin());

-- ─── KAMAR ────────────────────────────────────────────────────────────────
CREATE POLICY "Authenticated can view kamar"
  ON public.kamar FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin full access kamar"
  ON public.kamar FOR ALL TO authenticated
  USING (public.is_admin());

-- ─── SANTRI ───────────────────────────────────────────────────────────────
CREATE POLICY "Wali can view own santri"
  ON public.santri FOR SELECT TO authenticated
  USING (id_wali = auth.uid());

CREATE POLICY "Admin full access santri"
  ON public.santri FOR ALL TO authenticated
  USING (public.is_admin());

-- ─── APP_ROLES ────────────────────────────────────────────────────────────
CREATE POLICY "Authenticated can view app_roles"
  ON public.app_roles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin full access app_roles"
  ON public.app_roles FOR ALL TO authenticated
  USING (public.is_admin());

-- ─── ROLE_PERMISSIONS ─────────────────────────────────────────────────────
CREATE POLICY "Authenticated can view role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin full access role_permissions"
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.is_admin());
