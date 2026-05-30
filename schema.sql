-- ==========================================
-- SISTEM INFORMASI MANAJEMEN PESANTREN (SIM Pesantren)
-- Initial Database Schema
-- Supabase / PostgreSQL
-- ==========================================

-- 1. ENUM TYPES
-- Role Pengguna
CREATE TYPE public.user_role AS ENUM ('admin', 'pengasuh', 'wali_santri');

-- Status Santri
CREATE TYPE public.santri_status AS ENUM ('aktif', 'alumni', 'mutasi');


-- 2. TABLES DEFINITIONS

-- Tabel Profiles (Terintegrasi dengan auth.users milik Supabase)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nama_lengkap TEXT NOT NULL,
    role public.user_role NOT NULL DEFAULT 'wali_santri',
    no_hp TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabel Kamar (Data Asrama)
CREATE TABLE public.kamar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_kamar TEXT NOT NULL,
    gedung TEXT NOT NULL,
    kapasitas INTEGER NOT NULL CHECK (kapasitas >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabel Santri (Data Utama Santri)
CREATE TABLE public.santri (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nis TEXT UNIQUE NOT NULL,
    nama_lengkap TEXT NOT NULL,
    jenis_kelamin TEXT CHECK (jenis_kelamin IN ('L', 'P')),
    nisn TEXT,
    tempat_lahir TEXT,
    tanggal_lahir DATE NOT NULL,
    nik TEXT,
    alamat TEXT,
    hp TEXT,
    nama_ayah TEXT,
    nama_ibu TEXT,
    rombel_saat_ini TEXT,
    sekolah_asal TEXT,
    id_kamar UUID REFERENCES public.kamar(id) ON DELETE SET NULL,
    id_wali UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status public.santri_status NOT NULL DEFAULT 'aktif',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 3. AUTOMATIC PROFILE CREATION ON SIGNUP (SUPABASE TRIGGER)
-- Fungsi ini akan otomatis dipanggil saat user baru mendaftar di auth.users Supabase
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, nama_lengkap, role, no_hp)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', 'Pengguna Baru'),
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'wali_santri'::public.user_role),
        NEW.raw_user_meta_data->>'no_hp'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger untuk menjalankan fungsi handle_new_user
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 4. ROW LEVEL SECURITY (RLS) ENABLEMENT
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kamar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.santri ENABLE ROW LEVEL SECURITY;


-- 5. RLS POLICIES

-- ==================== POLICIES FOR PROFILES ====================
-- Semua user terautentikasi dapat membaca data profile mereka sendiri
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Admin dan Pengasuh dapat membaca semua profile
CREATE POLICY "Admin and Pengasuh can view all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pengasuh')
        )
    );

-- User dapat mengupdate profile mereka sendiri (hanya nama_lengkap, role tidak boleh diubah oleh user sendiri)
CREATE POLICY "Users can update own profile name"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admin memiliki akses penuh (CRUD) ke profiles
CREATE POLICY "Admin full access to profiles"
    ON public.profiles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ==================== POLICIES FOR KAMAR ====================
-- Semua user terautentikasi dapat melihat daftar kamar
CREATE POLICY "Authenticated users can view kamar"
    ON public.kamar
    FOR SELECT
    TO authenticated
    USING (true);

-- Admin dan Pengasuh dapat mengelola (insert, update, delete) kamar
CREATE POLICY "Admin and Pengasuh can manage kamar"
    ON public.kamar
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pengasuh')
        )
    );


-- ==================== POLICIES FOR SANTRI ====================
-- Contoh Policy yang diminta: Wali santri hanya bisa membaca (SELECT) data santri jika id_wali = auth.uid()
CREATE POLICY "Wali santri can view their own santri"
    ON public.santri
    FOR SELECT
    TO authenticated
    USING (id_wali = auth.uid());

-- Admin dan Pengasuh dapat melihat semua data santri
CREATE POLICY "Admin and Pengasuh can view all santri"
    ON public.santri
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pengasuh')
        )
    );

