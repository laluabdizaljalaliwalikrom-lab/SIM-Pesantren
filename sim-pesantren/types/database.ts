export type UserRole = 'admin' | 'pengasuh' | 'wali_santri';
export type SantriStatus = 'aktif' | 'alumni' | 'mutasi';

export interface Profile {
  id: string;
  nama_lengkap: string;
  role: UserRole;
  no_hp?: string | null;
  foto_url?: string | null;
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

export interface NilaiAkademik {
  id: string;
  id_santri: string;
  id_kelas: string;
  mata_pelajaran: string;
  nilai: number;
  catatan?: string | null;
  created_at: string;
  // Joins
  santri?: Santri | null;
  kelas?: Kelas | null;
}

export interface MataPelajaran {
  id: string;
  kode_mapel: string;
  nama_mapel: string;
  kategori: 'Diniyah/Pesantren' | 'Umum' | 'Kitab Kuning' | 'Bahasa';
  keterangan?: string | null;
  created_at: string;
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
  mapel?: MataPelajaran | null;
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
  created_at: string;
  // Joins
  santri?: Santri | null;
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
  feature: 'Santri' | 'Keuangan' | 'Akademik' | string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
}

export interface Pembayaran {
  id: string;
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
}
