-- ==========================================================================
-- SQL MIGRATION: CREATE ACADEMIC YEAR (TAHUN AJARAN) AND SEMESTER TABLES
-- Run this script inside your Supabase Dashboard SQL Editor (https://supabase.com).
-- ==========================================================================

-- 1. Create public.tahun_ajaran Table
CREATE TABLE IF NOT EXISTS public.tahun_ajaran (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_tahun TEXT UNIQUE NOT NULL, -- e.g., '2025/2026'
    tanggal_mulai DATE NOT NULL,
    tanggal_akhir DATE NOT NULL,
    status_aktif BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    CONSTRAINT tanggal_check CHECK (tanggal_akhir > tanggal_mulai)
);

-- Enable RLS on tahun_ajaran
ALTER TABLE public.tahun_ajaran ENABLE ROW LEVEL SECURITY;

-- 2. Create public.semester Table
CREATE TABLE IF NOT EXISTS public.semester (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_tahun_ajaran UUID REFERENCES public.tahun_ajaran(id) ON DELETE CASCADE NOT NULL,
    nama_semester TEXT NOT NULL CHECK (nama_semester IN ('Ganjil', 'Genap')),
    status_aktif BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    CONSTRAINT unique_semester_per_tahun UNIQUE (id_tahun_ajaran, nama_semester)
);

-- Enable RLS on semester
ALTER TABLE public.semester ENABLE ROW LEVEL SECURITY;


-- 3. Trigger to ensure only one active tahun_ajaran
CREATE OR REPLACE FUNCTION public.sync_active_tahun_ajaran()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status_aktif = TRUE THEN
    -- Set all other academic years to inactive
    UPDATE public.tahun_ajaran SET status_aktif = FALSE WHERE id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_tahun_ajaran_active_update
  BEFORE INSERT OR UPDATE OF status_aktif ON public.tahun_ajaran
  FOR EACH ROW 
  WHEN (NEW.status_aktif = TRUE)
  EXECUTE FUNCTION public.sync_active_tahun_ajaran();


-- 4. Trigger to ensure only one active semester
CREATE OR REPLACE FUNCTION public.sync_active_semester()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status_aktif = TRUE THEN
    -- Set all other semesters to inactive
    UPDATE public.semester SET status_aktif = FALSE WHERE id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_semester_active_update
  BEFORE INSERT OR UPDATE OF status_aktif ON public.semester
  FOR EACH ROW 
  WHEN (NEW.status_aktif = TRUE)
  EXECUTE FUNCTION public.sync_active_semester();


-- 5. Establish RLS Policies mapped to Matrix Roles (Akademik Module)
DROP POLICY IF EXISTS "RLS: View Tahun Ajaran" ON public.tahun_ajaran;
DROP POLICY IF EXISTS "RLS: Create Tahun Ajaran" ON public.tahun_ajaran;
DROP POLICY IF EXISTS "RLS: Edit Tahun Ajaran" ON public.tahun_ajaran;
DROP POLICY IF EXISTS "RLS: Delete Tahun Ajaran" ON public.tahun_ajaran;

CREATE POLICY "RLS: View Tahun Ajaran" ON public.tahun_ajaran FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY "RLS: Create Tahun Ajaran" ON public.tahun_ajaran FOR INSERT TO authenticated
    WITH CHECK (public.has_permission('Akademik', 'create'));

CREATE POLICY "RLS: Edit Tahun Ajaran" ON public.tahun_ajaran FOR UPDATE TO authenticated
    USING (public.has_permission('Akademik', 'edit'));

CREATE POLICY "RLS: Delete Tahun Ajaran" ON public.tahun_ajaran FOR DELETE TO authenticated
    USING (public.has_permission('Akademik', 'delete'));

DROP POLICY IF EXISTS "RLS: View Semester" ON public.semester;
DROP POLICY IF EXISTS "RLS: Create Semester" ON public.semester;
DROP POLICY IF EXISTS "RLS: Edit Semester" ON public.semester;
DROP POLICY IF EXISTS "RLS: Delete Semester" ON public.semester;

CREATE POLICY "RLS: View Semester" ON public.semester FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY "RLS: Create Semester" ON public.semester FOR INSERT TO authenticated
    WITH CHECK (public.has_permission('Akademik', 'create'));

CREATE POLICY "RLS: Edit Semester" ON public.semester FOR UPDATE TO authenticated
    USING (public.has_permission('Akademik', 'edit'));

CREATE POLICY "RLS: Delete Semester" ON public.semester FOR DELETE TO authenticated
    USING (public.has_permission('Akademik', 'delete'));


-- 6. Seed initial values (Optional)
INSERT INTO public.tahun_ajaran (nama_tahun, tanggal_mulai, tanggal_akhir, status_aktif) VALUES
    ('2025/2026', '2025-07-01', '2026-06-30', TRUE)
ON CONFLICT (nama_tahun) DO NOTHING;

DO $$
DECLARE
  v_tahun_id UUID;
BEGIN
  SELECT id INTO v_tahun_id FROM public.tahun_ajaran WHERE nama_tahun = '2025/2026';
  IF v_tahun_id IS NOT NULL THEN
    INSERT INTO public.semester (id_tahun_ajaran, nama_semester, status_aktif) VALUES
        (v_tahun_id, 'Ganjil', TRUE),
        (v_tahun_id, 'Genap', FALSE)
    ON CONFLICT ON CONSTRAINT unique_semester_per_tahun DO NOTHING;
  END IF;
END $$;
