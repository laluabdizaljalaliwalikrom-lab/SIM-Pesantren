-- =========================================================================
-- SQL MIGRATION: CREATE BROADCAST_MESSAGES & BROADCAST_RECIPIENTS TABLES
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.broadcast_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sender_name TEXT,
    judul TEXT NOT NULL,
    isi_pesan TEXT NOT NULL,
    saluran TEXT NOT NULL CHECK (saluran IN ('whatsapp', 'email', 'both')),
    target_audience TEXT NOT NULL, -- 'wali_santri', 'santri', 'pegawai', 'custom'
    target_filter JSONB,           -- filter applied (e.g. { id_sekolah, id_kelas, id_gedung, jabatan })
    total_target INT DEFAULT 0 NOT NULL,
    total_sent INT DEFAULT 0 NOT NULL,
    total_failed INT DEFAULT 0 NOT NULL,
    total_skipped INT DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'completed' NOT NULL -- 'draft', 'processing', 'completed', 'failed'
);

CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_broadcast UUID NOT NULL REFERENCES public.broadcast_messages(id) ON DELETE CASCADE,
    nama_penerima TEXT NOT NULL,
    tipe_penerima TEXT NOT NULL,   -- 'Santri', 'Wali Santri', 'Pegawai'
    nomor_wa TEXT,
    email TEXT,
    status_wa TEXT DEFAULT 'none' CHECK (status_wa IN ('none', 'sent', 'failed', 'skipped')),
    status_email TEXT DEFAULT 'none' CHECK (status_email IN ('none', 'sent', 'failed', 'skipped')),
    error_wa TEXT,
    error_email TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexing untuk query cepat
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_created_at ON public.broadcast_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_sender_id ON public.broadcast_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast_id ON public.broadcast_recipients(id_broadcast);

-- Enable RLS
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- Policies untuk broadcast_messages
DROP POLICY IF EXISTS "Authenticated staff can view broadcasts" ON public.broadcast_messages;
CREATE POLICY "Authenticated staff can view broadcasts"
    ON public.broadcast_messages
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated staff can insert broadcasts" ON public.broadcast_messages;
CREATE POLICY "Authenticated staff can insert broadcasts"
    ON public.broadcast_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated staff can update broadcasts" ON public.broadcast_messages;
CREATE POLICY "Authenticated staff can update broadcasts"
    ON public.broadcast_messages
    FOR UPDATE
    TO authenticated
    USING (true);

-- Policies untuk broadcast_recipients
DROP POLICY IF EXISTS "Authenticated staff can view broadcast recipients" ON public.broadcast_recipients;
CREATE POLICY "Authenticated staff can view broadcast recipients"
    ON public.broadcast_recipients
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated staff can insert broadcast recipients" ON public.broadcast_recipients;
CREATE POLICY "Authenticated staff can insert broadcast recipients"
    ON public.broadcast_recipients
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- =========================================================================
-- TABEL KONFIGURASI GATEWAY: WHATSAPP & EMAIL SMTP / RESEND
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.gateway_settings (
    id INT PRIMARY KEY DEFAULT 1,
    -- WhatsApp Gateway (Fonnte / Generic)
    wa_provider TEXT DEFAULT 'fonnte' NOT NULL,
    wa_token TEXT,
    wa_sender_number TEXT,
    wa_is_active BOOLEAN DEFAULT true NOT NULL,

    -- Email SMTP / API (Resend / Custom SMTP)
    email_provider TEXT DEFAULT 'resend' NOT NULL, -- 'resend', 'smtp'
    resend_api_key TEXT,
    email_from_address TEXT DEFAULT 'Pesantren <onboarding@resend.dev>',
    smtp_host TEXT,
    smtp_port INT DEFAULT 587,
    smtp_user TEXT,
    smtp_password TEXT,
    smtp_secure BOOLEAN DEFAULT false,
    email_is_active BOOLEAN DEFAULT true NOT NULL,

    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inisialisasi row default 1 jika belum ada
INSERT INTO public.gateway_settings (id, wa_provider, email_provider)
VALUES (1, 'fonnte', 'resend')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.gateway_settings ENABLE ROW LEVEL SECURITY;

-- Policies gateway_settings (Hanya staff/admin yang dapat melihat & update)
DROP POLICY IF EXISTS "Authenticated users can view gateway settings" ON public.gateway_settings;
CREATE POLICY "Authenticated users can view gateway settings"
    ON public.gateway_settings
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can update gateway settings" ON public.gateway_settings;
CREATE POLICY "Authenticated users can update gateway settings"
    ON public.gateway_settings
    FOR UPDATE
    TO authenticated
    USING (true);

