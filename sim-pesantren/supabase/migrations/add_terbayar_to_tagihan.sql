-- =========================================================================
-- SQL MIGRATION: ADD TERBAYAR TO TAGIHAN
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

-- 1. Add terbayar column to tagihan
ALTER TABLE public.tagihan 
ADD COLUMN IF NOT EXISTS terbayar NUMERIC DEFAULT 0 
CHECK (terbayar >= 0);

-- 2. Update existing tagihan records that are 'Lunas' to have terbayar equal to nominal
UPDATE public.tagihan 
SET terbayar = nominal 
WHERE status = 'Lunas';

-- 3. Make column NOT NULL
ALTER TABLE public.tagihan 
ALTER COLUMN terbayar SET NOT NULL;
