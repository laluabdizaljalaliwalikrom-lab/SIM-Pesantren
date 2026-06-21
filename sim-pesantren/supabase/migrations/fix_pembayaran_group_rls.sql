-- ==========================================================================
-- SQL MIGRATION: Fix pembayaran_group RLS to use has_permission()
-- ==========================================================================
-- Sebelumnya: policy menggunakan hardcoded role IN ('Super Admin', 'admin')
-- Sekarang: menggunakan public.has_permission('Keuangan', 'create')
-- supaya konsisten dengan tabel master_biaya, tagihan, dan pembayaran.
-- ==========================================================================

DROP POLICY IF EXISTS "Allow admin insert pembayaran_group" ON public.pembayaran_group;

DROP POLICY IF EXISTS "Allow read pembayaran_group" ON public.pembayaran_group;

CREATE POLICY "RLS: View Pembayaran Group" ON public.pembayaran_group
    FOR SELECT TO authenticated
    USING (public.has_permission('Keuangan', 'view')
        OR EXISTS (SELECT 1 FROM public.santri WHERE santri.id = pembayaran_group.id_santri AND santri.id_wali = auth.uid())
    );

CREATE POLICY "RLS: Manage Pembayaran Group (Create)" ON public.pembayaran_group
    FOR INSERT TO authenticated
    WITH CHECK (public.has_permission('Keuangan', 'create'));

CREATE POLICY "RLS: Manage Pembayaran Group (Edit)" ON public.pembayaran_group
    FOR UPDATE TO authenticated
    USING (public.has_permission('Keuangan', 'edit'))
    WITH CHECK (public.has_permission('Keuangan', 'edit'));

CREATE POLICY "RLS: Manage Pembayaran Group (Delete)" ON public.pembayaran_group
    FOR DELETE TO authenticated
    USING (public.has_permission('Keuangan', 'delete'));
