-- =========================================================================
-- SQL MIGRATION: ADD MISSING DAPODIK COLUMNS TO TABLE 'public.santri'
-- Run this script inside your Supabase Dashboard SQL Editor to ensure
-- all form fields are successfully saved to the database.
-- =========================================================================

ALTER TABLE public.santri
  ADD COLUMN IF NOT EXISTS anak_ke INTEGER,
  ADD COLUMN IF NOT EXISTS jml_saudara_kandung INTEGER,
  ADD COLUMN IF NOT EXISTS jarak_ke_sekolah TEXT,
  
  -- Data Ayah
  ADD COLUMN IF NOT EXISTS tahun_lahir_ayah INTEGER,
  ADD COLUMN IF NOT EXISTS pendidikan_ayah TEXT,
  ADD COLUMN IF NOT EXISTS pekerjaan_ayah TEXT,
  ADD COLUMN IF NOT EXISTS penghasilan_ayah TEXT,
  ADD COLUMN IF NOT EXISTS nik_ayah TEXT,
  
  -- Data Ibu
  ADD COLUMN IF NOT EXISTS tahun_lahir_ibu INTEGER,
  ADD COLUMN IF NOT EXISTS pendidikan_ibu TEXT,
  ADD COLUMN IF NOT EXISTS pekerjaan_ibu TEXT,
  ADD COLUMN IF NOT EXISTS penghasilan_ibu TEXT,
  ADD COLUMN IF NOT EXISTS nik_ibu TEXT,
  
  -- Data Wali
  ADD COLUMN IF NOT EXISTS tahun_lahir_wali INTEGER,
  ADD COLUMN IF NOT EXISTS pendidikan_wali TEXT,
  ADD COLUMN IF NOT EXISTS pekerjaan_wali TEXT,
  ADD COLUMN IF NOT EXISTS penghasilan_wali TEXT,
  ADD COLUMN IF NOT EXISTS nik_wali TEXT,
  
  -- Fisik & Administrasi Penunjang
  ADD COLUMN IF NOT EXISTS lingkar_kepala INTEGER,
  ADD COLUMN IF NOT EXISTS no_registrasi_akta_lahir TEXT,
  ADD COLUMN IF NOT EXISTS skhun TEXT,
  ADD COLUMN IF NOT EXISTS penerima_kip_kps BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bank TEXT,
  ADD COLUMN IF NOT EXISTS no_rekening TEXT,
  ADD COLUMN IF NOT EXISTS layak_pip BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS alasan_layak_pip TEXT;

-- Verify columns
COMMENT ON COLUMN public.santri.anak_ke IS 'Urutan anak dalam keluarga';
COMMENT ON COLUMN public.santri.jml_saudara_kandung IS 'Jumlah saudara kandung santri';
COMMENT ON COLUMN public.santri.jarak_ke_sekolah IS 'Estimasi jarak rumah ke sekolah';
COMMENT ON COLUMN public.santri.penerima_kip_kps IS 'Status kepemilikan Kartu Indonesia Pintar / KPS';
COMMENT ON COLUMN public.santri.layak_pip IS 'Status kelayakan usulan Program Indonesia Pintar';

