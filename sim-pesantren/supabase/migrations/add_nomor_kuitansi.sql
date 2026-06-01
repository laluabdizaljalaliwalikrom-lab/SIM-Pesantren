-- =========================================================================
-- SQL MIGRATION: Add nomor_kuitansi auto-increment to pembayaran
-- =========================================================================

-- 1. Create sequence for kuitansi numbers per year
CREATE SEQUENCE IF NOT EXISTS public.seq_nomor_kuitansi START 1;

-- 2. Add nomor_kuitansi column to pembayaran
ALTER TABLE public.pembayaran 
ADD COLUMN IF NOT EXISTS nomor_kuitansi TEXT;

-- 3. Create function to auto-generate nomor_kuitansi
CREATE OR REPLACE FUNCTION public.generate_nomor_kuitansi()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT := to_char(NEW.created_at, 'YYYY');
  v_month TEXT := to_char(NEW.created_at, 'MM');
  v_seq INTEGER;
  v_nomor TEXT;
BEGIN
  -- Get next sequence value
  v_seq := nextval('public.seq_nomor_kuitansi');
  v_nomor := 'INV/' || v_year || '/' || v_month || '/' || LPAD(v_seq::TEXT, 5, '0');
  
  -- Handle potential duplicate (safety check)
  WHILE EXISTS (SELECT 1 FROM public.pembayaran WHERE nomor_kuitansi = v_nomor) LOOP
    v_seq := nextval('public.seq_nomor_kuitansi');
    v_nomor := 'INV/' || v_year || '/' || v_month || '/' || LPAD(v_seq::TEXT, 5, '0');
  END LOOP;
  
  NEW.nomor_kuitansi := v_nomor;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to auto-set nomor_kuitansi on insert
DROP TRIGGER IF EXISTS trg_set_nomor_kuitansi ON public.pembayaran;
CREATE TRIGGER trg_set_nomor_kuitansi
  BEFORE INSERT ON public.pembayaran
  FOR EACH ROW
  WHEN (NEW.nomor_kuitansi IS NULL)
  EXECUTE FUNCTION public.generate_nomor_kuitansi();
