'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  MapPin, 
  Users as UsersIcon, 
  FileText, 
  Save, 
  Loader2, 
  HelpCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Kamar, Profile, SantriStatus, Kelas } from '@/types/database';
import { createSantri, updateSantri } from '@/services/santri-actions';
import { toast } from 'sonner';

interface FormTambahSantriProps {
  onClose: () => void;
  onSuccess: () => void;
  selectedSantri?: any | null;
  kamarList: Kamar[];
  waliList: Profile[];
  kelasList: any[];
}

type TabType = 'identitas' | 'alamat' | 'orangtua' | 'penunjang';

// Mock database wilayah sederhana untuk mendemonstrasikan Auto-Kecamatan
const MOCK_POSTAL_CODES: Record<string, { kelurahan: string; kecamatan: string }> = {
  '12345': { kelurahan: 'Pondok Indah', kecamatan: 'Kebayoran Lama' },
  '60111': { kelurahan: 'Keputih', kecamatan: 'Sukolilo' },
  '67153': { kelurahan: 'Gondang', kecamatan: 'Gondang' },
  '70111': { kelurahan: 'Melayu', kecamatan: 'Banjarmasin Tengah' },
  '80111': { kelurahan: 'Sumerta', kecamatan: 'Denpasar Timur' }
};

