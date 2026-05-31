-- =========================================================================
-- SQL MIGRATION: SEED DATA MASTER MATA PELAJARAN (KURIKULUM MERDEKA)
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

DO $$
DECLARE
    -- 1. Definisikan ID Sekolah untuk masing-masing jenjang (SD, SMP, SMA)
    -- Ganti dengan UUID yang sesuai dari tabel public.sekolah jika diperlukan.
    -- Jika dibiarkan NULL, skrip akan mencari secara otomatis dari tabel sekolah.
    sd_school_id   UUID := NULL;
    smp_school_id  UUID := NULL;
    sma_school_id  UUID := NULL;
    
    has_id_sekolah  BOOLEAN;
    current_item    JSONB;
    c_kode          TEXT;
    c_nama          TEXT;
    c_jenjang       TEXT;
    target_school   UUID;
    
    -- Array data master mata pelajaran Kurikulum Merdeka
    mapel_data JSONB[] := ARRAY[
        -- --- JENJANG SD ---
        '{"kode": "SD-PABP", "nama": "Pendidikan Agama dan Budi Pekerti", "jenjang": "SD"}'::jsonb,
        '{"kode": "SD-PP", "nama": "Pendidikan Pancasila", "jenjang": "SD"}'::jsonb,
        '{"kode": "SD-IND", "nama": "Bahasa Indonesia", "jenjang": "SD"}'::jsonb,
        '{"kode": "SD-MAT", "nama": "Matematika", "jenjang": "SD"}'::jsonb,
        '{"kode": "SD-IPAS", "nama": "Ilmu Pengetahuan Alam dan Sosial (IPAS)", "jenjang": "SD"}'::jsonb,
        '{"kode": "SD-PJOK", "nama": "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)", "jenjang": "SD"}'::jsonb,
        '{"kode": "SD-SENI", "nama": "Seni dan Budaya", "jenjang": "SD"}'::jsonb,
        '{"kode": "SD-ING", "nama": "Bahasa Inggris", "jenjang": "SD"}'::jsonb,
        '{"kode": "SD-MULOK", "nama": "Muatan Lokal", "jenjang": "SD"}'::jsonb,
        
        -- --- JENJANG SMP ---
        '{"kode": "SMP-PABP", "nama": "Pendidikan Agama dan Budi Pekerti", "jenjang": "SMP"}'::jsonb,
        '{"kode": "SMP-PP", "nama": "Pendidikan Pancasila", "jenjang": "SMP"}'::jsonb,
        '{"kode": "SMP-IND", "nama": "Bahasa Indonesia", "jenjang": "SMP"}'::jsonb,
        '{"kode": "SMP-MAT", "nama": "Matematika", "jenjang": "SMP"}'::jsonb,
        '{"kode": "SMP-IPA", "nama": "Ilmu Pengetahuan Alam (IPA)", "jenjang": "SMP"}'::jsonb,
        '{"kode": "SMP-IPS", "nama": "Ilmu Pengetahuan Sosial (IPS)", "jenjang": "SMP"}'::jsonb,
        '{"kode": "SMP-ING", "nama": "Bahasa Inggris", "jenjang": "SMP"}'::jsonb,
        '{"kode": "SMP-PJOK", "nama": "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)", "jenjang": "SMP"}'::jsonb,
        '{"kode": "SMP-INF", "nama": "Informatika", "jenjang": "SMP"}'::jsonb,
        '{"kode": "SMP-SENI", "nama": "Seni dan Prakarya", "jenjang": "SMP"}'::jsonb,
        '{"kode": "SMP-MULOK", "nama": "Muatan Lokal", "jenjang": "SMP"}'::jsonb,
        
        -- --- JENJANG SMA ---
        '{"kode": "SMA-PABP", "nama": "Pendidikan Agama dan Budi Pekerti", "jenjang": "SMA"}'::jsonb,
        '{"kode": "SMA-PP", "nama": "Pendidikan Pancasila", "jenjang": "SMA"}'::jsonb,
        '{"kode": "SMA-IND", "nama": "Bahasa Indonesia", "jenjang": "SMA"}'::jsonb,
        '{"kode": "SMA-MAT", "nama": "Matematika", "jenjang": "SMA"}'::jsonb,
        '{"kode": "SMA-SEJ", "nama": "Sejarah", "jenjang": "SMA"}'::jsonb,
        '{"kode": "SMA-ING", "nama": "Bahasa Inggris", "jenjang": "SMA"}'::jsonb,
        '{"kode": "SMA-PJOK", "nama": "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)", "jenjang": "SMA"}'::jsonb,
        '{"kode": "SMA-SENI", "nama": "Seni dan Budaya", "jenjang": "SMA"}'::jsonb,
        '{"kode": "SMA-BIO", "nama": "Biologi (Pilihan)", "jenjang": "SMA"}'::jsonb,
        '{"kode": "SMA-KIM", "nama": "Kimia (Pilihan)", "jenjang": "SMA"}'::jsonb,
        '{"kode": "SMA-FIS", "nama": "Fisika (Pilihan)", "jenjang": "SMA"}'::jsonb,
        '{"kode": "SMA-INF", "nama": "Informatika (Pilihan)", "jenjang": "SMA"}'::jsonb,
        '{"kode": "SMA-MAT-LANJUT", "nama": "Matematika Tingkat Lanjut (Pilihan)", "jenjang": "SMA"}'::jsonb,
        '{"kode": "SMA-SOS", "nama": "Sosiologi (Pilihan)", "jenjang": "SMA"}'::jsonb,
        '{"kode": "SMA-EKO", "nama": "Ekonomi (Pilihan)", "jenjang": "SMA"}'::jsonb,
        '{"kode": "SMA-GEO", "nama": "Geografi (Pilihan)", "jenjang": "SMA"}'::jsonb,
        '{"kode": "SMA-ANT", "nama": "Antropologi (Pilihan)", "jenjang": "SMA"}'::jsonb
    ];
