import { supabase } from '@/lib/supabase';

export interface ResetModuleCounts {
  santri: number;
  pegawai: number;
  keuangan: number;
  asrama: number;
  akademik: number;
  presensi: number;
  tahfidz: number;
  ppdb: number;
  broadcast: number;
}

export interface ResetOption {
  id: keyof ResetModuleCounts;
  title: string;
  description: string;
  badge: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  warningText: string;
}

export const RESET_MODULE_DEFINITIONS: ResetOption[] = [
  {
    id: 'santri',
    title: 'Data Santri & Kesiswaan',
    description: 'Menghapus seluruh profil santri, data wali, serta seluruh riwayat nilai, pembayaran, tagihan, dan absensi.',
    badge: 'Master Santri',
    impactLevel: 'critical',
    warningText: 'Tindakan ini akan menghapus seluruh rekaman santri beserta riwayat akademik dan keuangan mereka.',
  },
  {
    id: 'pegawai',
    title: 'Data Pegawai & Guru',
    description: 'Menghapus master biodata pegawai, guru, ustadz, dan riwayat absensi pegawai.',
    badge: 'Master Pegawai',
    impactLevel: 'high',
    warningText: 'Jadwal pelajaran dan riwayat penguji PPDB yang terhubung ke pegawai akan dilepaskan (set NULL).',
  },
  {
    id: 'keuangan',
    title: 'Transaksi Keuangan & Tagihan',
    description: 'Mengosongkan semua data tagihan SPP, kuitansi pembayaran, dan riwayat transaksi kasir.',
    badge: 'Kasir & Tagihan',
    impactLevel: 'high',
    warningText: 'Data santri tetap ada, namun seluruh riwayat pembayaran dan status lunas/belum lunas akan dikosongkan.',
  },
  {
    id: 'akademik',
    title: 'Struktur Akademik & Kurikulum',
    description: 'Menghapus data nilai raport, jadwal pelajaran, mata pelajaran, kelas, dan sekolah.',
    badge: 'Kurikulum & Nilai',
    impactLevel: 'high',
    warningText: 'Penetapan kelas formal/non-formal pada santri akan direset menjadi kosong.',
  },
  {
    id: 'asrama',
    title: 'Kamar & Asrama Santri',
    description: 'Menghapus riwayat perpindahan kamar, master kamar, dan master gedung asrama.',
    badge: 'Fasilitas Asrama',
    impactLevel: 'medium',
    warningText: 'Santri yang sedang menempati kamar akan dilepaskan (id_kamar menjadi NULL).',
  },
  {
    id: 'presensi',
    title: 'Log Presensi & Kedisiplinan',
    description: 'Membersihkan riwayat absensi santri, absensi pegawai, absensi sholat, izin keluar, dan pelanggaran santri.',
    badge: 'Histori Log',
    impactLevel: 'medium',
    warningText: 'Master santri dan pegawai tetap utuh, hanya rekaman harian yang dihapus.',
  },
  {
    id: 'tahfidz',
    title: 'Presensi & Setoran Tahfidz',
    description: 'Mengosongkan riwayat setoran hafalan Al-Qur\'an, Hadits, Matan, dan Tahsin santri.',
    badge: 'Hafalan Qur\'an',
    impactLevel: 'medium',
    warningText: 'Seluruh riwayat perkembangan juz dan surah santri akan dikosongkan.',
  },
  {
    id: 'ppdb',
    title: 'PPDB (Penerimaan Santri Baru)',
    description: 'Menghapus berkas pendaftar calon santri, nilai seleksi, biaya PPDB, dan gelombang pendaftaran.',
    badge: 'Pendaftaran Baru',
    impactLevel: 'medium',
    warningText: 'Cocok dijalankan saat pergantian periode pendaftaran tahun ajaran baru.',
  },
  {
    id: 'broadcast',
    title: 'Riwayat Siaran WhatsApp & Email',
    description: 'Membersihkan log siaran pesan keluar (broadcast hub) dan status pengiriman penerima.',
    badge: 'Log Pesan Keluar',
    impactLevel: 'low',
    warningText: 'Hanya membersihkan riwayat pengiriman siaran pesan, tidak memengaruhi kontak.',
  },
];

