-- =========================================================================
-- SQL MIGRATION: CREATE BUCKETS AND CONFIG STORAGE RLS POLICIES
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

-- 1. Insert buckets 'foto-santri' and 'foto-pegawai' into Supabase storage
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('foto-santri', 'foto-santri', true),
    ('foto-pegawai', 'foto-pegawai', true)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Policies for 'foto-santri' bucket
DROP POLICY IF EXISTS "Allow public select for foto-santri" ON storage.objects;
CREATE POLICY "Allow public select for foto-santri" ON storage.objects 
    FOR SELECT TO public USING (bucket_id = 'foto-santri');

DROP POLICY IF EXISTS "Allow public insert for foto-santri" ON storage.objects;
CREATE POLICY "Allow public insert for foto-santri" ON storage.objects 
    FOR INSERT TO public WITH CHECK (bucket_id = 'foto-santri');

DROP POLICY IF EXISTS "Allow public update for foto-santri" ON storage.objects;
CREATE POLICY "Allow public update for foto-santri" ON storage.objects 
    FOR UPDATE TO public USING (bucket_id = 'foto-santri') WITH CHECK (bucket_id = 'foto-santri');

DROP POLICY IF EXISTS "Allow public delete for foto-santri" ON storage.objects;
CREATE POLICY "Allow public delete for foto-santri" ON storage.objects 
    FOR DELETE TO public USING (bucket_id = 'foto-santri');


-- 3. RLS Policies for 'foto-pegawai' bucket
DROP POLICY IF EXISTS "Allow public select for foto-pegawai" ON storage.objects;
CREATE POLICY "Allow public select for foto-pegawai" ON storage.objects 
    FOR SELECT TO public USING (bucket_id = 'foto-pegawai');

DROP POLICY IF EXISTS "Allow public insert for foto-pegawai" ON storage.objects;
CREATE POLICY "Allow public insert for foto-pegawai" ON storage.objects 
    FOR INSERT TO public WITH CHECK (bucket_id = 'foto-pegawai');

DROP POLICY IF EXISTS "Allow public update for foto-pegawai" ON storage.objects;
CREATE POLICY "Allow public update for foto-pegawai" ON storage.objects 
    FOR UPDATE TO public USING (bucket_id = 'foto-pegawai') WITH CHECK (bucket_id = 'foto-pegawai');

DROP POLICY IF EXISTS "Allow public delete for foto-pegawai" ON storage.objects;
CREATE POLICY "Allow public delete for foto-pegawai" ON storage.objects 
    FOR DELETE TO public USING (bucket_id = 'foto-pegawai');
