'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Santri, Perizinan } from '@/types/database';
import {
  FileText,
  UserCheck,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  X,
  Check,
  Ban,
  Calendar,
  User,
  Loader2,
  CalendarDays,
  CornerDownLeft,
  Sparkles,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

export default function PerizinanSantriPage() {
  // Current logged-in user
  const [currentUser, setCurrentUser] = useState<{ id: string; nama: string } | null>(null);

  // Master states
  const [perizinanList, setPerizinanList] = useState<Perizinan[]>([]);
  const [santriList, setSantriList] = useState<Pick<Santri, 'id' | 'nis' | 'nama_lengkap'>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');

  // Submit Modal States
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [submitSubmitting, setSubmitSubmitting] = useState<boolean>(false);
  
  // Form States
  const [selectedSantri, setSelectedSantri] = useState<Pick<Santri, 'id' | 'nis' | 'nama_lengkap'> | null>(null);
  const [santriSearchTerm, setSantriSearchTerm] = useState<string>('');
  const [showSantriDropdown, setShowSantriDropdown] = useState<boolean>(false);
  const [formKeperluan, setFormKeperluan] = useState<string>('');
  const [formTanggalKeluar, setFormTanggalKeluar] = useState<string>(() => {
    // Current date time formatted for datetime-local input (YYYY-MM-DDThh:mm)
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [formRencanaKembali, setFormRencanaKembali] = useState<string>(() => {
    // Default tomorrow at same time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
    return tomorrow.toISOString().slice(0, 16);
  });
  const [formPenjemput, setFormPenjemput] = useState<string>('');

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch Perizinan list with Santri and Petugas details
      const { data: perizinanData, error: perizinanErr } = await supabase
        .from('perizinan')
        .select(`
          *,
          santri:id_santri (id, nis, nama_lengkap),
          creator:created_by (id, nama_lengkap),
          approver:approved_by (id, nama_lengkap)
        `)
        .order('created_at', { ascending: false });

      if (perizinanErr) throw perizinanErr;
      setPerizinanList((perizinanData || []) as any);

      // Fetch active Santri list for selection
      const { data: santriData, error: santriErr } = await supabase
        .from('santri')
        .select('id, nis, nama_lengkap')
        .eq('status', 'aktif')
        .order('nama_lengkap', { ascending: true });

      if (santriErr) throw santriErr;
      setSantriList(santriData || []);

    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengambil data perizinan: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase
          .from('profiles')
          .select('id, nama_lengkap')
          .eq('id', data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setCurrentUser({ id: profile.id, nama: profile.nama_lengkap });
            }
          });
      }
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Action: Setujui Izin
  const handleSetujui = async (id: string) => {
    try {
      const update: Record<string, any> = { status: 'disetujui' };
      if (currentUser) update.approved_by = currentUser.id;
      const { error } = await supabase
        .from('perizinan')
        .update(update)
        .eq('id', id);

      if (error) throw error;
      toast.success('Pengajuan izin disetujui.');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menyetujui izin: ' + err.message);
    }
  };

  // Action: Tolak Izin
  const handleTolak = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menolak pengajuan izin ini?')) return;
    try {
      const update: Record<string, any> = { status: 'ditolak' };
      if (currentUser) update.approved_by = currentUser.id;
      const { error } = await supabase
        .from('perizinan')
        .update(update)
        .eq('id', id);

      if (error) throw error;
      toast.info('Pengajuan izin ditolak.');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menolak izin: ' + err.message);
    }
  };

  // Action: Konfirmasi Kembali
  const handleKonfirmasiKembali = async (id: string) => {
    try {
      const todayStr = new Date().toISOString();
      const update: Record<string, any> = {
        status: 'kembali',
        tanggal_kembali: todayStr
      };
      if (currentUser) update.approved_by = currentUser.id;
      const { error } = await supabase
        .from('perizinan')
        .update(update)
        .eq('id', id);

      if (error) throw error;
      toast.success('Konfirmasi santri kembali berhasil dilakukan.');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengonfirmasi kepulangan: ' + err.message);
    }
  };

  // Submit New Permit Request
  const handleSubmitPermit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri) {
      toast.error('Silakan pilih santri terlebih dahulu.');
      return;
    }
    if (!formKeperluan.trim()) {
      toast.error('Keperluan izin wajib diisi.');
      return;
    }

    setSubmitSubmitting(true);
    try {
      const payload: Record<string, any> = {
        id_santri: selectedSantri.id,
        keperluan: formKeperluan.trim(),
        tanggal_keluar: new Date(formTanggalKeluar).toISOString(),
        rencana_kembali: new Date(formRencanaKembali).toISOString(),
        penjemput: formPenjemput.trim() || null,
        status: 'diajukan',
      };
      if (currentUser) {
        payload.created_by = currentUser.id;
      }

      const { error } = await supabase
        .from('perizinan')
        .insert([payload]);

      if (error) throw error;

      toast.success('Pengajuan perizinan santri berhasil didaftarkan!');
      setIsSubmitModalOpen(false);
      
      // Reset Form states
      setSelectedSantri(null);
      setSantriSearchTerm('');
      setFormKeperluan('');
      setFormPenjemput('');
      
      await fetchData();
    } catch (err: any) {
      console.error('Error detail:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code,
        error: err
      });
      const errorMsg = err.details || err.message || JSON.stringify(err);
      toast.error('Gagal mengajukan perizinan: ' + errorMsg);
    } finally {
      setSubmitSubmitting(false);
    }
  };

  // Autocomplete student filter inside modal
  const filteredModalSantri = useMemo(() => {
    if (!santriSearchTerm.trim()) return [];
    return santriList.filter(s =>
      s.nama_lengkap.toLowerCase().includes(santriSearchTerm.toLowerCase()) ||
      s.nis.includes(santriSearchTerm)
    );
  }, [santriList, santriSearchTerm]);

  // Statistics Summary
  const stats = useMemo(() => {
    const now = new Date();
    
    // Status 'disetujui' and not returned yet
    const izinKeluar = perizinanList.filter(p => p.status === 'disetujui' && !p.tanggal_kembali).length;
    
    // Status 'diajukan'
    const menunggu = perizinanList.filter(p => p.status === 'diajukan').length;
    
    // Status 'disetujui', not returned yet, and rencana_kembali has passed
    const terlambat = perizinanList.filter(p => {
      if (p.status !== 'disetujui' || p.tanggal_kembali) return false;
      if (!p.rencana_kembali) return false;
      return new Date(p.rencana_kembali) < now;
    }).length;

    return { izinKeluar, menunggu, terlambat };
  }, [perizinanList]);

  // Filtered perizinan list displayed in table
  const filteredPerizinan = useMemo(() => {
    return perizinanList.filter(p => {
      // 1. Status Filter
      if (statusFilter !== 'Semua') {
        if (statusFilter === 'Terlambat') {
          const now = new Date();
          return p.status === 'disetujui' && !p.tanggal_kembali && p.rencana_kembali && new Date(p.rencana_kembali) < now;
        } else if (p.status !== statusFilter) {
          return false;
        }
      }

      // 2. Search Query
      if (searchQuery.trim() !== '') {
        const term = searchQuery.toLowerCase();
        const nama = p.santri?.nama_lengkap?.toLowerCase() || '';
        const nis = p.santri?.nis || '';
        const keperluan = p.keperluan?.toLowerCase() || '';
        return nama.includes(term) || nis.includes(term) || keperluan.includes(term);
      }

      return true;
    });
  }, [perizinanList, statusFilter, searchQuery]);

  // Helper: Format Durasi Izin
  const formatDurasi = (keluar: string, kembali: string | null | undefined, rencana: string | null | undefined) => {
    const start = new Date(keluar);
    const end = kembali ? new Date(kembali) : (rencana ? new Date(rencana) : new Date());
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return '0 Jam';

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      const remainingHours = diffHours % 24;
      return `${diffDays} Hari` + (remainingHours > 0 ? `, ${remainingHours} Jam` : '');
    }
    return `${diffHours} Jam` + (diffMins % 60 > 0 ? ` ${diffMins % 60} Menit` : '');
  };

  // Helper: Format Date String for view
  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper Check: Is Late?
  const isLate = (p: Perizinan) => {
    if (p.status !== 'disetujui' || p.tanggal_kembali || !p.rencana_kembali) return false;
    return new Date(p.rencana_kembali) < new Date();
  };

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen transition-colors duration-300">
      
      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 mb-3">
            <Sparkles className="h-3 w-3" />
            Keamanan & Mobilitas Santri
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Modul Perizinan Santri
          </h1>
          <p className="text-slate-550 dark:text-zinc-400 text-xs sm:text-sm mt-1">
            Asrama / Rekap, Persetujuan, dan Kontrol Perizinan Keluar-Masuk Pesantren
          </p>
        </div>
        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/10 transition-all duration-200 text-xs sm:text-sm"
        >
          <Plus className="h-4.5 w-4.5" />
          Ajukan Izin Baru
        </button>
      </div>

      {/* Summary Cards */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* Card 1: Santri Izin Keluar */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-455 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/10 shadow-sm flex-shrink-0">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Izin Keluar Aktif</p>
            <h3 className="text-xl font-extrabold text-slate-850 dark:text-white mt-0.5">{stats.izinKeluar} Santri</h3>
          </div>
        </div>

        {/* Card 2: Menunggu Persetujuan */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-500/5 text-amber-600 dark:text-amber-450 flex items-center justify-center border border-amber-100 dark:border-amber-500/10 shadow-sm flex-shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Menunggu Persetujuan</p>
            <h3 className="text-xl font-extrabold text-slate-850 dark:text-white mt-0.5">{stats.menunggu} Pengajuan</h3>
          </div>
        </div>

        {/* Card 3: Terlambat Kembali */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-rose-50 dark:bg-rose-500/5 text-rose-600 dark:text-rose-450 flex items-center justify-center border border-rose-100 dark:border-rose-500/10 shadow-sm flex-shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Terlambat Kembali</p>
            <h3 className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">{stats.terlambat} Santri</h3>
          </div>
        </div>

      </div>

      {/* Control Panel (Filters & Search) */}
      <div className="max-w-6xl mx-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {['Semua', 'diajukan', 'disetujui', 'kembali', 'Terlambat'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50'
                  : 'bg-slate-50 dark:bg-zinc-950 text-slate-500 hover:text-slate-700 border border-slate-250/20'
              }`}
            >
              {st === 'Semua' ? 'Semua Riwayat' : st === 'diajukan' ? 'Menunggu' : st === 'disetujui' ? 'Keluar' : st === 'kembali' ? 'Kembali' : 'Terlambat'}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-455" />
          <input
            type="text"
            placeholder="Cari santri atau keperluan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none text-xs sm:text-sm"
          />
        </div>

      </div>

      {/* Main Table / List Display */}
      <div className="max-w-6xl mx-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-slate-400 text-sm">Mengambil daftar perizinan...</p>
          </div>
        ) : filteredPerizinan.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="h-12 w-12 text-slate-350 mx-auto mb-3" />
            <h4 className="font-bold text-slate-850 dark:text-white">Tidak ada data perizinan</h4>
            <p className="text-slate-450 text-xs mt-1">Belum ada data pengajuan perizinan yang sesuai dengan filter.</p>
          </div>
        ) : (
          <div>
            
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-slate-450 text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Santri</th>
                    <th className="py-4 px-6">Keperluan</th>
                    <th className="py-4 px-6">Penjemput</th>
                    <th className="py-4 px-6">Durasi & Jadwal</th>
                    <th className="py-4 px-6">Petugas</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-sm">
                  {filteredPerizinan.map((izin) => {
                    const late = isLate(izin);
                    return (
                      <tr
                        key={izin.id}
                        className={`transition-colors duration-150 ${
                          late 
                            ? 'bg-rose-50/40 dark:bg-rose-950/10 hover:bg-rose-50/60' 
                            : 'hover:bg-slate-50/40 dark:hover:bg-zinc-950/20'
                        }`}
                      >
                        {/* Student Name */}
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-extrabold text-slate-900 dark:text-white">
                              {izin.santri?.nama_lengkap || '-'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">NIS: {izin.santri?.nis || '-'}</p>
                          </div>
                        </td>

                        {/* Keperluan */}
                        <td className="py-4 px-6 text-slate-650 dark:text-zinc-300 max-w-[200px] truncate">
                          {izin.keperluan}
                        </td>

                        {/* Penjemput */}
                        <td className="py-4 px-6 text-slate-550 dark:text-zinc-400">
                          {izin.penjemput || <span className="text-slate-350 italic">Tanpa Penjemput</span>}
                        </td>

                        {/* Durasi & Waktu */}
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-zinc-300">
                              <CalendarDays className="h-3.5 w-3.5 text-emerald-500" />
                              {formatDurasi(izin.tanggal_keluar, izin.tanggal_kembali, izin.rencana_kembali)}
                            </span>
                            <div className="text-[10.5px] text-slate-400 space-y-0.5">
                              <p>Keluar: {formatDateTime(izin.tanggal_keluar)}</p>
                              <p className={late ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}>
                                Rencana: {formatDateTime(izin.rencana_kembali)}
                              </p>
                              {izin.tanggal_kembali && <p className="text-emerald-600 dark:text-emerald-400">Kembali: {formatDateTime(izin.tanggal_kembali)}</p>}
                            </div>
                          </div>
                        </td>

                        {/* Petugas */}
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-0.5">
                            {izin.creator && (
                              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                                <span className="text-[9px] text-slate-400">Input: </span>
                                {izin.creator.nama_lengkap}
                              </span>
                            )}
                            {izin.approver && (
                              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                                <span className="text-[9px] text-slate-400">Approval: </span>
                                {izin.approver.nama_lengkap}
                              </span>
                            )}
                            {!izin.creator && !izin.approver && (
                              <span className="text-[11px] text-slate-400 italic">-</span>
                            )}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-6 text-center">
                          {late ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200/50">
                              <AlertTriangle className="h-3 w-3" />
                              Terlambat
                            </span>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${
                              izin.status === 'diajukan'
                                ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200/50'
                                : izin.status === 'disetujui'
                                ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200/50'
                                : izin.status === 'ditolak'
                                ? 'bg-slate-100 dark:bg-zinc-800 text-slate-550 border-slate-200/40'
                                : 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200/50'
                            }`}>
                              {izin.status === 'diajukan' ? 'Menunggu' : izin.status === 'disetujui' ? 'Keluar' : izin.status === 'ditolak' ? 'Ditolak' : 'Kembali'}
                            </span>
                          )}
                        </td>

                        {/* Actions buttons */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            {izin.status === 'diajukan' && (
                              <>
                                <button
                                  onClick={() => handleSetujui(izin.id)}
                                  className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Setujui
                                </button>
                                <button
                                  onClick={() => handleTolak(izin.id)}
                                  className="inline-flex items-center gap-1 border border-rose-250 hover:bg-rose-50 text-rose-600 font-bold py-1.5 px-3 rounded-lg text-xs transition-colors"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  Tolak
                                </button>
                              </>
                            )}
                            {izin.status === 'disetujui' && (
                              <button
                                onClick={() => handleKonfirmasiKembali(izin.id)}
                                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors shadow-sm"
                              >
                                <CornerDownLeft className="h-3.5 w-3.5" />
                                Konfirmasi Kembali
                              </button>
                            )}
                            {(izin.status === 'ditolak' || izin.status === 'kembali') && (
                              <span className="text-slate-350 text-xs italic">Selesai</span>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout View */}
            <div className="lg:hidden divide-y divide-slate-100 dark:divide-zinc-850">
              {filteredPerizinan.map((izin) => {
                const late = isLate(izin);
                return (
                  <div
                    key={izin.id}
                    className={`p-4 space-y-3.5 ${
                      late ? 'bg-rose-50/20 dark:bg-rose-950/5' : ''
                    }`}
                  >
                    {/* Header: Student name & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-slate-905 dark:text-white text-sm">{izin.santri?.nama_lengkap || '-'}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">NIS: {izin.santri?.nis || '-'}</p>
                      </div>
                      
                      {late ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-455 border border-rose-200/50">
                          <AlertTriangle className="h-3 w-3" />
                          Terlambat
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                          izin.status === 'diajukan'
                            ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200/50'
                            : izin.status === 'disetujui'
                            ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200/50'
                            : izin.status === 'ditolak'
                            ? 'bg-slate-100 dark:bg-zinc-800 text-slate-550 border-slate-200/40'
                            : 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200/50'
                        }`}>
                          {izin.status === 'diajukan' ? 'Menunggu' : izin.status === 'disetujui' ? 'Keluar' : 'Selesai'}
                        </span>
                      )}
                    </div>

                    {/* Keperluan & Penjemput details */}
                    <div className="text-xs space-y-1 bg-slate-50/50 dark:bg-zinc-950/20 p-2.5 rounded-xl border border-slate-200/35 dark:border-zinc-800">
                      <p><strong className="font-semibold text-slate-700 dark:text-zinc-300">Keperluan:</strong> {izin.keperluan}</p>
                      <p><strong className="font-semibold text-slate-700 dark:text-zinc-300">Penjemput:</strong> {izin.penjemput || <span className="text-slate-350 italic">Tanpa Penjemput</span>}</p>
                    </div>

                    {/* Schedule / Time details */}
                    <div className="text-[10.5px] text-slate-450 space-y-1 pl-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-650 dark:text-zinc-350 text-xs">
                        <Clock className="h-3.5 w-3.5 text-emerald-500" />
                        {formatDurasi(izin.tanggal_keluar, izin.tanggal_kembali, izin.rencana_kembali)}
                      </div>
                      <p>Keluar: {formatDateTime(izin.tanggal_keluar)}</p>
                      <p className={late ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}>
                        Rencana Kembali: {formatDateTime(izin.rencana_kembali)}
                      </p>
                      {izin.tanggal_kembali && <p className="text-emerald-600 dark:text-emerald-400">Kembali: {formatDateTime(izin.tanggal_kembali)}</p>}
                      {/* Petugas Info */}
                      <div className="pt-1.5 border-t border-slate-100 dark:border-zinc-800 mt-1.5 space-y-0.5">
                        {izin.creator && (
                          <p className="text-slate-400">
                            <span className="text-[9px] font-semibold uppercase tracking-wider">Input: </span>
                            {izin.creator.nama_lengkap}
                          </p>
                        )}
                        {izin.approver && (
                          <p className="text-slate-400">
                            <span className="text-[9px] font-semibold uppercase tracking-wider">Approval: </span>
                            {izin.approver.nama_lengkap}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons footer */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                      {izin.status === 'diajukan' && (
                        <>
                          <button
                            onClick={() => handleSetujui(izin.id)}
                            className="flex-1 inline-flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-colors"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Setujui
                          </button>
                          <button
                            onClick={() => handleTolak(izin.id)}
                            className="flex-1 inline-flex items-center justify-center gap-1 border border-rose-250 hover:bg-rose-50 text-rose-600 font-bold py-2 rounded-xl text-xs transition-colors"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Tolak
                          </button>
                        </>
                      )}
                      {izin.status === 'disetujui' && (
                        <button
                          onClick={() => handleKonfirmasiKembali(izin.id)}
                          className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm"
                        >
                          <CornerDownLeft className="h-3.5 w-3.5" />
                          Konfirmasi Kembali
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}
      </div>

      {/* Form Pengajuan Izin Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsSubmitModalOpen(false)} />

          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            <div className="border-b border-slate-150 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Calendar className="h-5 w-5 text-emerald-600" />
                Pengajuan Perizinan Santri
              </h3>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPermit} className="p-6 space-y-4">
              
              {/* Searchable Santri Select */}
              <div className="relative">
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
                  Cari Nama Santri *
                </label>
                {selectedSantri ? (
                  <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 p-2.5 rounded-xl text-sm">
                    <span className="font-extrabold text-emerald-800 dark:text-emerald-400">
                      {selectedSantri.nama_lengkap} (NIS: {selectedSantri.nis})
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSantri(null)}
                      className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Ketik nama santri..."
                        value={santriSearchTerm}
                        onChange={(e) => {
                          setSantriSearchTerm(e.target.value);
                          setShowSantriDropdown(true);
                        }}
                        onFocus={() => setShowSantriDropdown(true)}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none text-xs sm:text-sm"
                      />
                    </div>

                    {showSantriDropdown && santriSearchTerm.trim() !== '' && (
                      <div className="absolute z-10 w-full mt-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-850">
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
                              className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-zinc-800/40 text-xs flex flex-col gap-0.5"
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

              {/* Keperluan */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
                  Keperluan Izin *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Takziyah keluarga wafat, Menikahkan Kakak"
                  value={formKeperluan}
                  onChange={(e) => setFormKeperluan(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none text-sm"
                />
              </div>

              {/* Tanggal & Jam Keluar */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
                  Tanggal & Waktu Keluar *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formTanggalKeluar}
                  onChange={(e) => setFormTanggalKeluar(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none text-sm font-mono"
                />
              </div>

              {/* Rencana Kembali */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-550 uppercase mb-1.5">
                  Rencana Tanggal & Waktu Kembali *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formRencanaKembali}
                  onChange={(e) => setFormRencanaKembali(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none text-sm font-mono"
                />
              </div>

              {/* Penjemput */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
                  Nama Penjemput / Penanggung Jawab
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ayah Kandung / Paman"
                  value={formPenjemput}
                  onChange={(e) => setFormPenjemput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none text-sm"
                />
              </div>

              {/* Action buttons */}
              <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-850 hover:bg-slate-50 text-slate-600 dark:text-slate-400 rounded-xl font-semibold text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/10"
                >
                  {submitSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Ajukan Izin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
