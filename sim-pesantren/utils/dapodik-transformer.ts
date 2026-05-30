import { Santri } from '@/types/database';

// Representasi satu baris data dari CSV/Excel Dapodik
interface DapodikRow {
  Nama?: string;
  NIPD?: string | number;
  JK?: string;
  NISN?: string | number;
  'Tempat Lahir'?: string;
  'Tanggal Lahir'?: string | Date | number;
  NIK?: string | number;
  Alamat?: string;
  HP?: string | number;
  'Nama Ayah'?: string;
  'Nama Ibu'?: string;
  'Rombel Saat Ini'?: string;
  'Sekolah Asal'?: string;
  [key: string]: any;
}

// Payload yang siap di-insert ke tabel 'santri' Supabase
type SantriInsertPayload = Omit<Santri, 'id' | 'created_at' | 'kamar' | 'wali'>;

/**
 * Mengonversi format tanggal lahir dari Dapodik ke format DATE standar PostgreSQL (YYYY-MM-DD)
 */
function parseDapodikDate(rawDate: any): string {
  if (!rawDate) return '2000-01-01'; // Fallback jika tanggal kosong

  if (rawDate instanceof Date) {
    return rawDate.toISOString().split('T')[0];
  }

  const dateStr = String(rawDate).trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  const dmyMatch = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const [_, day, month, year] = dmyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return '2000-01-01';
}

/**
 * Menormalisasi jenis kelamin: 'L' / 'P'
 */
function parseGender(rawJk: any): 'L' | 'P' | null {
  if (!rawJk) return null;
  const jk = String(rawJk).trim().toUpperCase();
  if (jk.startsWith('L')) return 'L';
  if (jk.startsWith('P') || jk.startsWith('W')) return 'P'; // P / Perempuan / Wanita
  return null;
}

/**
 * Mengubah input ke angka atau null
 */
