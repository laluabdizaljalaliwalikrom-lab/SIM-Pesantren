import { Pegawai, JabatanPegawai } from '@/types/database';

// Representasi satu baris data dari CSV/Excel Dapodik (PTK / GTK)
interface DapodikPegawaiRow {
  Nama?: string;
  NIP?: string | number;
  NUPTK?: string | number;
  NIK?: string | number;
  JK?: string;
  'Tempat Lahir'?: string;
  'Tanggal Lahir'?: string | Date | number;
  Alamat?: string;
  HP?: string | number;
  Email?: string;
  Jabatan?: string;
  'Jenis PTK'?: string;
  'Pendidikan Terakhir'?: string;
  'Bidang Studi'?: string;
  'TMT Kerja'?: string | Date | number;
  [key: string]: any;
}

// Payload siap di-insert ke tabel 'pegawai'
export type PegawaiInsertPayload = Omit<Pegawai, 'id' | 'created_at' | 'sekolah'>;

// Daftar jabatan kanonik yang diterima tabel pegawai (pondok + Dapodik)
const JABATAN_KANONIK: string[] = [
  'Ustadz', 'Ustadzah', 'Guru Formal', 'Guru Non-Formal', 'Pengasuh', 'Administrasi',
  'Tenaga Kebersihan', 'Keamanan', 'Lainnya',
  'Guru Kelas', 'Guru Mapel', 'Guru BK', 'Guru Inklusi', 'Guru Pendamping', 'Guru Magang',
  'Guru TIK', 'Guru Kehormatan', 'Kepala Sekolah', 'Wakil Kepala Sekolah', 'Kepala TU',
  'Tenaga Administrasi Sekolah', 'Pustakawan', 'Kepala Perpustakaan', 'Laboran',
  'Kepala Laboratorium', 'Koordinator Laboratorium', 'Teknisi', 'Penjaga Sekolah',
  'Pesuruh', 'Tukang Kebun', 'Petugas Keamanan', 'Perawat', 'Pengemudi', 'Supervisor',
  'Operator Sekolah', 'Ketua Jurusan', 'Bendahara', 'Pembantu Bendahara',
];

// Alias kata kunci -> jabatan kanonik (urutan: yang lebih spesifik didahulukan)
const JABATAN_ALIAS: { keywords: string[]; result: JabatanPegawai }[] = [
  { keywords: ['pembantu bendahara'], result: 'Pembantu Bendahara' },
  { keywords: ['bendahara'], result: 'Bendahara' },
  { keywords: ['koordinator laboratorium'], result: 'Koordinator Laboratorium' },
  { keywords: ['kepala laboratorium'], result: 'Kepala Laboratorium' },
  { keywords: ['kepala perpustakaan'], result: 'Kepala Perpustakaan' },
  { keywords: ['kepala sekolah', 'kepala madrasah'], result: 'Kepala Sekolah' },
  { keywords: ['wakil kepala'], result: 'Wakil Kepala Sekolah' },
  { keywords: ['kepala tu', 'kepala tata usaha'], result: 'Kepala TU' },
  { keywords: ['operator sekolah', 'operator dapodik'], result: 'Operator Sekolah' },
  { keywords: ['tenaga administrasi', 'administrasi sekolah', 'tata usaha'], result: 'Tenaga Administrasi Sekolah' },
  { keywords: ['guru mata pelajaran', 'guru matapelajaran'], result: 'Guru Mapel' },
  { keywords: ['guru mapel'], result: 'Guru Mapel' },
  { keywords: ['guru bk', 'bimbingan konseling'], result: 'Guru BK' },
  { keywords: ['guru inklusi'], result: 'Guru Inklusi' },
  { keywords: ['guru pendamping'], result: 'Guru Pendamping' },
  { keywords: ['guru magang'], result: 'Guru Magang' },
  { keywords: ['guru tik', 'guru komputer', 'teknologi informasi'], result: 'Guru TIK' },
  { keywords: ['guru kehormatan', 'guru honor'], result: 'Guru Kehormatan' },
  { keywords: ['guru kelas'], result: 'Guru Kelas' },
  { keywords: ['ketua jurusan', 'kaprodi'], result: 'Ketua Jurusan' },
  { keywords: ['penjaga sekolah'], result: 'Penjaga Sekolah' },
  { keywords: ['petugas keamanan', 'security'], result: 'Petugas Keamanan' },
  { keywords: ['tukang kebun'], result: 'Tukang Kebun' },
  { keywords: ['pustakawan'], result: 'Pustakawan' },
  { keywords: ['laboran'], result: 'Laboran' },
  { keywords: ['teknisi'], result: 'Teknisi' },
  { keywords: ['pesuruh'], result: 'Pesuruh' },
  { keywords: ['perawat'], result: 'Perawat' },
  { keywords: ['pengemudi', 'sopir'], result: 'Pengemudi' },
  { keywords: ['supervisor'], result: 'Supervisor' },
];

