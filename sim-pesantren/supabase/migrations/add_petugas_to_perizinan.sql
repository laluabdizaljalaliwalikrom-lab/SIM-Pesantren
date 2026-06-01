-- ==========================================================================
-- SQL MIGRATION: Add petugas (officer) tracking columns to perizinan table
-- Run this script inside your Supabase Dashboard SQL Editor.
-- ==========================================================================

-- 1. Add created_by column (who created/submitted the permit)
ALTER TABLE public.perizinan
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Add approved_by column (who approved/rejected/confirmed return)
ALTER TABLE public.perizinan
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.perizinan.created_by IS 'Petugas yang mendaftarkan/menginput perizinan';
COMMENT ON COLUMN public.perizinan.approved_by IS 'Petugas yang menyetujui/menolak/mengkonfirmasi kepulangan';
