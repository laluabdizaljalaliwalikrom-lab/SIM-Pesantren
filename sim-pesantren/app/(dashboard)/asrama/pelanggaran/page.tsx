'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Santri, MasterPelanggaran, PelanggaranSantri, Pegawai } from '@/types/database';
import {
  AlertTriangle,
  History,
  ShieldAlert,
  Search,
  User,
  Trash2,
  Plus,
  Loader2,
  Sparkles,
  Trophy,
  CheckCircle,
  HelpCircle,
  Filter,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface LeaderboardItem {
  id_santri: string;
  nama_lengkap: string;
  nis: string;
  total_poin: number;
  jumlah_kasus: number;
}

export default function PelanggaranPage() {
  // Master Lists
  const [santriList, setSantriList] = useState<Pick<Santri, 'id' | 'nis' | 'nama_lengkap'>[]>([]);
  const [masterPelanggaran, setMasterPelanggaran] = useState<MasterPelanggaran[]>([]);
  const [historyList, setHistoryList] = useState<PelanggaranSantri[]>([]);
  const [pegawaiList, setPegawaiList] = useState<any[]>([]);
  const [currentUserPegawai, setCurrentUserPegawai] = useState<any | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form states
  const [selectedSantri, setSelectedSantri] = useState<Pick<Santri, 'id' | 'nis' | 'nama_lengkap'> | null>(null);
  const [santriSearchTerm, setSantriSearchTerm] = useState<string>('');
  const [showSantriDropdown, setShowSantriDropdown] = useState<boolean>(false);
  const [selectedPelanggaranId, setSelectedPelanggaranId] = useState<string>('');
  const [formCatatan, setFormCatatan] = useState<string>('');
  const [formTanggal, setFormTanggal] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [selectedPelaporId, setSelectedPelaporId] = useState<string>('');

  // History Search & Filter
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');

  // CRUD Master Pelanggaran States
  const [isMasterModalOpen, setIsMasterModalOpen] = useState<boolean>(false);
  const [editingMaster, setEditingMaster] = useState<MasterPelanggaran | null>(null);
  const [masterFormNama, setMasterFormNama] = useState<string>('');
  const [masterFormKategori, setMasterFormKategori] = useState<'Ringan' | 'Sedang' | 'Berat'>('Ringan');
  const [masterFormPoin, setMasterFormPoin] = useState<number>(5);
  const [masterSubmitting, setMasterSubmitting] = useState<boolean>(false);

  // Fetch Master Data & History
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch Master Pelanggaran
      const { data: masterData, error: masterErr } = await supabase
        .from('master_pelanggaran')
        .select('*')
        .order('poin', { ascending: false });
      if (masterErr) throw masterErr;
      setMasterPelanggaran(masterData || []);

      // 2. Fetch Active Santri (for dropdown selection)
      const { data: santriData, error: santriErr } = await supabase
        .from('santri')
        .select('id, nis, nama_lengkap')
        .eq('status', 'aktif')
        .order('nama_lengkap', { ascending: true });
      if (santriErr) throw santriErr;
      setSantriList(santriData || []);

      // 3. Fetch Pegawai List
      const { data: pegawaiData, error: pegawaiErr } = await supabase
        .from('pegawai')
        .select('id, nama_lengkap, jabatan, email')
        .eq('status', 'Aktif')
        .order('nama_lengkap', { ascending: true });
      if (pegawaiErr) throw pegawaiErr;
      setPegawaiList(pegawaiData || []);

      // 4. Fetch Infraction History log with joined data
      const { data: logData, error: logErr } = await supabase
        .from('pelanggaran_santri')
        .select(`
          *,
          santri:id_santri (id, nis, nama_lengkap),
          pelanggaran:id_pelanggaran (id, nama_pelanggaran, kategori, poin),
          pelapor:id_pelapor (id, nama_lengkap)
        `)
        .order('tanggal', { ascending: false });

      if (logErr) throw logErr;
      setHistoryList((logData || []) as any);

      // 5. Fetch Logged-in Pegawai/Reporter
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email && pegawaiData) {
        const matched = pegawaiData.find(p => p.email?.toLowerCase() === user.email?.toLowerCase());
        if (matched) {
          setCurrentUserPegawai(matched);
          setSelectedPelaporId(matched.id);
        } else if (pegawaiData.length > 0) {
          setSelectedPelaporId(pegawaiData[0].id); // Fallback
        }
      } else if (pegawaiData && pegawaiData.length > 0) {
        setSelectedPelaporId(pegawaiData[0].id); // Fallback
      }

    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengambil data pelanggaran: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Submit new infraction log
  const handleSubmitPelanggaran = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri) {
      toast.error('Silakan pilih santri terlebih dahulu.');
      return;
    }
    if (!selectedPelanggaranId) {
      toast.error('Silakan pilih jenis pelanggaran.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        id_santri: selectedSantri.id,
        id_pelanggaran: selectedPelanggaranId,
        catatan: formCatatan.trim() || null,
        id_pelapor: selectedPelaporId || null,
        tanggal: new Date(formTanggal).toISOString()
      };

      const { error } = await supabase
        .from('pelanggaran_santri')
        .insert([payload]);

      if (error) throw error;

      toast.success('Log pelanggaran santri berhasil dicatat!');
      
      // Reset Form State
      setSelectedSantri(null);
      setSantriSearchTerm('');
      setSelectedPelanggaranId('');
      setFormCatatan('');
      
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menyimpan pelanggaran: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete infraction log
  const handleDeleteLog = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan pelanggaran ini?')) return;

    try {
      const { error } = await supabase
        .from('pelanggaran_santri')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Catatan pelanggaran berhasil dihapus.');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menghapus catatan: ' + err.message);
    }
  };

  // Master CRUD Handlers
  const handleOpenAddMaster = () => {
    setEditingMaster(null);
    setMasterFormNama('');
    setMasterFormKategori('Ringan');
    setMasterFormPoin(5);
  };

  const handleOpenEditMaster = (item: MasterPelanggaran) => {
    setEditingMaster(item);
    setMasterFormNama(item.nama_pelanggaran);
    setMasterFormKategori(item.kategori);
    setMasterFormPoin(item.poin);
  };

  const handleSaveMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterFormNama.trim()) {
      toast.error('Nama pelanggaran tidak boleh kosong.');
      return;
    }

    setMasterSubmitting(true);
    try {
      const payload = {
        nama_pelanggaran: masterFormNama.trim(),
        kategori: masterFormKategori,
        poin: Number(masterFormPoin)
      };

      if (editingMaster) {
        // Edit
        const { error } = await supabase
          .from('master_pelanggaran')
          .update(payload)
          .eq('id', editingMaster.id);

        if (error) throw error;
        toast.success('Jenis pelanggaran berhasil diperbarui!');
      } else {
        // Insert
        const { error } = await supabase
          .from('master_pelanggaran')
          .insert([payload]);

        if (error) throw error;
        toast.success('Jenis pelanggaran baru berhasil ditambahkan!');
      }

      // Reset master form
      setMasterFormNama('');
      setEditingMaster(null);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menyimpan jenis pelanggaran: ' + err.message);
    } finally {
      setMasterSubmitting(false);
    }
  };

  const handleDeleteMaster = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jenis pelanggaran ini? Jika jenis pelanggaran ini sudah direkam pada histori santri, penghapusan mungkin gagal.')) return;

    try {
      const { error } = await supabase
        .from('master_pelanggaran')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === '23503') {
          throw new Error('Tidak bisa dihapus karena jenis pelanggaran ini sedang aktif digunakan pada catatan santri.');
        }
        throw error;
      }

      toast.success('Jenis pelanggaran berhasil dihapus.');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menghapus jenis pelanggaran: ' + err.message);
    }
  };

  // Autocomplete student filter inside form
  const filteredModalSantri = useMemo(() => {
    if (!santriSearchTerm.trim()) return [];
    return santriList.filter(s =>
      s.nama_lengkap.toLowerCase().includes(santriSearchTerm.toLowerCase()) ||
      s.nis.includes(santriSearchTerm)
    );
  }, [santriList, santriSearchTerm]);

  // Calculate Leaderboard (Sum of points per student)
  const leaderboard: LeaderboardItem[] = useMemo(() => {
    const map = new Map<string, { nama_lengkap: string; nis: string; total_poin: number; jumlah_kasus: number }>();
    
    historyList.forEach(log => {
      if (!log.id_santri || !log.santri) return;
      const s = log.santri;
      const pts = log.pelanggaran?.poin || 0;
      
      const current = map.get(log.id_santri) || {
        nama_lengkap: s.nama_lengkap,
        nis: s.nis,
        total_poin: 0,
        jumlah_kasus: 0
      };

      current.total_poin += pts;
      current.jumlah_kasus += 1;
      map.set(log.id_santri, current);
    });

    const list: LeaderboardItem[] = [];
    map.forEach((value, key) => {
      list.push({
        id_santri: key,
        ...value
      });
    });

    // Sort descending by total points
    return list.sort((a, b) => b.total_poin - a.total_poin);
  }, [historyList]);

  // Filtered infraction history list displayed in table
  const filteredHistory = useMemo(() => {
    return historyList.filter(h => {
      // 1. Category Filter
      if (categoryFilter !== 'Semua' && h.pelanggaran?.kategori !== categoryFilter) {
        return false;
      }

      // 2. Search query
      if (historySearchQuery.trim() !== '') {
        const term = historySearchQuery.toLowerCase();
        const nama = h.santri?.nama_lengkap?.toLowerCase() || '';
        const nis = h.santri?.nis || '';
        const pelanggaran = h.pelanggaran?.nama_pelanggaran?.toLowerCase() || '';
        const catatan = h.catatan?.toLowerCase() || '';
        return nama.includes(term) || nis.includes(term) || pelanggaran.includes(term) || catatan.includes(term);
      }

      return true;
    });
  }, [historyList, categoryFilter, historySearchQuery]);

  // Helper date formatter
  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      
      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-450 border border-rose-200/50 mb-3">
            <ShieldAlert className="h-3 w-3" />
            Kedisiplinan & Poin Asrama
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Pelanggaran & Poin Santri
          </h1>
          <p className="text-slate-550 dark:text-zinc-400 text-xs sm:text-sm mt-1">
            Asrama / Pencatatan Pelanggaran dan Pemantauan Akumulasi Poin Sanksi Santri
          </p>
        </div>
        <button
          onClick={() => {
            handleOpenAddMaster();
            setIsMasterModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-sm transition-all"
        >
          <Filter className="h-4.5 w-4.5 text-rose-500" />
          Kelola Jenis Pelanggaran
        </button>
      </div>

      {/* Main Grid: Left side = Leaderboard & Form, Right side = History Table */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* LEFT COLUMN: Input Form & Leaderboard */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Input Form Box */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="h-4.5 w-4.5 text-emerald-650" />
              Catat Pelanggaran Baru
            </h3>

            <form onSubmit={handleSubmitPelanggaran} className="space-y-4">
              {/* Student search input */}
              <div className="relative">
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1">
                  Nama Santri *
                </label>
                {selectedSantri ? (
                  <div className="flex items-center justify-between bg-rose-50 dark:bg-rose-500/10 border border-rose-200/50 p-2.5 rounded-xl text-sm">
                    <span className="font-extrabold text-rose-800 dark:text-rose-400">
                      {selectedSantri.nama_lengkap}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSantri(null);
                        setSantriSearchTerm('');
                      }}
                      className="p-1 hover:bg-rose-100 rounded-lg text-rose-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Ketik nama santri..."
                        value={santriSearchTerm}
                        onChange={(e) => {
                          setSantriSearchTerm(e.target.value);
                          setShowSantriDropdown(true);
                        }}
                        onFocus={() => setShowSantriDropdown(true)}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-rose-500 rounded-xl pl-9 pr-4 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none text-xs sm:text-sm"
                      />
                    </div>

                    {showSantriDropdown && santriSearchTerm.trim() !== '' && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-850">
                        {filteredModalSantri.length === 0 ? (
                          <p className="p-3 text-xs text-slate-400 italic">Santri tidak ditemukan</p>
                        ) : (
                          filteredModalSantri.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedSantri(s);
                                setShowSantriDropdown(false);
                              }}
                              className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800/40 text-xs flex flex-col"
                            >
                              <span className="font-extrabold text-slate-800 dark:text-zinc-200">{s.nama_lengkap}</span>
                              <span className="text-[10px] text-slate-400 font-mono">NIS: {s.nis}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Infraction Category select */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1">
                  Jenis Pelanggaran *
                </label>
                <select
                  value={selectedPelanggaranId}
                  onChange={(e) => setSelectedPelanggaranId(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-rose-500 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none text-xs sm:text-sm"
                >
                  <option value="">-- Pilih Jenis Pelanggaran --</option>
                  {masterPelanggaran.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.kategori}] {p.nama_pelanggaran} ({p.poin} Poin)
                    </option>
                  ))}
                </select>
              </div>

              {/* Catatan / Keterangan tambahan */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1">
                  Catatan Sanksi / Kejadian
                </label>
                <textarea
                  rows={2}
                  placeholder="Misal: Menyembunyikan HP di bawah kasur kamar..."
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-rose-500 rounded-xl px-3.5 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none text-xs sm:text-sm"
                />
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1">
                  Tanggal Kejadian *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formTanggal}
                  onChange={(e) => setFormTanggal(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-rose-500 rounded-xl px-3 py-2 text-slate-850 dark:text-zinc-100 focus:outline-none text-xs sm:text-sm font-mono"
                />
              </div>

              {/* Pelapor (Ustadz) select */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1">
                  Ustadz Pelapor *
                </label>
                <select
                  value={selectedPelaporId}
                  onChange={(e) => setSelectedPelaporId(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-rose-500 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none text-xs sm:text-sm"
                >
                  <option value="">-- Pilih Ustadz Pelapor --</option>
                  {pegawaiList.map((peg) => (
                    <option key={peg.id} value={peg.id}>
                      {peg.nama_lengkap} ({peg.jabatan})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl shadow-md shadow-rose-600/10 transition-all text-xs disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                Catat Pelanggaran
              </button>

            </form>
          </div>

          {/* Leaderboard Pelanggaran Box */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="h-4.5 w-4.5 text-amber-500" />
              Leaderboard Poin Pelanggaran
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {leaderboard.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Belum ada catatan poin sanksi.
                </div>
              ) : (
                leaderboard.map((item, index) => {
                  const isThresholdPassed = item.total_poin >= 75;
                  return (
                    <div 
                      key={item.id_santri}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isThresholdPassed
                          ? 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-500/20 shadow-sm'
                          : 'bg-slate-50/60 dark:bg-zinc-950/40 border-slate-200/50 dark:border-zinc-850'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`h-6 w-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                          index === 0
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15'
                            : 'bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-extrabold text-xs text-slate-850 dark:text-zinc-200">
                            {item.nama_lengkap}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-0.5">NIS: {item.nis} &bull; {item.jumlah_kasus} Kasus</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          isThresholdPassed
                            ? 'bg-rose-600 text-white shadow-sm font-black'
                            : item.total_poin >= 40
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-350'
                        }`}>
                          {item.total_poin} Poin
                        </span>
                        {isThresholdPassed && (
                          <span className="block text-[8px] text-rose-600 font-bold mt-1 animate-pulse">PANGGIL WALI</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Chronological History Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
            
            {/* Table Control Header */}
            <div className="p-5 border-b border-slate-100 dark:border-zinc-850 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="h-4.5 w-4.5 text-rose-500" />
                  Histori Kejadian Pelanggaran
                </h3>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Category selector */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 focus:border-rose-500 rounded-xl px-3 py-2 text-slate-700 dark:text-zinc-300 focus:outline-none text-xs"
                >
                  <option value="Semua">Semua Kategori</option>
                  <option value="Ringan">Ringan</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Berat">Berat</option>
                </select>

                {/* Search query field */}
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari histori..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className="w-full sm:w-56 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 focus:border-rose-500 rounded-xl pl-8 pr-3 py-2 text-slate-700 dark:text-zinc-150 focus:outline-none text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Table Display */}
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
                <p className="text-slate-400 text-sm">Mengambil histori sanksi...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-20 text-center">
                <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                <h4 className="font-bold text-slate-800 dark:text-white">Tidak ada kejadian pelanggaran</h4>
                <p className="text-slate-450 text-xs mt-1.5">Semua santri tertib dan tidak ada log pelanggaran terdaftar.</p>
              </div>
            ) : (
              <div>
                
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-slate-450 text-xs font-bold uppercase tracking-wider">
                        <th className="py-4 px-6">Santri</th>
                        <th className="py-4 px-6">Pelanggaran</th>
                        <th className="py-4 px-6">Poin</th>
                        <th className="py-4 px-6">Catatan Kejadian</th>
                        <th className="py-4 px-6">Pelapor & Tanggal</th>
                        <th className="py-4 px-6 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-sm">
                      {filteredHistory.map((log) => {
                        const kat = log.pelanggaran?.kategori || 'Ringan';
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/30 dark:hover:bg-zinc-950/10">
                            {/* Student */}
                            <td className="py-4 px-6">
                              <div>
                                <p className="font-extrabold text-slate-900 dark:text-white">
                                  {log.santri?.nama_lengkap || '-'}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">NIS: {log.santri?.nis || '-'}</p>
                              </div>
                            </td>

                            {/* Infraction Category */}
                            <td className="py-4 px-6">
                              <div>
                                <p className="font-bold text-slate-800 dark:text-zinc-200 leading-tight">
                                  {log.pelanggaran?.nama_pelanggaran}
                                </p>
                                <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase mt-1 border ${
                                  kat === 'Ringan'
                                    ? 'bg-slate-100 text-slate-655 border-slate-200/50'
                                    : kat === 'Sedang'
                                    ? 'bg-amber-100/70 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/50'
                                    : 'bg-rose-100/70 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200/50'
                                }`}>
                                  {kat}
                                </span>
                              </div>
                            </td>

                            {/* Points badge */}
                            <td className="py-4 px-6 font-bold font-mono text-slate-700 dark:text-zinc-300">
                              {log.pelanggaran?.poin} Poin
                            </td>

                            {/* Catatan / Notes */}
                            <td className="py-4 px-6 text-slate-500 dark:text-zinc-400 max-w-[150px] truncate" title={log.catatan || ''}>
                              {log.catatan || <span className="text-slate-300 italic">Tanpa Catatan</span>}
                            </td>

                            {/* Reporter and Date */}
                            <td className="py-4 px-6">
                              <div className="text-xs space-y-0.5 text-slate-500 dark:text-zinc-400">
                                <p className="font-bold text-slate-650 dark:text-zinc-300">Oleh: {log.pelapor?.nama_lengkap || '-'}</p>
                                <p className="text-[10px] text-slate-400">{formatDateTime(log.tanggal)}</p>
                              </div>
                            </td>

                            {/* Delete Action button */}
                            <td className="py-4 px-6 text-right">
                              <button
                                onClick={() => handleDeleteLog(log.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                                title="Hapus Log"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card Layout View */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-850">
                  {filteredHistory.map((log) => {
                    const kat = log.pelanggaran?.kategori || 'Ringan';
                    return (
                      <div key={log.id} className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">{log.santri?.nama_lengkap || '-'}</h4>
                            <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">NIS: {log.santri?.nis || '-'}</p>
                          </div>
                          
                          <span className={`inline-flex px-2 py-0.5 rounded text-[8.5px] font-bold uppercase border ${
                            kat === 'Ringan'
                              ? 'bg-slate-100 text-slate-600 border-slate-200/50'
                              : kat === 'Sedang'
                              ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/50'
                              : 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-455 border-rose-200/50'
                          }`}>
                            {log.pelanggaran?.poin} Pts &bull; {kat}
                          </span>
                        </div>

                        {/* Details card */}
                        <div className="text-xs bg-slate-50 dark:bg-zinc-950/60 p-2.5 rounded-xl border border-slate-200/35 dark:border-zinc-850">
                          <p><strong className="font-semibold text-slate-700 dark:text-zinc-300">Pelanggaran:</strong> {log.pelanggaran?.nama_pelanggaran}</p>
                          <p><strong className="font-semibold text-slate-700 dark:text-zinc-300">Catatan:</strong> {log.catatan || <span className="text-slate-350 italic">Tanpa Catatan</span>}</p>
                        </div>

                        {/* Footer details */}
                        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                          <div>
                            <p>Pelapor: {log.pelapor?.nama_lengkap || '-'}</p>
                            <p className="mt-0.5">{formatDateTime(log.tanggal)}</p>
                          </div>

                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1.5 text-rose-600 bg-rose-50 dark:bg-rose-500/5 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100 dark:border-rose-900/50"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}

          </div>
        </div>

      </div>

      {/* CRUD Master Pelanggaran Modal */}
      {isMasterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/65 backdrop-blur-sm" onClick={() => setIsMasterModalOpen(false)} />
          
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden transform transition-all flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="border-b border-slate-150 dark:border-zinc-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-500" />
                Kelola Master Jenis Pelanggaran & Poin
              </h3>
              <button onClick={() => setIsMasterModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body (2 Columns layout) */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-5 gap-6">
              
              {/* Left Column: Form (2/5 cols) */}
              <div className="md:col-span-2 bg-slate-50/60 dark:bg-zinc-950/40 border border-slate-200/60 dark:border-zinc-850 p-4 rounded-xl space-y-4 h-fit">
                <h4 className="font-extrabold text-xs text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                  {editingMaster ? '✏️ Edit Jenis Pelanggaran' : '✨ Tambah Jenis Pelanggaran'}
                </h4>
                
                <form onSubmit={handleSaveMaster} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide mb-1">
                      Nama Pelanggaran *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Merusak fasilitas kamar"
                      value={masterFormNama}
                      onChange={(e) => setMasterFormNama(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:border-rose-500 rounded-lg px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide mb-1">
                      Kategori Pelanggaran *
                    </label>
                    <select
                      value={masterFormKategori}
                      onChange={(e) => setMasterFormKategori(e.target.value as any)}
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:border-rose-500 rounded-lg px-2.5 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none text-xs"
                    >
                      <option value="Ringan">Ringan</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Berat">Berat</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide mb-1">
                      Bobot Sanksi (Poin) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      required
                      value={masterFormPoin}
                      onChange={(e) => setMasterFormPoin(Number(e.target.value))}
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:border-rose-500 rounded-lg px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none text-xs font-mono"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    {editingMaster && (
                      <button
                        type="button"
                        onClick={handleOpenAddMaster}
                        className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold py-2 rounded-lg text-xs"
                      >
                        Batal
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={masterSubmitting}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-lg text-xs shadow-sm disabled:opacity-50"
                    >
                      {masterSubmitting ? 'Menyimpan...' : 'Simpan Master'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: List (3/5 cols) */}
              <div className="md:col-span-3 space-y-3">
                <h4 className="font-extrabold text-xs text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  Daftar Master Aktif ({masterPelanggaran.length})
                </h4>

                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {masterPelanggaran.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-3 bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-200/50 dark:border-zinc-850 rounded-xl flex items-center justify-between hover:border-slate-300 transition-all"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-xs text-slate-800 dark:text-zinc-200">{item.nama_pelanggaran}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                            item.kategori === 'Ringan'
                              ? 'bg-slate-100 text-slate-550 border-slate-200'
                              : item.kategori === 'Sedang'
                              ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 border-amber-200'
                              : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 border-rose-200'
                          }`}>
                            {item.kategori}
                          </span>
                          <span className="text-[9.5px] font-mono text-slate-450">{item.poin} Poin</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditMaster(item)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded transition-colors"
                          title="Edit"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteMaster(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-650 hover:bg-rose-50 dark:hover:bg-rose-900/15 rounded transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-150 dark:border-zinc-800 px-6 py-4 flex justify-end flex-shrink-0 bg-slate-50/50 dark:bg-zinc-950/20">
              <button
                type="button"
                onClick={() => setIsMasterModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-zinc-850 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-xs transition-colors"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </>
  );
}
