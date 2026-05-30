-- =========================================================================
-- SQL MIGRATION: CREATE BILLING TABLES & FUNCTION
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

-- 1. Create master_biaya Table
CREATE TABLE IF NOT EXISTS public.master_biaya (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_biaya TEXT NOT NULL,
    nominal NUMERIC NOT NULL CHECK (nominal >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on master_biaya
ALTER TABLE public.master_biaya ENABLE ROW LEVEL SECURITY;

-- RLS Policy for master_biaya
CREATE POLICY "Allow public select for master_biaya" ON public.master_biaya FOR SELECT USING (true);
CREATE POLICY "Allow admin manage master_biaya" ON public.master_biaya FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 2. Create tagihan (Billing) Table
CREATE TABLE IF NOT EXISTS public.tagihan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_santri UUID REFERENCES public.santri(id) ON DELETE CASCADE NOT NULL,
    id_master_biaya UUID REFERENCES public.master_biaya(id) ON DELETE RESTRICT NOT NULL,
    bulan INTEGER NOT NULL CHECK (bulan >= 1 AND bulan <= 12),
    tahun INTEGER NOT NULL CHECK (tahun >= 1900),
    nominal NUMERIC NOT NULL CHECK (nominal >= 0),
    status TEXT NOT NULL DEFAULT 'Belum Lunas' CHECK (status IN ('Belum Lunas', 'Lunas')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure no duplicate bills for the same student, cost type, and month/year
    CONSTRAINT unique_student_billing_period UNIQUE (id_santri, id_master_biaya, bulan, tahun)
);

-- Enable RLS on tagihan
ALTER TABLE public.tagihan ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tagihan
CREATE POLICY "Wali santri can view own child's bills"
    ON public.tagihan
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.santri
            WHERE santri.id = tagihan.id_santri 
              AND santri.id_wali = auth.uid()
        )
    );

CREATE POLICY "Admin and Pengasuh can view all bills"
    ON public.tagihan
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pengasuh')
        )
    );

CREATE POLICY "Only admin can manage tagihan"
    ON public.tagihan
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. Database Function for Transaction-Safe Bulk Billing Generation
CREATE OR REPLACE FUNCTION public.generate_monthly_billing(
  p_id_master_biaya UUID,
  p_bulan INTEGER,
  p_tahun INTEGER,
  p_only_mukim BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  inserted_count INTEGER
) LANGUAGE plpgsql AS $$
DECLARE
  v_nominal NUMERIC;
  v_inserted INT := 0;
BEGIN
  -- Get nominal from master_biaya
  SELECT nominal INTO v_nominal FROM public.master_biaya WHERE id = p_id_master_biaya;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Master biaya tidak ditemukan.'::TEXT, 0;
    RETURN;
  END IF;

  -- Insert bills for active students who don't already have one
  -- Executed in a single database transaction context
  INSERT INTO public.tagihan (id_santri, id_master_biaya, bulan, tahun, nominal, status)
  SELECT 
    s.id, 
    p_id_master_biaya, 
    p_bulan, 
    p_tahun, 
    v_nominal, 
    'Belum Lunas'
  FROM public.santri s
  WHERE s.status = 'aktif'
    AND (NOT p_only_mukim OR s.id_kamar IS NOT NULL)
    AND NOT EXISTS (
      SELECT 1 FROM public.tagihan t
      WHERE t.id_santri = s.id
        AND t.id_master_biaya = p_id_master_biaya
        AND t.bulan = p_bulan
        AND t.tahun = p_tahun
    );

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN QUERY SELECT TRUE, 'Tagihan berhasil digenerate.'::TEXT, v_inserted;
END;
$$;
