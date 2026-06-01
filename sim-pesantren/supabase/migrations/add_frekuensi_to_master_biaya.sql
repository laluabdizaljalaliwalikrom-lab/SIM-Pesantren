-- =========================================================================
-- SQL MIGRATION: ADD FREKUENSI TO MASTER_BIAYA
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

-- 1. Add frekuensi column with constraint to master_biaya
ALTER TABLE public.master_biaya 
ADD COLUMN IF NOT EXISTS frekuensi TEXT DEFAULT 'bulanan' 
CHECK (frekuensi IN ('bulanan', 'persemester', 'insidentil'));

-- 2. Update existing records to default to 'bulanan' if they are null
UPDATE public.master_biaya 
SET frekuensi = 'bulanan' 
WHERE frekuensi IS NULL;

-- 3. Make column NOT NULL
ALTER TABLE public.master_biaya 
ALTER COLUMN frekuensi SET NOT NULL;
