'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Wallet,
  DoorOpen,
  BookOpen,
  Moon,
  School,
  RefreshCw,
  Clock,
  Calendar,
  GraduationCap,
  Briefcase,
  AlertCircle,
  TrendingUp,
  Activity,
  Maximize,
  Minimize,
} from 'lucide-react';
import Image from 'next/image';

const REFRESH_INTERVAL_MS = 20000;

interface PegawaiInfo {
  nama_lengkap: string;
  gelar_depan?: string | null;
  gelar_belakang?: string | null;
  jabatan?: string | null;
  foto_url?: string | null;
}

interface PegawaiAbsensiItem {
  id: string;
  id_pegawai: string;
  tanggal: string;
  jam_masuk?: string | null;
  jam_keluar?: string | null;
  status: string;
  keterangan?: string | null;
  created_at: string;
  pegawai?: PegawaiInfo | null;
}

interface SantriInfo {
  nama_lengkap: string;
  nis?: string | null;
  rombel_saat_ini?: string | null;
  foto_url?: string | null;
  kelas_formal?: {
    nama_kelas?: string | null;
  } | null;
}

interface SantriAbsensiItem {
  id: string;
  id_santri: string;
  tanggal: string;
  jam_masuk?: string | null;
  jam_keluar?: string | null;
  status: string;
  keterangan?: string | null;
  created_at: string;
  santri?: SantriInfo | null;
}

interface PaymentItem {
  id: string;
  total_bayar: number | string;
  id_santri?: string | null;
  created_at: string;
  santri?: { nama_lengkap: string } | null;
}

interface PermitItem {
  id: string;
  keperluan: string;
  status: string;
  tanggal_keluar?: string | null;
  rencana_kembali?: string | null;
  created_at: string;
  id_santri?: string | null;
  santri?: { nama_lengkap: string } | null;
}

interface TahfidzItem {
  id: string;
  juz: number | string;
  nama_surah: string;
  tipe_setoran: string;
  nilai_kelancaran: string;
  created_at: string;
  id_santri?: string | null;
  santri?: { nama_lengkap: string } | null;
}

interface SholatItem {
  id: string;
  waktu_sholat: string;
  status: string;
  keterangan?: string | null;
  created_at: string;
  id_santri?: string | null;
  santri?: { nama_lengkap: string } | null;
}

interface KbmItem {
  id: string;
  id_jadwal?: string | null;
  status: string;
  keterangan?: string | null;
  created_at: string;
  id_santri?: string | null;
  santri?: { nama_lengkap: string } | null;
  jadwal_pelajaran?: {
    mapel?: {
      nama_mapel?: string | null;
    } | null;
  } | null;
}