/**
 * Memetakan nilai jabatan dari file ke jabatan kanonik sistem.
 * Nilai pondok yang sudah ada (Ustadz/Pengasuh/dll) dipertahankan.
 */
export function mapJabatan(rawJabatan: any): JabatanPegawai {
  if (rawJabatan === undefined || rawJabatan === null) return 'Lainnya';
  const str = String(rawJabatan).trim();
  if (!str) return 'Lainnya';

  const lower = str.toLowerCase();

  // 1. Cocokkan persis dengan daftar kanonik (pertahankan jabatan pondok)
  const exact = JABATAN_KANONIK.find((j) => j.toLowerCase() === lower);
  if (exact) return exact as JabatanPegawai;

  // 2. Cocokkan kata kunci alias
  for (const alias of JABATAN_ALIAS) {
    if (alias.keywords.some((k) => lower.includes(k))) {
      return alias.result;
    }
  }

  // 3. 'Guru <Mapel>' tanpa kategori khusus -> Guru Mapel
  if (lower.startsWith('guru ')) return 'Guru Mapel';

  // 4. Nilai generik 'guru' tanpa kategori -> Guru Formal
  if (lower.includes('guru')) return 'Guru Formal';

  // 5. Fallback
  return 'Lainnya';
}

/**
 * Mengonversi tanggal Dapodik (ISO / DMY / Excel serial / Date) ke YYYY-MM-DD
 */
