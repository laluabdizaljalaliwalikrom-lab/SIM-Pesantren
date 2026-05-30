'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Sekolah, Kelas, Santri } from '@/types/database';
import { 
  School, 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Loader2, 
  ChevronRight, 
  BookOpen, 
  Layers, 
  Info,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

export default function LembagaDashboardPage() {
  const [sekolahList, setSekolahList] = useState<Sekolah[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [filterKategori, setFilterKategori] = useState<'Semua' | 'Formal' | 'Non-Formal'>('Semua');

  // Modals state
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  // Form states
  const [schoolSubmitting, setSchoolSubmitting] = useState(false);
  const [classSubmitting, setClassSubmitting] = useState(false);

  // Selection states for Edit
  const [selectedSchool, setSelectedSchool] = useState<Sekolah | null>(null);
  const [selectedClass, setSelectedClass] = useState<Kelas | null>(null);

  // Active school for detail view
  const [activeSchool, setActiveSchool] = useState<Sekolah | null>(null);

  // Form Data
  const [schoolForm, setSchoolForm] = useState({
    nama_sekolah: '',
    kategori: 'Formal' as 'Formal' | 'Non-Formal'
  });

  const [classForm, setClassForm] = useState({
    nama_kelas: '',
    tingkat: 1
  });

  // Class Members list and search states
  const [selectedClassForMembers, setSelectedClassForMembers] = useState<Kelas | null>(null);
  const [allSantriList, setAllSantriList] = useState<Santri[]>([]);
  const [classMembers, setClassMembers] = useState<Santri[]>([]);
  const [assignSearchTerm, setAssignSearchTerm] = useState('');
  const [membersLoading, setMembersLoading] = useState(false);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch Sekolah
      const { data: sekolahData, error: sekolahErr } = await supabase
        .from('sekolah')
        .select('*')
        .order('nama_sekolah', { ascending: true });

      if (sekolahErr) throw sekolahErr;
      setSekolahList(sekolahData || []);

      // Fetch Kelas
      const { data: kelasData, error: kelasErr } = await supabase
        .from('kelas')
        .select('*')
        .order('tingkat', { ascending: true })
        .order('nama_kelas', { ascending: true });

      if (kelasErr) throw kelasErr;
      setKelasList(kelasData || []);

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal mengambil data dari database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Keep activeSchool updated if lists change
  useEffect(() => {
    if (activeSchool) {
      const updated = sekolahList.find(s => s.id === activeSchool.id);
      if (updated) setActiveSchool(updated);
    }
  }, [sekolahList, activeSchool]);

  // Fetch class members and all santri
  const fetchClassMembers = useCallback(async (kelasId: string, kategori: 'Formal' | 'Non-Formal') => {
    try {
      setMembersLoading(true);
      const queryField = kategori === 'Formal' ? 'id_kelas_formal' : 'id_kelas_non_formal';
      const { data, error } = await supabase
        .from('santri')
        .select('*')
        .eq(queryField, kelasId)
        .order('nama_lengkap', { ascending: true });

      if (error) throw error;
      setClassMembers(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuat daftar anggota kelas: ' + err.message);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const fetchAllSantri = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('santri')
        .select('*')
        .order('nama_lengkap', { ascending: true });

      if (error) throw error;
      setAllSantriList(data || []);
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  // Manage members modal triggers
  const handleOpenMembers = async (kelas: Kelas) => {
    if (!activeSchool) return;
    setSelectedClassForMembers(kelas);
    setIsMembersModalOpen(true);
    setAssignSearchTerm('');
    await fetchAllSantri();
    await fetchClassMembers(kelas.id, activeSchool.kategori);
  };

  const handleAssignSantri = async (santriId: string) => {
    if (!selectedClassForMembers || !activeSchool) return;
    try {
      const queryField = activeSchool.kategori === 'Formal' ? 'id_kelas_formal' : 'id_kelas_non_formal';
      const { error } = await supabase
        .from('santri')
        .update({ [queryField]: selectedClassForMembers.id })
        .eq('id', santriId);

      if (error) throw error;
      toast.success('Berhasil menambahkan santri ke kelas.');
      await fetchClassMembers(selectedClassForMembers.id, activeSchool.kategori);
      await fetchData(); // Refresh class counts on parent list
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menambahkan santri: ' + err.message);
    }
  };

  const handleRemoveSantri = async (santriId: string) => {
    if (!selectedClassForMembers || !activeSchool) return;
    if (!confirm('Apakah Anda yakin ingin mengeluarkan santri ini dari kelas?')) return;
    try {
      const queryField = activeSchool.kategori === 'Formal' ? 'id_kelas_formal' : 'id_kelas_non_formal';
      const { error } = await supabase
        .from('santri')
        .update({ [queryField]: null })
        .eq('id', santriId);

      if (error) throw error;
      toast.success('Berhasil mengeluarkan santri dari kelas.');
      await fetchClassMembers(selectedClassForMembers.id, activeSchool.kategori);
      await fetchData(); // Refresh class counts on parent list
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengeluarkan santri: ' + err.message);
    }
  };

  // School actions handlers
  const handleOpenAddSchool = () => {
    setSelectedSchool(null);
    setSchoolForm({ nama_sekolah: '', kategori: 'Formal' });
    setIsSchoolModalOpen(true);
  };

  const handleOpenEditSchool = (school: Sekolah, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid opening detail modal
    setSelectedSchool(school);
    setSchoolForm({
      nama_sekolah: school.nama_sekolah,
      kategori: school.kategori
    });
    setIsSchoolModalOpen(true);
  };

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolForm.nama_sekolah.trim()) {
      toast.error('Nama sekolah wajib diisi.');
      return;
    }

    setSchoolSubmitting(true);
    try {
      if (selectedSchool) {
        // Edit
        const { error } = await supabase
          .from('sekolah')
          .update({
            nama_sekolah: schoolForm.nama_sekolah.trim(),
            kategori: schoolForm.kategori
          })
          .eq('id', selectedSchool.id);

        if (error) throw error;
        toast.success(`Lembaga "${schoolForm.nama_sekolah}" berhasil diperbarui!`);
      } else {
        // Add
        const { error } = await supabase
          .from('sekolah')
          .insert([{
            nama_sekolah: schoolForm.nama_sekolah.trim(),
            kategori: schoolForm.kategori
          }]);

        if (error) throw error;
        toast.success(`Lembaga "${schoolForm.nama_sekolah}" berhasil ditambahkan!`);
      }
      setIsSchoolModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal menyimpan data lembaga.');
    } finally {
      setSchoolSubmitting(false);
    }
  };

  const handleDeleteSchool = async (school: Sekolah, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Apakah Anda yakin ingin menghapus "${school.nama_sekolah}"? Semua kelas di bawah sekolah ini juga akan terhapus.`)) return;

    try {
      const { error } = await supabase
        .from('sekolah')
        .delete()
        .eq('id', school.id);

      if (error) throw error;
      toast.success(`Lembaga "${school.nama_sekolah}" berhasil dihapus.`);
      if (activeSchool?.id === school.id) {
        setIsDetailModalOpen(false);
        setActiveSchool(null);
      }
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal menghapus lembaga.');
    }
  };

  // Class actions handlers
  const handleOpenAddClass = () => {
    setSelectedClass(null);
    setClassForm({ nama_kelas: '', tingkat: 1 });
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = (kelas: Kelas) => {
    setSelectedClass(kelas);
    setClassForm({
      nama_kelas: kelas.nama_kelas,
      tingkat: kelas.tingkat
    });
    setIsClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classForm.nama_kelas.trim()) {
      toast.error('Nama kelas wajib diisi.');
      return;
    }
    if (!activeSchool) return;

    setClassSubmitting(true);
    try {
      if (selectedClass) {
        // Edit
        const { error } = await supabase
          .from('kelas')
          .update({
            nama_kelas: classForm.nama_kelas.trim(),
            tingkat: Number(classForm.tingkat)
          })
          .eq('id', selectedClass.id);

        if (error) throw error;
        toast.success(`Kelas "${classForm.nama_kelas}" berhasil diperbarui!`);
      } else {
        // Add
        const { error } = await supabase
          .from('kelas')
          .insert([{
            nama_kelas: classForm.nama_kelas.trim(),
            tingkat: Number(classForm.tingkat),
            id_sekolah: activeSchool.id
          }]);

        if (error) throw error;
        toast.success(`Kelas "${classForm.nama_kelas}" berhasil ditambahkan!`);
      }
      setIsClassModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal menyimpan data kelas.');
    } finally {
      setClassSubmitting(false);
    }
  };

  const handleDeleteClass = async (kelas: Kelas) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kelas "${kelas.nama_kelas}"?`)) return;

    try {
      const { error } = await supabase
        .from('kelas')
        .delete()
        .eq('id', kelas.id);

      if (error) throw error;
      toast.success(`Kelas "${kelas.nama_kelas}" berhasil dihapus.`);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal menghapus kelas.');
    }
  };

  const handleSchoolCardClick = (school: Sekolah) => {
    setActiveSchool(school);
    setIsDetailModalOpen(true);
  };

  // Filters application
  const filteredSchools = sekolahList.filter((s) => {
    if (filterKategori === 'Semua') return true;
    return s.kategori === filterKategori;
  });

  // Count classes helper
  const getClassCount = (schoolId: string) => {
    return kelasList.filter((k) => k.id_sekolah === schoolId).length;
  };

  // Get active school classes
  const activeSchoolClasses = activeSchool 
    ? kelasList.filter((k) => k.id_sekolah === activeSchool.id)
    : [];

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen transition-colors duration-300">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Pengelolaan Lembaga & Kelas
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">
            Manajemen unit sekolah formal/non-formal beserta ruang kelas.
          </p>
        </div>
        <button
          onClick={handleOpenAddSchool}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 text-sm w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Tambah Lembaga
        </button>
      </div>

      {/* Filters Area */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {(['Semua', 'Formal', 'Non-Formal'] as const).map((kategori) => (
            <button
              key={kategori}
              onClick={() => setFilterKategori(kategori)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-250 whitespace-nowrap ${
                filterKategori === kategori
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                  : 'bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900'
              }`}
            >
              {kategori}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-400 dark:text-zinc-500 flex items-center gap-1.5 font-medium">
          <Info className="h-4 w-4 text-slate-400" />
          Klik kartu lembaga untuk mengelola daftar kelas.
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        // Premium Skeleton Cards
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 animate-pulse">
              <div className="flex justify-between items-start">
                <div className="h-6 w-20 bg-slate-150 dark:bg-zinc-800 rounded-lg" />
                <div className="h-8 w-8 bg-slate-150 dark:bg-zinc-800 rounded-lg" />
              </div>
              <div className="h-5 w-40 bg-slate-150 dark:bg-zinc-800 rounded" />
              <div className="h-4 w-28 bg-slate-150 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : filteredSchools.length === 0 ? (
        // Empty State
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl py-16 px-4 text-center shadow-sm">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-center shadow-inner mx-auto mb-4">
            <School className="h-8 w-8" />
          </div>
          <h3 className="font-bold text-base text-slate-800 dark:text-white">Belum Ada Lembaga</h3>
          <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1 max-w-xs mx-auto">
            Daftar unit sekolah/lembaga formal & non-formal masih kosong. Silakan tambah data baru.
          </p>
        </div>
      ) : (
        // Dynamic Cards Grid
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchools.map((school) => {
            const numClasses = getClassCount(school.id);
            const isFormal = school.kategori === 'Formal';
            return (
              <div
                key={school.id}
                onClick={() => handleSchoolCardClick(school)}
                className="group relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all duration-300 transform hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between h-48"
              >
                <div className="space-y-4">
                  {/* Category badge & Action Controls */}
                  <div className="flex justify-between items-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wide uppercase border ${
                        isFormal
                          ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20'
                          : 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-500/20'
                      }`}
                    >
                      {school.kategori}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleOpenEditSchool(school, e)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-emerald-600 text-slate-400 rounded-lg transition-colors"
                        title="Edit Lembaga"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSchool(school, e)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-rose-600 text-slate-400 rounded-lg transition-colors"
                        title="Hapus Lembaga"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title info */}
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                      {school.nama_sekolah}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Terdaftar: {new Date(school.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Bottom specs */}
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-zinc-800/80 pt-4 mt-auto">
                  <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-emerald-500" />
                    {numClasses} Kelas terdaftar
                  </span>
                  <span className="text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-all">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sekolah Add/Edit Modal */}
      {isSchoolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsSchoolModalOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all flex flex-col">
            
            {/* Header */}
            <div className="border-b border-slate-150 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedSchool ? 'Edit Data Lembaga' : 'Tambah Lembaga Baru'}
              </h3>
              <button onClick={() => setIsSchoolModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSchool} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Nama Lembaga / Sekolah *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: SMP Islam Antigravity"
                  value={schoolForm.nama_sekolah}
                  onChange={(e) => setSchoolForm(prev => ({ ...prev, nama_sekolah: e.target.value }))}
                  required
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Kategori Pendidikan *
                </label>
                <select
                  value={schoolForm.kategori}
                  onChange={(e) => setSchoolForm(prev => ({ ...prev, kategori: e.target.value as any }))}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                >
                  <option value="Formal">Formal</option>
                  <option value="Non-Formal">Non-Formal</option>
                </select>
              </div>

              {/* Actions */}
              <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSchoolModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-850 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-xs sm:text-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={schoolSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/10"
                >
                  {schoolSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* School Detail & Classes Modal (CRUD Kelas inside) */}
      {isDetailModalOpen && activeSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden transform transition-all flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="border-b border-slate-150 dark:border-zinc-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Detail {activeSchool.nama_sekolah}
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {activeSchool.kategori}
                  </span>
                </div>
                <p className="text-slate-400 dark:text-zinc-500 text-xs mt-0.5">Kelola kelas-kelas di bawah unit sekolah ini.</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* List & Controls */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                  Daftar Kelas ({activeSchoolClasses.length})
                </h4>
                <button
                  onClick={handleOpenAddClass}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-sm hover:shadow transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Kelas
                </button>
              </div>

              {/* Class List Table */}
              <div className="border border-slate-200 dark:border-zinc-850 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-850 text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 w-28">Tingkat</th>
                      <th className="py-3 px-4">Nama Kelas</th>
                      <th className="py-3 px-4 text-right w-32">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-xs sm:text-sm text-slate-700 dark:text-zinc-300">
                    {activeSchoolClasses.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-10 text-center text-slate-400 dark:text-zinc-650">
                          Belum ada kelas terdaftar di sekolah ini.
                        </td>
                      </tr>
                    ) : (
                      activeSchoolClasses.map((kelas) => (
                        <tr key={kelas.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-850/20 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">Tingkat {kelas.tingkat}</td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{kelas.nama_kelas}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenMembers(kelas)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-emerald-600 text-slate-400 rounded-lg transition-colors"
                                title="Kelola Anggota Kelas"
                              >
                                <Users className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEditClass(kelas)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-emerald-600 text-slate-400 rounded-lg transition-colors"
                                title="Edit Kelas"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteClass(kelas)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-rose-600 text-slate-400 rounded-lg transition-colors"
                                title="Hapus Kelas"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Kelas Add/Edit Modal (Nested) */}
      {isClassModalOpen && activeSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsClassModalOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden transform transition-all flex flex-col z-55">
            
            <div className="border-b border-slate-150 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedClass ? 'Edit Kelas' : `Tambah Kelas di ${activeSchool.nama_sekolah}`}
              </h3>
              <button onClick={() => setIsClassModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Tingkat Kelas *
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 7"
                  value={classForm.tingkat}
                  onChange={(e) => setClassForm(prev => ({ ...prev, tingkat: Number(e.target.value) }))}
                  required
                  min={1}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Nama Ruang Kelas *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Kelas VII A"
                  value={classForm.nama_kelas}
                  onChange={(e) => setClassForm(prev => ({ ...prev, nama_kelas: e.target.value }))}
                  required
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                />
              </div>

              <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-850 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-xs sm:text-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={classSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/10"
                >
                  {classSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Class Members Modal */}
      {isMembersModalOpen && selectedClassForMembers && activeSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsMembersModalOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transform transition-all flex flex-col max-h-[80vh]">
            
            {/* Header */}
            <div className="border-b border-slate-150 dark:border-zinc-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Kelola Anggota Kelas: {selectedClassForMembers.nama_kelas}
                </h3>
                <p className="text-slate-400 dark:text-zinc-500 text-xs mt-0.5">
                  Lembaga: {activeSchool.nama_sekolah} &bull; Kategori: {activeSchool.kategori}
                </p>
              </div>
              <button onClick={() => setIsMembersModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              
              {/* Add Student Section */}
              <div className="space-y-3 bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Tambah Santri ke Kelas</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari berdasarkan nama atau NIS..."
                    value={assignSearchTerm}
                    onChange={(e) => setAssignSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm"
                  />
                  {assignSearchTerm.trim() !== '' && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 max-h-48 overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-20 divide-y divide-slate-100 dark:divide-zinc-800">
                      {allSantriList
                        .filter(s => {
                          const isMember = classMembers.some(m => m.id === s.id);
                          if (isMember) return false;
                          return s.nama_lengkap.toLowerCase().includes(assignSearchTerm.toLowerCase()) || s.nis.includes(assignSearchTerm);
                        })
                        .length === 0 ? (
                        <div className="p-3 text-xs text-slate-400 text-center italic">Tidak ada santri yang cocok atau belum terdaftar</div>
                      ) : (
                        allSantriList
                          .filter(s => {
                            const isMember = classMembers.some(m => m.id === s.id);
                            if (isMember) return false;
                            return s.nama_lengkap.toLowerCase().includes(assignSearchTerm.toLowerCase()) || s.nis.includes(assignSearchTerm);
                          })
                          .map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                handleAssignSantri(s.id);
                                setAssignSearchTerm('');
                              }}
                              className="w-full text-left p-3 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-xs flex justify-between items-center transition-colors group"
                            >
                              <div>
                                <p className="font-bold text-slate-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{s.nama_lengkap}</p>
                                <p className="text-[10px] text-slate-450 dark:text-zinc-500 font-mono">NIS: {s.nis}</p>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                                + Tambahkan
                              </span>
                            </button>
                          ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Member List */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Anggota Kelas Saat Ini</h4>
                <div className="border border-slate-200 dark:border-zinc-850 rounded-xl overflow-hidden max-h-[30vh] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-850 text-slate-400 dark:text-zinc-550 text-[10px] font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-4">Nama Santri</th>
                        <th className="py-2.5 px-4 w-28">NIS</th>
                        <th className="py-2.5 px-4 text-right w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-slate-700 dark:text-zinc-300">
                      {membersLoading ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-slate-455">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto text-emerald-500" />
                          </td>
                        </tr>
                      ) : classMembers.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-slate-400 dark:text-zinc-600 italic">
                            Belum ada santri terdaftar di kelas ini.
                          </td>
                        </tr>
                      ) : (
                        classMembers.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-850/20 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{s.nama_lengkap}</td>
                            <td className="py-2.5 px-4 font-mono text-xs">{s.nis}</td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveSantri(s.id)}
                                className="px-2 py-1 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 rounded-lg text-xs font-bold transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20"
                              >
                                Keluarkan
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex justify-end bg-slate-50/50 dark:bg-zinc-900/50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsMembersModalOpen(false)}
                className="px-5 py-2.5 bg-white dark:bg-zinc-850 border border-slate-205 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl font-bold text-xs sm:text-sm transition-colors"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
