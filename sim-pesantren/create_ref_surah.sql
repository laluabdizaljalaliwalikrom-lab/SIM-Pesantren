-- =========================================================================
-- SQL MIGRATION: CREATE REFERENCE TABLE FOR QURAN SURAHS (ref_surah)
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.ref_surah (
    id INTEGER PRIMARY KEY, -- Surah number (1 to 114)
    nama_surah VARCHAR(100) NOT NULL UNIQUE,
    jumlah_ayat INTEGER NOT NULL CHECK (jumlah_ayat > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.ref_surah ENABLE ROW LEVEL SECURITY;

-- Enable Public Select Policy
DROP POLICY IF EXISTS "Allow public select for ref_surah" ON public.ref_surah;
CREATE POLICY "Allow public select for ref_surah" ON public.ref_surah FOR SELECT USING (true);

-- Seed initial data for 114 surahs
INSERT INTO public.ref_surah (id, nama_surah, jumlah_ayat)
VALUES
    (1, 'Al-Fatihah', 7),
    (2, 'Al-Baqarah', 286),
    (3, 'Ali ''Imran', 200),
    (4, 'An-Nisa''', 176),
    (5, 'Al-Ma''idah', 120),
    (6, 'Al-An''am', 165),
    (7, 'Al-A''raf', 206),
    (8, 'Al-Anfal', 75),
    (9, 'At-Tawbah', 129),
    (10, 'Yunus', 109),
    (11, 'Hud', 123),
    (12, 'Yusuf', 111),
    (13, 'Ar-Ra''d', 43),
    (14, 'Ibrahim', 52),
    (15, 'Al-Hijr', 99),
    (16, 'An-Nahl', 128),
    (17, 'Al-Isra''', 111),
    (18, 'Al-Kahf', 110),
    (19, 'Maryam', 98),
    (20, 'Ta-Ha', 135),
    (21, 'Al-Anbiya''', 112),
    (22, 'Al-Hajj', 78),
    (23, 'Al-Mu''minun', 118),
    (24, 'An-Nur', 64),
    (25, 'Al-Furqan', 77),
    (26, 'Ash-Shu''ara''', 227),
    (27, 'An-Naml', 93),
    (28, 'Al-Qasas', 88),
    (29, 'Al-''Ankabut', 69),
    (30, 'Ar-Rum', 60),
    (31, 'Luqman', 34),
    (32, 'As-Sajdah', 30),
    (33, 'Al-Ahzab', 73),
    (34, 'Saba''', 54),
    (35, 'Fatir', 45),
    (36, 'Ya-Sin', 83),
    (37, 'As-Saffat', 182),
    (38, 'Sad', 88),
    (39, 'Az-Zumar', 75),
    (40, 'Ghafir', 85),
    (41, 'Fussilat', 54),
    (42, 'Ash-Shura', 53),
    (43, 'Az-Zukhruf', 89),
    (44, 'Ad-Dukhan', 59),
    (45, 'Al-Jathiyah', 37),
    (46, 'Al-Ahqaf', 35),
    (47, 'Muhammad', 38),
    (48, 'Al-Fath', 29),
    (49, 'Al-Hujurat', 18),
    (50, 'Qaf', 45),
    (51, 'Adh-Dhariyat', 60),
    (52, 'At-Tur', 49),
    (53, 'An-Najm', 62),
    (54, 'Al-Qamar', 55),
    (55, 'Ar-Rahman', 78),
    (56, 'Al-Waqi''ah', 96),
    (57, 'Al-Hadid', 29),
    (58, 'Al-Mujadilah', 22),
    (59, 'Al-Hashr', 24),
    (60, 'Al-Mumtahanah', 13),
    (61, 'As-Saff', 14),
    (62, 'Al-Jumu''ah', 11),
    (63, 'Al-Munafiqun', 11),
    (64, 'At-Taghabun', 18),
    (65, 'At-Talaq', 12),
    (66, 'At-Tahrim', 12),
    (67, 'Al-Mulk', 30),
    (68, 'Al-Qalam', 52),
    (69, 'Al-Haqqah', 52),
    (70, 'Al-Ma''arij', 44),
    (71, 'Nuh', 28),
    (72, 'Al-Jinn', 28),
    (73, 'Al-Muzzammil', 20),
    (74, 'Al-Muddaththir', 56),
    (75, 'Al-Qiyamah', 40),
    (76, 'Al-Insan', 31),
    (77, 'Al-Mursalat', 50),
    (78, 'An-Naba''', 40),
    (79, 'An-Nazi''at', 46),
    (80, 'text_Abasa' /* 'Abasa */, 42), -- We'll use 'Abasa as name, let's fix it below
    (81, 'At-Takwir', 29),
    (82, 'Al-Infitar', 19),
    (83, 'Al-Mutaffifin', 36),
    (84, 'Al-Inshiqaq', 25),
    (85, 'Al-Buruj', 22),
    (86, 'At-Tariq', 17),
    (87, 'Al-A''la', 19),
    (88, 'Al-Ghashiyah', 26),
    (89, 'Al-Fajr', 30),
    (90, 'Al-Balad', 20),
    (91, 'Ash-Shams', 15),
    (92, 'Al-Layl', 21),
    (93, 'Ad-Duha', 11),
    (94, 'Ash-Sharh', 8),
    (95, 'At-Tin', 8),
    (96, 'Al-''Alaq', 19),
    (97, 'Al-Qadr', 5),
    (98, 'Al-Bayyinah', 8),
    (99, 'Az-Zalzalah', 8),
    (100, 'Al-''Adiyat', 11),
    (101, 'Al-Qari''ah', 11),
    (102, 'At-Takathur', 8),
    (103, 'Al-''Asr', 3),
    (104, 'Al-Humazah', 9),
    (105, 'Al-Fil', 5),
    (106, 'Quraysh', 4),
    (107, 'Al-Ma''un', 7),
    (108, 'Al-Kawthar', 3),
    (109, 'Al-Kafirun', 6),
    (110, 'An-Nasr', 3),
    (111, 'Al-Masad', 5),
    (112, 'Al-Ikhlas', 4),
    (113, 'Al-Falaq', 5),
    (114, 'An-Nas', 6)
ON CONFLICT (id) DO UPDATE SET 
    nama_surah = EXCLUDED.nama_surah,
    jumlah_ayat = EXCLUDED.jumlah_ayat;

-- Fix the name for surah 80
UPDATE public.ref_surah SET nama_surah = '`Abasa' WHERE id = 80;

COMMENT ON TABLE public.ref_surah IS 'Tabel Referensi Nama Surah Al-Qur''an dan Jumlah Ayatnya';
