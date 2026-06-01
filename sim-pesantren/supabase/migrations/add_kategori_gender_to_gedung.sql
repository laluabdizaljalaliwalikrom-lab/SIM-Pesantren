-- =====================================================================
-- Migration: Add kategori_gender to gedung table
-- Run this in your Supabase SQL editor if the column doesn't exist yet.
-- =====================================================================

-- 1. Add kategori_gender column (L = Putra, P = Putri, LP = Campuran)
ALTER TABLE gedung
ADD COLUMN IF NOT EXISTS kategori_gender TEXT NOT NULL DEFAULT 'L'
  CHECK (kategori_gender IN ('L', 'P', 'LP'));

-- 2. Verify
SELECT id, nama_gedung, kategori_gender, keterangan FROM gedung;
