-- ==========================================================================
-- SQL SEED: Copy data from mata_pelajaran to mapel table
-- Run this script inside your Supabase Dashboard SQL Editor (https://supabase.com).
-- ==========================================================================

INSERT INTO mapel (id, nama_mapel, kategori)
SELECT gen_random_uuid(), nama_mapel, 
  CASE 
    WHEN kategori = 'Umum' THEN 'umum'
    WHEN kategori IN ('Diniyah/Pesantren', 'Kitab Kuning', 'Bahasa') THEN 'diniyah'
    ELSE NULL
  END
FROM mata_pelajaran;
