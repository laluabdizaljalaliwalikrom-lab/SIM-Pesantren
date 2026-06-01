import { getServerSupabase, requirePermission } from '@/utils/server-supabase';

/**
 * Seeding data master mata pelajaran Kurikulum Merdeka (Dapodik 2024)
 * Mendukung deteksi dinamis kolom 'id_sekolah' dengan fallback otomatis.
 */
export async function seedKurikulumMerdeka() {
  const auth = await requirePermission('Akademik', 'create');
  if (auth.error) return { success: false, error: auth.error };

  const supabase = await getServerSupabase();
  try {
    // 1. Ambil data sekolah formal untuk mencocokkan ID Sekolah SD, SMP, SMA
    let sekolahList: any[] = [];
    try {
      const { data } = await supabase
        .from('sekolah')
        .select('id, nama_sekolah, kategori');
      sekolahList = data || [];
    } catch (e) {
      console.warn('Tabel sekolah tidak ditemukan atau tidak dapat diakses:', e);
    }

    let sdSchoolId = null;
    let smpSchoolId = null;
    let smaSchoolId = null;

    if (sekolahList.length > 0) {
      sdSchoolId = sekolahList.find(s => s.kategori === 'Formal' && (/SD|MIM|Dasar/i).test(s.nama_sekolah))?.id || null;
      smpSchoolId = sekolahList.find(s => s.kategori === 'Formal' && (/SMP|MTs|Menengah Pertama/i).test(s.nama_sekolah))?.id || null;
      smaSchoolId = sekolahList.find(s => s.kategori === 'Formal' && (/SMA|MA|Menengah Atas/i).test(s.nama_sekolah))?.id || null;
    }

    // 2. Daftar Mata Pelajaran Kurikulum Merdeka
    const mapelData = [
      // --- JENJANG SD ---
      { kode_mapel: 'SD-PABP', nama_mapel: 'Pendidikan Agama dan Budi Pekerti', jenjang: 'SD', schoolId: sdSchoolId },
      { kode_mapel: 'SD-PP', nama_mapel: 'Pendidikan Pancasila', jenjang: 'SD', schoolId: sdSchoolId },
      { kode_mapel: 'SD-IND', nama_mapel: 'Bahasa Indonesia', jenjang: 'SD', schoolId: sdSchoolId },
      { kode_mapel: 'SD-MAT', nama_mapel: 'Matematika', jenjang: 'SD', schoolId: sdSchoolId },
      { kode_mapel: 'SD-IPAS', nama_mapel: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)', jenjang: 'SD', schoolId: sdSchoolId },
      { kode_mapel: 'SD-PJOK', nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', jenjang: 'SD', schoolId: sdSchoolId },
      { kode_mapel: 'SD-SENI', nama_mapel: 'Seni dan Budaya', jenjang: 'SD', schoolId: sdSchoolId },
      { kode_mapel: 'SD-ING', nama_mapel: 'Bahasa Inggris', jenjang: 'SD', schoolId: sdSchoolId },
      { kode_mapel: 'SD-MULOK', nama_mapel: 'Muatan Lokal', jenjang: 'SD', schoolId: sdSchoolId },
      
      // --- JENJANG SMP ---
      { kode_mapel: 'SMP-PABP', nama_mapel: 'Pendidikan Agama dan Budi Pekerti', jenjang: 'SMP', schoolId: smpSchoolId },
      { kode_mapel: 'SMP-PP', nama_mapel: 'Pendidikan Pancasila', jenjang: 'SMP', schoolId: smpSchoolId },
      { kode_mapel: 'SMP-IND', nama_mapel: 'Bahasa Indonesia', jenjang: 'SMP', schoolId: smpSchoolId },
      { kode_mapel: 'SMP-MAT', nama_mapel: 'Matematika', jenjang: 'SMP', schoolId: smpSchoolId },
      { kode_mapel: 'SMP-IPA', nama_mapel: 'Ilmu Pengetahuan Alam (IPA)', jenjang: 'SMP', schoolId: smpSchoolId },
      { kode_mapel: 'SMP-IPS', nama_mapel: 'Ilmu Pengetahuan Sosial (IPS)', jenjang: 'SMP', schoolId: smpSchoolId },
      { kode_mapel: 'SMP-ING', nama_mapel: 'Bahasa Inggris', jenjang: 'SMP', schoolId: smpSchoolId },
      { kode_mapel: 'SMP-PJOK', nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', jenjang: 'SMP', schoolId: smpSchoolId },
      { kode_mapel: 'SMP-INF', nama_mapel: 'Informatika', jenjang: 'SMP', schoolId: smpSchoolId },
      { kode_mapel: 'SMP-SENI', nama_mapel: 'Seni dan Prakarya', jenjang: 'SMP', schoolId: smpSchoolId },
      { kode_mapel: 'SMP-MULOK', nama_mapel: 'Muatan Lokal', jenjang: 'SMP', schoolId: smpSchoolId },
      
      // --- JENJANG SMA ---
      { kode_mapel: 'SMA-PABP', nama_mapel: 'Pendidikan Agama dan Budi Pekerti', jenjang: 'SMA', schoolId: smaSchoolId },
      { kode_mapel: 'SMA-PP', nama_mapel: 'Pendidikan Pancasila', jenjang: 'SMA', schoolId: smaSchoolId },
      { kode_mapel: 'SMA-IND', nama_mapel: 'Bahasa Indonesia', jenjang: 'SMA', schoolId: smaSchoolId },
      { kode_mapel: 'SMA-MAT', nama_mapel: 'Matematika', jenjang: 'SMA', schoolId: smaSchoolId },
      { kode_mapel: 'SMA-SEJ', nama_mapel: 'Sejarah', jenjang: 'SMA', schoolId: smaSchoolId },
      { kode_mapel: 'SMA-ING', nama_mapel: 'Bahasa Inggris', jenjang: 'SMA', schoolId: smaSchoolId },
      { kode_mapel: 'SMA-PJOK', nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', jenjang: 'SMA', schoolId: smaSchoolId },
      { kode_mapel: 'SMA-SENI', nama_mapel: 'Seni dan Budaya', jenjang: 'SMA', schoolId: smaSchoolId },
      { kode_mapel: 'SMA-BIO', nama_mapel: 'Biologi (Pilihan)', jenjang: 'SMA', schoolId: smaSchoolId },
      { kode_mapel: 'SMA-KIM', nama_mapel: 'Kimia (Pilihan)', jenjang: 'SMA', schoolId: smaSchoolId },
      { kode_mapel: 'SMA-FIS', nama_mapel: 'Fisika (Pilihan)', jenjang: 'SMA', schoolId: smaSchoolId },
      { kode_mapel: 'SMA-INF', nama_mapel: 'Informatika (Pilihan)', jenjang: 'SMA', schoolId: smaSchoolId },
      { kode_mapel: 'SMA-MAT-LANJUT', nama_mapel: 'Matematika Tingkat Lanjut (Pilihan)', jenjang: 'SMA', schoolId: smaSchoolId },
      { kode_mapel: 'SMA-SOS', nama_mapel: 'Sosiologi (Pilihan)', jenjang: 'SMA', schoolId: smaSchoolId },
      { kode_mapel: 'SMA-EKO', nama_mapel: 'Ekonomi (Pilihan)', jenjang: 'SMA', schoolId: smaSchoolId },
      { kode_mapel: 'SMA-GEO', nama_mapel: 'Geografi (Pilihan)', jenjang: 'SMA', schoolId: smaSchoolId },
      { kode_mapel: 'SMA-ANT', nama_mapel: 'Antropologi (Pilihan)', jenjang: 'SMA', schoolId: smaSchoolId }
    ];

    // Coba masukkan dengan kolom id_sekolah
    const payloadWithSchool = mapelData.map(m => ({
      kode_mapel: m.kode_mapel,
      nama_mapel: m.nama_mapel,
      kategori: 'Umum',
      keterangan: `Kurikulum Merdeka ${m.jenjang}`,
      id_sekolah: m.schoolId
    }));

    const { error: errorWithSchool } = await supabase
      .from('mapel')
      .upsert(payloadWithSchool, { onConflict: 'kode_mapel' });

    if (errorWithSchool) {
      console.warn("Mencoba tanpa id_sekolah...");
      
      const payloadWithoutSchool = mapelData.map(m => ({
        kode_mapel: m.kode_mapel,
        nama_mapel: m.nama_mapel,
        kategori: 'Umum',
        keterangan: `Kurikulum Merdeka ${m.jenjang}`
      }));

      const { error: errorWithoutSchool } = await supabase
        .from('mapel')
        .upsert(payloadWithoutSchool, { onConflict: 'kode_mapel' });

      if (errorWithoutSchool) throw errorWithoutSchool;
    }

    return { success: true, message: 'Data Kurikulum Merdeka berhasil dimasukkan!' };
  } catch (err: any) {
    console.error('Exception in seedKurikulumMerdeka:', err);
    return { success: false, error: err.message || 'Gagal melakukan seeding mata pelajaran.' };
  }
}

/**
 * Seeding data master mata pelajaran Diniyah (Kemenag)
 * Mendukung deteksi dinamis kolom 'id_sekolah' dengan fallback otomatis.
 */
export async function seedDiniyahKurikulum() {
  const auth = await requirePermission('Akademik', 'create');
  if (auth.error) return { success: false, error: auth.error };

  const supabase = await getServerSupabase();
  try {
    // 1. Ambil data sekolah/lembaga
    let sekolahList: any[] = [];
    try {
      const { data } = await supabase
        .from('sekolah')
        .select('id, nama_sekolah, kategori');
      sekolahList = data || [];
    } catch (e) {
      console.warn('Tabel sekolah tidak ditemukan atau tidak dapat diakses:', e);
    }

    let ulaSchoolId = null;
    let wusthaSchoolId = null;
    let ulyaSchoolId = null;

    if (sekolahList.length > 0) {
      ulaSchoolId = sekolahList.find(s => (/Ula|Dasar/i).test(s.nama_sekolah))?.id || null;
      wusthaSchoolId = sekolahList.find(s => (/Wustha|Menengah Pertama/i).test(s.nama_sekolah))?.id || null;
      ulyaSchoolId = sekolahList.find(s => (/Ulya|Menengah Atas/i).test(s.nama_sekolah))?.id || null;
    }

    // 2. Daftar Mata Pelajaran Diniyah Kemenag
    const mapelData = [
      // --- ULA ---
      { kode_mapel: 'ULA-QURAN', nama_mapel: "Al-Qur'an Hadits", jenjang: 'Ula', schoolId: ulaSchoolId },
      { kode_mapel: 'ULA-AKHLAK', nama_mapel: 'Aqidah Akhlak', jenjang: 'Ula', schoolId: ulaSchoolId },
      { kode_mapel: 'ULA-FIQIH', nama_mapel: 'Fiqih', jenjang: 'Ula', schoolId: ulaSchoolId },
      { kode_mapel: 'ULA-SKI', nama_mapel: 'Sejarah Kebudayaan Islam (SKI)', jenjang: 'Ula', schoolId: ulaSchoolId },
      { kode_mapel: 'ULA-ARAB', nama_mapel: 'Bahasa Arab', jenjang: 'Ula', schoolId: ulaSchoolId },
      // --- WUSTHA ---
      { kode_mapel: 'WUSTHA-TAFSIR', nama_mapel: 'Tafsir / Ilmu Tafsir', jenjang: 'Wustha', schoolId: wusthaSchoolId },
      { kode_mapel: 'WUSTHA-HADITS', nama_mapel: 'Hadits / Ilmu Hadits', jenjang: 'Wustha', schoolId: wusthaSchoolId },
      { kode_mapel: 'WUSTHA-TAUHID', nama_mapel: 'Tauhid / Aqidah', jenjang: 'Wustha', schoolId: wusthaSchoolId },
      { kode_mapel: 'WUSTHA-AKHLAK', nama_mapel: 'Akhlak', jenjang: 'Wustha', schoolId: wusthaSchoolId },
      { kode_mapel: 'WUSTHA-FIQIH', nama_mapel: 'Fiqih / Ushul Fiqih', jenjang: 'Wustha', schoolId: wusthaSchoolId },
      { kode_mapel: 'WUSTHA-SEJARAH', nama_mapel: 'Tarikh Islam (Sejarah)', jenjang: 'Wustha', schoolId: wusthaSchoolId },
      { kode_mapel: 'WUSTHA-ARAB', nama_mapel: 'Bahasa Arab (Nahwu / Sharf Dasar)', jenjang: 'Wustha', schoolId: wusthaSchoolId },
      // --- ULYA ---
      { kode_mapel: 'ULYA-TAFSIR', nama_mapel: 'Tafsir', jenjang: 'Ulya', schoolId: ulyaSchoolId },
      { kode_mapel: 'ULYA-ITAFSIR', nama_mapel: 'Ilmu Tafsir', jenjang: 'Ulya', schoolId: ulyaSchoolId },
      { kode_mapel: 'ULYA-HADITS', nama_mapel: 'Hadits', jenjang: 'Ulya', schoolId: ulyaSchoolId },
      { kode_mapel: 'ULYA-IHADITS', nama_mapel: 'Ilmu Hadits', jenjang: 'Ulya', schoolId: ulyaSchoolId },
      { kode_mapel: 'ULYA-TAUHID', nama_mapel: 'Tauhid', jenjang: 'Ulya', schoolId: ulyaSchoolId },
      { kode_mapel: 'ULYA-AKHLAK', nama_mapel: 'Akhlak / Tasawuf', jenjang: 'Ulya', schoolId: ulyaSchoolId },
      { kode_mapel: 'ULYA-FIQIH', nama_mapel: 'Fiqih', jenjang: 'Ulya', schoolId: ulyaSchoolId },
      { kode_mapel: 'ULYA-UFIQIH', nama_mapel: 'Ushul Fiqih', jenjang: 'Ulya', schoolId: ulyaSchoolId },
      { kode_mapel: 'ULYA-TARIKH', nama_mapel: 'Tarikh Islam / SKI', jenjang: 'Ulya', schoolId: ulyaSchoolId },
      { kode_mapel: 'ULYA-ARAB', nama_mapel: 'Bahasa Arab (Balaghah / Arudh)', jenjang: 'Ulya', schoolId: ulyaSchoolId },
      { kode_mapel: 'ULYA-MANTIQ', nama_mapel: 'Ilmu Mantiq', jenjang: 'Ulya', schoolId: ulyaSchoolId }
    ];

    // Coba masukkan dengan kolom id_sekolah
    const payloadWithSchool = mapelData.map(m => ({
      kode_mapel: m.kode_mapel,
      nama_mapel: m.nama_mapel,
      kategori: 'Diniyah/Pesantren', // Sesuai CHECK constraint database
      keterangan: `Kurikulum Diniyah ${m.jenjang}`,
      id_sekolah: m.schoolId
    }));

    const { error: errorWithSchool } = await supabase
      .from('mapel')
      .upsert(payloadWithSchool, { onConflict: 'kode_mapel' });

    if (errorWithSchool) {
      console.warn("Mencoba tanpa id_sekolah...");
      
      const payloadWithoutSchool = mapelData.map(m => ({
        kode_mapel: m.kode_mapel,
        nama_mapel: m.nama_mapel,
        kategori: 'Diniyah/Pesantren',
        keterangan: `Kurikulum Diniyah ${m.jenjang}`
      }));

      const { error: errorWithoutSchool } = await supabase
        .from('mapel')
        .upsert(payloadWithoutSchool, { onConflict: 'kode_mapel' });

      if (errorWithoutSchool) throw errorWithoutSchool;
    }

    return { success: true, message: 'Data Kurikulum Diniyah Kemenag berhasil dimasukkan!' };
  } catch (err: any) {
    console.error('Exception in seedDiniyahKurikulum:', err);
    return { success: false, error: err.message || 'Gagal melakukan seeding mata pelajaran diniyah.' };
  }
}