/**
 * Mengambil jumlah data real-time untuk setiap modul sebelum reset
 */
export async function getResetModuleCounts(): Promise<{
  success: boolean;
  counts?: ResetModuleCounts;
  message?: string;
}> {
  // 1. Coba panggil RPC terlebih dahulu
  try {
    const { data, error } = await supabase.rpc('get_reset_data_counts');
    if (!error && data) {
      return { success: true, counts: data as ResetModuleCounts };
    }
    if (error) {
      console.warn('[RESET] RPC get_reset_data_counts belum tersedia / error:', error.message || error);
    }
  } catch (err: unknown) {
    console.warn('[RESET] Exception RPC:', err);
  }

  // 2. Fallback: Hitung langsung lewat client tabel jika RPC belum di-create di Supabase SQL Editor
  try {
    const [
      { count: santriCount },
      { count: pegawaiCount },
      { count: tagihanCount },
      { count: pembayaranCount },
      { count: kamarCount },
      { count: gedungCount },
      { count: kelasCount },
      { count: mapelCount },
      { count: absensiSantriCount },
      { count: tahfidzCount },
      { count: calonSantriCount },
      { count: broadcastCount },
    ] = await Promise.all([
      supabase.from('santri').select('*', { count: 'exact', head: true }),
      supabase.from('pegawai').select('*', { count: 'exact', head: true }),
      supabase.from('tagihan').select('*', { count: 'exact', head: true }),
      supabase.from('pembayaran').select('*', { count: 'exact', head: true }),
      supabase.from('kamar').select('*', { count: 'exact', head: true }),
      supabase.from('gedung').select('*', { count: 'exact', head: true }),
      supabase.from('kelas').select('*', { count: 'exact', head: true }),
      supabase.from('mapel').select('*', { count: 'exact', head: true }),
      supabase.from('absensi_santri').select('*', { count: 'exact', head: true }),
      supabase.from('presensi_tahfidz').select('*', { count: 'exact', head: true }),
      supabase.from('calon_santri').select('*', { count: 'exact', head: true }),
      supabase.from('broadcast_messages').select('*', { count: 'exact', head: true }),
    ]);

    const fallbackCounts: ResetModuleCounts = {
      santri: santriCount || 0,
      pegawai: pegawaiCount || 0,
      keuangan: (tagihanCount || 0) + (pembayaranCount || 0),
      asrama: (kamarCount || 0) + (gedungCount || 0),
      akademik: (kelasCount || 0) + (mapelCount || 0),
      presensi: absensiSantriCount || 0,
      tahfidz: tahfidzCount || 0,
      ppdb: calonSantriCount || 0,
      broadcast: broadcastCount || 0,
    };

    return { success: true, counts: fallbackCounts };
  } catch (fallbackErr: unknown) {
    const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
    console.warn('[RESET] Gagal menghitung data fallback:', fallbackMsg);
    return {
      success: true,
      counts: {
        santri: 0,
        pegawai: 0,
        keuangan: 0,
        asrama: 0,
        akademik: 0,
        presensi: 0,
        tahfidz: 0,
        ppdb: 0,
        broadcast: 0,
      },
    };
  }
}

/**
 * Mengeksekusi penghapusan data secara atomik di database
 */
export async function executeDataReset(modules: string[]): Promise<{
  success: boolean;
  message?: string;
  details?: Record<string, boolean>;
}> {
  try {
    if (!modules || modules.length === 0) {
      return { success: false, message: 'Harap pilih minimal satu modul untuk di-reset.' };
    }

    const { data, error } = await supabase.rpc('execute_reset_data', {
      p_modules: modules,
    });

    if (error) throw error;

    const res = data as { success: boolean; message?: string; details?: Record<string, boolean> };
    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[RESET] Gagal eksekusi reset data:', err);
    return { success: false, message: msg };
  }
}