export default function FormTambahSantri({ 
  onClose, 
  onSuccess, 
  selectedSantri = null, 
  kamarList, 
  waliList,
  kelasList 
}: FormTambahSantriProps) {
  const [activeTab, setActiveTab] = useState<TabType>('identitas');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoFilledBadge, setAutoFilledBadge] = useState(false);

  // Full state with grouped parent objects and defaults
  const [formData, setFormData] = useState({
    // Identitas Pribadi
    nama_lengkap: selectedSantri?.nama_lengkap || '',
    nis: selectedSantri?.nis || '',
    jenis_kelamin: (selectedSantri?.jenis_kelamin || '') as 'L' | 'P' | '',
    nisn: selectedSantri?.nisn || '',
    nik: selectedSantri?.nik || '',
    no_kk: selectedSantri?.no_kk || '',
    tempat_lahir: selectedSantri?.tempat_lahir || '',
    tanggal_lahir: selectedSantri?.tanggal_lahir || '',
    agama: selectedSantri?.agama || 'Islam', // Default: Islam
    anak_ke: '', 
    jml_saudara_kandung: '', 

    // Alamat & Kontak
    alamat: selectedSantri?.alamat || '',
    rt: selectedSantri?.rt || '',
    rw: selectedSantri?.rw || '',
    dusun: selectedSantri?.dusun || '',
    kelurahan: selectedSantri?.kelurahan || '',
    kecamatan: selectedSantri?.kecamatan || '',
    kode_pos: selectedSantri?.kode_pos || '',
    jenis_tinggal: selectedSantri?.jenis_tinggal || 'Bersama Orang Tua', // Default: Bersama Orang Tua
    alat_transportasi: selectedSantri?.alat_transportasi || '',
    jarak_ke_sekolah: '', 
    hp: selectedSantri?.hp || '',
    email: selectedSantri?.email || '',

    // Grouped Parent Data
    data_ayah: {
      nama: selectedSantri?.nama_ayah || '',
      tahun_lahir: '',
      pendidikan: '',
      pekerjaan: '',
      penghasilan: '',
      nik: ''
    },
    data_ibu: {
      nama: selectedSantri?.nama_ibu || '',
      tahun_lahir: '',
      pendidikan: '',
      pekerjaan: '',
      penghasilan: '',
      nik: ''
    },
    data_wali: {
      nama: selectedSantri?.nama_wali || '',
      tahun_lahir: '',
      pendidikan: '',
      pekerjaan: '',
      penghasilan: '',
      nik: ''
    },

    // Data Penunjang & Fisik
    sekolah_asal: selectedSantri?.sekolah_asal || '',
    rombel_saat_ini: selectedSantri?.rombel_saat_ini || '',
    berat_badan: selectedSantri?.berat_badan ? String(selectedSantri.berat_badan) : '',
    tinggi_badan: selectedSantri?.tinggi_badan ? String(selectedSantri.tinggi_badan) : '',
    lingkar_kepala: '', 
    no_registrasi_akta_lahir: '', 
    skhun: '', 
    penerima_kip_kps: false, 
    bank: '', 
    no_rekening: '', 
    layak_pip: false, 
    alasan_layak_pip: '', 

    id_kamar: selectedSantri?.id_kamar || '',
    id_wali: selectedSantri?.id_wali || '',
    id_kelas_formal: selectedSantri?.id_kelas_formal || '',
    id_kelas_non_formal: selectedSantri?.id_kelas_non_formal || '',
    status: (selectedSantri?.status || 'aktif') as SantriStatus,
  });

  // Auto-fill wilayah based on postal code
  useEffect(() => {
    const zip = formData.kode_pos.trim();
    if (zip && MOCK_POSTAL_CODES[zip]) {
      const match = MOCK_POSTAL_CODES[zip];
      setFormData((prev) => ({
        ...prev,
        kelurahan: match.kelurahan,
        kecamatan: match.kecamatan
      }));
      setAutoFilledBadge(true);
      toast.success(`Wilayah otomatis terisi untuk kode pos ${zip}: Kel. ${match.kelurahan}, Kec. ${match.kecamatan}`);
    } else {
      setAutoFilledBadge(false);
    }
  }, [formData.kode_pos]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleNestedInputChange = (
    section: 'data_ayah' | 'data_ibu' | 'data_wali',
    name: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [name]: value
      }
    }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nama_lengkap.trim()) {
      newErrors.nama_lengkap = 'Nama lengkap wajib diisi';
    }
    if (!formData.nis.trim()) {
      newErrors.nis = 'Nomor Induk Santri (NIS/NIPD) wajib diisi';
    }
    if (!formData.tanggal_lahir) {
      newErrors.tanggal_lahir = 'Tanggal lahir wajib diisi';
    }
    if (!formData.nik.trim()) {
      newErrors.nik = 'NIK wajib diisi';
    } else if (!/^\d{16}$/.test(formData.nik.trim())) {
      newErrors.nik = 'NIK harus berupa 16 digit angka';
    }
    if (!formData.nisn.trim()) {
      newErrors.nisn = 'NISN wajib diisi';
    } else if (!/^\d{10}$/.test(formData.nisn.trim())) {
      newErrors.nisn = 'NISN harus berupa 10 digit angka';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Silakan periksa kembali input form yang ditandai merah.');
      setActiveTab('identitas');
      return;
    }

    setIsSubmitting(true);

    // Map the grouped state and flat state to valid database fields
    const payload = {
      nis: formData.nis.trim(),
      nama_lengkap: formData.nama_lengkap.trim(),
      jenis_kelamin: formData.jenis_kelamin || null,
      nisn: formData.nisn.trim() || null,
      tempat_lahir: formData.tempat_lahir.trim() || null,
      tanggal_lahir: formData.tanggal_lahir,
      nik: formData.nik.trim() || null,
      alamat: formData.alamat.trim() || null,
      hp: formData.hp.trim() || null,
      rombel_saat_ini: formData.rombel_saat_ini.trim() || null,
      sekolah_asal: formData.sekolah_asal.trim() || null,
      id_kamar: formData.id_kamar || null,
      id_wali: formData.id_wali || null,
      status: formData.status,
      id_kelas_formal: formData.id_kelas_formal || null,
      id_kelas_non_formal: formData.id_kelas_non_formal || null,

      // Grouped parents mapping to schema columns
      nama_ayah: formData.data_ayah.nama.trim() || null,
      nama_ibu: formData.data_ibu.nama.trim() || null,
      nama_wali: formData.data_wali.nama.trim() || null,

      // Extended DB Columns
      no_kk: formData.no_kk.trim() || null,
      agama: formData.agama || null,
      rt: formData.rt.trim() || null,
      rw: formData.rw.trim() || null,
      dusun: formData.dusun.trim() || null,
      kelurahan: formData.kelurahan.trim() || null,
      kecamatan: formData.kecamatan.trim() || null,
      kode_pos: formData.kode_pos.trim() || null,
      jenis_tinggal: formData.jenis_tinggal || null,
      alat_transportasi: formData.alat_transportasi || null,
      email: formData.email.trim() || null,
      berat_badan: formData.berat_badan ? Number(formData.berat_badan) : null,
      tinggi_badan: formData.tinggi_badan ? Number(formData.tinggi_badan) : null,

      // Remaining Mapped Columns
      anak_ke: formData.anak_ke ? Number(formData.anak_ke) : null,
      jml_saudara_kandung: formData.jml_saudara_kandung ? Number(formData.jml_saudara_kandung) : null,
      jarak_ke_sekolah: formData.jarak_ke_sekolah || null,
      tahun_lahir_ayah: formData.data_ayah.tahun_lahir ? Number(formData.data_ayah.tahun_lahir) : null,
      pendidikan_ayah: formData.data_ayah.pendidikan || null,
      pekerjaan_ayah: formData.data_ayah.pekerjaan || null,
      penghasilan_ayah: formData.data_ayah.penghasilan || null,
      nik_ayah: formData.data_ayah.nik || null,
      tahun_lahir_ibu: formData.data_ibu.tahun_lahir ? Number(formData.data_ibu.tahun_lahir) : null,
      pendidikan_ibu: formData.data_ibu.pendidikan || null,
      pekerjaan_ibu: formData.data_ibu.pekerjaan || null,
      penghasilan_ibu: formData.data_ibu.penghasilan || null,
      nik_ibu: formData.data_ibu.nik || null,
      tahun_lahir_wali: formData.data_wali.tahun_lahir ? Number(formData.data_wali.tahun_lahir) : null,
      pendidikan_wali: formData.data_wali.pendidikan || null,
      pekerjaan_wali: formData.data_wali.pekerjaan || null,
      penghasilan_wali: formData.data_wali.penghasilan || null,
      nik_wali: formData.data_wali.nik || null,
      lingkar_kepala: formData.lingkar_kepala ? Number(formData.lingkar_kepala) : null,
      no_registrasi_akta_lahir: formData.no_registrasi_akta_lahir.trim() || null,
      skhun: formData.skhun.trim() || null,
      penerima_kip_kps: formData.penerima_kip_kps,
      bank: formData.bank.trim() || null,
      no_rekening: formData.no_rekening.trim() || null,
      layak_pip: formData.layak_pip,
      alasan_layak_pip: formData.alasan_layak_pip.trim() || null,
    };

    try {
      if (selectedSantri) {
        const { error } = await updateSantri(selectedSantri.id, payload);
        if (error) throw new Error(error);
        toast.success(`Data santri "${formData.nama_lengkap}" berhasil diperbarui!`);
      } else {
        const { error } = await createSantri(payload);
        if (error) throw new Error(error);
        toast.success(`Santri "${formData.nama_lengkap}" berhasil ditambahkan!`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal menyimpan data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabsConfig = [
    { id: 'identitas', label: 'Identitas Pribadi', icon: User },
    { id: 'alamat', label: 'Alamat & Kontak', icon: MapPin },
    { id: 'orangtua', label: 'Orang Tua & Wali', icon: UsersIcon },
    { id: 'penunjang', label: 'Data Penunjang & Fisik', icon: FileText },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-zinc-900">
      {/* Dynamic Tab Headers */}
      <div className="flex border-b border-slate-100 dark:border-zinc-800 overflow-x-auto scrollbar-none flex-shrink-0 bg-slate-50/50 dark:bg-zinc-900/50">
        {tabsConfig.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-zinc-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100/50 dark:hover:bg-zinc-800/30'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Form Fields Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Tab 1: Identitas Pribadi */}
        {activeTab === 'identitas' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 mb-4 border-b border-slate-100 dark:border-zinc-800/60 pb-2">
                Identitas Utama Santri
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    name="nama_lengkap"
                    required
                    placeholder="Nama Lengkap sesuai Akta/Ijazah"
                    value={formData.nama_lengkap}
                    onChange={handleInputChange}
                    className={`w-full bg-slate-50 dark:bg-zinc-950 border ${
                      errors.nama_lengkap ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-zinc-800 focus:border-emerald-500'
                    } rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm`}
                  />
                  {errors.nama_lengkap && (
                    <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.nama_lengkap}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Nomor Induk Santri (NIS / NIPD) *
                  </label>
                  <input
                    type="text"
                    name="nis"
                    required
                    disabled={!!selectedSantri}
                    placeholder="Contoh: 2026001"
                    value={formData.nis}
                    onChange={handleInputChange}
                    className={`w-full bg-slate-50 dark:bg-zinc-950 border ${
                      errors.nis ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-zinc-800 focus:border-emerald-500'
                    } rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none disabled:opacity-60 transition-all text-sm`}
                  />
                  {errors.nis && (
                    <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.nis}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Jenis Kelamin *
                  </label>
                  <select
                    name="jenis_kelamin"
                    required
                    value={formData.jenis_kelamin}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  >
                    <option value="">-- Pilih Jenis Kelamin --</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    NISN (Nomor Induk Siswa Nasional) *
                  </label>
                  <input
                    type="text"
                    name="nisn"
                    required
                    placeholder="10 digit angka NISN"
                    value={formData.nisn}
                    onChange={handleInputChange}
                    className={`w-full bg-slate-50 dark:bg-zinc-950 border ${
                      errors.nisn ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-zinc-800 focus:border-emerald-500'
                    } rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm`}
                  />
                  {errors.nisn && (
                    <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.nisn}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    NIK (Nomor Induk Kependudukan) *
                  </label>
                  <input
                    type="text"
                    name="nik"
                    required
                    placeholder="16 digit NIK KTP/KK"
                    value={formData.nik}
                    onChange={handleInputChange}
                    className={`w-full bg-slate-50 dark:bg-zinc-950 border ${
                      errors.nik ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-zinc-800 focus:border-emerald-500'
                    } rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm`}
                  />
                  {errors.nik && (
                    <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.nik}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Nomor Kartu Keluarga (KK)
                  </label>
                  <input
                    type="text"
                    name="no_kk"
                    placeholder="16 digit Nomor KK"
                    value={formData.no_kk}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 mb-4 border-b border-slate-100 dark:border-zinc-800/60 pb-2">
                Kelahiran & Silsilah
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    name="tempat_lahir"
                    placeholder="Kabupaten/Kota Lahir"
                    value={formData.tempat_lahir}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Tanggal Lahir *
                  </label>
                  <input
                    type="date"
                    name="tanggal_lahir"
                    required
                    value={formData.tanggal_lahir}
                    onChange={handleInputChange}
                    className={`w-full bg-slate-50 dark:bg-zinc-950 border ${
                      errors.tanggal_lahir ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-zinc-800 focus:border-emerald-500'
                    } rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm`}
                  />
                  {errors.tanggal_lahir && (
                    <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.tanggal_lahir}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Agama
                  </label>
                  <select
                    name="agama"
                    value={formData.agama}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  >
                    <option value="Islam">Islam</option>
                    <option value="Kristen">Kristen</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Khonghucu">Khonghucu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Anak Ke-berapa
                  </label>
                  <input
                    type="number"
                    name="anak_ke"
                    min="1"
                    placeholder="Contoh: 1"
                    value={formData.anak_ke}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Jml. Saudara Kandung
                  </label>
                  <input
                    type="number"
                    name="jml_saudara_kandung"
                    min="0"
                    placeholder="Jumlah saudara kandung"
                    value={formData.jml_saudara_kandung}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Alamat & Kontak */}
        {activeTab === 'alamat' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-zinc-800/60 pb-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                  Domisili Santri
                </h3>
                {autoFilledBadge && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <Sparkles className="h-3 w-3" /> Auto-fill Wilayah Aktif
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Alamat Jalan / Dusun
                  </label>
                  <textarea
                    name="alamat"
                    rows={2}
                    placeholder="Jalan, Gang, Blok, No Rumah..."
                    value={formData.alamat}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Kode Pos (Ketik 12345, 60111, 67153, 70111, atau 80111)
                  </label>
                  <input
                    type="text"
                    name="kode_pos"
                    placeholder="Kode Pos"
                    value={formData.kode_pos}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Kelurahan / Desa
                  </label>
                  <input
                    type="text"
                    name="kelurahan"
                    placeholder="Kelurahan/Desa"
                    value={formData.kelurahan}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Kecamatan
                  </label>
                  <input
                    type="text"
                    name="kecamatan"
                    placeholder="Kecamatan"
                    value={formData.kecamatan}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    RT
                  </label>
                  <input
                    type="text"
                    name="rt"
                    placeholder="RT"
                    value={formData.rt}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    RW
                  </label>
                  <input
                    type="text"
                    name="rw"
                    placeholder="RW"
                    value={formData.rw}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Nama Dusun
                  </label>
                  <input
                    type="text"
                    name="dusun"
                    placeholder="Nama Dusun"
                    value={formData.dusun}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 mb-4 border-b border-slate-100 dark:border-zinc-800/60 pb-2">
                Kontak & Transportasi
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Jenis Tinggal
                  </label>
                  <select
                    name="jenis_tinggal"
                    value={formData.jenis_tinggal}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  >
                    <option value="Bersama Orang Tua">Bersama Orang Tua</option>
                    <option value="Asrama Pesantren">Asrama Pesantren</option>
                    <option value="Kost">Kost</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Alat Transportasi ke Sekolah
                  </label>
                  <select
                    name="alat_transportasi"
                    value={formData.alat_transportasi}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  >
                    <option value="">-- Pilih --</option>
                    <option value="Jalan Kaki">Jalan Kaki</option>
                    <option value="Sepeda">Sepeda</option>
                    <option value="Sepeda Motor">Sepeda Motor</option>
                    <option value="Mobil">Mobil</option>
                    <option value="Jemputan Sekolah">Jemputan Sekolah</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Jarak Rumah ke Sekolah
                  </label>
                  <select
                    name="jarak_ke_sekolah"
                    value={formData.jarak_ke_sekolah}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  >
                    <option value="">-- Pilih --</option>
                    <option value="Kurang dari 1 km">Kurang dari 1 km</option>
                    <option value="1 - 5 km">1 - 5 km</option>
                    <option value="Lebih dari 5 km">Lebih dari 5 km</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    No. Handphone / WhatsApp
                  </label>
                  <input
                    type="text"
                    name="hp"
                    placeholder="Contoh: 08123456789"
                    value={formData.hp}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Alamat E-Mail
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="contoh@gmail.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Orang Tua & Wali */}
        {activeTab === 'orangtua' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Ayah Section */}
            <div className="bg-slate-50/50 dark:bg-zinc-850/20 p-5 rounded-2xl border border-slate-100 dark:border-zinc-850">
              <h3 className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
                Data Ayah Kandung
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Nama Ayah</label>
                  <input
                    type="text"
                    name="nama_ayah"
                    placeholder="Nama Lengkap Ayah"
                    value={formData.data_ayah.nama}
                    onChange={(e) => handleNestedInputChange('data_ayah', 'nama', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Tahun Lahir</label>
                  <input
                    type="number"
                    name="tahun_lahir_ayah"
                    placeholder="Tahun Lahir Ayah"
                    value={formData.data_ayah.tahun_lahir}
                    onChange={(e) => handleNestedInputChange('data_ayah', 'tahun_lahir', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Pendidikan Terakhir</label>
                  <select
                    name="pendidikan_ayah"
                    value={formData.data_ayah.pendidikan}
                    onChange={(e) => handleNestedInputChange('data_ayah', 'pendidikan', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  >
                    <option value="">-- Pilih --</option>
                    <option value="SD">SD/Sederajat</option>
                    <option value="SMP">SMP/Sederajat</option>
                    <option value="SMA">SMA/Sederajat</option>
                    <option value="D3">D3</option>
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                    <option value="S3">S3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Pekerjaan</label>
                  <input
                    type="text"
                    name="pekerjaan_ayah"
                    placeholder="Pekerjaan Ayah"
                    value={formData.data_ayah.pekerjaan}
                    onChange={(e) => handleNestedInputChange('data_ayah', 'pekerjaan', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Penghasilan Bulanan</label>
                  <select
                    name="penghasilan_ayah"
                    value={formData.data_ayah.penghasilan}
                    onChange={(e) => handleNestedInputChange('data_ayah', 'penghasilan', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  >
                    <option value="">-- Pilih --</option>
                    <option value="Kurang dari 1 Juta">Kurang dari 1 Juta</option>
                    <option value="1 Juta - 3 Juta">1 Juta - 3 Juta</option>
                    <option value="3 Juta - 5 Juta">3 Juta - 5 Juta</option>
                    <option value="Lebih dari 5 Juta">Lebih dari 5 Juta</option>
                    <option value="Tidak Berpenghasilan">Tidak Berpenghasilan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">NIK Ayah</label>
                  <input
                    type="text"
                    name="nik_ayah"
                    placeholder="16 digit NIK Ayah"
                    value={formData.data_ayah.nik}
                    onChange={(e) => handleNestedInputChange('data_ayah', 'nik', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Ibu Section */}
            <div className="bg-slate-50/50 dark:bg-zinc-850/20 p-5 rounded-2xl border border-slate-100 dark:border-zinc-850">
              <h3 className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
                Data Ibu Kandung
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Nama Ibu</label>
                  <input
                    type="text"
                    name="nama_ibu"
                    placeholder="Nama Lengkap Ibu"
                    value={formData.data_ibu.nama}
                    onChange={(e) => handleNestedInputChange('data_ibu', 'nama', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Tahun Lahir</label>
                  <input
                    type="number"
                    name="tahun_lahir_ibu"
                    placeholder="Tahun Lahir Ibu"
                    value={formData.data_ibu.tahun_lahir}
                    onChange={(e) => handleNestedInputChange('data_ibu', 'tahun_lahir', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Pendidikan Terakhir</label>
                  <select
                    name="pendidikan_ibu"
                    value={formData.data_ibu.pendidikan}
                    onChange={(e) => handleNestedInputChange('data_ibu', 'pendidikan', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  >
                    <option value="">-- Pilih --</option>
                    <option value="SD">SD/Sederajat</option>
                    <option value="SMP">SMP/Sederajat</option>
                    <option value="SMA">SMA/Sederajat</option>
                    <option value="D3">D3</option>
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                    <option value="S3">S3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Pekerjaan</label>
                  <input
                    type="text"
                    name="pekerjaan_ibu"
                    placeholder="Pekerjaan Ibu"
                    value={formData.data_ibu.pekerjaan}
                    onChange={(e) => handleNestedInputChange('data_ibu', 'pekerjaan', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Penghasilan Bulanan</label>
                  <select
                    name="penghasilan_ibu"
                    value={formData.data_ibu.penghasilan}
                    onChange={(e) => handleNestedInputChange('data_ibu', 'penghasilan', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  >
                    <option value="">-- Pilih --</option>
                    <option value="Kurang dari 1 Juta">Kurang dari 1 Juta</option>
                    <option value="1 Juta - 3 Juta">1 Juta - 3 Juta</option>
                    <option value="3 Juta - 5 Juta">3 Juta - 5 Juta</option>
                    <option value="Lebih dari 5 Juta">Lebih dari 5 Juta</option>
                    <option value="Tidak Berpenghasilan">Tidak Berpenghasilan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">NIK Ibu</label>
                  <input
                    type="text"
                    name="nik_ibu"
                    placeholder="16 digit NIK Ibu"
                    value={formData.data_ibu.nik}
                    onChange={(e) => handleNestedInputChange('data_ibu', 'nik', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Wali Section */}
            <div className="bg-slate-50/50 dark:bg-zinc-850/20 p-5 rounded-2xl border border-slate-100 dark:border-zinc-850">
              <h3 className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
                Data Wali (Opsional)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Nama Wali</label>
                  <input
                    type="text"
                    name="nama_wali"
                    placeholder="Nama Lengkap Wali"
                    value={formData.data_wali.nama}
                    onChange={(e) => handleNestedInputChange('data_wali', 'nama', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Tahun Lahir</label>
                  <input
                    type="number"
                    name="tahun_lahir_wali"
                    placeholder="Tahun Lahir Wali"
                    value={formData.data_wali.tahun_lahir}
                    onChange={(e) => handleNestedInputChange('data_wali', 'tahun_lahir', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Pendidikan Terakhir</label>
                  <select
                    name="pendidikan_wali"
                    value={formData.data_wali.pendidikan}
                    onChange={(e) => handleNestedInputChange('data_wali', 'pendidikan', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  >
                    <option value="">-- Pilih --</option>
                    <option value="SD">SD/Sederajat</option>
                    <option value="SMP">SMP/Sederajat</option>
                    <option value="SMA">SMA/Sederajat</option>
                    <option value="D3">D3</option>
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                    <option value="S3">S3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Pekerjaan</label>
                  <input
                    type="text"
                    name="pekerjaan_wali"
                    placeholder="Pekerjaan Wali"
                    value={formData.data_wali.pekerjaan}
                    onChange={(e) => handleNestedInputChange('data_wali', 'pekerjaan', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Penghasilan Bulanan</label>
                  <select
                    name="penghasilan_wali"
                    value={formData.data_wali.penghasilan}
                    onChange={(e) => handleNestedInputChange('data_wali', 'penghasilan', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  >
                    <option value="">-- Pilih --</option>
                    <option value="Kurang dari 1 Juta">Kurang dari 1 Juta</option>
                    <option value="1 Juta - 3 Juta">1 Juta - 3 Juta</option>
                    <option value="3 Juta - 5 Juta">3 Juta - 5 Juta</option>
                    <option value="Lebih dari 5 Juta">Lebih dari 5 Juta</option>
                    <option value="Tidak Berpenghasilan">Tidak Berpenghasilan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">NIK Wali</label>
                  <input
                    type="text"
                    name="nik_wali"
                    placeholder="16 digit NIK Wali"
                    value={formData.data_wali.nik}
                    onChange={(e) => handleNestedInputChange('data_wali', 'nik', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Data Penunjang & Fisik */}
        {activeTab === 'penunjang' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 mb-4 border-b border-slate-100 dark:border-zinc-800/60 pb-2">
                Asal Sekolah & Kelas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Sekolah Asal</label>
                  <input
                    type="text"
                    name="sekolah_asal"
                    placeholder="SD/MI Asal Santri"
                    value={formData.sekolah_asal}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Rombel Saat Ini</label>
                  <input
                    type="text"
                    name="rombel_saat_ini"
                    placeholder="Contoh: Kelas VII A"
                    value={formData.rombel_saat_ini}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Pilih Kelas Formal (SMP/SMA)</label>
                  <select
                    name="id_kelas_formal"
                    value={formData.id_kelas_formal}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  >
                    <option value="">-- Belum Memilih Kelas Formal --</option>
                    {kelasList
                      ?.filter((k) => k.sekolah?.kategori === 'Formal')
                      .map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.nama_kelas} ({k.sekolah?.nama_sekolah})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Pilih Kelas Non-Formal (Madrasah Diniyah)</label>
                  <select
                    name="id_kelas_non_formal"
                    value={formData.id_kelas_non_formal}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  >
                    <option value="">-- Belum Memilih Kelas Non-Formal --</option>
                    {kelasList
                      ?.filter((k) => k.sekolah?.kategori === 'Non-Formal')
                      .map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.nama_kelas} ({k.sekolah?.nama_sekolah})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 mb-4 border-b border-slate-100 dark:border-zinc-800/60 pb-2">
                Kondisi Fisik
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Berat Badan (kg)</label>
                  <input
                    type="number"
                    name="berat_badan"
                    placeholder="Berat Badan"
                    value={formData.berat_badan}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Tinggi Badan (cm)</label>
                  <input
                    type="number"
                    name="tinggi_badan"
                    placeholder="Tinggi Badan"
                    value={formData.tinggi_badan}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Lingkar Kepala (cm)</label>
                  <input
                    type="number"
                    name="lingkar_kepala"
                    placeholder="Lingkar Kepala"
                    value={formData.lingkar_kepala}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 mb-4 border-b border-slate-100 dark:border-zinc-800/60 pb-2">
                Administrasi & PIP
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">No. Registrasi Akta Lahir</label>
                  <input
                    type="text"
                    name="no_registrasi_akta_lahir"
                    placeholder="Nomor Akta Lahir"
                    value={formData.no_registrasi_akta_lahir}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">No. SKHUN</label>
                  <input
                    type="text"
                    name="skhun"
                    placeholder="Nomor SKHUN"
                    value={formData.skhun}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>

                {/* KIP / KPS Switches */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl">
                  <div>
                    <label className="block text-xs font-bold text-slate-850 dark:text-zinc-200">Penerima KIP / KPS</label>
                    <p className="text-[10px] text-slate-400">Pilih jika siswa adalah pemegang KIP/KPS</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.penerima_kip_kps}
                    onChange={(e) => handleSwitchChange('penerima_kip_kps', e.target.checked)}
                    className="w-9 h-5 bg-slate-200 dark:bg-zinc-800 rounded-full appearance-none checked:bg-emerald-600 relative cursor-pointer before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-4.5 before:transition-all transition-all duration-200"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl">
                  <div>
                    <label className="block text-xs font-bold text-slate-850 dark:text-zinc-200">Layak PIP</label>
                    <p className="text-[10px] text-slate-400">Pilih jika siswa layak menerima usulan PIP</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.layak_pip}
                    onChange={(e) => handleSwitchChange('layak_pip', e.target.checked)}
                    className="w-9 h-5 bg-slate-200 dark:bg-zinc-800 rounded-full appearance-none checked:bg-emerald-600 relative cursor-pointer before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-4.5 before:transition-all transition-all duration-200"
                  />
                </div>

                {formData.penerima_kip_kps && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Nama Bank Penerima</label>
                      <input
                        type="text"
                        name="bank"
                        placeholder="Contoh: BRI / BNI"
                        value={formData.bank}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">No. Rekening Bank</label>
                      <input
                        type="text"
                        name="no_rekening"
                        placeholder="Nomor rekening KIP"
                        value={formData.no_rekening}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                      />
                    </div>
                  </>
                )}

                {formData.layak_pip && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Alasan Layak PIP</label>
                    <input
                      type="text"
                      name="alasan_layak_pip"
                      placeholder="Contoh: Pemegang PKH / Yatim Piatu"
                      value={formData.alasan_layak_pip}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 mb-4 border-b border-slate-100 dark:border-zinc-800/60 pb-2">
                Asrama & Wali Penghubung
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Kamar Asrama</label>
                  <select
                    name="id_kamar"
                    value={formData.id_kamar}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  >
                    <option value="">-- Belum Di-plot --</option>
                    {kamarList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama_kamar} ({k.gedung})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Akun Wali Penghubung</label>
                  <select
                    name="id_wali"
                    value={formData.id_wali}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  >
                    <option value="">-- Belum Memiliki Akun Wali --</option>
                    {waliList.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.nama_lengkap}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Status Santri</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="alumni">Alumni</option>
                    <option value="mutasi">Mutasi</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Persistent / Sticky Bottom Actions Bar */}
      <div className="sticky bottom-0 z-10 border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-850 text-slate-600 dark:text-zinc-400 rounded-xl font-bold text-xs sm:text-sm transition-colors"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 transition-all duration-200 text-xs sm:text-sm"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Simpan Data
        </button>
      </div>
    </div>
  );
}
