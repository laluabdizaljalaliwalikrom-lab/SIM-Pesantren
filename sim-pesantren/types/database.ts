export type UserRole = 'admin' | 'pengasuh' | 'wali_santri';
export type SantriStatus = 'aktif' | 'alumni' | 'mutasi';

export interface Profile {
  id: string;
  nama_lengkap: string;
  role: UserRole;
  created_at: string;
}

export interface Gedung {
  id: string;
  nama_gedung: string;
  kategori_gender: 'L' | 'P' | 'LP';
  keterangan?: string | null;
  created_at: string;
}

export interface LogPerpindahanKamar {
  id: string;
  id_santri: string;
  id_kamar_asal: string | null;
  id_kamar_tujuan: string | null;
  tanggal_pindah: string;
  keterangan?: string | null;
  // Joins
  santri?: Santri | null;
  kamar_asal?: Kamar | null;
  kamar_tujuan?: Kamar | null;
}


export interface Kamar {
  id: string;
  nama_kamar: string;
  gedung: string;
  id_gedung?: string | null;
  kapasitas: number;
  created_at: string;
  gedung_relation?: Gedung | null;
}

export interface Santri {
  id: string;
  nis: string;
  nama_lengkap: string;
  jenis_kelamin?: 'L' | 'P' | null;
  nisn?: string | null;
  tempat_lahir?: string | null;
  tanggal_lahir: string;
  nik?: string | null;
  alamat?: string | null;
  hp?: string | null;
  nama_ayah?: string | null;
  nama_ibu?: string | null;
  rombel_saat_ini?: string | null;
  sekolah_asal?: string | null;
  id_kamar: string | null;
  id_wali: string | null;
  id_kelas_formal?: string | null;
  id_kelas_non_formal?: string | null;
  status: SantriStatus;
  created_at: string;
  // Extended Columns
  no_kk?: string | null;
  agama?: string | null;
  rt?: string | null;
  rw?: string | null;
  dusun?: string | null;
  kelurahan?: string | null;
  kecamatan?: string | null;
  kode_pos?: string | null;
  jenis_tinggal?: string | null;
  alat_transportasi?: string | null;
  email?: string | null;
  nama_wali?: string | null;
  berat_badan?: number | null;
  tinggi_badan?: number | null;
  anak_ke?: number | null;
  jml_saudara_kandung?: number | null;
  jarak_ke_sekolah?: string | null;
  tahun_lahir_ayah?: number | null;
  pendidikan_ayah?: string | null;
  pekerjaan_ayah?: string | null;
  penghasilan_ayah?: string | null;
  nik_ayah?: string | null;
  tahun_lahir_ibu?: number | null;
  pendidikan_ibu?: string | null;
  pekerjaan_ibu?: string | null;
  penghasilan_ibu?: string | null;
  nik_ibu?: string | null;
  tahun_lahir_wali?: number | null;
  pendidikan_wali?: string | null;
  pekerjaan_wali?: string | null;
  penghasilan_wali?: string | null;
  nik_wali?: string | null;
  lingkar_kepala?: number | null;
  no_registrasi_akta_lahir?: string | null;
  skhun?: string | null;
  penerima_kip_kps?: boolean | null;
  bank?: string | null;
  no_rekening?: string | null;
  layak_pip?: boolean | null;
  alasan_layak_pip?: string | null;
  // Joins
  kamar?: Kamar | null;
  wali?: Profile | null;
  kelas_formal?: Kelas | null;
  kelas_non_formal?: Kelas | null;
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

export interface Sekolah {
  id: string;
  nama_sekolah: string;
  kategori: 'Formal' | 'Non-Formal';
  created_at: string;
}

export interface Kelas {
  id: string;
  nama_kelas: string;
  tingkat: number;
  id_sekolah: string;
  created_at: string;
}

export type JabatanPegawai =
  | 'Ustadz'
  | 'Ustadzah'
  | 'Guru Formal'
  | 'Guru Non-Formal'
  | 'Pengasuh'
  | 'Administrasi'
  | 'Tenaga Kebersihan'
  | 'Keamanan'
  | 'Lainnya';

export type StatusPegawai = 'Aktif' | 'Tidak Aktif' | 'Cuti';

export interface Pegawai {
  id: string;
  nip?: string | null;
  nama_lengkap: string;
  gelar_depan?: string | null;
  gelar_belakang?: string | null;
  jabatan: JabatanPegawai;
  jenis_kelamin?: 'L' | 'P' | null;
  tempat_lahir?: string | null;
  tanggal_lahir?: string | null;
  alamat?: string | null;
  no_hp?: string | null;
  email?: string | null;
  foto_url?: string | null;
  pendidikan_terakhir?: string | null;
  spesialisasi?: string | null;
  tanggal_bergabung?: string | null;
  status: StatusPegawai;
  created_at: string;
}