-- Support Formal and Non-Formal Class assignment simultaneously
ALTER TABLE public.santri
  ADD COLUMN IF NOT EXISTS id_kelas_formal UUID REFERENCES public.kelas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS id_kelas_non_formal UUID REFERENCES public.kelas(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.santri.id_kelas_formal IS 'Referensi kelas pendidikan formal (misal: SMP/SMA)';
COMMENT ON COLUMN public.santri.id_kelas_non_formal IS 'Referensi kelas pendidikan non-formal (misal: Madrasah Diniyah)';

-- =========================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES FOR TABLES 'sekolah' AND 'kelas'
-- Run these statements in the Supabase Dashboard SQL Editor to permit
-- administrative CRUD operations.
-- =========================================================================

-- Enable RLS on both tables (if not already enabled)
ALTER TABLE public.sekolah ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;

-- Redefine Kategori check constraint to accept both title case and lowercase values safely
ALTER TABLE public.sekolah DROP CONSTRAINT IF EXISTS sekolah_kategori_check;
ALTER TABLE public.sekolah ADD CONSTRAINT sekolah_kategori_check CHECK (kategori IN ('Formal', 'Non-Formal', 'formal', 'non-formal'));

-- Make tahun_ajaran column nullable in kelas table to match app forms
ALTER TABLE public.kelas ALTER COLUMN tahun_ajaran DROP NOT NULL;

-- Drop existing policies if they conflict (optional but safe)
DROP POLICY IF EXISTS "Allow public select for sekolah" ON public.sekolah;
DROP POLICY IF EXISTS "Allow public insert for sekolah" ON public.sekolah;
DROP POLICY IF EXISTS "Allow public update for sekolah" ON public.sekolah;
DROP POLICY IF EXISTS "Allow public delete for sekolah" ON public.sekolah;

DROP POLICY IF EXISTS "Allow public select for kelas" ON public.kelas;
DROP POLICY IF EXISTS "Allow public insert for kelas" ON public.kelas;
DROP POLICY IF EXISTS "Allow public update for kelas" ON public.kelas;
DROP POLICY IF EXISTS "Allow public delete for kelas" ON public.kelas;

-- Create policies for table 'sekolah'
CREATE POLICY "Allow public select for sekolah" ON public.sekolah FOR SELECT USING (true);
CREATE POLICY "Allow public insert for sekolah" ON public.sekolah FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for sekolah" ON public.sekolah FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete for sekolah" ON public.sekolah FOR DELETE USING (true);

-- Create policies for table 'kelas'
CREATE POLICY "Allow public select for kelas" ON public.kelas FOR SELECT USING (true);
CREATE POLICY "Allow public insert for kelas" ON public.kelas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for kelas" ON public.kelas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete for kelas" ON public.kelas FOR DELETE USING (true);

-- =========================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES FOR TABLE 'santri'
-- Run these statements in the Supabase Dashboard SQL Editor to permit
-- administrative CRUD operations.
-- =========================================================================

-- Enable RLS on santri table (if not already enabled)
ALTER TABLE public.santri ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they conflict
DROP POLICY IF EXISTS "Allow public select for santri" ON public.santri;
DROP POLICY IF EXISTS "Allow public insert for santri" ON public.santri;
DROP POLICY IF EXISTS "Allow public update for santri" ON public.santri;
DROP POLICY IF EXISTS "Allow public delete for santri" ON public.santri;

-- Create policies for table 'santri'
CREATE POLICY "Allow public select for santri" ON public.santri FOR SELECT USING (true);
CREATE POLICY "Allow public insert for santri" ON public.santri FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for santri" ON public.santri FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete for santri" ON public.santri FOR DELETE USING (true);

-- =========================================================================
-- DATABASE FUNCTION: move_santri_to_kamar
-- Run this block in the Supabase Dashboard SQL Editor to establish
-- atomic student room transfer capabilities.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.move_santri_to_kamar(
  santri_ids UUID[],
  target_kamar_id UUID
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  remaining_capacity INT
) LANGUAGE plpgsql AS $$
DECLARE
  v_capacity INT;
  v_current_occupants INT;
  v_needed INT;
BEGIN
  -- Get room capacity
  SELECT kapasitas INTO v_capacity FROM public.kamar WHERE id = target_kamar_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Kamar tidak ditemukan.'::TEXT, 0;
    RETURN;
  END IF;

  -- Count current occupants
  SELECT COUNT(*)::INT INTO v_current_occupants FROM public.santri WHERE id_kamar = target_kamar_id;

  -- Needed spots
  v_needed := array_length(santri_ids, 1);

  -- Validate capacity
  IF (v_capacity - v_current_occupants) < v_needed THEN
    RETURN QUERY SELECT FALSE, 'Kapasitas kamar tidak mencukupi.'::TEXT, (v_capacity - v_current_occupants);
    RETURN;
  END IF;

  -- Update occupants
  UPDATE public.santri
  SET id_kamar = target_kamar_id
  WHERE id = ANY(santri_ids);

  RETURN QUERY SELECT TRUE, 'Santri berhasil dipindahkan.'::TEXT, (v_capacity - (v_current_occupants + v_needed));
END;
$$;

