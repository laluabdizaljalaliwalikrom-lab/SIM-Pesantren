-- =========================================================================
-- SQL MIGRATION: ADD FOTO_URL TO PROFILES & CREATE STORAGE BUCKET
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

-- 1. Add foto_url column to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Comment on column for clarity
COMMENT ON COLUMN public.profiles.foto_url IS 'URL foto profil pengguna yang disimpan di Supabase Storage';

-- 2. Update the handle_new_user trigger function to support foto_url from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, nama_lengkap, role, no_hp, foto_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', 'Pengguna Baru'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'wali_santri'),
        NEW.raw_user_meta_data->>'no_hp',
        NEW.raw_user_meta_data->>'foto_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        nama_lengkap = EXCLUDED.nama_lengkap,
        role = EXCLUDED.role,
        no_hp = EXCLUDED.no_hp,
        foto_url = COALESCE(EXCLUDED.foto_url, profiles.foto_url);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create 'foto-users' bucket in Supabase storage if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('foto-users', 'foto-users', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Enable RLS and setup policies for 'foto-users' bucket
-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow public read for foto-users" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated insert for own foto-users" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update for own foto-users" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete for own foto-users" ON storage.objects;

-- Allow public read access to profile pictures
CREATE POLICY "Allow public read for foto-users" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'foto-users');

-- Allow authenticated users to upload/insert their own profile photos
CREATE POLICY "Allow authenticated insert for own foto-users" ON storage.objects
    FOR INSERT TO authenticated 
    WITH CHECK (
        bucket_id = 'foto-users' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow authenticated users to update their own profile photos
CREATE POLICY "Allow authenticated update for own foto-users" ON storage.objects
    FOR UPDATE TO authenticated 
    USING (
        bucket_id = 'foto-users' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'foto-users' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow authenticated users to delete their own profile photos
CREATE POLICY "Allow authenticated delete for own foto-users" ON storage.objects
    FOR DELETE TO authenticated 
    USING (
        bucket_id = 'foto-users' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );
