'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Santri, PresensiTahfidz, KelancaranGrade } from '@/types/database';
import { 
  BookOpen, 
  Milestone, 
  TrendingUp, 
  Search, 
  Calendar, 
  User, 
  Award,
  Loader2, 
  ChevronRight,
  BookMarked,
  Info,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import KartuProgresTahfidz from '@/components/KartuProgresTahfidz';

interface DashboardStats {
  setoranHariIni: number;
  rataRataJuz: number;
  santriPalingAktif: { nama: string; nis: string; jumlahSetoran: number } | null;
}

interface MonthlyData {
  monthName: string;
  maxJuz: number;
  count: number;
}

export default function TahfidzDashboard() {
  // Database States
  const [loading, setLoading] = useState<boolean>(true);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [recentSetorans, setRecentSetorans] = useState<PresensiTahfidz[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    setoranHariIni: 0,
    rataRataJuz: 0,
    santriPalingAktif: null,
  });

  // Search & Profile Selection States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSantriId, setSelectedSantriId] = useState<string>('');
  const [santriSetorans, setSantriSetorans] = useState<PresensiTahfidz[]>([]);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch active santri for autocomplete list
      const { data: santriData, error: santriErr } = await supabase
        .from('santri')
        .select('*')
        .eq('status', 'aktif')
        .order('nama_lengkap', { ascending: true });

      if (santriErr) throw santriErr;
      setSantriList(santriData || []);

      // 2. Fetch recent 10 setorans for timeline
      const { data: recentData, error: recentErr } = await supabase
        .from('presensi_tahfidz')
        .select(`
          *,
          santri:id_santri (nama_lengkap, nis)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentErr) throw recentErr;
      setRecentSetorans(recentData || []);

      // 3. Fetch all setorans for stats
      const { data: allSetoranData, error: allErr } = await supabase
        .from('presensi_tahfidz')
        .select(`
          *,
          santri:id_santri (nama_lengkap, nis)
        `);

      if (allErr) throw allErr;
      const allSetorans = allSetoranData || [];

      // Calculate Stats
      const todayStr = new Date().toISOString().split('T')[0];
      const setoranHariIni = allSetorans.filter(s => s.tanggal_setoran === todayStr).length;

      // Average Juz (distinct max juz per santri)
      const santriMaxJuz = new Map<string, number>();
      allSetorans.forEach(s => {
        const cur = santriMaxJuz.get(s.id_santri) || 0;
        if (s.juz > cur) {
          santriMaxJuz.set(s.id_santri, s.juz);
        }
      });
      const totalJuz = Array.from(santriMaxJuz.values()).reduce((sum, val) => sum + val, 0);
      const rataRataJuz = santriMaxJuz.size > 0 ? Math.round((totalJuz / santriMaxJuz.size) * 10) / 10 : 0;

      // Santri Paling Aktif (frequency in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activityMap = new Map<string, { nama: string; nis: string; count: number }>();
      
      allSetorans
        .filter(s => new Date(s.tanggal_setoran) >= thirtyDaysAgo)
        .forEach(s => {
          if (s.santri) {
            const curObj = activityMap.get(s.id_santri) || { nama: s.santri.nama_lengkap, nis: s.santri.nis, count: 0 };
            curObj.count += 1;
            activityMap.set(s.id_santri, curObj);
          }
        });

      let mostActive: { nama: string; nis: string; jumlahSetoran: number } | null = null;
      activityMap.forEach((val, key) => {
        if (!mostActive || val.count > mostActive.jumlahSetoran) {
          mostActive = { nama: val.nama, nis: val.nis, jumlahSetoran: val.count };
        }
      });

      setStats({
        setoranHariIni,
        rataRataJuz,
        santriPalingAktif: mostActive
      });

    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      toast.error('Gagal mengambil data statistik dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Load individual student setoran history for chart
  const handleSelectSantri = async (santriId: string) => {
    setSelectedSantriId(santriId);
    setSearchQuery(''); // Close autocomplete dropdown
    
    try {
      setLoadingProfile(true);
      const { data, error } = await supabase
        .from('presensi_tahfidz')
        .select('*')
        .eq('id_santri', santriId)
        .order('tanggal_setoran', { ascending: true });

      if (error) throw error;
      setSantriSetorans(data || []);
    } catch (err: any) {
      console.error('Error fetching student setorans:', err);
      toast.error('Gagal mengambil riwayat hafalan santri.');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Autocomplete search list filter
  const filteredSearchList = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return santriList
      .filter(s => s.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) || s.nis.includes(searchQuery))
      .slice(0, 5); // limit to 5 results
  }, [searchQuery, santriList]);

  // Selected Santri Object
  const selectedSantriObj = useMemo(() => {
    return santriList.find(s => s.id === selectedSantriId) || null;
  }, [selectedSantriId, santriList]);

  // Process monthly data for visualization (past 6 months chart)
  const processedMonthlyData = useMemo((): MonthlyData[] => {
    if (santriSetorans.length === 0) return [];

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthlyMap = new Map<string, { maxJuz: number; count: number; dateIndex: number }>();

    // Initialize past 6 months structure
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${months[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
      monthlyMap.set(key, { maxJuz: 0, count: 0, dateIndex: d.getTime() });
    }

    // Fill with database data
    let lastKnownMaxJuz = 0;
    
    // Sort all setorans ascendingly
    const sortedSetorans = [...santriSetorans].sort((a, b) => a.tanggal_setoran.localeCompare(b.tanggal_setoran));
    
    // Find the latest juz memorized before the chart period
    const chartStartKey = Array.from(monthlyMap.keys())[0];
    const chartStartTimestamp = monthlyMap.get(chartStartKey)!.dateIndex;
    
    sortedSetorans.forEach(s => {
      const sDate = new Date(s.tanggal_setoran);
      if (sDate.getTime() < chartStartTimestamp) {
        if (s.juz > lastKnownMaxJuz) {
          lastKnownMaxJuz = s.juz;
        }
      }
    });

    // Populate months
    Array.from(monthlyMap.keys()).forEach(key => {
      const yearMonthStart = new Date(`${key}-01T00:00:00`);
      const yearMonthEnd = new Date(yearMonthStart.getFullYear(), yearMonthStart.getMonth() + 1, 0, 23, 59, 59);

      // Find setorans in this month range
      let monthlyMax = lastKnownMaxJuz;
      let count = 0;
      
      sortedSetorans.forEach(s => {
        const sDate = new Date(s.tanggal_setoran);
        if (sDate >= yearMonthStart && sDate <= yearMonthEnd) {
          count++;
          if (s.juz > monthlyMax) {
            monthlyMax = s.juz;
          }
        }
      });

      monthlyMap.set(key, {
        maxJuz: monthlyMax,
        count: count,
        dateIndex: yearMonthStart.getTime()
      });

      lastKnownMaxJuz = monthlyMax;
    });

    return Array.from(monthlyMap.entries()).map(([key, val]) => {
      const [y, m] = key.split('-');
      const monthLabel = `${months[parseInt(m) - 1]} ${y.slice(-2)}`;
      return {
        monthName: monthLabel,
        maxJuz: val.maxJuz,
        count: val.count
      };
    });
  }, [santriSetorans]);

  // SVG Chart path calculation helper
  const chartPathSvg = useMemo(() => {
    if (processedMonthlyData.length === 0) return '';
    const width = 500;
    const height = 180;
    const paddingX = 40;
    const paddingY = 20;

    const points = processedMonthlyData.map((d, index) => {
      const x = paddingX + (index * (width - 2 * paddingX)) / (processedMonthlyData.length - 1);
      // Max Juz is 30. Convert juz to y-coordinate.
      const y = height - paddingY - (d.maxJuz * (height - 2 * paddingY)) / 30;
      return { x, y };
    });

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  }, [processedMonthlyData]);

  // SVG area fill under line helper
  const chartAreaSvg = useMemo(() => {
    if (processedMonthlyData.length === 0) return '';
    const width = 500;
    const height = 180;
    const paddingX = 40;
    const paddingY = 20;

    const points = processedMonthlyData.map((d, index) => {
      const x = paddingX + (index * (width - 2 * paddingX)) / (processedMonthlyData.length - 1);
      const y = height - paddingY - (d.maxJuz * (height - 2 * paddingY)) / 30;
      return { x, y };
    });

    const startX = points[0].x;
    const endX = points[points.length - 1].x;
    const bottomY = height - paddingY;

    let path = `M ${startX} ${bottomY}`;
    points.forEach(p => {
      path += ` L ${p.x} ${p.y}`;
    });
    path += ` L ${endX} ${bottomY} Z`;
    return path;
  }, [processedMonthlyData]);

  return (
    <>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookMarked className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Dashboard Pemantauan Tahfidz
          </h1>
          <p className="text-slate-550 dark:text-zinc-400 text-xs sm:text-sm mt-1">
            Akademik / Pemantauan Progres Setoran dan Pencapaian Hafalan Al-Qur'an
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/akademik/tahfidz/laporan"
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-sm transition-all"
          >
            <FileText className="h-4 w-4" />
            Laporan Bulanan
          </Link>
        </div>
      </div>

      <div className="mb-8">
      {/* 1. Statistik Ringkasan (Cards) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Total Setoran Hari Ini */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm flex items-center gap-5 hover:border-emerald-500/20 transition-colors">
            <div className="h-12 w-12 rounded-xl bg-emerald-55/70 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-wider">Setoran Hari Ini</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.setoranHariIni}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">laporan setoran masuk</p>
            </div>
          </div>

          {/* Card Rata-rata Juz Terbanyak */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm flex items-center gap-5 hover:border-emerald-500/20 transition-colors">
            <div className="h-12 w-12 rounded-xl bg-teal-55/70 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-100/50 dark:border-teal-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Milestone className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-wider">Rata-rata Juz Hafalan</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.rataRataJuz} <span className="text-xs font-normal text-slate-400">Juz</span></h3>
              <p className="text-[10px] text-slate-400 mt-0.5">pencapaian per santri</p>
            </div>
          </div>

          {/* Card Santri Paling Aktif */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm flex items-center gap-5 hover:border-emerald-500/20 transition-colors">
            <div className="h-12 w-12 rounded-xl bg-amber-55/70 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100/50 dark:border-amber-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-wider">Santri Paling Aktif (30 Hari)</p>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 truncate">
                {stats.santriPalingAktif ? stats.santriPalingAktif.nama : '-'}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {stats.santriPalingAktif ? `${stats.santriPalingAktif.jumlahSetoran} kali setor hafalan` : 'Belum ada data'}
              </p>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Main Grid: Timeline & Search-Profile Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 2. Timeline Hafalan (Left column: 1 span on desktop) */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
              Lini Masa Setoran Terbaru
            </h2>
            <p className="text-slate-400 text-[11px] mt-0.5">Aktivitas hafalan santri hari ini dan kemarin</p>
          </div>

          <div className="relative border-l border-slate-200 dark:border-zinc-800 pl-4 space-y-6 flex-1 max-h-[500px] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-xs text-slate-400 flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                Memuat riwayat setoran...
              </div>
            ) : recentSetorans.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-zinc-650 py-4">Belum ada riwayat setoran tahfidz.</p>
            ) : (
              recentSetorans.map((setoran) => (
                <div key={setoran.id} className="relative group">
                  {/* Point Indicator */}
                  <span className="absolute -left-[21px] top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-slate-50 dark:bg-zinc-950 border-2 border-emerald-500 group-hover:scale-125 transition-transform" />
                  
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 dark:text-zinc-600 font-mono">
                      {new Date(setoran.tanggal_setoran).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    {/* Interactive name trigger */}
                    <button
                      onClick={() => handleSelectSantri(setoran.id_santri)}
                      className="text-left font-extrabold text-xs sm:text-sm text-slate-800 dark:text-zinc-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      {setoran.santri?.nama_lengkap}
                    </button>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 font-medium">
                      Juz {setoran.juz} &bull; Surah {setoran.nama_surah} (Ayat {setoran.ayat_terakhir})
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                          setoran.nilai_kelancaran === 'A'
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-150/40 dark:border-emerald-500/20'
                            : setoran.nilai_kelancaran === 'B'
                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-150/40 dark:border-blue-500/20'
                            : setoran.nilai_kelancaran === 'C'
                            ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-150/40 dark:border-amber-500/20'
                            : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-150/40 dark:border-rose-500/20'
                        }`}
                      >
                        Grade {setoran.nilai_kelancaran}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Search & Profile (Right column: 2 spans on desktop) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col space-y-6">
          
          {/* Autocomplete Search Bar */}
          <div className="space-y-2 relative">
            <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Search className="h-5 w-5 text-emerald-600" />
              Pencarian Perkembangan Santri
            </h2>
            <p className="text-slate-400 text-[11px]">Ketik nama atau NIS untuk memantau detail kurva progres hafalan bulanan</p>
            
            <div className="relative mt-3">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Cari nama santri (misal: Ahmad, Yusuf)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-3 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-650 focus:outline-none transition-all text-xs sm:text-sm"
              />

              {/* Autocomplete Dropdown */}
              {filteredSearchList.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800">
                  {filteredSearchList.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSantri(s.id)}
                      className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs sm:text-sm text-slate-800 dark:text-zinc-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-emerald-500" />
                        <span className="font-extrabold">{s.nama_lengkap}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">NIS: {s.nis} &bull; <ChevronRight className="inline h-3.5 w-3.5" /></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Student Profile & Progress Chart Display */}
          {!selectedSantriId ? (
            // No student selected state
            <div className="flex-1 border border-dashed border-slate-200 dark:border-zinc-800/80 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-center mb-4">
                <User className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">Pilih Santri Terlebih Dahulu</h3>
              <p className="text-slate-400 dark:text-zinc-550 text-xs mt-1 max-w-xs">
                Gunakan pencarian di atas atau klik nama di lini masa setoran untuk menampilkan kurva statistik pencapaian hafalan.
              </p>
            </div>
          ) : loadingProfile ? (
            // Loader
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-slate-400 text-xs">Memuat histori progres...</p>
            </div>
          ) : (
            // Student Profile Active Area
            <div className="flex-1 space-y-6">
              
              {/* Profile Card Header */}
              <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-150 dark:border-zinc-850 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 flex items-center justify-center font-bold text-sm uppercase">
                    {selectedSantriObj?.nama_lengkap.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{selectedSantriObj?.nama_lengkap}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">NIS: {selectedSantriObj?.nis}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <Award className="h-5 w-5 text-amber-500" />
                  <span className="text-xs font-extrabold text-slate-700 dark:text-zinc-300 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                    Hafalan: Juz {processedMonthlyData.length > 0 ? processedMonthlyData[processedMonthlyData.length - 1].maxJuz : 0}
                  </span>
                </div>
              </div>

              {/* Grid: Left Column = Visual Profile Card, Right Column = SVG Progress Chart */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Visual Progress Card Component */}
                <KartuProgresTahfidz idSantri={selectedSantriId} />

                {/* Graphic Progress Chart (SVG Line Chart) */}
                <div className="space-y-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">Grafik Progres Hafalan (6 Bulan Terakhir)</h3>
                  
                  {processedMonthlyData.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-6 text-center">Belum ada riwayat setoran hafalan.</p>
                  ) : (
                    <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 p-4 rounded-xl">
                      {/* SVG Chart Container */}
                      <div className="relative w-full h-[180px]">
                        <svg
                          viewBox="0 0 500 180"
                          className="w-full h-full overflow-visible"
                          preserveAspectRatio="none"
                        >
                          <defs>
                            {/* Gradient fill */}
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Y lines & Labels */}
                          {[0, 10, 20, 30].map((juzLevel) => {
                            const y = 180 - 20 - (juzLevel * (180 - 40)) / 30;
                            return (
                              <g key={juzLevel} className="opacity-40">
                                <line
                                  x1="40"
                                  y1={y}
                                  x2="480"
                                  y2={y}
                                  className="stroke-slate-200 dark:stroke-zinc-800"
                                  strokeDasharray="3 3"
                                  strokeWidth="1"
                                />
                                <text
                                  x="30"
                                  y={y + 4}
                                  className="fill-slate-400 text-[10px] font-mono text-right"
                                  textAnchor="end"
                                >
                                  {juzLevel}
                                </text>
                              </g>
                            );
                          })}

                          {/* Area Gradient Fill */}
                          <path d={chartAreaSvg} fill="url(#chartGradient)" />

                          {/* Main Plot Line */}
                          <path
                            d={chartPathSvg}
                            fill="none"
                            className="stroke-emerald-500"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />

                          {/* Interaction Dot Points & X labels */}
                          {processedMonthlyData.map((d, index) => {
                            const x = 40 + (index * (500 - 80)) / (processedMonthlyData.length - 1);
                            const y = 180 - 20 - (d.maxJuz * (180 - 40)) / 30;
                            return (
                              <g key={index} className="group/dot cursor-pointer">
                                {/* Label X (Month name) */}
                                <text
                                  x={x}
                                  y="176"
                                  className="fill-slate-400 text-[9px] font-bold text-center"
                                  textAnchor="middle"
                                >
                                  {d.monthName}
                                </text>

                                {/* Dot Point */}
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="4.5"
                                  className="fill-emerald-500 stroke-white dark:stroke-zinc-950"
                                  strokeWidth="1.5"
                                />

                                {/* Hover Indicator Box / Tooltip */}
                                <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-150 pointer-events-none">
                                  <rect
                                    x={x - 30}
                                    y={y - 30}
                                    width="60"
                                    height="22"
                                    rx="4"
                                    className="fill-slate-900 dark:fill-zinc-800"
                                  />
                                  <text
                                    x={x}
                                    y={y - 15}
                                    className="fill-white font-mono text-[9px] font-bold"
                                    textAnchor="middle"
                                  >
                                    Juz {d.maxJuz}
                                  </text>
                                </g>
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-150 dark:border-zinc-850 mt-2 text-[10px] text-slate-400">
                        <Info className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        Arahkan kursor pada lingkaran titik untuk melihat juz pencapaian bulanan.
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Setoran List for the Selected Student */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">Detail Histori Setoran</h3>
                
                <div className="border border-slate-200 dark:border-zinc-850 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-850 text-slate-400 dark:text-zinc-550 text-[10px] font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-4 w-28">Tanggal</th>
                        <th className="py-2.5 px-4">Surah (Juz)</th>
                        <th className="py-2.5 px-4 w-24">Ayat</th>
                        <th className="py-2.5 px-4 text-right w-24">Kelancaran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-xs text-slate-700 dark:text-zinc-300">
                      {santriSetorans.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-400">
                            Belum ada riwayat setoran hafalan.
                          </td>
                        </tr>
                      ) : (
                        [...santriSetorans].reverse().map((setoran) => (
                          <tr key={setoran.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-850/20">
                            <td className="py-2.5 px-4 font-mono text-slate-500">
                              {new Date(setoran.tanggal_setoran).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })}
                            </td>
                            <td className="py-2.5 px-4 font-bold">
                              {setoran.nama_surah} <span className="text-[10px] text-slate-400 font-normal">(Juz {setoran.juz})</span>
                            </td>
                            <td className="py-2.5 px-4 font-mono">Ayat {setoran.ayat_terakhir}</td>
                            <td className="py-2.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-450">
                              {setoran.nilai_kelancaran}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </>
  );
}