export function parseDapodikDate(rawDate: any): string | null {
  if (rawDate === undefined || rawDate === null) return null;
  const str = String(rawDate).trim();
  if (!str) return null;

  if (rawDate instanceof Date) {
    if (isNaN(rawDate.getTime())) return null;
    return rawDate.toISOString().split('T')[0];
  }

  if (typeof rawDate === 'number' && rawDate > 20000) {
    // Serial number Excel
    const ms = Math.round((rawDate - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];

  return null;
}

/**
 * Menormalisasi jenis kelamin: 'L' / 'P'
 */
function parseGender(rawJk: any): 'L' | 'P' | null {
  if (!rawJk) return null;
  const jk = String(rawJk).trim().toUpperCase();
  if (jk.startsWith('L')) return 'L';
  if (jk.startsWith('P') || jk.startsWith('W')) return 'P';
  return null;
}

/**
 * Mengambil nilai dari objek baris berdasarkan daftar alias kunci (case-insensitive).
 * Prioritas mengikuti URUTAN alias (bukan urutan kolom), sehingga kolom yang lebih
 * spesifik (mis. "Jabatan PTK") menang atas kolom generik ("Jenis PTK").
 */
function getValue(row: any, aliases: string[]): any {
  const rowKeys = Object.keys(row);

  // 1. Pencocokan persis — urut berdasarkan alias
  for (const alias of aliases) {
    const cleanAlias = alias.trim().toLowerCase();
    for (const key of rowKeys) {
      if (key.trim().toLowerCase() === cleanAlias) {
        return row[key];
      }
    }
  }

  // 2. Pencocokan parsial yang aman — urut berdasarkan alias
  for (const alias of aliases) {
    const cleanAlias = alias.trim().toLowerCase();
    for (const key of rowKeys) {
      const cleanKey = key.trim().toLowerCase();

      // Hindari false positive kolom 'nama' (nama sekolah, nama ayah/ibu, dll)
      if (cleanAlias === 'nama' || cleanAlias === 'nama_lengkap') {
        if (
          cleanKey.includes('sekolah') ||
          cleanKey.includes('ayah') ||
          cleanKey.includes('ibu') ||
          cleanKey.includes('wali') ||
          cleanKey.includes('rombel')
        ) {
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

function toStringVal(val: any): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s || null;
}

/**
 * Membersihkan nilai gelar (Dapodik memakai pemisah koma & placeholder '-').
 * Contoh: "Prof., Dr." -> "Prof., Dr." | "-, -, -" -> null
 */
function parseGelarList(val: any): string | null {
  if (val === undefined || val === null) return null;
  const parts = String(val)
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && !/^[-–—]+$/.test(p));
  return parts.length ? parts.join(', ') : null;
}

/**
 * Menemukan indeks baris header: baris yang memiliki kolom bernama "Nama".
 * Kembali -1 bila tidak ditemukan.
 */
export function detectHeaderRowIndex(rawRows: any[][]): number {
  if (!rawRows || !Array.isArray(rawRows)) return -1;
  for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;
    if (findNamaColumn(row) >= 0) return i;
  }
  return -1;
}

/** Menemukan indeks kolom "Nama" pada satu baris (atau -1). */
function findNamaColumn(row: any[]): number {
  for (let c = 0; c < row.length; c++) {
    const cellStr = String(row[c] ?? '').trim().toLowerCase();
    if (!cellStr) continue;
    if (['sekolah', 'rombel', 'ayah', 'ibu', 'wali', 'gelar'].some((w) => cellStr.includes(w))) continue;
    if (cellStr === 'nama' || cellStr === 'nama lengkap' || cellStr === 'nama_lengkap' || cellStr === 'nama pegawai' || cellStr.includes('nama')) {
      return c;
    }
  }
  return -1;
}

export interface FlatDapodikRow {
  [key: string]: any;
}

/**
 * Menggabungkan header Dapodik bertingkat (2 baris) menjadi satu baris header datar,
 * lalu memetakan baris data menjadi objek.
 *
 * - Jika baris di bawah header berisi sub-header (sel "Nama" kosong + >=2 sel terisi),
 *   key diambil dari sub-header (fallback header utama), data dimulai header+2.
 * - Jika tidak, header tunggal, data dimulai header+1.
 */
export function buildFlatRows(rawRows: any[][], headerRowIndex: number, namaColIndex: number): FlatDapodikRow[] {
  if (!rawRows || !Array.isArray(rawRows) || headerRowIndex < 0) return [];

  const headerRow = rawRows[headerRowIndex] || [];
  const nextRow = rawRows[headerRowIndex + 1] || [];

  const hasSubHeader =
    nextRow.length > 0 &&
    String(nextRow[namaColIndex] ?? '').trim() === '' &&
    nextRow.filter((v) => String(v ?? '').trim() !== '').length >= 2;

  const subRow = hasSubHeader ? nextRow : [];
  const dataStart = hasSubHeader ? headerRowIndex + 2 : headerRowIndex + 1;

  let maxCols = Math.max(headerRow.length, subRow.length);
  for (let i = dataStart; i < rawRows.length; i++) {
    maxCols = Math.max(maxCols, (rawRows[i] || []).length);
  }

  const keys: string[] = [];
  for (let c = 0; c < maxCols; c++) {
    const main = String(headerRow[c] ?? '').trim();
    const sub = String(subRow[c] ?? '').trim();
    keys.push(sub || main || `kolom_${c + 1}`);
  }

  return rawRows.slice(dataStart).map((r) => {
    const obj: FlatDapodikRow = {};
    for (let c = 0; c < keys.length; c++) {
      obj[keys[c]] = r[c];
    }
    return obj;
  });
}

export function transformDapodikPegawaiData(rawRows: DapodikPegawaiRow[]): PegawaiInsertPayload[] {
  if (!rawRows || !Array.isArray(rawRows)) return [];

  const transformed: PegawaiInsertPayload[] = [];

  for (const row of rawRows) {
    const namaLengkap = toStringVal(getValue(row, ['nama', 'nama lengkap', 'nama_lengkap', 'nama pegawai', 'nama ptk', 'nama_ptk']));
    if (!namaLengkap) continue;

    const nip = toStringVal(getValue(row, ['nip', 'n i p']));
    const nuptk = toStringVal(getValue(row, ['nuptk', 'n u p t k']));

    transformed.push({
      nip,
      nuptk,
      nik: toStringVal(getValue(row, ['nik', 'no. ktp', 'no ktp', 'nomor ktp', 'ktp'])),
      nama_lengkap: namaLengkap,
      gelar_depan: parseGelarList(getValue(row, ['gelar depan', 'gelar_depan'])),
      gelar_belakang: parseGelarList(getValue(row, ['gelar belakang', 'gelar_belakang'])),
      jabatan: mapJabatan(getValue(row, ['jabatan ptk', 'jabatan', 'jenis ptk', 'jenis_ptk', 'status pegawai'])),
      jenis_kelamin: parseGender(getValue(row, ['jk', 'jenis kelamin', 'jenis_kelamin', 'jenis kelamin pegawai'])),
      tempat_lahir: toStringVal(getValue(row, ['tempat lahir', 'tempat_lahir'])),
      tanggal_lahir: parseDapodikDate(getValue(row, ['tanggal lahir', 'tanggal_lahir'])),
      alamat: toStringVal(getValue(row, ['alamat', 'alamat jalan', 'alamat_jalan', 'alamat tinggal'])),
      no_hp: toStringVal(getValue(row, ['hp', 'no hp', 'no. hp', 'no_hp', 'telepon', 'handphone'])),
      email: toStringVal(getValue(row, ['email', 'e-mail', 'email pegawai'])),
      foto_url: null,
      pendidikan_terakhir: toStringVal(getValue(row, ['jenjang', 'pendidikan terakhir', 'pendidikan_terakhir', 'pendidikan', 'jenjang pendidikan'])),
      spesialisasi: toStringVal(getValue(row, ['kompetensi', 'sertifikasi', 'bidang studi', 'bidang_studi', 'jurusan/prodi', 'jurusan', 'prodi', 'spesialisasi', 'mapel diampu', 'mata pelajaran diampu', 'keahlian'])),
      tanggal_bergabung: parseDapodikDate(getValue(row, ['tmt kerja', 'tmt_kerja', 'tanggal bergabung', 'tanggal mulai kerja', 'tanggal_bergabung'])),
      status: 'Aktif',
      qr_code_url: null,
      id_sekolah: null,
    });
  }

  return transformed;
}
