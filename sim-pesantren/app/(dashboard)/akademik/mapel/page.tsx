'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Mapel } from '@/types/database';
import { 
  BookOpen, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Loader2, 
  Search, 
  BookMarked,
  Layers,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';

type KategoriMapel = 'Diniyah/Pesantren' | 'Umum' | 'Kitab Kuning' | 'Bahasa';

export default function MasterMapelPage() {
  const [mapelList, setMapelList] = useState<Mapel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedKategori, setSelectedKategori] = useState<string>('Semua');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedMapel, setSelectedMapel] = useState<Mapel | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    kode_mapel: '',
    nama_mapel: '',
    kategori: 'Diniyah/Pesantren' as KategoriMapel,
    keterangan: '',
  });

  // Fetch data mapel
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mapel')
        .select('*')
        .order('nama_mapel', { ascending: true });

      if (error) throw error;
      setMapelList(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuat master mata pelajaran: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Insert mock data when list is empty to assist user starting out
  const handleInsertInitialData = async () => {
    const initialMapels = [
      { kode_mapel: 'DYN-01', nama_mapel: 'Fiqih', kategori: 'Diniyah/Pesantren', keterangan: 'Pembahasan fiqih madzhab Syafi\'i' },
      { kode_mapel: 'DYN-02', nama_mapel: 'Nahwu', kategori: 'Kitab Kuning', keterangan: 'Kaidah tata bahasa arab Al-Ajurrumiyyah' },
      { kode_mapel: 'DYN-03', nama_mapel: 'Shorof', kategori: 'Kitab Kuning', keterangan: 'Morfologi kata bahasa arab Amtsilah Tasrifiyyah' },
      { kode_mapel: 'DYN-04', nama_mapel: 'Tauhid', kategori: 'Diniyah/Pesantren', keterangan: 'Kajian aqidah ahlussunnah wal jama\'ah' },
      { kode_mapel: 'DYN-05', nama_mapel: 'Hadits', kategori: 'Diniyah/Pesantren', keterangan: 'Kajian hadits Arbain Nawawi' },
      { kode_mapel: 'UMM-01', nama_mapel: 'Matematika', kategori: 'Umum', keterangan: 'Matematika Kurikulum Merdeka' },
      { kode_mapel: 'UMM-02', nama_mapel: 'Bahasa Indonesia', kategori: 'Umum', keterangan: 'Bahasa Indonesia kurikulum nasional' },
      { kode_mapel: 'BHS-01', nama_mapel: 'Bahasa Arab', kategori: 'Bahasa', keterangan: 'Muhadatsah dan percakapan harian arab' },
      { kode_mapel: 'BHS-02', nama_mapel: 'Bahasa Inggris', kategori: 'Bahasa', keterangan: 'English speaking & grammar' },
    ];

    try {
      setIsSubmitting(true);
      const { error } = await supabase.from('mapel').insert(initialMapels);
      if (error) throw error;
      toast.success('Pelajaran percontohan berhasil ditambahkan!');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menambahkan data contoh: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAddModal = () => {
    setSelectedMapel(null);
    setFormData({
      kode_mapel: '',
      nama_mapel: '',
      kategori: 'Diniyah/Pesantren',
      keterangan: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (mapel: Mapel) => {
    setSelectedMapel(mapel);
    setFormData({
      kode_mapel: mapel.kode_mapel,
      nama_mapel: mapel.nama_mapel,
      kategori: mapel.kategori,
      keterangan: mapel.keterangan || '',
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kode_mapel.trim() || !formData.nama_mapel.trim()) {
      toast.error('Kode dan nama pelajaran wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      kode_mapel: formData.kode_mapel.trim().toUpperCase(),
      nama_mapel: formData.nama_mapel.trim(),
      kategori: formData.kategori,
      keterangan: formData.keterangan.trim() || null,
    };

    try {
      if (selectedMapel) {
        // Update
        const { error } = await supabase
          .from('mapel')
          .update(payload)
          .eq('id', selectedMapel.id);

        if (error) throw error;
        toast.success(`Pelajaran "${payload.nama_mapel}" berhasil diperbarui!`);
      } else {
        // Insert
        const { error } = await supabase
          .from('mapel')
          .insert([payload]);

        if (error) throw error;
        toast.success(`Pelajaran "${payload.nama_mapel}" berhasil ditambahkan!`);
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menyimpan mata pelajaran: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus mata pelajaran "${name}"? Semua jadwal pelajaran yang menggunakan subjek ini juga akan terhapus.`)) return;

    try {
      const { error } = await supabase
        .from('mapel')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success(`Pelajaran "${name}" berhasil dihapus.`);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menghapus mata pelajaran: ' + err.message);
    }
  };

  // Filter application
  const filteredMapel = mapelList.filter(m => {
    const matchSearch = m.nama_mapel.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        m.kode_mapel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchKategori = selectedKategori === 'Semua' || m.kategori === selectedKategori;
    return matchSearch && matchKategori;
  });

  return (
    <>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookMarked className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Master Mata Pelajaran
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm mt-1">
            Akademik / Pengelolaan Kurikulum Kurikulum Sekolah & Pesantren
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 text-sm w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Tambah Pelajaran
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
        
        {/* Search */}
        <div className="relative w-full md:max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau kode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-2 text-slate-805 dark:text-zinc-100 placeholder-slate-450 dark:placeholder-zinc-650 focus:outline-none transition-all duration-200 text-xs sm:text-sm"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
          {['Semua', 'Diniyah/Pesantren', 'Kitab Kuning', 'Umum', 'Bahasa'].map((kategori) => (
            <button
              key={kategori}
              onClick={() => setSelectedKategori(kategori)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                selectedKategori === kategori
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-850 hover:bg-slate-100 dark:hover:bg-zinc-900'
              }`}
            >
              {kategori}
            </button>
          ))}
        </div>

      </div>

      {/* Main List Table */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden mb-6">
        
        {loading ? (
          // Loader
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-slate-400 text-sm">Memuat kurikulum pelajaran...</p>
          </div>
        ) : mapelList.length === 0 ? (
          // Empty State with Insert Option
          <div className="py-16 px-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-base text-slate-800 dark:text-white">Belum Ada Pelajaran</h3>
            <p className="text-slate-400 dark:text-zinc-550 text-xs mt-1 max-w-xs mx-auto">
              Daftar mata pelajaran masih kosong. Klik di bawah ini untuk membuat data pelajaran pesantren percontohan secara otomatis.
            </p>
            <button
              onClick={handleInsertInitialData}
              disabled={isSubmitting}
              className="mt-4 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Isi Data Contoh
            </button>
          </div>
        ) : filteredMapel.length === 0 ? (
          // Search Empty
          <div className="py-10 text-center text-slate-400 text-sm italic">
            Tidak ditemukan mata pelajaran yang cocok.
          </div>
        ) : (
          // Grid View
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-550 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6 w-28">Kode</th>
                  <th className="py-4 px-6 w-56">Nama Pelajaran</th>
                  <th className="py-4 px-6 w-44">Kategori</th>
                  <th className="py-4 px-6">Keterangan</th>
                  <th className="py-4 px-6 text-right w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-sm text-slate-700 dark:text-zinc-300">
                {filteredMapel.map((mapel) => (
                  <tr key={mapel.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 transition-all duration-200">
                    <td className="py-4 px-6 font-mono text-xs font-bold text-slate-500">{mapel.kode_mapel}</td>
                    <td className="py-4 px-6 font-extrabold text-slate-900 dark:text-white">{mapel.nama_mapel}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase border ${
                          mapel.kategori === 'Diniyah/Pesantren'
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50'
                            : mapel.kategori === 'Kitab Kuning'
                            ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50'
                            : mapel.kategori === 'Bahasa'
                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50'
                            : 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/50'
                        }`}
                      >
                        {mapel.kategori}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-400 max-w-xs truncate" title={mapel.keterangan || ''}>
                      {mapel.keterangan || '-'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(mapel)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-emerald-600 rounded-lg transition-colors text-slate-400"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(mapel.id, mapel.nama_mapel)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-rose-600 rounded-lg transition-colors text-slate-400"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            <div className="border-b border-slate-150 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedMapel ? 'Edit Mata Pelajaran' : 'Tambah Pelajaran Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
                  Kode Pelajaran *
                </label>
                <input
                  type="text"
                  name="kode_mapel"
                  required
                  placeholder="Contoh: FIQ-01"
                  value={formData.kode_mapel}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-555 uppercase mb-1.5">
                  Nama Mata Pelajaran *
                </label>
                <input
                  type="text"
                  name="nama_mapel"
                  required
                  placeholder="Contoh: Fiqh Ibadah"
                  value={formData.nama_mapel}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
                  Kategori
                </label>
                <select
                  name="kategori"
                  required
                  value={formData.kategori}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                >
                  <option value="Diniyah/Pesantren">Diniyah/Pesantren</option>
                  <option value="Kitab Kuning">Kitab Kuning</option>
                  <option value="Umum">Umum</option>
                  <option value="Bahasa">Bahasa</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
                  Keterangan (Optional)
                </label>
                <textarea
                  name="keterangan"
                  rows={3}
                  placeholder="Deskripsi singkat materi pembelajaran..."
                  value={formData.keterangan}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>

              <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-850 text-slate-600 dark:text-slate-400 rounded-xl font-semibold text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/10"
                >
                  {isSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
}
