'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Kamar, Santri, Pegawai, AbsensiSholat } from '@/types/database';
import { saveAbsensiSholat } from '@/services/sholat-actions';
import {
  Moon,
  Sun,
  Sunrise,
  Sunset,
  CloudSun,
  Users,
  Home,
  Check,
  CheckCircle,
  Clock,
  AlertCircle,
  HelpCircle,
  Loader2,
  Save,
  Sparkles,
  Search,
  CheckCircle2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

// Define Prayer configuration
const SHOLAT_LIST = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'] as const;
type SholatWaktu = typeof SHOLAT_LIST[number];

const STATUS_OPTS = [
  { value: 'Hadir', label: 'Hadir', color: 'bg-emerald-600 border-emerald-700 text-white', lightColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { value: 'Terlambat', label: 'Terlambat', color: 'bg-amber-500 border-amber-600 text-white', lightColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { value: 'Izin', label: 'Izin', color: 'bg-blue-500 border-blue-600 text-white', lightColor: 'bg-blue-500/10 text-blue-650 dark:text-blue-400 border-blue-500/20' },
  { value: 'Sakit', label: 'Sakit', color: 'bg-indigo-500 border-indigo-600 text-white', lightColor: 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border-indigo-500/20' },
  { value: 'Alpha', label: 'Mangkir (Alpha)', color: 'bg-rose-500 border-rose-600 text-white', lightColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' }
] as const;

type SholatStatus = typeof STATUS_OPTS[number]['value'];

interface SantriSholatState {
  id: string;
  nis: string;
  nama_lengkap: string;
  id_kamar: string | null;
  status: SholatStatus;
  keterangan: string;
}

// Helpers for automatic prayer selector based on current hour
function getAutomaticWaktuSholat(): SholatWaktu {
  const hour = new Date().getHours();
  if (hour >= 3 && hour < 8) return 'Subuh';
  if (hour >= 11 && hour < 14) return 'Dzuhur';
  if (hour >= 14 && hour < 17) return 'Ashar';
  if (hour >= 17 && hour < 19) return 'Maghrib';
  return 'Isya'; // Default / Night
}

const SHOLAT_ICONS: Record<SholatWaktu, React.ReactNode> = {
  Subuh: <Sunrise className="h-5 w-5" />,
  Dzuhur: <Sun className="h-5 w-5" />,
  Ashar: <CloudSun className="h-5 w-5" />,
  Maghrib: <Sunset className="h-5 w-5" />,
  Isya: <Moon className="h-5 w-5" />
};

export default function AbsensiSholatPage() {
  // Master state
  const [kamars, setKamars] = useState<Kamar[]>([]);
  const [loadingMaster, setLoadingMaster] = useState<boolean>(true);
  const [activeMusyrif, setActiveMusyrif] = useState<Pegawai | null>(null);

  // Filters
  const [selectedWaktu, setSelectedWaktu] = useState<SholatWaktu>('Subuh');
  const [selectedKamarId, setSelectedKamarId] = useState<string>('Semua');
  const [selectedTanggal, setSelectedTanggal] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Attendance state
  const [santris, setSantris] = useState<SantriSholatState[]>([]);
  const [loadingSantri, setLoadingSantri] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Long press / Edit Status Modal state
  const [editingSantri, setEditingSantri] = useState<SantriSholatState | null>(null);
  const [editStatus, setEditStatus] = useState<SholatStatus>('Hadir');
  const [editKeterangan, setEditKeterangan] = useState<string>('');
  
  // Track press events
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const clickTracker = useRef<{ [key: string]: { count: number; timer: NodeJS.Timeout | null } }>({});

  // Auto select prayer time based on current local hour
  useEffect(() => {
    setSelectedWaktu(getAutomaticWaktuSholat());
  }, []);

  // Fetch Master Kamar and Authenticated Musyrif
  const fetchMasterData = useCallback(async () => {
    try {
      setLoadingMaster(true);

      // Fetch Kamars
      const { data: kamarData } = await supabase
        .from('kamar')
        .select('*')
        .order('nama_kamar', { ascending: true });
      setKamars(kamarData || []);

      // Fetch Logged-in Pegawai/Musyrif
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data: pegawaiData } = await supabase
          .from('pegawai')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
        if (pegawaiData) {
          setActiveMusyrif(pegawaiData);
        }
      }
    } catch (err) {
      console.error('Error loading master data:', err);
    } finally {
      setLoadingMaster(false);
    }
  }, []);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  // Dynamic Room Mentors Generator (consistent with main asrama dashboard)
  const getMusyrifForKamar = useCallback((kamarId: string) => {
    if (!kamarId) return '-';
    const hash = kamarId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const ustadzList = [
      'Ustadz Ahmad Fauzi',
      'Ustadz M. Ridwan',
      'Ustadz H. Syamsuri',
      'Ustadzah Siti Aminah',
      'Ustadzah Khadijah',
      'Ustadz Yusuf Mansur'
    ];
    return ustadzList[hash % ustadzList.length];
  }, []);

  // Fetch Active Santri & Sholat Attendance Records
  const fetchAttendanceData = useCallback(async () => {
    try {
      setLoadingSantri(true);

      // 1. Fetch Santri
      let santriQuery = supabase
        .from('santri')
        .select('id, nis, nama_lengkap, id_kamar')
        .eq('status', 'aktif');

      if (selectedKamarId !== 'Semua') {
        santriQuery = santriQuery.eq('id_kamar', selectedKamarId);
      }

      const { data: santriData, error: santriErr } = await santriQuery.order('nama_lengkap', { ascending: true });
      if (santriErr) throw santriErr;
      const listSantri = santriData || [];

      // 2. Fetch existing sholat attendance today
      const { data: absensiData, error: absensiErr } = await supabase
        .from('absensi_sholat')
        .select('id_santri, status, keterangan')
        .eq('tanggal', selectedTanggal)
        .eq('waktu_sholat', selectedWaktu);

      if (absensiErr) throw absensiErr;
      
      const existMap = new Map<string, { status: SholatStatus; keterangan: string }>();
      (absensiData || []).forEach(a => {
        existMap.set(a.id_santri, { status: a.status as SholatStatus, keterangan: a.keterangan || '' });
      });

      // 3. Map to state (Defaulting to 'Hadir')
      const mapped: SantriSholatState[] = listSantri.map(s => {
        const exist = existMap.get(s.id);
        return {
          id: s.id,
          nis: s.nis,
          nama_lengkap: s.nama_lengkap,
          id_kamar: s.id_kamar,
          status: exist ? exist.status : 'Hadir',
          keterangan: exist ? exist.keterangan : ''
        };
      });

      setSantris(mapped);
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuat absensi: ' + err.message);
    } finally {
      setLoadingSantri(false);
    }
  }, [selectedKamarId, selectedWaktu, selectedTanggal]);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  // Click & Touch Handlers
  const handleSingleClick = (id: string) => {
    setSantris(prev =>
      prev.map(s => (s.id === id ? { ...s, status: 'Hadir' } : s))
    );
  };

  const handleDoubleClick = (id: string) => {
    setSantris(prev =>
      prev.map(s => (s.id === id ? { ...s, status: 'Terlambat' } : s))
    );
    toast.info('Status diatur ke Terlambat', { duration: 1000 });
  };

  const handleLongPress = (santri: SantriSholatState) => {
    setEditingSantri(santri);
    setEditStatus(santri.status);
    setEditKeterangan(santri.keterangan);
  };

  // Helper handling multi-tap / single-tap/ double-tap / long-press detection
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent, santri: SantriSholatState) => {
    // Start long press timer
    pressTimer.current = setTimeout(() => {
      handleLongPress(santri);
      // Vibrate if mobile supports it for premium feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 600);
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent, santri: SantriSholatState) => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }

    // Double click / single click detection
    if (!editingSantri) {
      const clickData = clickTracker.current[santri.id] || { count: 0, timer: null };

      if (clickData.timer) {
        clearTimeout(clickData.timer);
      }

      clickData.count += 1;

      if (clickData.count === 2) {
        handleDoubleClick(santri.id);
        clickData.count = 0;
        clickTracker.current[santri.id] = clickData;
      } else {
        clickData.timer = setTimeout(() => {
          handleSingleClick(santri.id);
          clickData.count = 0;
          clickTracker.current[santri.id] = clickData;
        }, 220); // click detection gap
        clickTracker.current[santri.id] = clickData;
      }
    }
  };

  // Quick Action: Hadir Semua
  const handleHadirSemua = () => {
    setSantris(prev => prev.map(s => ({ ...s, status: 'Hadir' })));
    toast.success('Semua santri diatur ke status Hadir.');
  };

  // Save Modal edits
  const handleSaveModal = () => {
    if (!editingSantri) return;
    setSantris(prev =>
      prev.map(s =>
        s.id === editingSantri.id
          ? { ...s, status: editStatus, keterangan: editKeterangan }
          : s
      )
    );
    setEditingSantri(null);
    toast.success(`Absensi ${editingSantri.nama_lengkap} diperbarui.`);
  };

  // Submit to Database
  const handleSaveAll = async () => {
    setIsSaving(true);

    const payloads = santris.map(s => ({
      id_santri: s.id,
      tanggal: selectedTanggal,
      waktu_sholat: selectedWaktu,
      status: s.status,
      keterangan: s.keterangan.trim() || null,
      id_musyrif: activeMusyrif?.id || null
    }));

    try {
      const res = await saveAbsensiSholat(payloads);
      if (!res.success) throw new Error(res.error);
      toast.success('Absensi sholat berjamaah berhasil disimpan!');
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menyimpan absensi: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered List based on Search Query
  const filteredSantris = useMemo(() => {
    return santris.filter(s =>
      s.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nis.includes(searchQuery)
    );
  }, [santris, searchQuery]);

  // Statistics Summary
  const stats = useMemo(() => {
    const total = santris.length;
    const hadir = santris.filter(s => s.status === 'Hadir').length;
    const terlambat = santris.filter(s => s.status === 'Terlambat').length;
    const hadirJamaah = hadir + terlambat;
    return { total, hadir, terlambat, hadirJamaah };
  }, [santris]);

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen transition-colors duration-300">
      
      {/* Header */}
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 mb-3">
            <Sparkles className="h-3 w-3" />
            Pencatatan Jamaah Asrama
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Absensi Sholat 5 Waktu
          </h1>
          <p className="text-slate-550 dark:text-zinc-400 text-xs sm:text-sm mt-1">
            Musyrif Asrama / Monitor Kedisiplinan Sholat Berjamaah Harian Santri
          </p>
        </div>
      </div>

      {/* Primary Selector Waktu Sholat */}
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1.5 sm:p-2.5 rounded-2xl shadow-sm">
          {SHOLAT_LIST.map((waktu) => {
            const isActive = selectedWaktu === waktu;
            return (
              <button
                key={waktu}
                onClick={() => setSelectedWaktu(waktu)}
                className={`flex flex-col items-center justify-center py-2 sm:py-3.5 px-1 rounded-xl transition-all font-bold ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-650/10 scale-[1.02]'
                    : 'bg-slate-50 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900'
                }`}
              >
                {SHOLAT_ICONS[waktu]}
                <span className="text-[10px] sm:text-xs mt-1.5 tracking-wide">{waktu}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Panel (Filters, Search, Actions) */}
      <div className="max-w-5xl mx-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Kamar Filter */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">
              Filter Kamar Asrama
            </label>
            <select
              value={selectedKamarId}
              onChange={(e) => setSelectedKamarId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none text-xs sm:text-sm"
            >
              <option value="Semua">-- Semua Kamar --</option>
              {kamars.map((k) => (
                <option key={k.id} value={k.id}>
                  Kamar {k.nama_kamar} (Gedung {k.gedung})
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal Filter */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">
              Pilih Tanggal Absensi
            </label>
            <input
              type="date"
              value={selectedTanggal}
              onChange={(e) => setSelectedTanggal(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none text-xs sm:text-sm font-mono"
            />
          </div>

          {/* Search bar */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">
              Cari Nama / NIS
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari santri..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none text-xs sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Quick Help Banner for Touch Actions */}
        <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850/60 p-3.5 rounded-xl flex items-start gap-2 text-[10.5px] sm:text-xs text-slate-500 dark:text-zinc-400">
          <Info className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-slate-700 dark:text-zinc-300">Pintasan Layar Sentuh:</span>
            <p>
              Tap <strong className="text-emerald-600 font-bold">1x</strong> untuk <strong className="font-semibold text-emerald-600">Hadir</strong> &bull; Tap <strong className="text-amber-500 font-bold">2x</strong> untuk <strong className="font-semibold text-amber-500">Terlambat</strong> &bull; <strong className="text-rose-500 font-bold">Tekan Lama / Hold</strong> untuk membuka opsi detail (Izin, Sakit, Alpha, Catatan).
            </p>
          </div>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/60 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 p-4 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          <div>
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Ringkasan Kehadiran</p>
            <h4 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-zinc-200">
              {stats.hadirJamaah}/{stats.total} Santri Hadir Jamaah
            </h4>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <button
            onClick={handleHadirSemua}
            className="border border-emerald-200 dark:border-emerald-800/40 bg-white dark:bg-zinc-900 hover:bg-slate-50 text-emerald-700 dark:text-emerald-400 font-bold px-4 py-2.5 rounded-xl transition-all text-xs shadow-sm"
          >
            Hadir Semua
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-650/10 transition-all text-xs disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Absensi
          </button>
        </div>
      </div>

      {/* Santri Interactive List Grid */}
      <div className="max-w-5xl mx-auto">
        {loadingSantri ? (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl py-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-slate-400 text-sm">Memuat daftar santri asrama...</p>
          </div>
        ) : filteredSantris.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl py-16 text-center">
            <Users className="h-10 w-10 text-slate-350 mx-auto mb-3" />
            <h4 className="font-bold text-slate-800 dark:text-white">Tidak ada data santri</h4>
            <p className="text-slate-450 text-xs mt-1">Silakan sesuaikan filter pencarian atau pilih kamar asrama lain.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {filteredSantris.map((item) => {
              const currentOpt = STATUS_OPTS.find(o => o.value === item.status) || STATUS_OPTS[0];
              const initials = item.nama_lengkap.split(' ').slice(0, 2).map(n => n[0]).join('');

              return (
                <div
                  key={item.id}
                  onTouchStart={(e) => handleTouchStart(e, item)}
                  onTouchEnd={(e) => handleTouchEnd(e, item)}
                  onMouseDown={(e) => handleTouchStart(e, item)}
                  onMouseUp={(e) => handleTouchEnd(e, item)}
                  className={`relative p-3.5 rounded-xl border bg-white dark:bg-zinc-900 select-none cursor-pointer active:scale-95 transition-all shadow-sm flex flex-col items-center justify-between text-center min-h-[140px] ${
                    item.status === 'Hadir'
                      ? 'border-emerald-500/30 hover:border-emerald-500/50'
                      : item.status === 'Terlambat'
                      ? 'border-amber-500/40 hover:border-amber-500/60'
                      : item.status === 'Izin'
                      ? 'border-blue-500/30 hover:border-blue-500/50'
                      : item.status === 'Sakit'
                      ? 'border-indigo-500/30 hover:border-indigo-500/50'
                      : 'border-rose-500/30 hover:border-rose-500/50'
                  }`}
                  title="Klik untuk Hadir, Double Klik untuk Terlambat, Hold untuk opsi lainnya"
                >
                  
                  {/* Status indicator pill top right */}
                  <div className="absolute top-2 right-2">
                    <span className={`text-[8.5px] px-2 py-0.5 rounded-full border font-bold ${currentOpt.lightColor}`}>
                      {item.status}
                    </span>
                  </div>

                  {/* Avatar or Initials */}
                  <div className={`h-11 w-11 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-inner border border-slate-100 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 mt-2 ${
                    item.status === 'Hadir'
                      ? 'bg-emerald-50 dark:bg-emerald-500/5'
                      : item.status === 'Terlambat'
                      ? 'bg-amber-50 dark:bg-amber-500/5'
                      : 'bg-slate-100 dark:bg-zinc-950'
                  }`}>
                    {initials}
                  </div>

                  {/* Name and NIS */}
                  <div className="mt-2.5 w-full">
                    <h5 className="font-extrabold text-xs text-slate-800 dark:text-zinc-200 line-clamp-1 pr-1 pl-1">
                      {item.nama_lengkap}
                    </h5>
                    <p className="text-[9.5px] font-mono text-slate-400 mt-0.5">
                      Kamar: {kamars.find(k => k.id === item.id_kamar)?.nama_kamar || '-'}
                    </p>
                    {item.keterangan && (
                      <p className="text-[8.5px] text-slate-500 italic mt-1 line-clamp-1 bg-slate-50 dark:bg-zinc-950 p-0.5 rounded border border-slate-100 dark:border-zinc-850">
                        "{item.keterangan}"
                      </p>
                    )}
                  </div>

                  {/* Quick Action Button for Accessibility fallback (instead of only hold) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLongPress(item);
                    }}
                    className="mt-2.5 text-[9px] font-bold text-slate-400 hover:text-emerald-650 px-2 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-900 rounded-lg border border-slate-200/50 dark:border-zinc-800/80 w-full transition-colors"
                  >
                    Opsi Detail
                  </button>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Editing Dialog Modal (Triggered by Long Press / Hold or Accessibility Option button) */}
      {editingSantri && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/65 backdrop-blur-sm" onClick={() => setEditingSantri(null)} />
          
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            <div className="border-b border-slate-150 dark:border-zinc-800 px-5 py-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Opsi Absensi: {editingSantri.nama_lengkap}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">NIS: {editingSantri.nis}</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Select Status Options */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-550 uppercase">
                  Pilih Status Kehadiran
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTS.map((opt) => {
                    const isSel = editStatus === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEditStatus(opt.value)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold text-center border transition-all ${
                          isSel
                            ? opt.color
                            : 'bg-slate-50 dark:bg-zinc-950 text-slate-650 dark:text-zinc-400 border-slate-200 dark:border-zinc-850 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note / Keterangan */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-550 uppercase">
                  Catatan Keterangan
                </label>
                <input
                  type="text"
                  placeholder="Misal: Demam, Telat Bangun, Sakit Gigi"
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none text-xs sm:text-sm"
                />
              </div>

              {/* Action buttons */}
              <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 mt-5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingSantri(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-850 hover:bg-slate-50 text-slate-550 dark:text-slate-400 rounded-xl font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/10"
                >
                  Simpan
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
