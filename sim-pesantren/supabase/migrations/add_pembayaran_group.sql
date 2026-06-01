-- =========================================================================
-- SQL MIGRATION: Add pembayaran_group for unified receipts
-- =========================================================================

-- 1. Create pembayaran_group table
CREATE TABLE IF NOT EXISTS public.pembayaran_group (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nomor_kuitansi TEXT,
    id_santri UUID REFERENCES public.santri(id) ON DELETE CASCADE NOT NULL,
    total_tagihan NUMERIC NOT NULL DEFAULT 0,
    total_bayar NUMERIC NOT NULL DEFAULT 0,
    uang_diterima NUMERIC NOT NULL DEFAULT 0,
    kembalian NUMERIC NOT NULL DEFAULT 0,
    id_admin UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.pembayaran_group ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read pembayaran_group"
    ON public.pembayaran_group FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Allow admin insert pembayaran_group"
    ON public.pembayaran_group FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Add id_group to pembayaran
ALTER TABLE public.pembayaran
ADD COLUMN IF NOT EXISTS id_group UUID REFERENCES public.pembayaran_group(id) ON DELETE SET NULL;

-- 3. Remove auto nomor_kuitansi from pembayaran (it will be on group instead)
-- Keep the column but drop the trigger
DROP TRIGGER IF EXISTS trg_set_nomor_kuitansi ON public.pembayaran;

-- 4. Create trigger for nomor_kuitansi on pembayaran_group instead
CREATE OR REPLACE FUNCTION public.generate_nomor_kuitansi_group()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT := to_char(NEW.created_at, 'YYYY');
  v_month TEXT := to_char(NEW.created_at, 'MM');
  v_seq INTEGER;
  v_nomor TEXT;
BEGIN
  v_seq := nextval('public.seq_nomor_kuitansi');
  v_nomor := 'INV/' || v_year || '/' || v_month || '/' || LPAD(v_seq::TEXT, 5, '0');
  
  WHILE EXISTS (SELECT 1 FROM public.pembayaran_group WHERE nomor_kuitansi = v_nomor) LOOP
    v_seq := nextval('public.seq_nomor_kuitansi');
    v_nomor := 'INV/' || v_year || '/' || v_month || '/' || LPAD(v_seq::TEXT, 5, '0');
  END LOOP;
  
  NEW.nomor_kuitansi := v_nomor;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_nomor_kuitansi_group ON public.pembayaran_group;
CREATE TRIGGER trg_set_nomor_kuitansi_group
  BEFORE INSERT ON public.pembayaran_group
  FOR EACH ROW
  WHEN (NEW.nomor_kuitansi IS NULL)
  EXECUTE FUNCTION public.generate_nomor_kuitansi_group();
