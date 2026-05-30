'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Santri, Kamar, Profile, SantriStatus } from '@/types/database';
import { 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Loader2, 
  AlertTriangle,
  ClipboardList,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { ImportSantriModal } from '@/components/import-santri-modal';
import FormTambahSantri from '@/components/FormTambahSantri';

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

export default function SantriDashboardPage() {
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [kamarList, setKamarList] = useState<Kamar[]>([]);
  const [waliList, setWaliList] = useState<Profile[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);

  const [formData, setFormData] = useState({
    nis: '',
    nama_lengkap: '',
    jenis_kelamin: '' as 'L' | 'P' | '',
    nisn: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    nik: '',
    alamat: '',
    hp: '',
    nama_ayah: '',
    nama_ibu: '',
    rombel_saat_ini: '',
    sekolah_asal: '',
    id_kamar: '',
    id_wali: '',
    status: 'aktif' as SantriStatus,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch Kamar
      const { data: kamarData, error: kamarErr } = await supabase
        .from('kamar')
        .select('*')
        .order('nama_kamar', { ascending: true });

      if (kamarErr) throw kamarErr;
      setKamarList(kamarData || []);

      // Fetch Wali
      const { data: waliData, error: waliErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'wali_santri')
        .order('nama_lengkap', { ascending: true });

      if (waliErr) throw waliErr;
      setWaliList(waliData || []);

      // Fetch Kelas joined with Sekolah info
      const { data: kelasData, error: kelasErr } = await supabase
        .from('kelas')
        .select('*, sekolah:id_sekolah(*)');

      if (kelasErr) throw kelasErr;
      setKelasList(kelasData || []);

      // Fetch Santri with joins
      const { data: santriData, error: santriErr } = await supabase
        .from('santri')
        .select(`
          *,
          kamar:id_kamar (*),
          wali:id_wali (*),
          kelas_formal:id_kelas_formal (*),
          kelas_non_formal:id_kelas_non_formal (*)
        `)
        .order('nama_lengkap', { ascending: true });

      if (santriErr) throw santriErr;
      setSantriList(santriData || []);

    } catch (err: any) {
      console.error('Error fetching data:', err);
      toast.error(err.message || 'Gagal memuat data dari database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenAddModal = () => {
    setSelectedSantri(null);
    setFormData({
      nis: '',
      nama_lengkap: '',
      jenis_kelamin: '',
      nisn: '',
      tempat_lahir: '',
      tanggal_lahir: '',
      nik: '',
      alamat: '',
      hp: '',
      nama_ayah: '',
      nama_ibu: '',
      rombel_saat_ini: '',
      sekolah_asal: '',
      id_kamar: '',
      id_wali: '',
      status: 'aktif',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (santri: Santri) => {
    setSelectedSantri(santri);
    setFormData({
      nis: santri.nis,
      nama_lengkap: santri.nama_lengkap,
      jenis_kelamin: (santri.jenis_kelamin || '') as 'L' | 'P' | '',
      nisn: santri.nisn || '',
      tempat_lahir: santri.tempat_lahir || '',
      tanggal_lahir: santri.tanggal_lahir,
      nik: santri.nik || '',
      alamat: santri.alamat || '',
      hp: santri.hp || '',
      nama_ayah: santri.nama_ayah || '',
      nama_ibu: santri.nama_ibu || '',
      rombel_saat_ini: santri.rombel_saat_ini || '',
      sekolah_asal: santri.sekolah_asal || '',
      id_kamar: santri.id_kamar || '',
      id_wali: santri.id_wali || '',
      status: santri.status,
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      nis: formData.nis,
      nama_lengkap: formData.nama_lengkap,
      jenis_kelamin: formData.jenis_kelamin || null,
      nisn: formData.nisn || null,
      tempat_lahir: formData.tempat_lahir || null,
      tanggal_lahir: formData.tanggal_lahir,
      nik: formData.nik || null,
      alamat: formData.alamat || null,
      hp: formData.hp || null,
      nama_ayah: formData.nama_ayah || null,
      nama_ibu: formData.nama_ibu || null,
      rombel_saat_ini: formData.rombel_saat_ini || null,
      sekolah_asal: formData.sekolah_asal || null,
      id_kamar: formData.id_kamar || null,
      id_wali: formData.id_wali || null,
      status: formData.status,
    };

    try {
      if (selectedSantri) {
        const { error: updateErr } = await supabase
          .from('santri')
          .update(payload)
          .eq('id', selectedSantri.id);

        if (updateErr) throw updateErr;
        toast.success(`Data santri "${formData.nama_lengkap}" berhasil diperbarui!`);
      } else {
        const { error: insertErr } = await supabase
          .from('santri')
          .insert([payload]);

        if (insertErr) throw insertErr;
        toast.success(`Santri "${formData.nama_lengkap}" berhasil ditambahkan!`);
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Error saving:', err);
      toast.error(err.message || 'Gagal menyimpan data santri.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data santri "${name}"?`)) return;

    try {
      const { error: deleteErr } = await supabase
        .from('santri')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;
      toast.success(`Data santri "${name}" berhasil dihapus.`);
      await fetchData();
    } catch (err: any) {
      console.error('Error deleting:', err);
      toast.error(err.message || 'Gagal menghapus data.');
    }
  };

  const filteredList = santriList.filter(
    (s) =>
      s.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nis.includes(searchTerm)
  );

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen transition-colors duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Data Santri
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">
            Grup Dashboard / Pengelolaan Administrasi Santri
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center justify-center gap-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-700 dark:text-zinc-300 font-semibold px-4 py-2.5 rounded-xl transition-all text-sm shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Import Excel
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 text-sm"
          >
            <Plus className="h-4 w-4" />
            Tambah Santri
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau NIS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-2 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none transition-all duration-200 text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6 w-20">Foto</th>
                <th className="py-4 px-6 w-24">NIS</th>
                <th className="py-4 px-6">Nama</th>
                <th className="py-4 px-6">Kamar</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-sm text-slate-700 dark:text-zinc-300">
              {loading ? (
                // Shimmering Skeleton Loader
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-6">
                      <div className="h-9 w-9 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 w-12 bg-slate-100 dark:bg-zinc-800/80 rounded" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 w-40 bg-slate-100 dark:bg-zinc-800/80 rounded" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 w-28 bg-slate-100 dark:bg-zinc-800/80 rounded" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-6 w-16 bg-slate-100 dark:bg-zinc-800/80 rounded-full" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <div className="h-8 w-8 bg-slate-100 dark:bg-zinc-800/80 rounded" />
                        <div className="h-8 w-8 bg-slate-100 dark:bg-zinc-800/80 rounded" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredList.length === 0 ? (
                // Premium Empty State
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-center shadow-inner mb-4">
                        <ClipboardList className="h-8 w-8" />
                      </div>
                      <h3 className="font-bold text-base text-slate-800 dark:text-white">Belum Ada Data Santri</h3>
                      <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1 max-w-xs">
                        Database masih kosong. Silakan tambahkan santri baru dengan menekan tombol diatas.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((santri) => (
                  <tr key={santri.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 transition-all duration-200">
                    <td className="py-4 px-6">
                      <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                        {santri.nama_lengkap.charAt(0)}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-500 dark:text-zinc-500">{santri.nis}</td>
                    <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">{toTitleCase(santri.nama_lengkap)}</td>
                    <td className="py-4 px-6">
                      {santri.kamar ? (
                        <span>
                          {santri.kamar.nama_kamar}{' '}
                          <span className="text-[10px] text-slate-400">({santri.kamar.gedung})</span>
                        </span>
                      ) : (
                        <span className="text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded text-[10px] font-semibold border border-amber-200/30">
                          Belum di-plot
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          santri.status === 'aktif'
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                            : santri.status === 'alumni'
                            ? 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
                            : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                        }`}
                      >
                        {santri.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(santri)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-emerald-600 rounded-lg transition-colors text-slate-400"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(santri.id, santri.nama_lengkap)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-rose-600 rounded-lg transition-colors text-slate-400"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-850">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="p-4 flex gap-4 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-28 bg-slate-100 dark:bg-zinc-800/80 rounded" />
                  <div className="h-3 w-16 bg-slate-100 dark:bg-zinc-800/80 rounded" />
                </div>
              </div>
            ))
          ) : filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-center shadow-inner mb-4">
                <ClipboardList className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">Belum Ada Data Santri</h3>
              <p className="text-slate-400 dark:text-zinc-500 text-[11px] mt-1 max-w-xs">
                Database masih kosong.
              </p>
            </div>
          ) : (
            filteredList.map((santri) => (
              <div key={santri.id} className="p-4 flex gap-4 items-start hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 transition-all">
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 flex items-center justify-center font-bold text-sm uppercase flex-shrink-0">
                  {santri.nama_lengkap.charAt(0)}
                </div>
                
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{toTitleCase(santri.nama_lengkap)}</h4>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        santri.status === 'aktif'
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                          : santri.status === 'alumni'
                          ? 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
                          : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                      }`}
                    >
                      {santri.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-500 font-mono">NIS: {santri.nis}</p>
                  <p className="text-xs text-slate-600 dark:text-zinc-400">
                    Kamar: {santri.kamar ? `${santri.kamar.nama_kamar} (${santri.kamar.gedung})` : 'Belum di-plot'}
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50 dark:border-zinc-800/50 mt-2">
                    <button
                      onClick={() => handleOpenEditModal(santri)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                      <Edit3 className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(santri.id, santri.nama_lengkap)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                      <Trash2 className="h-3 w-3" /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
            <div className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedSantri ? 'Edit Data Santri' : 'Tambah Santri Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <FormTambahSantri
              onClose={() => setIsModalOpen(false)}
              onSuccess={fetchData}
              selectedSantri={selectedSantri}
              kamarList={kamarList}
              waliList={waliList}
              kelasList={kelasList}
            />
          </div>
        </div>
      )}

      {/* Modal Import Excel */}
      <ImportSantriModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={fetchData} 
        kelasList={kelasList}
      />

    </div>
  );
}
