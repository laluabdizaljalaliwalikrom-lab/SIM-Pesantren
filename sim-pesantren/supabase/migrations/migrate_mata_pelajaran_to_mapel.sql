-- ==========================================================================
-- MIGRATE: Replace mata_pelajaran with mapel across the database
-- Run this script inside your Supabase Dashboard SQL Editor.
-- ==========================================================================

-- 1. Add missing columns from mata_pelajaran into mapel
ALTER TABLE mapel ADD COLUMN IF NOT EXISTS kode_mapel TEXT;
ALTER TABLE mapel ADD COLUMN IF NOT EXISTS keterangan TEXT;
ALTER TABLE mapel ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 2. Drop CHECK constraint on kategori if exists
ALTER TABLE mapel DROP CONSTRAINT IF EXISTS mapel_kategori_check;

-- 3. Drop FK from nilai referencing mapel before truncate
ALTER TABLE nilai DROP CONSTRAINT IF EXISTS nilai_id_mapel_fkey;

-- 4. Remove old seed data (gen_random_uuid IDs) before inserting real data
TRUNCATE mapel;

-- 5. Copy all data from mata_pelajaran into mapel (preserving original UUIDs)
INSERT INTO mapel (id, kode_mapel, nama_mapel, kategori, keterangan, created_at)
SELECT id, kode_mapel, nama_mapel, kategori, keterangan, created_at
FROM mata_pelajaran;

-- 6. Drop FK from jadwal_pelajaran referencing mata_pelajaran
ALTER TABLE jadwal_pelajaran DROP CONSTRAINT IF EXISTS jadwal_pelajaran_id_mapel_fkey;

-- 7. Re-create FK pointing to mapel instead
ALTER TABLE jadwal_pelajaran 
  ADD CONSTRAINT jadwal_pelajaran_id_mapel_fkey 
  FOREIGN KEY (id_mapel) REFERENCES mapel(id) ON DELETE CASCADE;

-- 8. Re-create FK from nilai to mapel
ALTER TABLE nilai
  ADD CONSTRAINT nilai_id_mapel_fkey
  FOREIGN KEY (id_mapel) REFERENCES mapel(id) ON DELETE CASCADE;

-- 9. Drop mata_pelajaran table (CASCADE drops any remaining FK refs)
DROP TABLE mata_pelajaran CASCADE;

-- 10. Add unique constraint on kode_mapel for upsert support
ALTER TABLE mapel ADD CONSTRAINT mapel_kode_mapel_key UNIQUE (kode_mapel);

-- 11. Add RLS policies for mapel table
ALTER TABLE mapel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated select on mapel" ON mapel;
DROP POLICY IF EXISTS "RLS: Manage Mapel (Create)" ON mapel;
DROP POLICY IF EXISTS "RLS: Manage Mapel (Edit)" ON mapel;
DROP POLICY IF EXISTS "RLS: Manage Mapel (Delete)" ON mapel;

CREATE POLICY "Allow authenticated select on mapel" ON mapel FOR SELECT TO authenticated USING (true);
CREATE POLICY "RLS: Manage Mapel (Create)" ON mapel FOR INSERT TO authenticated WITH CHECK (public.has_permission('Akademik', 'create'));
CREATE POLICY "RLS: Manage Mapel (Edit)" ON mapel FOR UPDATE TO authenticated USING (public.has_permission('Akademik', 'edit'));
CREATE POLICY "RLS: Manage Mapel (Delete)" ON mapel FOR DELETE TO authenticated USING (public.has_permission('Akademik', 'delete'));