function formatRp(n: number): string {
  return `Rp${n.toLocaleString('id-ID')}`;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins}m lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j lalu`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatTimeOnly(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr.slice(11, 16) || dateStr;
  }
}

function formatPegawaiName(nama: string, depan?: string | null, belakang?: string | null) {
  let res = '';
  if (depan?.trim()) res += `${depan.trim()} `;
  res += nama.trim();
  if (belakang?.trim()) {
    res += belakang.trim().startsWith(',') ? ` ${belakang.trim()}` : `, ${belakang.trim()}`;
  }
  return res;
}

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    Terlambat: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',
    Alpha: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40',
    Izin: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40',
    Sakit: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/40',
    Hadir: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40',
    diajukan: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',
    disetujui: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40',
    ditolak: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40',
    kembali: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };
  return map[status] || 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
}

function Skeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-2.5 animate-pulse space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-2 w-36 bg-slate-200/60 dark:bg-slate-800/60 rounded" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function LiveFeedCard({
  icon: Icon,
  title,
  subtitle,
  count,
  accent,
  loading,
  children,
  isEmpty,
  isFullscreen,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  count: number | string;
  accent: 'emerald' | 'sky' | 'blue' | 'violet' | 'amber' | 'rose';
  loading: boolean;
  children: React.ReactNode;
  isEmpty?: boolean;
  isFullscreen?: boolean;
}) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    sky: 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
    blue: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    violet: 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20',
    amber: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    rose: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  };

  return (
    <div className={`rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden ${isFullscreen ? 'h-full flex-1 min-h-0' : ''}`}>
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg ${colorMap[accent]} border flex items-center justify-center shrink-0`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 leading-tight">{title}</h2>
            {subtitle && <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight">{subtitle}</p>}
          </div>
        </div>
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${colorMap[accent]} tabular-nums`}>
          {count}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100 dark:divide-slate-800/50" style={{ maxHeight: isFullscreen ? 'none' : '360px' }}>
        {loading ? (
          <Skeleton />
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-6 text-slate-400 dark:text-slate-600">
            <Icon className="h-6 w-6 mb-1.5 opacity-30" />
            <p className="text-[11px] font-medium">Belum ada aktivitas hari ini</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)),
  ]);
}

export default function ExecutiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [pegawaiStats, setPegawaiStats] = useState({ total: 0, hadir: 0, terlambat: 0, izin: 0, alpha: 0 });
  const [pegawaiAbsensi, setPegawaiAbsensi] = useState<PegawaiAbsensiItem[]>([]);

  const [santriStats, setSantriStats] = useState({ total: 0, hadir: 0, terlambat: 0, izin: 0, alpha: 0 });
  const [santriAbsensi, setSantriAbsensi] = useState<SantriAbsensiItem[]>([]);

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [totalBayarHariIni, setTotalBayarHariIni] = useState(0);

  const [permits, setPermits] = useState<PermitItem[]>([]);
  const [tahfidz, setTahfidz] = useState<TahfidzItem[]>([]);
  const [sholat, setSholat] = useState<SholatItem[]>([]);
  const [kbm, setKbm] = useState<KbmItem[]>([]);

  const [clock, setClock] = useState('');
  const [fullDate, setFullDate] = useState('');
  const [hijriDate, setHijriDate] = useState('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function fetchDashboardData() {
    try {
      const now = new Date();
      // Format YYYY-MM-DD for local date
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Makassar',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);

      const TIMEOUT = 10000;

      const [
        totalPegawaiRes,
        pegawaiAbsenRes,
        totalSantriRes,
        santriAbsenRes,
        payRes,
        permRes,
        tahfRes,
        solRes,
        kbmRes,
      ] = await Promise.all([
        withTimeout(supabase.from('pegawai').select('id', { count: 'exact', head: true }), TIMEOUT).catch(() => ({ count: 0, error: null })),
        withTimeout(
          supabase
            .from('absensi_pegawai')
            .select('id, id_pegawai, tanggal, jam_masuk, jam_keluar, status, keterangan, created_at, pegawai:id_pegawai(nama_lengkap, gelar_depan, gelar_belakang, jabatan, foto_url)')
            .eq('tanggal', today)
            .order('jam_masuk', { ascending: false })
            .limit(30),
          TIMEOUT
        ).catch(() => ({ data: [], error: null })),
        withTimeout(supabase.from('santri').select('id', { count: 'exact', head: true }).eq('status', 'aktif'), TIMEOUT).catch(() => ({ count: 0, error: null })),
        withTimeout(
          supabase
            .from('absensi_santri')
            .select('id, id_santri, tanggal, jam_masuk, jam_keluar, status, keterangan, created_at, santri:id_santri(nama_lengkap, nis, rombel_saat_ini, foto_url, kelas_formal:id_kelas_formal(nama_kelas))')
            .eq('tanggal', today)
            .order('jam_masuk', { ascending: false })
            .limit(30),
          TIMEOUT
        ).catch(() => ({ data: [], error: null })),
        withTimeout(
          supabase
            .from('pembayaran_group')
            .select('id, total_bayar, id_santri, created_at, santri:id_santri(nama_lengkap)')
            .order('created_at', { ascending: false })
            .limit(20),
          TIMEOUT
        ).catch(() => ({ data: [], error: null })),
        withTimeout(
          supabase
            .from('perizinan')
            .select('id, keperluan, status, tanggal_keluar, rencana_kembali, created_at, id_santri, santri:id_santri(nama_lengkap)')
            .in('status', ['diajukan', 'disetujui'])
            .order('created_at', { ascending: false })
            .limit(20),
          TIMEOUT
        ).catch(() => ({ data: [], error: null })),
        withTimeout(
          supabase
            .from('presensi_tahfidz')
            .select('id, juz, nama_surah, tipe_setoran, nilai_kelancaran, created_at, id_santri, santri:id_santri(nama_lengkap)')
            .eq('tanggal_setoran', today)
            .order('created_at', { ascending: false })
            .limit(20),
          TIMEOUT
        ).catch(() => ({ data: [], error: null })),
        withTimeout(
          supabase
            .from('absensi_sholat')
            .select('id, waktu_sholat, status, keterangan, created_at, id_santri, santri:id_santri(nama_lengkap)')
            .eq('tanggal', today)
            .order('created_at', { ascending: false })
            .limit(20),
          TIMEOUT
        ).catch(() => ({ data: [], error: null })),
        withTimeout(
          supabase
            .from('absensi')
            .select('id, id_jadwal, status, keterangan, created_at, id_santri, santri:id_santri(nama_lengkap), jadwal_pelajaran:id_jadwal(mapel:id_mapel(nama_mapel))')
            .eq('tanggal', today)
            .neq('status', 'Hadir')
            .order('created_at', { ascending: false })
            .limit(20),
          TIMEOUT
        ).catch(() => ({ data: [], error: null })),
      ]);

      if (!mountedRef.current) return;

      // 1. Process Pegawai Attendance
      const totalPegawaiCount = totalPegawaiRes.count || 0;
      const rawPegawaiAbsensi = (pegawaiAbsenRes.data as PegawaiAbsensiItem[]) || [];
      const pegHadir = rawPegawaiAbsensi.filter((p) => p.status === 'Hadir').length;
      const pegTerlambat = rawPegawaiAbsensi.filter((p) => p.status === 'Terlambat').length;
      const pegIzin = rawPegawaiAbsensi.filter((p) => p.status === 'Izin' || p.status === 'Sakit').length;
      const pegAlpha = rawPegawaiAbsensi.filter((p) => p.status === 'Alpha').length;

      setPegawaiStats({
        total: totalPegawaiCount,
        hadir: pegHadir,
        terlambat: pegTerlambat,
        izin: pegIzin,
        alpha: pegAlpha,
      });
      setPegawaiAbsensi(rawPegawaiAbsensi);

      // 2. Process Santri Attendance
      const totalSantriCount = totalSantriRes.count || 0;
      const rawSantriAbsensi = (santriAbsenRes.data as SantriAbsensiItem[]) || [];
      const sanHadir = rawSantriAbsensi.filter((s) => s.status === 'Hadir').length;
      const sanTerlambat = rawSantriAbsensi.filter((s) => s.status === 'Terlambat').length;
      const sanIzin = rawSantriAbsensi.filter((s) => s.status === 'Izin' || s.status === 'Sakit').length;
      const sanAlpha = rawSantriAbsensi.filter((s) => s.status === 'Alpha').length;

      setSantriStats({
        total: totalSantriCount,
        hadir: sanHadir,
        terlambat: sanTerlambat,
        izin: sanIzin,
        alpha: sanAlpha,
      });
      setSantriAbsensi(rawSantriAbsensi);

      // 3. Process Payments
      const rawPayments = (payRes.data as PaymentItem[]) || [];
      const sumToday = rawPayments.reduce((acc: number, curr) => acc + (Number(curr.total_bayar) || 0), 0);
      setPayments(rawPayments);
      setTotalBayarHariIni(sumToday);

      // 4. Other Modules
      setPermits((permRes.data as PermitItem[]) || []);
      setTahfidz((tahfRes.data as TahfidzItem[]) || []);
      setSholat((solRes.data as SholatItem[]) || []);
      setKbm((kbmRes.data as KbmItem[]) || []);

      setLoading(false);
      setError(null);
    } catch (err: unknown) {
      console.error('Executive Dashboard Error:', err);
      if (mountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data.';
        setError(msg);
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      await fetchDashboardData();
    };
    void init();

    const interval = setInterval(() => {
      if (isMounted) {
        void fetchDashboardData();
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setFullDate(
        now.toLocaleDateString('id-ID', {
          timeZone: 'Asia/Makassar',
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );

      try {
        const hijri = now.toLocaleDateString('id-ID', {
          calendar: 'islamic-umalqura',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        setHijriDate(hijri);
      } catch {
        try {
          const hijri = now.toLocaleDateString('id-ID', {
            calendar: 'islamic',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
          setHijriDate(hijri);
        } catch {
          setHijriDate('');
        }
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (dashboardRef.current?.requestFullscreen) {
          await dashboardRef.current.requestFullscreen();
        } else if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err: unknown) {
      console.error('Fullscreen toggle failed:', err);
    }
  };

  const pegPresensiTotal = pegawaiStats.hadir + pegawaiStats.terlambat;
  const pegRate = pegawaiStats.total > 0 ? Math.round((pegPresensiTotal / pegawaiStats.total) * 100) : 0;

  const sanPresensiTotal = santriStats.hadir + santriStats.terlambat;
  const sanRate = santriStats.total > 0 ? Math.round((sanPresensiTotal / santriStats.total) * 100) : 0;

  return (
    <div
      ref={dashboardRef}
      className={`bg-slate-50/90 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white ${
        isFullscreen
          ? 'fixed inset-0 z-[99999] overflow-hidden w-screen h-screen p-3 md:p-4 flex flex-col justify-between gap-3 bg-slate-50 dark:bg-slate-950'
          : 'min-h-screen p-4 md:p-6 space-y-5'
      }`}
    >
      {/* ─── Top Header & Command Center Bar ─── */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-xl backdrop-blur-md shrink-0 ${isFullscreen ? 'p-3 px-4' : 'p-4 md:p-5'}`}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-md shadow-emerald-500/10 dark:shadow-emerald-900/30 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Activity className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`${isFullscreen ? 'text-base' : 'text-lg md:text-xl'} font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none`}>Dashboard Eksekutif</h1>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400 text-[10px] font-extrabold tracking-wider animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Monitoring Real-Time Operasional & Disiplin Pesantren</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center flex-wrap">
          {/* Tampilkan Tanggal Masehi, Hijriah & Jam hanya saat Fullscreen */}
          {isFullscreen && (
            <>
              {/* Tanggal Masehi & Hijriah */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-bold text-slate-700 dark:text-slate-200">
                <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{fullDate}</span>
                {hijriDate && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700 font-normal">|</span>
                    <Moon className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{hijriDate} H</span>
                  </>
                )}
              </div>

              {/* Jam WITA */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-emerald-500/30 shadow-inner">
                <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-bold tabular-nums tracking-widest text-emerald-700 dark:text-emerald-300">
                  {clock} <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">WITA</span>
                </span>
              </div>
            </>
          )}

          {/* Auto Refresh indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-medium">
            <RefreshCw className={`h-3 w-3 text-emerald-600 dark:text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
            <span>{REFRESH_INTERVAL_MS / 1000}s</span>
          </div>

          {/* Tombol Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Keluar dari Layar Penuh (Esc)' : 'Tampilan Layar Penuh / Fullscreen TV'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/40 transition-all duration-200 shadow-sm"
          >
            {isFullscreen ? (
              <>
                <Minimize className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden md:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden md:inline">Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30 px-3.5 py-2 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Executive KPI Scorecards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {/* KPI 1: Kehadiran Pegawai */}
        <div className={`rounded-xl bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300 ${isFullscreen ? 'p-3' : 'p-4'}`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Presensi Pegawai
            </span>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 tabular-nums">
              {pegRate}%
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums leading-none">{pegPresensiTotal}</span>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">/ {pegawaiStats.total} Pegawai</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min(pegRate, 100)}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{pegawaiStats.hadir} Hadir</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">{pegawaiStats.terlambat} Telat</span>
            <span className="text-blue-600 dark:text-blue-400">{pegawaiStats.izin} Izin</span>
            <span className="text-rose-600 dark:text-rose-400">{pegawaiStats.alpha} Alpha</span>
          </div>
        </div>

        {/* KPI 2: Kehadiran Santri */}
        <div className={`rounded-xl bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg relative overflow-hidden group hover:border-sky-500/40 transition-all duration-300 ${isFullscreen ? 'p-3' : 'p-4'}`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              Presensi Santri
            </span>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/30 tabular-nums">
              {sanRate}%
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums leading-none">{sanPresensiTotal}</span>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">/ {santriStats.total} Santri</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${Math.min(sanRate, 100)}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-sky-600 dark:text-sky-400 font-bold">{santriStats.hadir} Hadir</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">{santriStats.terlambat} Telat</span>
            <span className="text-blue-600 dark:text-blue-400">{santriStats.izin} Izin</span>
            <span className="text-rose-600 dark:text-rose-400">{santriStats.alpha} Alpha</span>
          </div>
        </div>

        {/* KPI 3: Keuangan Pemasukan */}
        <div className={`rounded-xl bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all duration-300 ${isFullscreen ? 'p-3' : 'p-4'}`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              Penerimaan Hari Ini
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30">
              {payments.length} Trx
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-lg font-black text-amber-600 dark:text-amber-300 tabular-nums leading-none">
              {formatRp(totalBayarHariIni)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-amber-500 w-full" />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span>SPP & Tagihan</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> Kasir Aktif
            </span>
          </div>
        </div>

        {/* KPI 4: Izin Santri Aktif */}
        <div className={`rounded-xl bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg relative overflow-hidden group hover:border-purple-500/40 transition-all duration-300 ${isFullscreen ? 'p-3' : 'p-4'}`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <DoorOpen className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              Perizinan Santri
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30">
              Aktif
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums leading-none">{permits.length}</span>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Santri di Luar</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-purple-500 w-3/4" />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-amber-600 dark:text-amber-400 font-semibold">{permits.filter((p) => p.status === 'diajukan').length} Menunggu</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{permits.filter((p) => p.status === 'disetujui').length} Disetujui</span>
          </div>
        </div>
      </div>

      {/* ─── Main Content Grid (100% Fit Full HD TV) ─── */}
      <div className={`grid gap-3 ${isFullscreen ? 'flex-1 min-h-0 grid-cols-12 overflow-hidden' : 'grid-cols-1 lg:grid-cols-2'}`}>
        
        {/* Kolom 1: Live Presensi Pegawai (Span 4 di TV Fullscreen) */}
        <div className={isFullscreen ? 'col-span-4 h-full flex flex-col min-h-0' : ''}>
          <LiveFeedCard
            icon={Briefcase}
            title="Live Presensi Pegawai"
            subtitle="Pendidik & staf scan hari ini"
            count={`${pegawaiAbsensi.length} Scan`}
            accent="emerald"
            loading={loading}
            isEmpty={!loading && pegawaiAbsensi.length === 0}
            isFullscreen={isFullscreen}
          >
            {pegawaiAbsensi.map((absen) => {
              const p = absen.pegawai;
              const namaFormatted = p ? formatPegawaiName(p.nama_lengkap, p.gelar_depan, p.gelar_belakang) : 'Pegawai';
              return (
                <div key={absen.id} className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                      {p?.foto_url ? (
                        <Image src={p.foto_url} alt={namaFormatted} width={32} height={32} className="w-full h-full object-cover" unoptimized />
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{namaFormatted.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{namaFormatted}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{p?.jabatan || 'Pegawai'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-right">
                    <div>
                      <div className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-300">
                        {formatTimeOnly(absen.jam_masuk)}
                      </div>
                      {absen.jam_keluar && (
                        <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
                          {formatTimeOnly(absen.jam_keluar)}
                        </div>
                      )}
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${statusBadge(absen.status)}`}>
                      {absen.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </LiveFeedCard>
        </div>

        {/* Kolom 2: Live Presensi Santri (Span 4 di TV Fullscreen) */}
        <div className={isFullscreen ? 'col-span-4 h-full flex flex-col min-h-0' : ''}>
          <LiveFeedCard
            icon={GraduationCap}
            title="Live Presensi Santri"
            subtitle="Kehadiran santri gerbang / asrama"
            count={`${santriAbsensi.length} Scan`}
            accent="sky"
            loading={loading}
            isEmpty={!loading && santriAbsensi.length === 0}
            isFullscreen={isFullscreen}
          >
            {santriAbsensi.map((absen) => {
              const s = absen.santri;
              const namaSantri = s?.nama_lengkap || 'Santri';
              const rombel = s?.kelas_formal?.nama_kelas || s?.rombel_saat_ini || (s?.nis ? `NIS: ${s.nis}` : 'Santri');
              return (
                <div key={absen.id} className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                      {s?.foto_url ? (
                        <Image src={s.foto_url} alt={namaSantri} width={32} height={32} className="w-full h-full object-cover" unoptimized />
                      ) : (
                        <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">{namaSantri.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{namaSantri}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{rombel}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-right">
                    <div>
                      <div className="text-[11px] font-mono font-bold text-sky-600 dark:text-sky-300">
                        {formatTimeOnly(absen.jam_masuk)}
                      </div>
                      {absen.jam_keluar && (
                        <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
                          {formatTimeOnly(absen.jam_keluar)}
                        </div>
                      )}
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${statusBadge(absen.status)}`}>
                      {absen.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </LiveFeedCard>
        </div>

        {/* Kolom 3: 4 Modul Operasional (Span 4 di TV Fullscreen dalam 2x2 grid) */}
        <div className={isFullscreen ? 'col-span-4 h-full grid grid-cols-2 grid-rows-2 gap-2.5 min-h-0' : 'col-span-1 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3'}>
          {/* Keuangan Transaksi */}
          <LiveFeedCard
            icon={Wallet}
            title="Keuangan"
            subtitle="Pembayaran terbaru"
            count={payments.length}
            accent="amber"
            loading={loading}
            isEmpty={!loading && payments.length === 0}
            isFullscreen={isFullscreen}
          >
            {payments.map((pay) => (
              <div key={pay.id} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{pay.santri?.nama_lengkap || 'Santri'}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 truncate">SPP / Tagihan</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">{formatRp(Number(pay.total_bayar))}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{timeAgo(pay.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </LiveFeedCard>

          {/* Perizinan Santri */}
          <LiveFeedCard
            icon={DoorOpen}
            title="Perizinan"
            subtitle="Izin keluar/pulang"
            count={permits.length}
            accent="violet"
            loading={loading}
            isEmpty={!loading && permits.length === 0}
            isFullscreen={isFullscreen}
          >
            {permits.map((p) => (
              <div key={p.id} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.santri?.nama_lengkap || 'Santri'}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 truncate">{p.keperluan}</p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-0.5">
                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded border ${statusBadge(p.status)}`}>
                      {p.status === 'diajukan' ? 'PENDING' : 'ACC'}
                    </span>
                    <span className="text-[8px] text-slate-400">{timeAgo(p.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </LiveFeedCard>

          {/* Setoran Tahfidz */}
          <LiveFeedCard
            icon={BookOpen}
            title="Tahfidz"
            subtitle="Setoran hafalan"
            count={tahfidz.length}
            accent="blue"
            loading={loading}
            isEmpty={!loading && tahfidz.length === 0}
            isFullscreen={isFullscreen}
          >
            {tahfidz.map((t) => (
              <div key={t.id} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{t.santri?.nama_lengkap || 'Santri'}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 truncate">Juz {t.juz} &middot; {t.nama_surah}</p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-0.5">
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                      t.nilai_kelancaran === 'A'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                        : t.nilai_kelancaran === 'B'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                    }`}>
                      {t.nilai_kelancaran}
                    </span>
                    <span className="text-[8px] text-slate-400 capitalize">{t.tipe_setoran}</span>
                  </div>
                </div>
              </div>
            ))}
          </LiveFeedCard>

          {/* Monitoring Sholat Berjamaah */}
          <LiveFeedCard
            icon={Moon}
            title="Sholat"
            subtitle="Presensi jamaah"
            count={sholat.length}
            accent="rose"
            loading={loading}
            isEmpty={!loading && sholat.length === 0}
            isFullscreen={isFullscreen}
          >
            {sholat.map((s) => (
              <div key={s.id} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.santri?.nama_lengkap || 'Santri'}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 truncate">
                      <span className="font-semibold text-rose-600 dark:text-rose-400">{s.waktu_sholat}</span>
                      {s.keterangan ? ` · ${s.keterangan}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-0.5">
                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded border ${statusBadge(s.status)}`}>
                      {s.status}
                    </span>
                    <span className="text-[8px] text-slate-400">{timeAgo(s.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </LiveFeedCard>
        </div>
      </div>

      {/* ─── KBM Status & Monitoring Summary Bar ─── */}
      <div className={`rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 ${isFullscreen ? 'p-2.5 px-3.5' : 'p-4 md:p-5'}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 flex items-center justify-center shrink-0">
            <School className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Monitoring KBM Hari Ini</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {kbm.length === 0
                ? 'Semua santri tercatat hadir pada jam pelajaran aktif.'
                : `${kbm.length} santri berhalangan hadir pada sesi KBM.`}
            </p>
          </div>
        </div>

        {kbm.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 shrink-0">
            {kbm.slice(0, 4).map((item) => (
              <div key={item.id} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] shrink-0 flex items-center gap-1.5">
                <span className="font-bold text-slate-800 dark:text-white truncate max-w-[90px]">{item.santri?.nama_lengkap || 'Santri'}</span>
                <span className={`text-[8px] font-extrabold px-1 py-0.2 rounded border ${statusBadge(item.status)}`}>
                  {item.status}
                </span>
              </div>
            ))}
            {kbm.length > 4 && (
              <span className="text-[10px] text-slate-400 font-semibold">+{kbm.length - 4} lainnya</span>
            )}
          </div>
        )}
      </div>

      {/* ─── Footer ─── */}
      {!isFullscreen && (
        <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800/80 pt-4 shrink-0">
          <span>SIM Pesantren &copy; {new Date().getFullYear()} &middot; Auto-refresh real-time {REFRESH_INTERVAL_MS / 1000}s</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-semibold text-slate-600 dark:text-slate-400">Server Connected</span>
          </div>
        </div>
      )}
    </div>
  );
}