BEGIN
    -- 2. Deteksi keberadaan kolom id_sekolah pada public.mata_pelajaran
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'mata_pelajaran' 
          AND column_name = 'id_sekolah'
    ) INTO has_id_sekolah;

    -- 3. Cari ID sekolah secara otomatis di tabel public.sekolah jika variabel masih NULL
    -- Deteksi sekolah formal berdasar jenjang
    IF sd_school_id IS NULL AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sekolah') THEN
        EXECUTE 'SELECT id FROM public.sekolah WHERE kategori = ''Formal'' AND (nama_sekolah ILIKE ''%SD%'' OR nama_sekolah ILIKE ''%MIM%'' OR nama_sekolah ILIKE ''%Dasar%'') LIMIT 1' INTO sd_school_id;
    END IF;
    
    IF smp_school_id IS NULL AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sekolah') THEN
        EXECUTE 'SELECT id FROM public.sekolah WHERE kategori = ''Formal'' AND (nama_sekolah ILIKE ''%SMP%'' OR nama_sekolah ILIKE ''%MTs%'' OR nama_sekolah ILIKE ''%Menengah Pertama%'') LIMIT 1' INTO smp_school_id;
    END IF;
    
    IF sma_school_id IS NULL AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sekolah') THEN
        EXECUTE 'SELECT id FROM public.sekolah WHERE kategori = ''Formal'' AND (nama_sekolah ILIKE ''%SMA%'' OR nama_sekolah ILIKE ''%MA%'' OR nama_sekolah ILIKE ''%Menengah Atas%'') LIMIT 1' INTO sma_school_id;
    END IF;

    -- 4. Iterasi dan simpan data mata pelajaran
    FOREACH current_item IN ARRAY mapel_data
    LOOP
        c_kode := current_item->>'kode';
        c_nama := current_item->>'nama';
        c_jenjang := current_item->>'jenjang';
        
        -- Pilih target ID Sekolah berdasar jenjang
        IF c_jenjang = 'SD' THEN
            target_school := sd_school_id;
        ELSIF c_jenjang = 'SMP' THEN
            target_school := smp_school_id;
        ELSE
            target_school := sma_school_id;
        END IF;

        IF has_id_sekolah THEN
            -- Jika kolom id_sekolah ada di skema, gunakan dynamic sql untuk menyisipkan
            EXECUTE '
                INSERT INTO public.mata_pelajaran (kode_mapel, nama_mapel, kategori, keterangan, id_sekolah)
                VALUES ($1, $2, ''Umum'', $3, $4)
                ON CONFLICT (kode_mapel) DO UPDATE
                SET nama_mapel = EXCLUDED.nama_mapel,
                    kategori = EXCLUDED.kategori,
                    keterangan = EXCLUDED.keterangan,
                    id_sekolah = EXCLUDED.id_sekolah
            ' USING c_kode, c_nama, 'Kurikulum Merdeka ' || c_jenjang, target_school;
        ELSE
            -- Jika kolom id_sekolah tidak ada (menggunakan skema tabel bawaan mata_pelajaran)
            INSERT INTO public.mata_pelajaran (kode_mapel, nama_mapel, kategori, keterangan)
            VALUES (c_kode, c_nama, 'Umum', 'Kurikulum Merdeka ' || c_jenjang)
            ON CONFLICT (kode_mapel) DO UPDATE
            SET nama_mapel = EXCLUDED.nama_mapel,
                kategori = EXCLUDED.kategori,
                keterangan = EXCLUDED.keterangan;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Seeding Mata Pelajaran Kurikulum Merdeka selesai dijalankan.';
END $$;
