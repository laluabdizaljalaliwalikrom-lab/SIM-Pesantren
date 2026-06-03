'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Santri, PresensiTahfidz } from '@/types/database';
import { 
  BookOpen, 
  Loader2, 
  Search, 
  Settings, 
  BookMarked,
  Award,
  Calendar,
  Layers,
  FileText,
  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  RefreshCw,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import { toast } from 'sonner';
import FormSetoranTahfidz from '@/components/FormSetoranTahfidz';
import * as XLSX from 'xlsx';

type ActiveTab = 'quran' | 'hadits' | 'matan' | 'tahsin' | 'ujian' | 'pengaturan';

interface KitabItem {
  id: string;
  nama_kitab: string;
  jumlah_item: number;
}

export default function TahfidzTracker() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('quran');
  
  // Database States
  const [santriList, setSantriList] = useState<Pick<Santri, 'id' | 'nis' | 'nama_lengkap'>[]>([]);
  const [setoranList, setSetoranList] = useState<PresensiTahfidz[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Search, Sort, Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'terbaru' | 'terlama' | 'default'>('default');
  const [filterType, setFilterType] = useState<string>('semua');

  // Pengaturan (CRUD Kitab) States
  const [haditsList, setHaditsList] = useState<KitabItem[]>([]);
  const [matanList, setMatanList] = useState<KitabItem[]>([]);
  const [loadingPengaturan, setLoadingPengaturan] = useState(false);
  
  // CRUD Form States
  const [newItemType, setNewItemType] = useState<'hadits' | 'matan'>('hadits');
  const [isAdding, setIsAdding] = useState(false);
  const [kitabName, setKitabName] = useState('');
  const [kitabJumlah, setKitabJumlah] = useState<number>(10);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Theme state mockup to match screenshot's toggle
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch active santri
      const { data: santriData, error: santriErr } = await supabase
        .from('santri')
        .select('id, nis, nama_lengkap')
        .eq('status', 'aktif')
        .order('nama_lengkap', { ascending: true });

      if (santriErr) throw santriErr;
      setSantriList(santriData || []);

      // 2. Fetch all setoran
      const { data: tahfidzData, error: tahfidzErr } = await supabase
        .from('presensi_tahfidz')
        .select(`
          *,
          santri:id_santri (nama_lengkap, nis)
        `)
        .order('created_at', { ascending: false });

      if (tahfidzErr) throw tahfidzErr;
      setSetoranList(tahfidzData || []);

    } catch (err: any) {
      console.error('Error fetching tahfidz data:', err);
      toast.error('Gagal memuat data setoran.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Hadits/Matan Kitabs for Pengaturan Tab
  const fetchKitabs = useCallback(async () => {
    try {
      setLoadingPengaturan(true);
      const { data: haditsData } = await supabase
        .from('ref_hadits')
        .select('id, nama_kitab, jumlah_hadits')
        .order('nama_kitab', { ascending: true });
        
      const { data: matanData } = await supabase
        .from('ref_matan')
        .select('id, nama_kitab, jumlah_bait')
        .order('nama_kitab', { ascending: true });

      if (haditsData) {
        setHaditsList(haditsData.map(h => ({ id: h.id, nama_kitab: h.nama_kitab, jumlah_item: h.jumlah_hadits })));
      } else {
        setHaditsList([
          { id: '1', nama_kitab: "Arba'in Nawawi", jumlah_item: 42 },
          { id: '2', nama_kitab: 'Riyadhus Shalihin', jumlah_item: 1896 }
        ]);
      }

      if (matanData) {
        setMatanList(matanData.map(m => ({ id: m.id, nama_kitab: m.nama_kitab, jumlah_item: m.jumlah_bait })));
      } else {
        setMatanList([
          { id: '1', nama_kitab: 'Tuhfatul Athfal', jumlah_item: 61 },
          { id: '2', nama_kitab: 'Al-Jazariyah', jumlah_item: 109 }
        ]);
      }
    } catch (err) {
      console.error('Error fetching kitabs:', err);
    } finally {
      setLoadingPengaturan(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchKitabs();
  }, [fetchData, fetchKitabs]);

  // Tab Filtering logic
  const filteredSetorans = useMemo(() => {
    let result = setoranList.filter(s => s.tipe_setoran === activeTab);

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.santri?.nama_lengkap?.toLowerCase().includes(q));
    }

    // Custom Filters
    if (filterType !== 'semua') {
      if (filterType === 'ziyadah') {
        result = result.filter(s => s.jenis_setoran === 'Ziyadah');
      } else if (filterType === 'murojaah') {
        result = result.filter(s => s.jenis_setoran === 'Murojaah');
      }
    }

    // Sort By
    if (sortBy === 'terbaru') {
      result = [...result].sort((a, b) => new Date(b.tanggal_setoran).getTime() - new Date(a.tanggal_setoran).getTime());
    } else if (sortBy === 'terlama') {
      result = [...result].sort((a, b) => new Date(a.tanggal_setoran).getTime() - new Date(b.tanggal_setoran).getTime());
    }

    return result;
  }, [setoranList, activeTab, searchQuery, sortBy, filterType]);

  // Export handlers
  const handleExportExcel = () => {
    if (filteredSetorans.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    const data = filteredSetorans.map((s, idx) => ({
      No: idx + 1,
      Tanggal: s.tanggal_setoran,
      NIS: s.santri?.nis || '',
      Santri: s.santri?.nama_lengkap || '',
      Penyimak: s.penyimak || '',
      Jenis: s.jenis_setoran || '',
      Detail: s.tipe_setoran === 'quran' ? `Surah ${s.nama_surah} (Ayat ${s.ayat_mulai || 1}-${s.ayat_terakhir})` :
              s.tipe_setoran === 'hadits' ? `Kitab ${s.kitab_hadits_matan} (Hadits ke ${s.hadits_ke || s.ayat_terakhir})` :
              s.tipe_setoran === 'matan' ? `Matan ${s.kitab_hadits_matan} (Bait ${s.ayat_mulai || 1}-${s.ayat_terakhir})` :
              s.tipe_setoran === 'tahsin' ? `Tahsin Jilid ${s.juz} Hal. ${s.ayat_terakhir}` : `Ujian: ${s.materi_ujian || s.nama_surah}`,
      Nilai: s.nilai_custom || s.nilai_kelancaran,
      Catatan: s.catatan || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Setoran ${activeTab}`);
    XLSX.writeFile(workbook, `setoran_${activeTab}_export.xlsx`);
    toast.success('Ekspor Spreadsheet berhasil!');
  };

  const handleExportCSV = () => {
    if (filteredSetorans.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    const headers = ['No', 'Tanggal', 'NIS', 'Santri', 'Penyimak', 'Jenis', 'Detail', 'Nilai', 'Catatan'];
    const rows = filteredSetorans.map((s, idx) => [
      idx + 1,
      s.tanggal_setoran,
      s.santri?.nis || '',
      s.santri?.nama_lengkap || '',
      s.penyimak || '',
      s.jenis_setoran || '',
      s.tipe_setoran === 'quran' ? `Surah ${s.nama_surah} (Ayat ${s.ayat_mulai || 1}-${s.ayat_terakhir})` :
      s.tipe_setoran === 'hadits' ? `Kitab ${s.kitab_hadits_matan} (Hadits ke ${s.hadits_ke || s.ayat_terakhir})` :
      s.tipe_setoran === 'matan' ? `Matan ${s.kitab_hadits_matan} (Bait ${s.ayat_mulai || 1}-${s.ayat_terakhir})` :
      s.tipe_setoran === 'tahsin' ? `Tahsin Jilid ${s.juz} Hal. ${s.ayat_terakhir}` : `Ujian: ${s.materi_ujian || s.nama_surah}`,
      s.nilai_custom || s.nilai_kelancaran,
      s.catatan || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `setoran_${activeTab}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Ekspor CSV berhasil!');
  };

  const handleExportPDF = () => {
    window.print();
  };

  // --- CRUD ref_hadits / ref_matan logic ---
  const handleSaveKitab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitabName.trim()) return;

    try {
      const table = newItemType === 'hadits' ? 'ref_hadits' : 'ref_matan';
      const payload: any = {
        nama_kitab: kitabName,
      };

      if (newItemType === 'hadits') {
        payload.jumlah_hadits = Number(kitabJumlah);
      } else {
        payload.jumlah_bait = Number(kitabJumlah);
      }

      let error;
      if (editingId) {
        // Edit mode
        ({ error } = await supabase
          .from(table)
          .update(payload)
          .eq('id', editingId));
      } else {
        // Create mode
        ({ error } = await supabase
          .from(table)
          .insert([payload]));
      }

      if (error) throw error;

      toast.success(`Kitab ${newItemType} berhasil disimpan!`);
      setKitabName('');
      setKitabJumlah(10);
      setIsAdding(false);
      setEditingId(null);
      fetchKitabs();
    } catch (err: any) {
      console.error('Error saving kitab:', err);
      toast.error('Gagal menyimpan: ' + err.message);
    }
  };

  const handleDeleteKitab = async (id: string, type: 'hadits' | 'matan') => {
    if (!confirm('Apakah Anda yakin ingin menghapus kitab ini?')) return;

    try {
      const table = type === 'hadits' ? 'ref_hadits' : 'ref_matan';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success(`Kitab ${type} berhasil dihapus!`);
      fetchKitabs();
    } catch (err: any) {
      console.error('Error deleting kitab:', err);
      toast.error('Gagal menghapus: ' + err.message);
    }
  };

  const startEditKitab = (item: KitabItem, type: 'hadits' | 'matan') => {
    setNewItemType(type);
    setEditingId(item.id);
    setKitabName(item.nama_kitab);
    setKitabJumlah(item.jumlah_item);
    setIsAdding(true);
  };

  return (
    <>
      
      {/* Top Mobile Bar Style Mockup matching screenshot */}
      <div className="bg-emerald-800 dark:bg-emerald-950 text-white rounded-2xl p-4 shadow-md text-center font-extrabold text-base tracking-wide mb-6">
        Monitoring Hafalan Santri
      </div>

      {/* Sub Tabs Navigation matching screenshot */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-1.5 shadow-sm flex overflow-x-auto gap-1 mb-6">
        {(['quran', 'hadits', 'matan', 'tahsin', 'ujian', 'pengaturan'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setIsAdding(false);
              setEditingId(null);
            }}
            className={`flex-1 min-w-[75px] py-2 rounded-xl text-xs font-bold transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
              activeTab === tab
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/10'
                : 'text-slate-550 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-850'
            }`}
          >
            {tab === 'quran' && <BookMarked className="h-4 w-4" />}
            {tab === 'hadits' && <BookOpen className="h-4 w-4" />}
            {tab === 'matan' && <FileText className="h-4 w-4" />}
            {tab === 'tahsin' && <Layers className="h-4 w-4" />}
            {tab === 'ujian' && <Award className="h-4 w-4" />}
            {tab === 'pengaturan' && <Settings className="h-4 w-4" />}
            <span className="capitalize">{tab === 'quran' ? 'Quran' : tab}</span>
          </button>
        ))}
      </div>

      {/* Main Grid Content */}
      {activeTab === 'pengaturan' ? (
        // Settings Tab CRUD
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-emerald-600" />
                Pengaturan Kitab Hadits & Matan
              </h2>
              <p className="text-xs text-slate-400 mt-1">Kelola data referensi kitab untuk dropdown setoran</p>
            </div>
            {!isAdding && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setNewItemType('hadits');
                    setIsAdding(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-all"
                >
                  <Plus className="h-4.5 w-4.5" /> + Hadits
                </button>
                <button
                  onClick={() => {
                    setNewItemType('matan');
                    setIsAdding(true);
                  }}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-all"
                >
                  <Plus className="h-4.5 w-4.5" /> + Matan
                </button>
              </div>
            )}
          </div>

          {isAdding && (
            <form onSubmit={handleSaveKitab} className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-zinc-850 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  {editingId ? 'Edit' : 'Tambah'} Kitab {newItemType.toUpperCase()}
                </h3>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    setKitabName('');
                  }} 
                  className="text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Nama Kitab</label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Riyadhus Shalihin, Tuhfatul Athfal"
                    value={kitabName}
                    onChange={(e) => setKitabName(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">
                    Jumlah {newItemType === 'hadits' ? 'Hadits' : 'Bait'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={kitabJumlah}
                    onChange={(e) => setKitabJumlah(Number(e.target.value))}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 w-full transition-all"
              >
                <Save className="h-4 w-4" />
                Simpan
              </button>
            </form>
          )}

          {loadingPengaturan ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hadits List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Kitab Hadits ({haditsList.length})</h3>
                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-zinc-850">
                  {haditsList.map(item => (
                    <div key={item.id} className="p-3 bg-slate-50/50 dark:bg-zinc-900/60 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-zinc-200">{item.nama_kitab}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{item.jumlah_item} Hadits</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => startEditKitab(item, 'hadits')}
                          className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 text-emerald-600 rounded transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteKitab(item.id, 'hadits')}
                          className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-500 rounded transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Matan List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider">Kitab Matan ({matanList.length})</h3>
                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-zinc-850">
                  {matanList.map(item => (
                    <div key={item.id} className="p-3 bg-slate-50/50 dark:bg-zinc-900/60 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-zinc-200">{item.nama_kitab}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{item.jumlah_item} Bait</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => startEditKitab(item, 'matan')}
                          className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 text-emerald-600 rounded transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteKitab(item.id, 'matan')}
                          className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-500 rounded transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left / Top form column */}
          <div className="lg:col-span-1">
            <FormSetoranTahfidz 
              santriList={santriList} 
              onSuccess={fetchData} 
              activeTab={activeTab} 
            />
          </div>

          {/* Right history / statistics column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* History Table Card matching screenshot */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100 dark:border-zinc-850">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="h-4.5 w-4.5 text-emerald-600" />
                    Riwayat Hafalan {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} ({filteredSetorans.length})
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Daftar setoran masuk untuk modul ini</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportExcel}
                    className="p-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 rounded-xl text-[10px] font-bold text-slate-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition-all"
                    title="Export Excel"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Spreadsheet ({filteredSetorans.length})
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="p-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 rounded-xl text-[10px] font-bold text-slate-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition-all"
                    title="Export CSV"
                  >
                    <Download className="h-3.5 w-3.5" /> CSV ({filteredSetorans.length})
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="p-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 rounded-xl text-[10px] font-bold text-slate-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition-all"
                    title="Print / PDF"
                  >
                    <FileText className="h-3.5 w-3.5" /> PDF ({filteredSetorans.length})
                  </button>
                </div>
              </div>

              {/* Filtering & Sorting Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Cari nama santri..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-zinc-100 focus:outline-none transition-all"
                  >
                    <option value="default">Urutan Default</option>
                    <option value="terbaru">Terbaru</option>
                    <option value="terlama">Terlama</option>
                  </select>
                </div>

                <div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-zinc-100 focus:outline-none transition-all"
                  >
                    <option value="semua">Semua Data</option>
                    <option value="ziyadah">Kategori: Ziyadah</option>
                    <option value="murojaah">Kategori: Murojaah</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 dark:border-zinc-850 rounded-xl overflow-hidden overflow-x-auto">
                {loading ? (
                  <div className="text-center py-10 text-xs text-slate-450 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    Memuat riwayat setoran...
                  </div>
                ) : filteredSetorans.length === 0 ? (
                  <p className="text-center py-12 text-xs text-slate-400 dark:text-zinc-650 font-medium">
                    Belum ada data. Mulai input data baru.
                  </p>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-850 text-slate-400 dark:text-zinc-550 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">Santri</th>
                        <th className="py-2.5 px-3">Jenis</th>
                        <th className="py-2.5 px-3">Detail Setoran</th>
                        <th className="py-2.5 px-3">Penyimak</th>
                        <th className="py-2.5 px-3 text-center">Nilai</th>
                        <th className="py-2.5 px-3">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-slate-700 dark:text-zinc-300">
                      {filteredSetorans.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-850/20">
                          <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                            {new Date(s.tanggal_setoran).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                            {s.santri?.nama_lengkap}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              s.jenis_setoran === 'Ziyadah'
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            }`}>
                              {s.jenis_setoran || 'Ziyadah'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {s.tipe_setoran === 'quran' && (
                              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                Juz {s.juz} &bull; Surah {s.nama_surah} (Ayat {s.ayat_mulai || 1}-{s.ayat_terakhir})
                              </span>
                            )}
                            {s.tipe_setoran === 'hadits' && (
                              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                Kitab {s.kitab_hadits_matan} &bull; Hadits ke-{s.hadits_ke || s.ayat_terakhir}
                              </span>
                            )}
                            {s.tipe_setoran === 'matan' && (
                              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                Kitab {s.kitab_hadits_matan} &bull; Bait {s.ayat_mulai || 1}-{s.ayat_terakhir}
                              </span>
                            )}
                            {s.tipe_setoran === 'tahsin' && (
                              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                Jilid {s.juz} &bull; Halaman {s.ayat_terakhir}
                              </span>
                            )}
                            {s.tipe_setoran === 'ujian' && (
                              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                Ujian: {s.materi_ujian}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                            {s.penyimak || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/30">
                              {s.nilai_custom || s.nilai_kelancaran}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 italic max-w-[120px] truncate" title={s.catatan || ''}>
                            {s.catatan || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </>
  );
}