function parseNumber(val: any): number | null {
  if (val === undefined || val === null || String(val).trim() === '') return null;
  const num = Number(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? null : num;
}

/**
 * Mengubah input ke boolean
 */
function parseBoolean(val: any): boolean {
  if (val === undefined || val === null) return false;
  const str = String(val).trim().toLowerCase();
  return str === 'true' || str === '1' || str === 'y' || str === 'ya' || str === 'yes' || str === 'penerima' || str === 'layak';
}

/**
 * Fungsi pembantu untuk mengambil nilai dari objek baris berdasarkan daftar nama kunci alias.
 * Bersifat tidak sensitif huruf besar/kecil (case-insensitive) dan mendukung trim whitespace.
 */
function getValue(row: any, aliases: string[]): any {
  const rowKeys = Object.keys(row);
  
  // 1. Coba pencocokan persis (case-insensitive & trim)
  for (const key of rowKeys) {
    const cleanKey = key.trim().toLowerCase();
    for (const alias of aliases) {
      const cleanAlias = alias.trim().toLowerCase();
      if (cleanKey === cleanAlias) {
        return row[key];
      }
    }
  }

  // 2. Coba pencocokan parsial yang aman
  for (const key of rowKeys) {
    const cleanKey = key.trim().toLowerCase();
    for (const alias of aliases) {
      const cleanAlias = alias.trim().toLowerCase();
      
      // Hindari false positive jika mencari 'nama' agar tidak mencocokkan nama sekolah, nama ayah, dll.
      if (cleanAlias === 'nama' || cleanAlias === 'nama_lengkap' || cleanAlias === 'nama peserta didik') {
        if (cleanKey.includes('sekolah') || cleanKey.includes('ayah') || cleanKey.includes('ibu') || cleanKey.includes('wali') || cleanKey.includes('rombel')) {
          continue;
        }
      }
      
      if (cleanKey.includes(cleanAlias)) {
        return row[key];
      }
    }
  }
  return undefined;
}

export function transformDapodikData(rawRows: DapodikRow[]): SantriInsertPayload[] {
  if (!rawRows || !Array.isArray(rawRows)) return [];

  const transformed: SantriInsertPayload[] = [];

  for (const row of rawRows) {
    const nisVal = getValue(row, ['nipd', 'nis']);
    const namaVal = getValue(row, ['nama_lengkap', 'nama']);

    const nis = nisVal !== undefined ? String(nisVal).trim() : '';
    const namaLengkap = namaVal !== undefined ? String(namaVal).trim() : '';

    // Validasi minimal NIS & Nama Lengkap
    if (!nis || !namaLengkap) {
      continue; 
    }

    transformed.push({
      // Core Identity
      nis: nis,
      nama_lengkap: namaLengkap,
      jenis_kelamin: parseGender(getValue(row, ['jk', 'jenis_kelamin', 'jenis kelamin'])),
      nisn: getValue(row, ['nisn', 'nomor induk siswa nasional']) ? String(getValue(row, ['nisn', 'nomor induk siswa nasional'])).trim() : null,
      tempat_lahir: getValue(row, ['tempat lahir', 'tempat_lahir']) ? String(getValue(row, ['tempat lahir', 'tempat_lahir'])).trim() : null,
      tanggal_lahir: parseDapodikDate(getValue(row, ['tanggal lahir', 'tanggal_lahir'])),
      nik: getValue(row, ['nik', 'nomor induk kependudukan', 'no. ktp', 'ktp']) ? String(getValue(row, ['nik', 'nomor induk kependudukan', 'no. ktp', 'ktp'])).trim() : null,
      no_kk: getValue(row, ['no_kk', 'no kk', 'nomor kk', 'no. kk']) ? String(getValue(row, ['no_kk', 'no kk', 'nomor kk', 'no. kk'])).trim() : null,
      agama: getValue(row, ['agama']) ? String(getValue(row, ['agama'])).trim() : 'Islam',
      anak_ke: parseNumber(getValue(row, ['anak_ke', 'anak ke', 'anak_ke_berapa', 'anak_ke_ke'])),
      jml_saudara_kandung: parseNumber(getValue(row, ['jml_saudara_kandung', 'jumlah saudara kandung', 'saudara kandung', 'jumlah saudara'])),

      // Alamat & Kontak
      alamat: getValue(row, ['alamat']) ? String(getValue(row, ['alamat'])).trim() : null,
      rt: getValue(row, ['rt']) ? String(getValue(row, ['rt'])).trim() : null,
      rw: getValue(row, ['rw']) ? String(getValue(row, ['rw'])).trim() : null,
      dusun: getValue(row, ['dusun', 'nama dusun']) ? String(getValue(row, ['dusun', 'nama dusun'])).trim() : null,
      kelurahan: getValue(row, ['kelurahan', 'desa']) ? String(getValue(row, ['kelurahan', 'desa'])).trim() : null,
      kecamatan: getValue(row, ['kecamatan']) ? String(getValue(row, ['kecamatan'])).trim() : null,
      kode_pos: getValue(row, ['kode_pos', 'kode pos']) ? String(getValue(row, ['kode_pos', 'kode pos'])).trim() : null,
      jenis_tinggal: getValue(row, ['jenis_tinggal', 'jenis tinggal']) ? String(getValue(row, ['jenis_tinggal', 'jenis tinggal'])).trim() : 'Bersama Orang Tua',
      alat_transportasi: getValue(row, ['alat_transportasi', 'alat transportasi', 'transportasi']) ? String(getValue(row, ['alat_transportasi', 'alat transportasi', 'transportasi'])).trim() : null,
      jarak_ke_sekolah: getValue(row, ['jarak_ke_sekolah', 'jarak ke sekolah', 'jarak rumah']) ? String(getValue(row, ['jarak_ke_sekolah', 'jarak ke sekolah', 'jarak rumah'])).trim() : null,
      hp: getValue(row, ['hp', 'telepon', 'handphone']) ? String(getValue(row, ['hp', 'telepon', 'handphone'])).trim() : null,
      email: getValue(row, ['email', 'e-mail']) ? String(getValue(row, ['email', 'e-mail'])).trim() : null,

      // Parents & Wali
      nama_ayah: getValue(row, ['ayah', 'nama ayah', 'nama_ayah']) ? String(getValue(row, ['ayah', 'nama ayah', 'nama_ayah'])).trim() : null,
      tahun_lahir_ayah: parseNumber(getValue(row, ['tahun_lahir_ayah', 'tahun lahir ayah', 'lahir ayah'])),
      pendidikan_ayah: getValue(row, ['pendidikan_ayah', 'pendidikan ayah']) ? String(getValue(row, ['pendidikan_ayah', 'pendidikan ayah'])).trim() : null,
      pekerjaan_ayah: getValue(row, ['pekerjaan_ayah', 'pekerjaan ayah']) ? String(getValue(row, ['pekerjaan_ayah', 'pekerjaan ayah'])).trim() : null,
      penghasilan_ayah: getValue(row, ['penghasilan_ayah', 'penghasilan ayah']) ? String(getValue(row, ['penghasilan_ayah', 'penghasilan ayah'])).trim() : null,
      nik_ayah: getValue(row, ['nik_ayah', 'nik ayah']) ? String(getValue(row, ['nik_ayah', 'nik ayah'])).trim() : null,

      nama_ibu: getValue(row, ['ibu', 'nama ibu', 'nama_ibu']) ? String(getValue(row, ['ibu', 'nama ibu', 'nama_ibu'])).trim() : null,
      tahun_lahir_ibu: parseNumber(getValue(row, ['tahun_lahir_ibu', 'tahun lahir ibu', 'lahir ibu'])),
      pendidikan_ibu: getValue(row, ['pendidikan_ibu', 'pendidikan ibu']) ? String(getValue(row, ['pendidikan_ibu', 'pendidikan ibu'])).trim() : null,
      pekerjaan_ibu: getValue(row, ['pekerjaan_ibu', 'pekerjaan ibu']) ? String(getValue(row, ['pekerjaan_ibu', 'pekerjaan ibu'])).trim() : null,
      penghasilan_ibu: getValue(row, ['penghasilan_ibu', 'penghasilan ibu']) ? String(getValue(row, ['penghasilan_ibu', 'penghasilan ibu'])).trim() : null,
      nik_ibu: getValue(row, ['nik_ibu', 'nik ibu']) ? String(getValue(row, ['nik_ibu', 'nik ibu'])).trim() : null,

      nama_wali: getValue(row, ['wali', 'nama wali', 'nama_wali']) ? String(getValue(row, ['wali', 'nama wali', 'nama_wali'])).trim() : null,
      tahun_lahir_wali: parseNumber(getValue(row, ['tahun_lahir_wali', 'tahun lahir wali', 'lahir wali'])),
      pendidikan_wali: getValue(row, ['pendidikan_wali', 'pendidikan wali']) ? String(getValue(row, ['pendidikan_wali', 'pendidikan wali'])).trim() : null,
      pekerjaan_wali: getValue(row, ['pekerjaan_wali', 'pekerjaan wali']) ? String(getValue(row, ['pekerjaan_wali', 'pekerjaan wali'])).trim() : null,
      penghasilan_wali: getValue(row, ['penghasilan_wali', 'penghasilan wali']) ? String(getValue(row, ['penghasilan_wali', 'penghasilan wali'])).trim() : null,
      nik_wali: getValue(row, ['nik_wali', 'nik wali']) ? String(getValue(row, ['nik_wali', 'nik wali'])).trim() : null,

      // Data Penunjang & Fisik
      rombel_saat_ini: getValue(row, ['rombel', 'rombel saat ini', 'rombel_saat_ini']) ? String(getValue(row, ['rombel', 'rombel saat ini', 'rombel_saat_ini'])).trim() : null,
      sekolah_asal: getValue(row, ['sekolah asal', 'sekolah_asal']) ? String(getValue(row, ['sekolah asal', 'sekolah_asal'])).trim() : null,
      berat_badan: parseNumber(getValue(row, ['berat_badan', 'berat badan', 'bb'])),
      tinggi_badan: parseNumber(getValue(row, ['tinggi_badan', 'tinggi badan', 'tb'])),
      lingkar_kepala: parseNumber(getValue(row, ['lingkar_kepala', 'lingkar kepala', 'lk'])),
      no_registrasi_akta_lahir: getValue(row, ['no_registrasi_akta_lahir', 'no registrasi akta lahir', 'no akta']) ? String(getValue(row, ['no_registrasi_akta_lahir', 'no registrasi akta lahir', 'no akta'])).trim() : null,
      skhun: getValue(row, ['skhun', 'no skhun']) ? String(getValue(row, ['skhun', 'no skhun'])).trim() : null,
      penerima_kip_kps: parseBoolean(getValue(row, ['penerima_kip_kps', 'penerima kip kps', 'kip', 'kps'])),
      bank: getValue(row, ['bank', 'nama bank']) ? String(getValue(row, ['bank', 'nama bank'])).trim() : null,
      no_rekening: getValue(row, ['no_rekening', 'no rekening', 'rekening']) ? String(getValue(row, ['no_rekening', 'no rekening', 'rekening'])).trim() : null,
      layak_pip: parseBoolean(getValue(row, ['layak_pip', 'layak pip', 'pip'])),
      alasan_layak_pip: getValue(row, ['alasan_layak_pip', 'alasan layak pip', 'alasan pip']) ? String(getValue(row, ['alasan_layak_pip', 'alasan layak pip', 'alasan pip'])).trim() : null,

      id_kamar: null,
      id_wali: null,
      id_kelas_formal: null,
      id_kelas_non_formal: null,
      status: 'aktif',
    });
  }

  return transformed;
}
