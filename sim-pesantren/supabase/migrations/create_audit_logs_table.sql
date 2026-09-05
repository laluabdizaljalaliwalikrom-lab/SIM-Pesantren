-- =========================================================================
-- SQL MIGRATION: CREATE AUDIT_LOGS TABLE
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name TEXT,
    user_role TEXT,
    action TEXT NOT NULL,       -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'IMPORT', 'EXPORT', 'PAYMENT'
    module TEXT NOT NULL,       -- 'Santri', 'Pegawai', 'Keuangan', 'Pembayaran', 'Asrama', 'Tahfidz', 'Settings', 'Auth'
    record_id TEXT,             -- ID entitas terkait
    description TEXT NOT NULL,   -- Ringkasan naratif
    old_data JSONB,             -- Snapshot sebelum diubah/dihapus
    new_data JSONB,             -- Snapshot setelah dibuat/diubah
    ip_address TEXT,
    user_agent TEXT
);

-- Indexing untuk kecepatan query riwayat & filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs (module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: Hanya Super Admin & Admin yang dapat melihat riwayat audit
DROP POLICY IF EXISTS "Super Admin and Admin can view audit logs" ON public.audit_logs;
CREATE POLICY "Super Admin and Admin can view audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role = 'Super Admin' OR role = 'Admin')
        )
    );

-- Policy INSERT: Semua authenticated users dapat mencatat aktivitas mereka
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
