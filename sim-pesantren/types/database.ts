export interface Profile {
  id: string;
  nama_lengkap: string;
  id_role: string | null;
  role: string;
  no_hp?: string | null;
  foto_url?: string | null;
  created_at: string;
  role_relation?: AppRole | null;
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
  foto_url?: string | null;
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

export interface RefHadits {
  id: string;
  nama_kitab: string;
  jumlah_hadits: number;
  created_at: string;
}

export interface RefMatan {
  id: string;
  nama_kitab: string;
  jumlah_bait: number;
  created_at: string;
}

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
  // New Fields
  tipe_setoran: 'quran' | 'hadits' | 'matan' | 'tahsin' | 'ujian';
  penyimak?: string | null;
  jenis_setoran?: 'Ziyadah' | 'Murojaah' | null;
  ayat_mulai?: number | null;
  catatan?: string | null;
  kitab_hadits_matan?: string | null;
  hadits_ke?: number | null;
  jilid_tahsin?: number | null;
  halaman_tahsin?: number | null;
  materi_ujian?: string | null;
  nilai_custom?: string | null;
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
  // Joins
  sekolah?: Sekolah | null;
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

export interface Nilai {
  id: string;
  id_santri: string;
  id_mapel: string;
  id_kelas: string;
  nilai_angka: number;
  catatan?: string | null;
  semester: number;
  tahun_ajaran: string;
  jenis_ujian: string;
  created_by: string;
  created_at: string;
  // Joins
  santri?: Santri | null;
  kelas?: Kelas | null;
}


export interface Mapel {
  id: string;
  kode_mapel: string;
  nama_mapel: string;
  kategori: 'Diniyah/Pesantren' | 'Umum' | 'Kitab Kuning' | 'Bahasa';
  id_sekolah: string | null;
  keterangan?: string | null;
  created_at: string;
  // Joins
  sekolah?: Sekolah | null;
}

export interface JadwalPelajaran {
  id: string;
  id_kelas: string;
  id_mapel: string;
  id_guru: string | null;
  hari: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Ahad';
  jam_mulai: string;
  jam_selesai: string;
  ruangan?: string | null;
  created_at: string;
  // Joins
  kelas?: Kelas | null;
  mapel?: Mapel | null;
  guru?: Pegawai | null;
}

export interface Absensi {
  id: string;
  id_jadwal: string;
  id_santri: string;
  tanggal: string;
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpha';
  keterangan?: string | null;
  created_at: string;
  // Joins
  jadwal?: JadwalPelajaran | null;
  santri?: Santri | null;
}

export interface AbsensiSholat {
  id: string;
  id_santri: string;
  tanggal: string;
  waktu_sholat: 'Subuh' | 'Dzuhur' | 'Ashar' | 'Maghrib' | 'Isya';
  status: 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpha';
  keterangan?: string | null;
  created_at: string;
  id_musyrif?: string | null;
  // Joins
  santri?: Santri | null;
  musyrif?: Pegawai | null;
}

export interface Perizinan {
  id: string;
  id_santri: string;
  keperluan: string;
  tanggal_keluar: string;
  tanggal_kembali?: string | null;
  rencana_kembali?: string | null;
  penjemput?: string | null;
  status: 'diajukan' | 'disetujui' | 'ditolak' | 'kembali' | string;
  created_by?: string | null;
  approved_by?: string | null;
  created_at: string;
  // Joins
  santri?: Santri | null;
  creator?: Profile | null;
  approver?: Profile | null;
}

export interface MasterPelanggaran {
  id: string;
  nama_pelanggaran: string;
  kategori: 'Ringan' | 'Sedang' | 'Berat';
  poin: number;
  created_at: string;
}

export interface PelanggaranSantri {
  id: string;
  id_santri: string;
  id_pelanggaran: string;
  catatan?: string | null;
  id_pelapor?: string | null;
  tanggal: string;
  created_at: string;
  // Joins
  santri?: Santri | null;
  pelanggaran?: MasterPelanggaran | null;
  pelapor?: Pegawai | null;
}

export interface MasterBiaya {
  id: string;
  nama_biaya: string;
  nominal: number;
  frekuensi: 'bulanan' | 'persemester' | 'insidentil';
  created_at: string;
}

export interface Tagihan {
  id: string;
  id_santri: string;
  id_master_biaya: string;
  bulan: number;
  tahun: number;
  nominal: number;
  terbayar: number;
  status: 'Belum Lunas' | 'Lunas' | string;
  created_at: string;
  // Joins
  santri?: Santri | null;
  master_biaya?: MasterBiaya | null;
}

export interface AppRole {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
}

export interface RolePermission {
  id: string;
  id_role: string;
  feature: 'Santri' | 'Keuangan' | 'Akademik' | 'PPDB' | string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
}

export interface PembayaranGroup {
  id: string;
  nomor_kuitansi?: string | null;
  id_santri: string;
  total_tagihan: number;
  total_bayar: number;
  uang_diterima: number;
  kembalian: number;
  id_admin?: string | null;
  created_at: string;
  // Joins
  santri?: Santri | null;
  admin?: Profile | null;
  pembayaran_list?: Pembayaran[] | null;
}

export interface Pembayaran {
  id: string;
  id_group?: string | null;
  id_santri: string;
  id_tagihan?: string | null;
  id_admin?: string | null;
  jumlah: number;
  status: 'Belum Lunas' | 'Lunas' | string;
  tanggal_bayar?: string | null;
  created_at: string;
  // Joins
  santri?: Santri | null;
  tagihan?: Tagihan | null;
  admin?: Profile | null;
  group?: PembayaranGroup | null;
}

export interface PesantrenProfile {
  id: string;
  nama_pesantren: string;
  alamat?: string | null;
  telp?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  foto_pimpinan_url?: string | null;
  nama_pimpinan?: string | null;
  created_at: string;
}

export interface LandingPageSettings {
  id: number;
  tagline_title: string;
  tagline_description: string;
  status_pendaftaran: boolean;
  medsos_facebook?: string | null;
  medsos_instagram?: string | null;
  medsos_youtube?: string | null;
  created_at: string;
}

export interface HeroSlide {
  id: string;
  image_url: string;
  title: string;
  subtitle: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RefSurah {
  id: string;
  nama_surah: string;
  jumlah_ayat: number;
}

export interface TahunAjaran {
  id: string;
  nama_tahun: string;
  tanggal_mulai: string;
  tanggal_akhir: string;
  status_aktif: boolean;
  created_at: string;
}

export interface Semester {
  id: string;
  id_tahun_ajaran: string;
  nama_semester: 'Ganjil' | 'Genap';
  status_aktif: boolean;
  created_at: string;
  tahun_ajaran?: TahunAjaran | null;
}

export interface AppRolePermission {
  id_role: string;
  role_name: string;
  feature: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

// =========================================================================
// PPDB Types
// =========================================================================

export type JalurPendaftaran = 'reguler' | 'prestasi' | 'afirmasi';
export type JenisAfirmasi = 'yatim' | 'piatu' | 'yatim_piatu' | 'dhuafa';
export type StatusPendaftaran =
  | 'MENUNGGU_VERIFIKASI'
  | 'LOLOS_ADMIN'
  | 'DITOLAK'
  | 'MENUNGGU_SELEKSI'
  | 'DITERIMA'
  | 'TIDAK_DITERIMA'
  | 'MENUNGGU_PEMBAYARAN'
  | 'LUNAS'
  | 'SUDAH_DAFTAR_ULANG';

export interface GelombangPendaftaran {
  id: string;
  nama: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  kuota: number;
  id_tahun_ajaran: string | null;
  aktif: boolean;
  created_at: string;
  tahun_ajaran?: TahunAjaran | null;
}

export interface CalonSantri {
  id: string;
  auth_user_id: string;
  nama_lengkap: string;
  email: string;
  no_hp: string;
  tempat_lahir?: string | null;
  tanggal_lahir?: string | null;
  jenis_kelamin?: 'L' | 'P' | null;
  nik?: string | null;
  nisn?: string | null;
  no_kk?: string | null;
  agama?: string | null;
  anak_ke?: number | null;
  jml_saudara_kandung?: number | null;
  alamat?: string | null;
  rt?: string | null;
  rw?: string | null;
  dusun?: string | null;
  kelurahan?: string | null;
  kecamatan?: string | null;
  kode_pos?: string | null;
  jenis_tinggal?: string | null;
  alat_transportasi?: string | null;
  jarak_ke_sekolah?: string | null;
  asal_sekolah?: string | null;
  nama_ayah?: string | null;
  tahun_lahir_ayah?: number | null;
  pendidikan_ayah?: string | null;
  pekerjaan_ayah?: string | null;
  penghasilan_ayah?: string | null;
  nik_ayah?: string | null;
  nama_ibu?: string | null;
  tahun_lahir_ibu?: number | null;
  pendidikan_ibu?: string | null;
  pekerjaan_ibu?: string | null;
  penghasilan_ibu?: string | null;
  nik_ibu?: string | null;
  nama_wali?: string | null;
  tahun_lahir_wali?: number | null;
  pendidikan_wali?: string | null;
  pekerjaan_wali?: string | null;
  penghasilan_wali?: string | null;
  nik_wali?: string | null;
  no_hp_ortu?: string | null;
  jalur_pendaftaran: JalurPendaftaran;
  jenis_afirmasi?: JenisAfirmasi | null;
  jenis_prestasi?: string | null;
  id_gelombang: string | null;
  no_registrasi_akta_lahir?: string | null;
  skhun?: string | null;
  penerima_kip_kps?: boolean | null;
  bank?: string | null;
  no_rekening?: string | null;
  layak_pip?: boolean | null;
  alasan_layak_pip?: string | null;
  berat_badan?: number | null;
  tinggi_badan?: number | null;
  lingkar_kepala?: number | null;
  foto_url?: string | null;
  scan_akte?: string | null;
  scan_kk?: string | null;
  scan_kip?: string | null;
  surat_keterangan?: string | null;
  status: StatusPendaftaran;
  catatan_admin?: string | null;
  id_santri?: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  gelombang?: GelombangPendaftaran | null;
  santri?: Santri | null;
  hasil_seleksi?: HasilSeleksi | null;
}

export interface BiayaPpdb {
  id: string;
  id_gelombang: string;
  nama_biaya: string;
  nominal_reguler: number;
  nominal_prestasi: number;
  nominal_afirmasi: number;
  wajib: boolean;
  keterangan?: string | null;
  created_at: string;
  // Joins
  gelombang?: GelombangPendaftaran | null;
}

export interface HasilSeleksi {
  id: string;
  id_calon_santri: string;
  nilai_tes_tulis?: number | null;
  nilai_baca_quran?: number | null;
  nilai_wawancara?: number | null;
  nilai_akhir?: number | null;
  lulus?: boolean | null;
  tanggal_tes?: string | null;
  jam_tes?: string | null;
  ruang_tes?: string | null;
  id_penguji?: string | null;
  catatan?: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  calon_santri?: CalonSantri | null;
  penguji?: Pegawai | null;
}

export interface PengumumanPpdb {
  id: string;
  id_gelombang: string;
  judul: string;
  konten?: string | null;
  file_url?: string | null;
  tanggal_terbit: string;
  created_at: string;
  // Joins
  gelombang?: GelombangPendaftaran | null;
}
