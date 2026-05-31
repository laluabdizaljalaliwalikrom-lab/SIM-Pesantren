-- =========================================================================
-- SQL MIGRATION: CREATE & SEED LANDING PAGE SETTINGS
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.landing_page_settings (
    id INT PRIMARY KEY DEFAULT 1,
    tagline_title TEXT NOT NULL,
    tagline_description TEXT NOT NULL,
    status_pendaftaran BOOLEAN NOT NULL DEFAULT TRUE,
    medsos_facebook TEXT,
    medsos_instagram TEXT,
    medsos_youtube TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT single_row CHECK (id = 1) -- Membatasi agar hanya ada maksimal 1 baris pengaturan
);

-- Masukkan data bawaan (seed) jika belum ada
INSERT INTO public.landing_page_settings (
    id, 
    tagline_title, 
    tagline_description, 
    status_pendaftaran, 
    medsos_facebook, 
    medsos_instagram, 
    medsos_youtube
)
VALUES (
    1,
    'Membentuk Generasi Qurani yang Unggul, Cerdas, dan Berakhlak Mulia',
    'SIM Pesantren menggabungkan metode pembelajaran salafiyah klasik dengan teknologi modern untuk menghadirkan manajemen asrama, hafalan tahfidz, dan administrasi sekolah yang terintegrasi secara profesional.',
    TRUE,
    'https://facebook.com/pesantrenmodern',
    'https://instagram.com/pesantrenmodern',
    'https://youtube.com/pesantrenmodern'
)
ON CONFLICT (id) DO NOTHING;

-- Aktifkan Row-Level Security (RLS)
ALTER TABLE public.landing_page_settings ENABLE ROW LEVEL SECURITY;

-- Izinkan semua pengguna (termasuk publik) melihat data pengaturan landing page
DROP POLICY IF EXISTS "Allow public select for landing_page_settings" ON public.landing_page_settings;
CREATE POLICY "Allow public select for landing_page_settings" ON public.landing_page_settings 
    FOR SELECT TO public USING (true);

-- Hanya admin yang dapat mengelola data pengaturan
DROP POLICY IF EXISTS "Allow admin modify landing_page_settings" ON public.landing_page_settings;
CREATE POLICY "Allow admin modify landing_page_settings" ON public.landing_page_settings 
    FOR ALL TO authenticated USING (public.is_admin());
