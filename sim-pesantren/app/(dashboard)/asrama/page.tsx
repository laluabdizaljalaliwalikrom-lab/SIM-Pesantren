'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Kamar, Santri, Gedung } from '@/types/database';
import { 
  Home, 
  Users, 
  UserCheck, 
  Search, 
  X, 
  Loader2, 
  AlertCircle, 
  ArrowLeftRight, 
  Plus, 
  Info,
  ChevronRight,
  Edit2,
  Trash2,
  Building,
  FileText,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { moveSantriToKamar } from '@/services/kamar-actions';
import { LogPerpindahanKamar } from '@/types/database';

export default function AsramaDashboardPage() {
  const [kamarList, setKamarList] = useState<Kamar[]>([]);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [gedungList, setGedungList] = useState<Gedung[]>([]);
  const [logsList, setLogsList] = useState<LogPerpindahanKamar[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Tab views state
  const [activeTab, setActiveTab] = useState<'kamar' | 'denah' | 'log'>('kamar');

  // Filter states
  const [selectedGedung, setSelectedGedung] = useState<string>('Semua');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Penuh' | 'Tersedia' | 'Kosong'>('Semua');

  // Kelola/Plotting Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedKamar, setSelectedKamar] = useState<Kamar | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [selectedSantriForTransfer, setSelectedSantriForTransfer] = useState<string[]>([]);

  // Room CRUD Form Modal states
  const [isRoomFormModalOpen, setIsRoomFormModalOpen] = useState(false);
  const [selectedRoomForEdit, setSelectedRoomForEdit] = useState<Kamar | null>(null);
  const [roomFormSubmitting, setRoomFormSubmitting] = useState(false);
  const [roomForm, setRoomForm] = useState({
    nama_kamar: '',
    id_gedung: '',
    kapasitas: 10
  });

  // Gedung CRUD Modal states
  const [isGedungModalOpen, setIsGedungModalOpen] = useState(false);
  const [selectedGedungForEdit, setSelectedGedungForEdit] = useState<Gedung | null>(null);
  const [gedungFormSubmitting, setGedungFormSubmitting] = useState(false);
  const [gedungForm, setGedungForm] = useState({
    nama_gedung: '',
    kategori_gender: 'L' as 'L' | 'P' | 'LP',
    keterangan: ''
  });

  // Fetch Kamar, Santri, Gedung & Logs
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch Gedung
      const { data: gedungData, error: gedungErr } = await supabase
        .from('gedung')
        .select('*')
        .order('nama_gedung', { ascending: true });

      if (gedungErr) throw gedungErr;
      setGedungList(gedungData || []);

      // Fetch Kamar
      const { data: kamarData, error: kamarErr } = await supabase
        .from('kamar')
        .select('*')
        .order('nama_kamar', { ascending: true });

      if (kamarErr) throw kamarErr;
      setKamarList(kamarData || []);

      // Fetch Santri
      const { data: santriData, error: santriErr } = await supabase
        .from('santri')
        .select('*')
        .order('nama_lengkap', { ascending: true });

      if (santriErr) throw santriErr;
      setSantriList(santriData || []);

      // Fetch Logs
      const { data: logsData, error: logsErr } = await supabase
        .from('log_perpindahan_kamar')
        .select(`
          id,
          id_santri,
          id_kamar_asal,
          id_kamar_tujuan,
          tanggal_pindah,
          keterangan,
          santri:id_santri(id, nama_lengkap, nis),
          kamar_asal:id_kamar_asal(id, nama_kamar, gedung),
          kamar_tujuan:id_kamar_tujuan(id, nama_kamar, gedung)
        `)
        .order('tanggal_pindah', { ascending: false });

      if (logsErr) throw logsErr;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLogsList((logsData || []) as any);

    } catch (err: any) {
      console.error('Error fetching dormitory data:', err);
      toast.error(err.message || 'Gagal memuat data asrama.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Mock supervisors generator based on room names for visual completeness
  const getPengasuh = (kamarId: string) => {
    const hash = kamarId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const supervisors = ['Ustadz Ahmad Rofi\'i', 'Ustadz Budi Santoso', 'Ustadz Hilman Hakim', 'Ustadz M. Ridwan', 'Ustadz Yusuf Mansur'];
    return supervisors[hash % supervisors.length];
  };

  // Get occupants in a specific room
  const getOccupants = (kamarId: string) => {
    return santriList.filter(s => s.id_kamar === kamarId);
  };

  // Extract unique building names (use names from gedung table, fallback to unmatched names in kamar)
  const uniqueGedungList = [
    'Semua',
    ...Array.from(new Set([
      ...gedungList.map(g => g.nama_gedung),
      ...kamarList.map(k => k.gedung).filter(Boolean)
    ]))
  ];

  // Filtering Rooms
  const filteredKamarList = kamarList.filter(k => {
    // 1. Gedung Filter
    if (selectedGedung !== 'Semua' && k.gedung !== selectedGedung) return false;

    // 2. Status Filter
    const occupants = getOccupants(k.id);
    const isFull = occupants.length >= k.kapasitas;
    const isEmpty = occupants.length === 0;

    if (statusFilter === 'Penuh') return isFull;
    if (statusFilter === 'Kosong') return isEmpty;
    if (statusFilter === 'Tersedia') return !isFull && !isEmpty;

    return true;
  });

  // Open Room Form Modal (Add)
  const handleOpenAddRoomModal = () => {
    setSelectedRoomForEdit(null);
    setRoomForm({
      nama_kamar: '',
      id_gedung: gedungList[0]?.id || '',
      kapasitas: 10
    });
    setIsRoomFormModalOpen(true);
  };

  // Open Room Form Modal (Edit)
  const handleOpenEditRoomModal = (kamar: Kamar, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRoomForEdit(kamar);
    setRoomForm({
      nama_kamar: kamar.nama_kamar,
      id_gedung: kamar.id_gedung || '',
      kapasitas: kamar.kapasitas
    });
    setIsRoomFormModalOpen(true);
  };

  // Save Room (Add / Edit)
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.nama_kamar.trim()) {
      toast.error('Nama kamar tidak boleh kosong');
      return;
    }
    if (!roomForm.id_gedung) {
      toast.error('Gedung/Asrama harus dipilih');
      return;
    }
    if (roomForm.kapasitas <= 0) {
      toast.error('Kapasitas harus lebih besar dari 0');
      return;
    }

    const selectedG = gedungList.find(g => g.id === roomForm.id_gedung);
    const gedungName = selectedG ? selectedG.nama_gedung : '';

    setRoomFormSubmitting(true);
    try {
      if (selectedRoomForEdit) {
        // Update existing room
        const { error } = await supabase
          .from('kamar')
          .update({
            nama_kamar: roomForm.nama_kamar,
            id_gedung: roomForm.id_gedung,
            gedung: gedungName,
            kapasitas: roomForm.kapasitas
          })
          .eq('id', selectedRoomForEdit.id);

        if (error) throw error;
        toast.success('Kamar berhasil diperbarui!');
      } else {
        // Add new room
        const { error } = await supabase
          .from('kamar')
          .insert([
            {
              nama_kamar: roomForm.nama_kamar,
              id_gedung: roomForm.id_gedung,
              gedung: gedungName,
              kapasitas: roomForm.kapasitas
            }
          ]);

        if (error) throw error;
        toast.success('Kamar baru berhasil ditambahkan!');
      }

      setIsRoomFormModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menyimpan kamar: ' + err.message);
    } finally {
      setRoomFormSubmitting(false);
    }
  };

  // Delete Room
  const handleDeleteRoom = async (kamar: Kamar, e: React.MouseEvent) => {
    e.stopPropagation();
    const occupants = getOccupants(kamar.id);
    if (occupants.length > 0) {
      toast.error(`Kamar tidak bisa dihapus karena masih berisi ${occupants.length} santri.`);
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus Kamar ${kamar.nama_kamar}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('kamar')
        .delete()
        .eq('id', kamar.id);

      if (error) throw error;
      toast.success('Kamar berhasil dihapus!');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menghapus kamar: ' + err.message);
    }
  };

  // Open Gedung CRUD modal (Add)
  const handleOpenAddGedungModal = () => {
    setSelectedGedungForEdit(null);
    setGedungForm({
      nama_gedung: '',
      kategori_gender: 'L',
      keterangan: ''
    });
    setIsGedungModalOpen(true);
  };

  // Open Gedung CRUD modal (Edit)
  const handleOpenEditGedungModal = (gedung: Gedung) => {
    setSelectedGedungForEdit(gedung);
    setGedungForm({
      nama_gedung: gedung.nama_gedung,
      kategori_gender: gedung.kategori_gender || 'L',
      keterangan: gedung.keterangan || ''
    });
  };

  // Save Gedung (Add / Edit)
  const handleSaveGedung = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gedungForm.nama_gedung.trim()) {
      toast.error('Nama gedung tidak boleh kosong');
      return;
    }

    setGedungFormSubmitting(true);
    try {
      if (selectedGedungForEdit) {
        const { error } = await supabase
          .from('gedung')
          .update({
            nama_gedung: gedungForm.nama_gedung,
            kategori_gender: gedungForm.kategori_gender,
            keterangan: gedungForm.keterangan
          })
          .eq('id', selectedGedungForEdit.id);

        if (error) throw error;
        toast.success('Gedung berhasil diperbarui!');
      } else {
        const { error } = await supabase
          .from('gedung')
          .insert([
            {
              nama_gedung: gedungForm.nama_gedung,
              kategori_gender: gedungForm.kategori_gender,
              keterangan: gedungForm.keterangan
            }
          ]);

        if (error) throw error;
        toast.success('Gedung baru berhasil ditambahkan!');
      }

      setGedungForm({ nama_gedung: '', kategori_gender: 'L', keterangan: '' });
      setSelectedGedungForEdit(null);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menyimpan gedung: ' + err.message);
    } finally {
      setGedungFormSubmitting(false);
    }
  };

  // Delete Gedung
  const handleDeleteGedung = async (gedung: Gedung) => {
    // Check if any room is inside this building
    const roomsInBuilding = kamarList.filter(k => k.id_gedung === gedung.id);
    if (roomsInBuilding.length > 0) {
      toast.error(`Gedung tidak bisa dihapus karena masih menampung ${roomsInBuilding.length} kamar.`);
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus Gedung ${gedung.nama_gedung}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('gedung')
        .delete()
        .eq('id', gedung.id);

      if (error) throw error;
      toast.success('Gedung berhasil dihapus!');
      await fetchData();
      if (selectedGedungForEdit?.id === gedung.id) {
        setSelectedGedungForEdit(null);
        setGedungForm({ nama_gedung: '', kategori_gender: 'L', keterangan: '' });
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menghapus gedung: ' + err.message);
    }
  };

  // Get the gender category of the currently selected room's building
  const selectedKamarGender = selectedKamar
    ? gedungList.find(g => g.id === selectedKamar.id_gedung)?.kategori_gender || 'LP'
    : 'LP';

  // Plot/Move occupant triggers
  const handleOpenModal = (kamar: Kamar) => {
    setSelectedKamar(kamar);
    setModalSearchTerm('');
    setSelectedSantriForTransfer([]);
    setIsModalOpen(true);
  };

  const handleAssignToKamar = async (santriId: string, kamarId: string | null) => {
    setModalSubmitting(true);
    try {
      const { error } = await supabase
        .from('santri')
        .update({ id_kamar: kamarId })
        .eq('id', santriId);

      if (error) throw error;
      toast.success(kamarId ? 'Santri berhasil di-plot ke kamar!' : 'Santri berhasil dikeluarkan dari kamar.');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memperbarui kamar santri: ' + err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  // Bulk assignment using moveSantriToKamar Server Action
  const handleBulkAssign = async () => {
    if (!selectedKamar) return;
    if (selectedSantriForTransfer.length === 0) {
      toast.error('Pilih minimal satu santri untuk dipindahkan.');
      return;
    }

    setModalSubmitting(true);
    try {
      const result = await moveSantriToKamar(selectedSantriForTransfer, selectedKamar.id);
      if (result.success) {
        toast.success(result.message);
        setSelectedSantriForTransfer([]);
        setModalSearchTerm('');
        await fetchData();
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal melakukan plotting massal.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Toggle student selection for transfer
  const toggleSantriSelection = (santriId: string) => {
    setSelectedSantriForTransfer(prev => 
      prev.includes(santriId) ? prev.filter(id => id !== santriId) : [...prev, santriId]
    );
  };

  // Filter assignable santri inside modal (with gender validation)
  const modalFilteredSantri = santriList.filter(s => {
    if (selectedKamar && s.id_kamar === selectedKamar.id) return false; // Already in this room
    // Gender filter: if building is exclusively for one gender, only show matching students
    if (selectedKamarGender !== 'LP' && s.jenis_kelamin && s.jenis_kelamin !== selectedKamarGender) return false;
    if (modalSearchTerm.trim() === '') {
      return !s.id_kamar; // Show only students who do not have any room by default
    }
    return s.nama_lengkap.toLowerCase().includes(modalSearchTerm.toLowerCase()) || s.nis.includes(modalSearchTerm);
  });

  // Calculate statistics
  const totalOccupants = santriList.filter(s => s.id_kamar).length;
  const totalKamarCount = kamarList.length;
  const totalCapacity = kamarList.reduce((acc, k) => acc + k.kapasitas, 0);

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen transition-colors duration-300">
      
      {/* Header section with Stats Banner */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Status Hunian Asrama
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">
              Pantau sebaran kamar, kapasitas asrama, dan plot santri secara instan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/asrama/absensi-sholat"
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20 hover:bg-emerald-100/55 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all duration-200"
            >
              <UserCheck className="h-4 w-4" /> Absensi Sholat
            </Link>
            <Link
              href="/asrama/perizinan"
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all duration-200"
            >
              <FileText className="h-4 w-4" /> Perizinan Santri
            </Link>
            <Link
              href="/asrama/pelanggaran"
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all duration-200"
            >
              <ShieldAlert className="h-4 w-4" /> Poin Pelanggaran
            </Link>
            <button
              onClick={() => setIsGedungModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all duration-200"
            >
              <Building className="h-4 w-4" /> Kelola Gedung
            </button>
            <button
              onClick={handleOpenAddRoomModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/10 transition-all duration-200"
            >
              <Plus className="h-4 w-4" /> Tambah Kamar
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/10 shadow-sm flex-shrink-0">
              <Home className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Total Kamar</p>
              <h3 className="text-xl font-extrabold text-slate-850 dark:text-white mt-0.5">{totalKamarCount} Kamar</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-500/5 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-500/10 shadow-sm flex-shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Santri Di Asrama</p>
              <h3 className="text-xl font-extrabold text-slate-850 dark:text-white mt-0.5">{totalOccupants} / {totalCapacity} Santri</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-500/10 shadow-sm flex-shrink-0">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Sisa Slot Tersedia</p>
              <h3 className="text-xl font-extrabold text-slate-850 dark:text-white mt-0.5">{totalCapacity - totalOccupants} Slot</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Tab Section */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm space-y-4">
        {/* Building Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Gedung / Asrama</label>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            {uniqueGedungList.map((gedung) => (
              <button
                key={gedung}
                onClick={() => setSelectedGedung(gedung)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                  selectedGedung === gedung
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                    : 'bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100/60 dark:hover:bg-zinc-900'
                }`}
              >
                {gedung === 'Semua' ? 'Semua Gedung' : gedung}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            {(['Semua', 'Penuh', 'Tersedia', 'Kosong'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                  statusFilter === status
                    ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-450 border border-emerald-200/50 dark:border-emerald-500/20'
                    : 'bg-white dark:bg-zinc-900 text-slate-550 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850'
                }`}
              >
                {status === 'Semua' ? 'Semua Status' : status === 'Penuh' ? 'Kamar Penuh' : status === 'Tersedia' ? 'Tersedia' : 'Kosong'}
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
            <Info className="h-4 w-4 text-slate-400" />
            Warna bar asrama berubah menjadi merah jika tingkat keterisian penuh.
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-1.5 shadow-sm">
        {(['kamar', 'denah', 'log'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === tab
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
            }`}
          >
            {tab === 'kamar' ? '🏠 Daftar Kamar' : tab === 'denah' ? '🗺️ Denah Visual' : '📋 Log Perpindahan'}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: Daftar Kamar */}
      {activeTab === 'kamar' && (
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 animate-pulse">
                <div className="flex justify-between items-start">
                  <div className="h-5 w-24 bg-slate-100 dark:bg-zinc-800 rounded" />
                  <div className="h-4 w-12 bg-slate-100 dark:bg-zinc-800 rounded-full" />
                </div>
                <div className="space-y-1">
                  <div className="h-3 w-16 bg-slate-100 dark:bg-zinc-800 rounded" />
                  <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-4 w-20 bg-slate-100 dark:bg-zinc-800 rounded" />
                  <div className="h-4 w-28 bg-slate-100 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredKamarList.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl py-16 px-4 text-center shadow-sm">
            <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-center shadow-inner mx-auto mb-4">
              <Home className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-base text-slate-800 dark:text-white">Tidak Ada Kamar Cocok</h3>
            <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1 max-w-xs mx-auto">
              Tidak ada kamar yang memenuhi kriteria filter saat ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredKamarList.map((kamar) => {
              const occupants = getOccupants(kamar.id);
              const occupancyRate = occupants.length;
              const capacity = kamar.kapasitas;
              const pct = Math.min((occupancyRate / capacity) * 100, 100);
              const isFull = occupancyRate >= capacity;
              const supervisor = getPengasuh(kamar.id);

              return (
                <div
                  key={kamar.id}
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[270px]"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-base text-slate-850 dark:text-white truncate">
                            Kamar {kamar.nama_kamar}
                          </h3>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => handleOpenEditRoomModal(kamar, e)}
                              className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                              title="Edit Kamar"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteRoom(kamar, e)}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                              title="Hapus Kamar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold uppercase mt-0.5">{kamar.gedung}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                        isFull
                          ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-450 border-rose-200/50 dark:border-rose-500/20'
                          : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-200/50 dark:border-emerald-500/20'
                      }`}>
                        {isFull ? 'Penuh' : `${capacity - occupancyRate} Slot`}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-400 dark:text-zinc-500">Tingkat Keterisian</span>
                        <span className={isFull ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-450'}>
                          {occupancyRate} / {capacity} Santri
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${isFull ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                        Santri ({occupants.length})
                      </p>
                      {occupants.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-zinc-600 italic">Kamar kosong</p>
                      ) : (
                        <div className="space-y-1 max-h-[60px] overflow-hidden">
                          {occupants.slice(0, 3).map((s) => (
                            <p key={s.id} className="text-xs font-bold text-slate-700 dark:text-zinc-350 truncate">
                              &bull; {s.nama_lengkap}
                            </p>
                          ))}
                          {occupants.length > 3 && (
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 italic pl-2">
                              +{occupants.length - 3} santri lainnya
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-3 mt-4 flex items-center justify-between gap-2 flex-shrink-0">
                    <div className="min-w-0">
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Pengasuh</p>
                      <p className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 truncate">{supervisor}</p>
                    </div>
                    <button
                      onClick={() => handleOpenModal(kamar)}
                      className="flex-shrink-0 text-[11px] font-extrabold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors flex items-center gap-0.5"
                    >
                      Kelola <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* TAB CONTENT: Denah Visual */}
      {activeTab === 'denah' && (
        <div className="space-y-8">
          {loading ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-10 text-center animate-pulse">
              <div className="h-6 w-40 bg-slate-100 dark:bg-zinc-800 rounded mx-auto" />
            </div>
          ) : gedungList.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl py-16 px-4 text-center shadow-sm">
              <div className="h-16 w-16 rounded-2xl bg-slate-50 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <Building className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="font-bold text-base text-slate-800 dark:text-white">Belum Ada Gedung</h3>
              <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1">Tambahkan gedung terlebih dahulu untuk melihat denah.</p>
            </div>
          ) : (
            gedungList.map((gedung) => {
              const roomsInGedung = kamarList.filter(k => k.id_gedung === gedung.id);
              const genderLabel = gedung.kategori_gender === 'L' ? '♂ Putra' : gedung.kategori_gender === 'P' ? '♀ Putri' : '⚥ Campuran';
              const genderColor = gedung.kategori_gender === 'L'
                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
                : gedung.kategori_gender === 'P'
                ? 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-500/20'
                : 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20';

              return (
                <div key={gedung.id} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
                  {/* Building Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-950/40">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Building className="h-4 w-4 text-emerald-500" />
                        {gedung.nama_gedung}
                      </h3>
                      {gedung.keterangan && (
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">{gedung.keterangan}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${genderColor}`}>{genderLabel}</span>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">{roomsInGedung.length} Kamar</span>
                    </div>
                  </div>

                  {/* Room Grid (floor plan layout) */}
                  <div className="p-6">
                    {roomsInGedung.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-zinc-600 italic text-center py-4">Belum ada kamar di gedung ini.</p>
                    ) : (
                      <div
                        className="grid gap-3"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}
                      >
                        {roomsInGedung.map((kamar) => {
                          const occupants = getOccupants(kamar.id);
                          const pct = Math.min((occupants.length / kamar.kapasitas) * 100, 100);
                          const isFull = occupants.length >= kamar.kapasitas;
                          const isEmpty = occupants.length === 0;
                          const bgColor = isFull
                            ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/5'
                            : isEmpty
                            ? 'border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60'
                            : 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5';

                          return (
                            <button
                              key={kamar.id}
                              onClick={() => { handleOpenModal(kamar); }}
                              className={`border-2 ${bgColor} rounded-xl p-3 text-left transition-all duration-200 hover:shadow-md hover:scale-[1.02] group`}
                            >
                              <p className="text-[11px] font-extrabold text-slate-800 dark:text-zinc-100 truncate">{kamar.nama_kamar}</p>
                              <div className="mt-2 w-full h-1.5 bg-white/60 dark:bg-zinc-900/60 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${isFull ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <p className={`text-[10px] font-bold mt-1.5 ${
                                isFull ? 'text-rose-600 dark:text-rose-400' : isEmpty ? 'text-slate-400 dark:text-zinc-500' : 'text-emerald-600 dark:text-emerald-400'
                              }`}>
                                {occupants.length}/{kamar.kapasitas} santri
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB CONTENT: Log Perpindahan */}
      {activeTab === 'log' && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-950/40 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Riwayat Perpindahan Kamar</h3>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">Tercatat otomatis setiap kali santri berpindah kamar.</p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
              {logsList.length} Entri
            </span>
          </div>

          {loading ? (
            <div className="p-6 space-y-3 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-zinc-800 rounded-xl" />
              ))}
            </div>
          ) : logsList.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <p className="text-slate-400 dark:text-zinc-600 text-sm italic">Belum ada log perpindahan kamar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-5">Tanggal</th>
                    <th className="py-3 px-5">Nama Santri</th>
                    <th className="py-3 px-5">Dari Kamar</th>
                    <th className="py-3 px-5">Ke Kamar</th>
                    <th className="py-3 px-5">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-700 dark:text-zinc-300">
                  {logsList.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                      <td className="py-3 px-5 font-mono text-[11px] text-slate-500 dark:text-zinc-500 whitespace-nowrap">
                        {new Date(log.tanggal_pindah).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 px-5 font-bold text-slate-900 dark:text-white">
                        {log.santri?.nama_lengkap || '-'}
                        <span className="block text-[10px] font-mono text-slate-400 dark:text-zinc-500">{log.santri?.nis}</span>
                      </td>
                      <td className="py-3 px-5">
                        {log.kamar_asal ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-full text-[10px] font-bold">
                            {log.kamar_asal.gedung ? `${log.kamar_asal.gedung} / ` : ''}{log.kamar_asal.nama_kamar}
                          </span>
                        ) : <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="py-3 px-5">
                        {log.kamar_tujuan ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-full text-[10px] font-bold">
                            {log.kamar_tujuan.gedung ? `${log.kamar_tujuan.gedung} / ` : ''}{log.kamar_tujuan.nama_kamar}
                          </span>
                        ) : <span className="text-slate-400 italic">Dikeluarkan</span>}
                      </td>
                      <td className="py-3 px-5 text-slate-400 dark:text-zinc-500 text-[11px]">
                        {log.keterangan || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Quick Move/Plotting Modal */}
      {isModalOpen && selectedKamar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transform transition-all flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="border-b border-slate-150 dark:border-zinc-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Kelola Kamar {selectedKamar.nama_kamar}
                  </h3>
                  {selectedKamarGender !== 'LP' && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      selectedKamarGender === 'L'
                        ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
                        : 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-500/20'
                    }`}>
                      {selectedKamarGender === 'L' ? '♂ Putra' : '♀ Putri'}
                    </span>
                  )}
                </div>
                <p className="text-slate-400 dark:text-zinc-500 text-xs mt-0.5">
                  Gedung: {selectedKamar.gedung} &bull; Kapasitas: {getOccupants(selectedKamar.id).length} / {selectedKamar.kapasitas} Terisi
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Roster of current occupants */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Santri Di Kamar Ini</h4>
                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-4">Nama Santri</th>
                        <th className="py-2.5 px-4 w-28">NIS</th>
                        <th className="py-2.5 px-4 text-right w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-slate-700 dark:text-zinc-300">
                      {getOccupants(selectedKamar.id).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-slate-400 dark:text-zinc-600 italic">
                            Belum ada santri di kamar ini.
                          </td>
                        </tr>
                      ) : (
                        getOccupants(selectedKamar.id).map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-850/20 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{s.nama_lengkap}</td>
                            <td className="py-2.5 px-4 font-mono text-xs">{s.nis}</td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                type="button"
                                disabled={modalSubmitting}
                                onClick={() => handleAssignToKamar(s.id, null)}
                                className="px-2 py-1 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 rounded-lg text-xs font-bold transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20 disabled:opacity-50"
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

              {/* Add Student Section */}
              <div className="space-y-3 bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Plot Santri Baru ke Kamar Ini</label>
                  {getOccupants(selectedKamar.id).length >= selectedKamar.kapasitas && (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> Kamar Penuh
                    </span>
                  )}
                </div>
                
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ketik nama atau NIS santri untuk mencari..."
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    disabled={getOccupants(selectedKamar.id).length >= selectedKamar.kapasitas}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm disabled:opacity-60"
                  />
                  
                  {/* Suggestions/Search Results Panel */}
                  <div className="mt-3 max-h-56 overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-inner divide-y divide-slate-100 dark:divide-zinc-800">
                    <div className="bg-slate-50/80 dark:bg-zinc-900/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 border-b border-slate-250/60 dark:border-zinc-800/60 flex justify-between">
                      <span>{modalSearchTerm.trim() === '' ? 'Santri Belum Berasrama' : 'Hasil Pencarian'}</span>
                      <span>{modalFilteredSantri.length} Orang</span>
                    </div>
                    {modalFilteredSantri.length === 0 ? (
                      <div className="p-4 text-xs text-slate-400 text-center italic">
                        {modalSearchTerm.trim() === '' ? 'Semua santri sudah memiliki kamar' : 'Tidak ada santri yang cocok'}
                      </div>
                    ) : (
                      <div className="p-1 space-y-1">
                        {modalFilteredSantri.map((s) => {
                          const currentKamar = kamarList.find(k => k.id === s.id_kamar);
                          const isChecked = selectedSantriForTransfer.includes(s.id);
                          return (
                            <div
                              key={s.id}
                              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-850/50 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSantriSelection(s.id)}
                                className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:bg-zinc-900 dark:border-zinc-700"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-slate-850 dark:text-zinc-200">{s.nama_lengkap}</p>
                                <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5">
                                  NIS: {s.nis} &bull; Kamar Saat Ini: {currentKamar ? `Kamar ${currentKamar.nama_kamar}` : 'Belum di-plot'}
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={modalSubmitting}
                                onClick={async () => {
                                  await handleAssignToKamar(s.id, selectedKamar.id);
                                  setModalSearchTerm('');
                                }}
                                className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 px-2 py-1 rounded-md transition-colors hover:bg-emerald-600 hover:text-white flex items-center gap-0.5"
                              >
                                {currentKamar ? <ArrowLeftRight className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                                Plot Langsung
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bulk assign button */}
                {selectedSantriForTransfer.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-zinc-800/60 flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-zinc-400">
                      Terpilih: <strong className="text-slate-800 dark:text-white font-bold">{selectedSantriForTransfer.length} Santri</strong>
                    </span>
                    <button
                      type="button"
                      disabled={modalSubmitting}
                      onClick={handleBulkAssign}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 transition-all disabled:opacity-50"
                    >
                      {modalSubmitting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" />
                      )}
                      Plot Terpilih
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex justify-end bg-slate-50/50 dark:bg-zinc-900/50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl font-bold text-xs sm:text-sm transition-colors"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add / Edit Room Modal */}
      {isRoomFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsRoomFormModalOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            
            {/* Header */}
            <div className="border-b border-slate-150 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedRoomForEdit ? `Edit Kamar ${selectedRoomForEdit.nama_kamar}` : 'Tambah Kamar Baru'}
              </h3>
              <button onClick={() => setIsRoomFormModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSaveRoom}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Nama Kamar</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: A-1, B-12, Al-Farabi"
                    value={roomForm.nama_kamar}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, nama_kamar: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Gedung / Asrama</label>
                  {gedungList.length === 0 ? (
                    <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-200 dark:border-amber-500/20 flex flex-col gap-1">
                      <span>Belum ada data gedung. Silakan tambahkan gedung terlebih dahulu.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRoomFormModalOpen(false);
                          setIsGedungModalOpen(true);
                        }}
                        className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-450 dark:hover:text-emerald-350 font-bold self-start mt-1"
                      >
                        Tambah Gedung &rarr;
                      </button>
                    </div>
                  ) : (
                    <select
                      required
                      value={roomForm.id_gedung}
                      onChange={(e) => setRoomForm(prev => ({ ...prev, id_gedung: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm"
                    >
                      <option value="" disabled>Pilih Gedung</option>
                      {gedungList.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nama_gedung} {g.keterangan ? `(${g.keterangan})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Kapasitas Maksimal (Santri)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={roomForm.kapasitas}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, kapasitas: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex justify-end gap-3 bg-slate-50/50 dark:bg-zinc-900/50">
                <button
                  type="button"
                  onClick={() => setIsRoomFormModalOpen(false)}
                  className="px-5 py-2.5 bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl font-bold text-xs sm:text-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={roomFormSubmitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/10 transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {roomFormSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Simpan Kamar
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Manage Gedung Modal */}
      {isGedungModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsGedungModalOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transform transition-all flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="border-b border-slate-150 dark:border-zinc-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Kelola Gedung / Asrama
              </h3>
              <button onClick={() => setIsGedungModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Form panel */}
              <form onSubmit={handleSaveGedung} className="space-y-4 bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
                <h4 className="font-bold text-xs text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  {selectedGedungForEdit ? 'Edit Gedung' : 'Tambah Gedung Baru'}
                </h4>
                
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-zinc-400 uppercase tracking-wider">Nama Gedung</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Gedung Abu Bakar, Gedung A"
                    value={gedungForm.nama_gedung}
                    onChange={(e) => setGedungForm(prev => ({ ...prev, nama_gedung: e.target.value }))}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-zinc-400 uppercase tracking-wider">Keterangan / Lokasi</label>
                  <input
                    type="text"
                    placeholder="Contoh: Asrama Putra lantai 1"
                    value={gedungForm.keterangan || ''}
                    onChange={(e) => setGedungForm(prev => ({ ...prev, keterangan: e.target.value }))}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-zinc-400 uppercase tracking-wider">Kategori Gender</label>
                  <div className="flex gap-2">
                    {(['L', 'P', 'LP'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGedungForm(prev => ({ ...prev, kategori_gender: g }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          gedungForm.kategori_gender === g
                            ? g === 'L'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : g === 'P'
                              ? 'bg-pink-600 text-white border-pink-600'
                              : 'bg-violet-600 text-white border-violet-600'
                            : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400'
                        }`}
                      >
                        {g === 'L' ? '♂ Putra' : g === 'P' ? '♀ Putri' : '⚥ Campuran'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  {selectedGedungForEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGedungForEdit(null);
                        setGedungForm({ nama_gedung: '', kategori_gender: 'L', keterangan: '' });
                      }}
                      className="px-3.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-bold transition-all hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                      Batal
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={gedungFormSubmitting}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all duration-200 flex items-center gap-1 disabled:opacity-50"
                  >
                    {gedungFormSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                    {selectedGedungForEdit ? 'Perbarui' : 'Tambahkan'}
                  </button>
                </div>
              </form>

              {/* List panel */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Daftar Gedung</h4>
                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-4">Nama Gedung</th>
                        <th className="py-2.5 px-4">Gender</th>
                        <th className="py-2.5 px-4">Keterangan</th>
                        <th className="py-2.5 px-4 text-right w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-slate-700 dark:text-zinc-300">
                      {gedungList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400 dark:text-zinc-500 italic">
                            Belum ada gedung. Silakan tambahkan.
                          </td>
                        </tr>
                      ) : (
                        gedungList.map((g) => (
                          <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-850/20 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{g.nama_gedung}</td>
                            <td className="py-2.5 px-4">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                g.kategori_gender === 'L'
                                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
                                  : g.kategori_gender === 'P'
                                  ? 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-500/20'
                                  : 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20'
                              }`}>
                                {g.kategori_gender === 'L' ? '♂ Putra' : g.kategori_gender === 'P' ? '♀ Putri' : '⚥ Campuran'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4">{g.keterangan || '-'}</td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditGedungModal(g)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800"
                                  title="Edit Gedung"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteGedung(g)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800"
                                  title="Hapus Gedung"
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

            {/* Footer */}
            <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex justify-end bg-slate-50/50 dark:bg-zinc-900/50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsGedungModalOpen(false)}
                className="px-5 py-2.5 bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl font-bold text-xs sm:text-sm transition-colors"
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

