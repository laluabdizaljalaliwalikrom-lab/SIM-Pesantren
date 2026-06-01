-- =========================================================================
-- SQL MIGRATION: SEED DATA MASTER MATA PELAJARAN DINIYAH (KEMENAG)
-- Run this script inside your Supabase Dashboard SQL Editor.
-- =========================================================================

DO $$
DECLARE
    -- 1. Definisikan ID Sekolah/Lembaga Diniyah untuk masing-masing jenjang (Ula, Wustha, Ulya)
    -- Ganti dengan UUID yang sesuai dari tabel public.sekolah jika diperlukan.
    -- Jika dibiarkan NULL, skrip akan mencari secara otomatis dari tabel sekolah.
    ula_school_id    UUID := NULL;
    wustha_school_id UUID := NULL;
    ulya_school_id   UUID := NULL;
    
    has_id_sekolah   BOOLEAN;
    current_item     JSONB;
    c_kode           TEXT;
    c_nama           TEXT;
    c_jenjang        TEXT;
    target_school    UUID;
    
    -- Array data master mata pelajaran Pendidikan Diniyah Kemenag
    mapel_data JSONB[] := ARRAY[
        -- --- JENJANG ULA (Setingkat SD) ---
        '{"kode": "ULA-QURAN", "nama": "Al-Qur''an Hadits", "jenjang": "Ula"}'::jsonb,
        '{"kode": "ULA-AKHLAK", "nama": "Aqidah Akhlak", "jenjang": "Ula"}'::jsonb,
        '{"kode": "ULA-FIQIH", "nama": "Fiqih", "jenjang": "Ula"}'::jsonb,
        '{"kode": "ULA-SKI", "nama": "Sejarah Kebudayaan Islam (SKI)", "jenjang": "Ula"}'::jsonb,
        '{"kode": "ULA-ARAB", "nama": "Bahasa Arab", "jenjang": "Ula"}'::jsonb,
        
        -- --- JENJANG WUSTHA (Setingkat SMP) ---
        '{"kode": "WUSTHA-TAFSIR", "nama": "Tafsir / Ilmu Tafsir", "jenjang": "Wustha"}'::jsonb,
        '{"kode": "WUSTHA-HADITS", "nama": "Hadits / Ilmu Hadits", "jenjang": "Wustha"}'::jsonb,
        '{"kode": "WUSTHA-TAUHID", "nama": "Tauhid / Aqidah", "jenjang": "Wustha"}'::jsonb,
        '{"kode": "WUSTHA-AKHLAK", "nama": "Akhlak", "jenjang": "Wustha"}'::jsonb,
        '{"kode": "WUSTHA-FIQIH", "nama": "Fiqih / Ushul Fiqih", "jenjang": "Wustha"}'::jsonb,
        '{"kode": "WUSTHA-SEJARAH", "nama": "Tarikh Islam (Sejarah)", "jenjang": "Wustha"}'::jsonb,
        '{"kode": "WUSTHA-ARAB", "nama": "Bahasa Arab (Nahwu / Sharf Dasar)", "jenjang": "Wustha"}'::jsonb,
        
        -- --- JENJANG ULYA (Setingkat SMA) ---
        '{"kode": "ULYA-TAFSIR", "nama": "Tafsir", "jenjang": "Ulya"}'::jsonb,
        '{"kode": "ULYA-ITAFSIR", "nama": "Ilmu Tafsir", "jenjang": "Ulya"}'::jsonb,
        '{"kode": "ULYA-HADITS", "nama": "Hadits", "jenjang": "Ulya"}'::jsonb,
        '{"kode": "ULYA-IHADITS", "nama": "Ilmu Hadits", "jenjang": "Ulya"}'::jsonb,
        '{"kode": "ULYA-TAUHID", "nama": "Tauhid", "jenjang": "Ulya"}'::jsonb,
        '{"kode": "ULYA-AKHLAK", "nama": "Akhlak / Tasawuf", "jenjang": "Ulya"}'::jsonb,
        '{"kode": "ULYA-FIQIH", "nama": "Fiqih", "jenjang": "Ulya"}'::jsonb,
        '{"kode": "ULYA-UFIQIH", "nama": "Ushul Fiqih", "jenjang": "Ulya"}'::jsonb,
        '{"kode": "ULYA-TARIKH", "nama": "Tarikh Islam / SKI", "jenjang": "Ulya"}'::jsonb,
        '{"kode": "ULYA-ARAB", "nama": "Bahasa Arab (Balaghah / Arudh)", "jenjang": "Ulya"}'::jsonb,
        '{"kode": "ULYA-MANTIQ", "nama": "Ilmu Mantiq", "jenjang": "Ulya"}'::jsonb
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
    -- Deteksi sekolah diniyah/pesantren/non-formal
    IF ula_school_id IS NULL AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sekolah') THEN
        EXECUTE 'SELECT id FROM public.sekolah WHERE nama_sekolah ILIKE ''%Ula%'' OR nama_sekolah ILIKE ''%Dasar%'' LIMIT 1' INTO ula_school_id;
    END IF;
    
    IF wustha_school_id IS NULL AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sekolah') THEN
        EXECUTE 'SELECT id FROM public.sekolah WHERE nama_sekolah ILIKE ''%Wustha%'' OR nama_sekolah ILIKE ''%Menengah Pertama%'' LIMIT 1' INTO wustha_school_id;
    END IF;
    
    IF ulya_school_id IS NULL AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sekolah') THEN
        EXECUTE 'SELECT id FROM public.sekolah WHERE nama_sekolah ILIKE ''%Ulya%'' OR nama_sekolah ILIKE ''%Menengah Atas%'' LIMIT 1' INTO ulya_school_id;
    END IF;

    -- 4. Iterasi dan simpan data mata pelajaran diniyah
    -- Catatan: Kategori di-mapping ke 'Diniyah/Pesantren' menyesuaikan dengan CHECK constraint di database
    FOREACH current_item IN ARRAY mapel_data
    LOOP
        c_kode := current_item->>'kode';
        c_nama := current_item->>'nama';
        c_jenjang := current_item->>'jenjang';
        
        -- Pilih target ID Sekolah berdasar jenjang
        IF c_jenjang = 'Ula' THEN
            target_school := ula_school_id;
        ELSIF c_jenjang = 'Wustha' THEN
            target_school := wustha_school_id;
        ELSE
            target_school := ulya_school_id;
        END IF;

        IF has_id_sekolah THEN
            -- Jika kolom id_sekolah ada di skema, gunakan dynamic sql untuk menyisipkan
            EXECUTE '
                INSERT INTO public.mata_pelajaran (kode_mapel, nama_mapel, kategori, keterangan, id_sekolah)
                VALUES ($1, $2, ''Diniyah/Pesantren'', $3, $4)
                ON CONFLICT (kode_mapel) DO UPDATE
                SET nama_mapel = EXCLUDED.nama_mapel,
                    kategori = EXCLUDED.kategori,
                    keterangan = EXCLUDED.keterangan,
                    id_sekolah = EXCLUDED.id_sekolah
            ' USING c_kode, c_nama, 'Kurikulum Diniyah ' || c_jenjang, target_school;
        ELSE
            -- Jika kolom id_sekolah tidak ada (menggunakan skema tabel bawaan mata_pelajaran)
            INSERT INTO public.mata_pelajaran (kode_mapel, nama_mapel, kategori, keterangan)
            VALUES (c_kode, c_nama, 'Diniyah/Pesantren', 'Kurikulum Diniyah ' || c_jenjang)
            ON CONFLICT (kode_mapel) DO UPDATE
            SET nama_mapel = EXCLUDED.nama_mapel,
                kategori = EXCLUDED.kategori,
                keterangan = EXCLUDED.keterangan;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Seeding Mata Pelajaran Pendidikan Diniyah selesai dijalankan.';
END $$;
