-- =========================================================================
-- SQL MIGRATION: ADD AUDIT COLUMNS TO PEMBAYARAN
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

-- 1. Add id_tagihan column to pembayaran referencing tagihan
ALTER TABLE public.pembayaran 
ADD COLUMN IF NOT EXISTS id_tagihan UUID REFERENCES public.tagihan(id) ON DELETE CASCADE;

-- 2. Add id_admin column to pembayaran referencing profiles
ALTER TABLE public.pembayaran 
ADD COLUMN IF NOT EXISTS id_admin UUID REFERENCES public.profiles(id);

-- 3. Adjust RLS policies on pembayaran table to make joins possible
DROP POLICY IF EXISTS "Admin and Pengasuh can view all payments" ON public.pembayaran;

CREATE POLICY "Admin and Pengasuh can view all payments"
    ON public.pembayaran
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pengasuh')
        )
    );
