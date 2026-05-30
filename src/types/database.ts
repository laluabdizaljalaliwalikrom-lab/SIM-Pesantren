export type UserRole = 'admin' | 'pengasuh' | 'wali_santri';
export type SantriStatus = 'aktif' | 'alumni' | 'mutasi';

export interface Profile {
  id: string;
  nama_lengkap: string;
  role: UserRole;
  created_at: string;
}

export interface Kamar {
  id: string;
  nama_kamar: string;
  gedung: string;
  kapasitas: number;
  created_at: string;
}

export interface Santri {
  id: string;
  nis: string;
  nama_lengkap: string;
  tanggal_lahir: string;
  id_kamar: string | null;
  id_wali: string | null;
  status: SantriStatus;
  created_at: string;
  // Joins
  kamar?: Kamar | null;
  wali?: Profile | null;
}

export type KelancaranGrade = 'A' | 'B' | 'C' | 'D';

export interface PresensiTahfidz {
  id: string;
  id_santri: string;
  tanggal_setoran: string;
  juz: number;
  nama_surah: string;
  ayat_terakhir: number;
  nilai_kelancaran: KelancaranGrade;
  id_ustadz: string | null;
  created_at: string;
  // Joins
  santri?: Santri | null;
  ustadz?: Profile | null;
}

