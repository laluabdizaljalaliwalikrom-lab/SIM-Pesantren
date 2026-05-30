-- =========================================================================
-- SQL MIGRATION: ADD MISSING COLUMNS AND UPDATE CONSTRAINTS ON TABLE PERIZINAN
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

-- 1. Add missing columns to 'perizinan' table
ALTER TABLE public.perizinan
  ADD COLUMN IF NOT EXISTS rencana_kembali TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS penjemput TEXT;

COMMENT ON COLUMN public.perizinan.rencana_kembali IS 'Waktu rencana santri kembali ke pesantren';
COMMENT ON COLUMN public.perizinan.penjemput IS 'Nama penjemput / penanggung jawab penjemputan santri';

-- 2. Drop and update status check constraint to support both lowercase UI statuses and old Uppercase statuses
ALTER TABLE public.perizinan DROP CONSTRAINT IF EXISTS perizinan_status_check;
ALTER TABLE public.perizinan ADD CONSTRAINT perizinan_status_check CHECK (status IN ('diajukan', 'disetujui', 'ditolak', 'kembali', 'Aktif', 'Kembali'));

-- 3. Enable RLS and public policies
ALTER TABLE public.perizinan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select for perizinan" ON public.perizinan;
DROP POLICY IF EXISTS "Allow public insert for perizinan" ON public.perizinan;
DROP POLICY IF EXISTS "Allow public update for perizinan" ON public.perizinan;
DROP POLICY IF EXISTS "Allow public delete for perizinan" ON public.perizinan;

CREATE POLICY "Allow public select for perizinan" ON public.perizinan FOR SELECT USING (true);
CREATE POLICY "Allow public insert for perizinan" ON public.perizinan FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for perizinan" ON public.perizinan FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete for perizinan" ON public.perizinan FOR DELETE USING (true);

