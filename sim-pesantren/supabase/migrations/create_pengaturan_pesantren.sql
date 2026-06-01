-- ==========================================================================
-- SQL MIGRATION: CREATE PESANTREN PROFILE (PENGATURAN) TABLES
-- Run this script inside your Supabase Dashboard SQL Editor (https://supabase.com).
-- ==========================================================================

-- 1. Create public.pesantren_profile Table
CREATE TABLE IF NOT EXISTS public.pesantren_profile (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_pesantren TEXT NOT NULL DEFAULT 'Pesantren Antigravity',
    npsn TEXT,
    nspp TEXT,
    nama_pimpinan TEXT,
    alamat TEXT,
    telepon TEXT,
    email TEXT,
    website TEXT,
    visi TEXT,
    misi TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on pesantren_profile
ALTER TABLE public.pesantren_profile ENABLE ROW LEVEL SECURITY;

-- 2. Trigger to ensure only one row in the table
CREATE OR REPLACE FUNCTION public.restrict_pesantren_profile_rows()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.pesantren_profile) >= 1 AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Hanya diperbolehkan menyimpan 1 baris konfigurasi profil pesantren.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_insert_restrict_rows
  BEFORE INSERT ON public.pesantren_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_pesantren_profile_rows();

-- 3. RLS Policies
DROP POLICY IF EXISTS "RLS: View Pesantren Profile" ON public.pesantren_profile;
DROP POLICY IF EXISTS "RLS: Update Pesantren Profile" ON public.pesantren_profile;

-- Anyone authenticated can view
CREATE POLICY "RLS: View Pesantren Profile" ON public.pesantren_profile FOR SELECT TO authenticated
    USING (TRUE);

-- Super admin, admin, or profile update capabilities
CREATE POLICY "RLS: Update Pesantren Profile" ON public.pesantren_profile FOR UPDATE TO authenticated
    USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' OR 
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Super Admin'
    );

-- 4. Seed initial profile if not exists
INSERT INTO public.pesantren_profile (id, nama_pesantren, npsn, nspp, nama_pimpinan, alamat, telepon, email, website, visi, misi)
SELECT 
  '00000000-0000-0000-0000-000000000001'::UUID,
  'Pondok Pesantren Antigravity',
  '12345678',
  '9876543210',
  'K.H. Ahmad Dahlan',
  'Jl. Raya Antigravity No. 42, Yogyakarta',
  '081234567890',
  'info@antigravity.sch.id',
  'https://antigravity.sch.id',
  'Mewujudkan generasi rabbani yang berakhlak mulia, berilmu luas, berdaya saing global, dan berpegang teguh pada nilai-nilai Islam.',
  '1. Menyelenggarakan pendidikan kepesantrenan berbasis kitab kuning dan kurikulum nasional.\n2. Menanamkan adab, kemandirian, dan kedisiplinan dalam kehidupan sehari-hari.\n3. Mengembangkan potensi bakat, wirausaha, serta teknologi informasi bagi para santri.'
WHERE NOT EXISTS (SELECT 1 FROM public.pesantren_profile);