-- Admin dan Pengasuh dapat mengelola (insert, update, delete) data santri
CREATE POLICY "Admin and Pengasuh can manage santri"
    ON public.santri
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pengasuh')
        )
    );


-- ==========================================
-- FITUR TAHFIDZ TRACKER
-- ==========================================

-- Nilai Kelancaran
CREATE TYPE public.kelancaran_grade AS ENUM ('A', 'B', 'C', 'D');

-- Tabel Presensi / Setoran Tahfidz
CREATE TABLE public.presensi_tahfidz (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_santri UUID REFERENCES public.santri(id) ON DELETE CASCADE NOT NULL,
    tanggal_setoran DATE NOT NULL DEFAULT CURRENT_DATE,
    juz INTEGER NOT NULL CHECK (juz >= 1 AND juz <= 30),
    nama_surah TEXT NOT NULL,
    ayat_terakhir INTEGER NOT NULL CHECK (ayat_terakhir >= 1),
    nilai_kelancaran public.kelancaran_grade NOT NULL,
    id_ustadz UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Enablement
ALTER TABLE public.presensi_tahfidz ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin dan Pengasuh (Ustadz) dapat mengelola (CRUD) data setoran tahfidz
CREATE POLICY "Admin and Pengasuh can manage tahfidz"
    ON public.presensi_tahfidz
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pengasuh')
        )
    );

-- Wali santri hanya bisa melihat (SELECT) riwayat tahfidz anaknya sendiri
CREATE POLICY "Wali santri can view their own child's tahfidz"
    ON public.presensi_tahfidz
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.santri
            WHERE santri.id = presensi_tahfidz.id_santri 
              AND santri.id_wali = auth.uid()
        )
    );


-- ==========================================
-- FITUR PEMBAYARAN SPP / KEUANGAN
-- ==========================================

-- Tabel Pembayaran
CREATE TABLE public.pembayaran (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_santri UUID REFERENCES public.santri(id) ON DELETE CASCADE NOT NULL,
    jumlah NUMERIC NOT NULL CHECK (jumlah > 0),
    status TEXT NOT NULL DEFAULT 'Belum Lunas' CHECK (status IN ('Belum Lunas', 'Lunas')),
    tanggal_bayar TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Enablement
ALTER TABLE public.pembayaran ENABLE ROW LEVEL SECURITY;

-- RLS Policies untuk Pembayaran
-- 1. Wali Santri hanya bisa melihat riwayat pembayaran anak mereka sendiri
CREATE POLICY "Wali santri can view own child's payments"
    ON public.pembayaran
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.santri
            WHERE santri.id = pembayaran.id_santri 
              AND santri.id_wali = auth.uid()
        )
    );

-- 2. Admin dan Pengasuh bisa melihat semua riwayat pembayaran
CREATE POLICY "Admin and Pengasuh can view all payments"
    ON public.pembayaran
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pengasuh')
        )
    );

-- 3. Hanya Admin yang bisa mengubah data pembayaran (termasuk status menjadi Lunas)
CREATE POLICY "Only admin can insert/update/delete payments"
    ON public.pembayaran
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ==========================================
-- FITUR PERIZINAN KELUAR SANTRI
-- ==========================================

-- Tabel Perizinan
CREATE TABLE public.perizinan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_santri UUID REFERENCES public.santri(id) ON DELETE CASCADE NOT NULL,
    keperluan TEXT NOT NULL,
    tanggal_keluar TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tanggal_kembali TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Kembali')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Enablement
ALTER TABLE public.perizinan ENABLE ROW LEVEL SECURITY;

-- RLS Policies untuk Perizinan
-- 1. Admin dan Pengasuh memiliki kontrol penuh (CRUD)
CREATE POLICY "Admin and Pengasuh can manage perizinan"
    ON public.perizinan
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pengasuh')
        )
    );

-- 2. Wali Santri hanya bisa membaca data perizinan anaknya sendiri
CREATE POLICY "Wali santri can view own child's perizinan"
    ON public.perizinan
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.santri
            WHERE santri.id = perizinan.id_santri 
              AND santri.id_wali = auth.uid()
        )
    );



