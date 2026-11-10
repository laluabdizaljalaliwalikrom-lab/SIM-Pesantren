'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Users,
  BookOpen,
  Wallet,
  School,
  Home,
  GraduationCap,
  Briefcase,
  CreditCard,
  Cog,
  ShieldCheck,
  BarChart4,
  ArrowRight,
  TrendingUp,
  ArrowUpRight,
  CalendarCheck,
  ClipboardList,
  Megaphone,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  AlertCircle,
  Activity,
  Layers,
  FileText,
  Calendar,
  LayoutDashboard,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import Badge from '@/components/ui/badge';
import EmptyState from '@/components/empty-state';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Pagi';
  if (h < 15) return 'Siang';
  if (h < 18) return 'Sore';
  return 'Malam';
}

interface RecentActivityItem {
  id: string;
  santri_nama: string;
  santri_nis: string;
  kategori: string;
  nominal: number;
  tanggal: string;
  status: string;
}

const emptySubscribe = () => () => {};

export default function AdminDashboardHome() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [stats, setStats] = useState({
    totalSantri: 0,
    santriIzin: 0,
    tahfidzHariIni: 0,
    saldoKas: 0,
    totalPegawai: 0,
    totalKamar: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Admin');
  const [userRole, setUserRole] = useState('Super Admin');
  const [permissions, setPermissions] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentActivityItem[]>([]);
  const [chartTab, setChartTab] = useState<'all' | 'tahfidz' | 'presensi'>('all');

  const isSuperAdmin = userRole === 'Super Admin';

  const pathModuleMap: Record<string, string> = {
    '/lembaga': 'Lembaga',
    '/santri': 'Santri',
    '/pegawai': 'Kepegawaian',
    '/asrama': 'Asrama',
    '/tahfidz': 'Tahfidz',
    '/akademik': 'Akademik',
    '/pembayaran': 'Keuangan',
    '/keuangan': 'Keuangan',
    '/laporan': 'Keuangan',
    '/ppdb': 'PPDB',
    '/siaran': 'Siaran',
  };

  const canAccessModule = (href: string): boolean => {
    if (href === '/admin') return true;
    const moduleName = pathModuleMap[href];
    if (moduleName && !isSuperAdmin) {
      const modPerm = permissions.find(
        (p) => p.feature?.toLowerCase() === moduleName.toLowerCase()
      );
      return !!(modPerm && modPerm.can_view);
    }
    return true;
  };

  useEffect(() => {
    async function loadDashboard() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nama_lengkap, role, id_role')
            .eq('id', user.id)
            .single();

          if (profile) {
            setUserName(profile.nama_lengkap || 'Admin');
            setUserRole(profile.role || 'Admin');
            if (profile.role !== 'Super Admin' && profile.id_role) {
              const { data: perms } = await supabase
                .from('role_permissions')
                .select('*')
                .eq('id_role', profile.id_role);
              setPermissions(perms || []);
            }
          }
        }

        // 1. Total Santri
        const { count: santriCount } = await supabase
          .from('santri')
          .select('*', { count: 'exact', head: true });

        // 2. Santri Izin
        const { count: izinCount } = await supabase
          .from('perizinan')
          .select('*', { count: 'exact', head: true })
          .in('status', ['Aktif', 'disetujui']);

        // 3. Tahfidz Hari Ini
        const today = new Date().toISOString().split('T')[0];
        const { count: tahfidzCount } = await supabase
          .from('presensi_tahfidz')
          .select('*', { count: 'exact', head: true })
          .eq('tanggal_setoran', today);

        // 4. Saldo Kas & Pembayaran
        const { data: groupPayments } = await supabase
          .from('pembayaran_group')
          .select('total_bayar');

        const { data: directPayments } = await supabase
          .from('pembayaran')
          .select('jumlah')
          .eq('status', 'Lunas')
          .is('id_group', null);

        const saldoDariGroup =
          groupPayments?.reduce((s, p) => s + Number(p.total_bayar || 0), 0) || 0;
        const saldoDirect =
          directPayments?.reduce((s, p) => s + Number(p.jumlah || 0), 0) || 0;
        const totalSaldo = saldoDariGroup + saldoDirect;

        // 5. Total Pegawai
        const { count: pegawaiCount } = await supabase
          .from('pegawai')
          .select('*', { count: 'exact', head: true });

        // 6. Total Kamar
        const { count: kamarCount } = await supabase
          .from('kamar')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalSantri: santriCount || 0,
          santriIzin: izinCount || 0,
          tahfidzHariIni: tahfidzCount || 0,
          saldoKas: totalSaldo,
          totalPegawai: pegawaiCount || 0,
          totalKamar: kamarCount || 0,
        });

        // 7. Recent Transactions
        const { data: recentPayData } = await supabase
          .from('pembayaran')
          .select(
            `
            id,
            jumlah,
            status,
            tanggal_bayar,
            created_at,
            santri:santri(nama_lengkap, nis)
          `
          )
          .order('created_at', { ascending: false })
          .limit(5);

        if (recentPayData && recentPayData.length > 0) {
          const formatted: RecentActivityItem[] = recentPayData.map((item: any) => ({
            id: item.id,
            santri_nama: item.santri?.nama_lengkap || 'Santri',
            santri_nis: item.santri?.nis || '-',
            kategori: 'Pembayaran Kasir / SPP',
            nominal: Number(item.jumlah || 0),
            tanggal: item.tanggal_bayar || item.created_at?.split('T')[0] || today,
            status: item.status || 'Lunas',
          }));
          setRecentTransactions(formatted);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  // Weekly dummy/fallback activity data for TailAdmin Statistics Chart
  const weeklyActivityData = [
    { day: 'Sen', tahfidz: 42, presensi: 185 },
    { day: 'Sel', tahfidz: 56, presensi: 192 },
    { day: 'Rab', tahfidz: 48, presensi: 188 },
    { day: 'Kam', tahfidz: 65, presensi: 195 },
    { day: 'Jum', tahfidz: 78, presensi: 204 },
    { day: 'Sab', tahfidz: 60, presensi: 198 },
    { day: 'Ahad', tahfidz: stats.tahfidzHariIni || 70, presensi: 200 },
  ];

  // All application modules in TailAdmin style
  const allModules = [
    {
      name: 'Santri & Data Induk',
      href: '/santri',
      icon: Users,
      desc: 'Pusat data induk santri, wali, dan biodata Dapodik',
      bgIcon: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      badge: `${stats.totalSantri} Santri`,
    },
    {
      name: 'Kasir & Pembayaran',
      href: '/pembayaran',
      icon: CreditCard,
      desc: 'Loket kasir, cetak kuitansi, & pembayaran tagihan',
      bgIcon: 'bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
      badge: 'Kasir',
    },
    {
      name: 'Tahfidz Tracker',
      href: '/tahfidz',
      icon: GraduationCap,
      desc: 'Pencatatan setoran hafalan Quran, hadits & mutabaah',
      bgIcon: 'bg-teal-50 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400',
      badge: 'Tahfidz',
    },
    {
      name: 'Absensi Santri',
      href: '/absen-santri',
      icon: CalendarCheck,
      desc: 'Scan QR presensi santri harian & rekap kehadiran',
      bgIcon: 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400',
      badge: 'Presensi',
    },
    {
      name: 'Kepegawaian',
      href: '/pegawai',
      icon: Briefcase,
      desc: 'Manajemen ustadz, guru, asatidz, & staf pesantren',
      bgIcon: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
      badge: `${stats.totalPegawai} Staf`,
    },
    {
      name: 'Asrama & Kamar',
      href: '/asrama',
      icon: Home,
      desc: 'Kamar santri, inventaris gedung, perizinan & asrama',
      bgIcon: 'bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
      badge: `${stats.totalKamar} Kamar`,
    },
    {
      name: 'Akademik',
      href: '/akademik',
      icon: BookOpen,
      desc: 'Jadwal pelajaran, mata pelajaran & input nilai rapor',
      bgIcon: 'bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400',
      badge: 'KBM',
    },
    {
      name: 'Lembaga & Sekolah',
      href: '/lembaga',
      icon: School,
      desc: 'Struktur madrasah, jenjang pendidikan & rombel kelas',
      bgIcon: 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
      badge: 'Unit',
    },
    {
      name: 'Keuangan & Laporan',
      href: '/keuangan',
      icon: Wallet,
      desc: 'Master pos biaya, tagihan santri, & arus kas pesantren',
      bgIcon: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      badge: 'Keuangan',
    },
    {
      name: 'PPDB Online',
      href: '/ppdb',
      icon: ClipboardList,
      desc: 'Pendaftaran santri baru, seleksi & gelombang masuk',
      bgIcon: 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400',
      badge: 'Baru',
    },
    {
      name: 'Siaran & Pengumuman',
      href: '/siaran',
      icon: Megaphone,
      desc: 'Broadcast pesan WhatsApp & email massal ke wali',
      bgIcon: 'bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400',
      badge: 'Siaran',
    },
    {
      name: 'Dashboard Eksekutif',
      href: '/dashboard-eksekutif',
      icon: BarChart4,
      desc: 'Laporan visual eksekutif untuk pimpinan pondok',
      bgIcon: 'bg-teal-50 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400',
      badge: 'Analitik',
    },
  ];

  const modules = allModules.filter((m) => canAccessModule(m.href));

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto">
      {/* 1. Page Header (Standard Tunggal GEMINI.md) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <LayoutDashboard className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            Dashboard Utama
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Ringkasan analitik operasional, metrik santri, tahfidz, dan keuangan pondok pesantren.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/santri"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all duration-200 active:scale-95"
          >
            <Users className="h-4 w-4" />
            + Tambah Santri
          </Link>
          <Link
            href="/pembayaran"
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all duration-200"
          >
            <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Buka Kasir
          </Link>
        </div>
      </div>

      {/* 2. TailAdmin Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 sm:p-8 text-white shadow-md shadow-emerald-900/10 dark:from-emerald-950 dark:via-zinc-900 dark:to-zinc-900 dark:border-zinc-800">
        {/* Ambient Decorative Shapes */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 dark:bg-emerald-500/20 backdrop-blur-md text-xs font-semibold text-white dark:text-emerald-300 border border-white/20 dark:border-emerald-500/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200" />
              </span>
              <span>Hak Akses: {userRole}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
              Selamat {getGreeting()},{' '}
              <span className="text-emerald-200 dark:text-emerald-400 underline decoration-emerald-300/40 underline-offset-4">
                {userName}
              </span>
              !
            </h2>

            <p className="text-emerald-50/90 dark:text-zinc-300 text-sm leading-relaxed">
              Selamat datang di portal administrasi <strong>SIM Pesantren</strong>.
              Seluruh sistem presensi, setoran tahfidz, dan arus keuangan kasir aktif dan terintegrasi secara real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isSuperAdmin && (
              <Link
                href="/pengaturan"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-white text-xs font-bold backdrop-blur-md border border-white/20 dark:border-zinc-700 transition-all active:scale-95 shadow-xs"
              >
                <Cog className="h-4 w-4" />
                Pengaturan Sistem
              </Link>
            )}

            <div className="flex items-center gap-3 rounded-xl bg-white/10 dark:bg-zinc-800/80 backdrop-blur-md border border-white/15 dark:border-zinc-700 px-4 py-2 text-white">
              <Sparkles className="h-4 w-4 text-emerald-300 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 dark:text-zinc-400">
                  Status Sistem
                </p>
                <p className="text-xs font-bold">Online & Terhubung</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TailAdmin Metric Cards Grid (EcommerceMetrics standard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Metric 1: Total Santri */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Users className="h-6 w-6" />
            </div>
            <Badge variant="light" color="success" size="sm">
              <TrendingUp className="h-3 w-3" />
              Aktif
            </Badge>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Total Santri
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {loading ? '...' : stats.totalSantri.toLocaleString('id-ID')}
              </h3>
            </div>
            <Link
              href="/santri"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              Detail
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Metric 2: Santri Izin */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <Badge variant="light" color="warning" size="sm">
              Perizinan
            </Badge>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Santri Izin & Sakit
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {loading ? '...' : stats.santriIzin.toLocaleString('id-ID')}
              </h3>
            </div>
            <Link
              href="/asrama"
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
            >
              Lihat Izin
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Metric 3: Tahfidz Hari Ini */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400">
              <GraduationCap className="h-6 w-6" />
            </div>
            <Badge variant="light" color="info" size="sm">
              Hari Ini
            </Badge>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Setoran Tahfidz
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {loading ? '...' : stats.tahfidzHariIni.toLocaleString('id-ID')}
              </h3>
            </div>
            <Link
              href="/tahfidz"
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5"
            >
              Input Setoran
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Metric 4: Saldo Kas */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
              <Wallet className="h-6 w-6" />
            </div>
            <Badge variant="light" color="primary" size="sm">
              Kasir Terpadu
            </Badge>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Penerimaan Kas
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 truncate">
                {loading ? '...' : `Rp${stats.saldoKas.toLocaleString('id-ID')}`}
              </h3>
            </div>
            <Link
              href="/keuangan"
              className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-0.5 shrink-0"
            >
              Laporan
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. TailAdmin Main Charts & Analytics Row (StatisticsChart + MonthlyTarget) */}
      <div className="grid grid-cols-12 gap-5 md:gap-6">
        {/* Left: TailAdmin StatisticsChart (AreaChart Recharts) */}
        <div className="col-span-12 xl:col-span-7 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Statistik Aktivitas Mingguan
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Tren setoran tahfidz dan presensi santri 7 hari terakhir
              </p>
            </div>

            {/* Filter Tabs (TailAdmin ChartTab style) */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-950 p-1 rounded-xl border border-slate-200/60 dark:border-zinc-800 self-start sm:self-auto">
              <button
                onClick={() => setChartTab('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  chartTab === 'all'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setChartTab('tahfidz')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  chartTab === 'tahfidz'
                    ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                Tahfidz
              </button>
              <button
                onClick={() => setChartTab('presensi')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  chartTab === 'presensi'
                    ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-xs'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                Presensi
              </button>
            </div>
          </div>

          {/* Chart Rendering */}
          <div className="h-64 sm:h-72 w-full pt-2">
            {isClient ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={weeklyActivityData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorTahfidz" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorPresensi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                    className="dark:stroke-zinc-800"
                  />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderColor: '#27272a',
                      borderRadius: '0.75rem',
                      color: '#f4f4f5',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                  />
                  {(chartTab === 'all' || chartTab === 'tahfidz') && (
                    <Area
                      type="monotone"
                      dataKey="tahfidz"
                      name="Setoran Tahfidz"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorTahfidz)"
                    />
                  )}
                  {(chartTab === 'all' || chartTab === 'presensi') && (
                    <Area
                      type="monotone"
                      dataKey="presensi"
                      name="Presensi Kehadiran"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorPresensi)"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
                Memuat grafik statistik...
              </div>
            )}
          </div>
        </div>

        {/* Right: TailAdmin MonthlyTarget (Progress & Target Card) */}
        <div className="col-span-12 xl:col-span-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                Target Capaian Bulan Ini
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Progres setoran hafalan & ketertiban SPP
              </p>
            </div>
            <Badge variant="light" color="primary" size="sm">
              November 2026
            </Badge>
          </div>

          {/* Radial / Gauge Visualization in TailAdmin Style */}
          <div className="my-4 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center w-36 h-36">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background track circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  strokeWidth="8"
                  className="text-slate-100 dark:text-zinc-800"
                  stroke="currentColor"
                  fill="transparent"
                />
                {/* Progress bar circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  strokeWidth="8"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 * (1 - 0.85)}
                  strokeLinecap="round"
                  className="text-emerald-500 dark:text-emerald-400 transition-all duration-1000 ease-out"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  85%
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Tercapai
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 text-center max-w-xs mt-3 leading-relaxed">
              Target bulanan hafalan Al-Quran santri melampaui rata-rata capaian kuartal ini.
            </p>
          </div>

          {/* Breakdown Mini Progress Bars */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                <span>Setoran Juz Al-Quran</span>
                <span className="text-emerald-600 dark:text-emerald-400">425 / 500 Juz</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: '85%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                <span>Kelancaran Tagihan SPP</span>
                <span className="text-cyan-600 dark:text-cyan-400">88.5%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                  style={{ width: '88.5%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. TailAdmin Modul Layanan Pesantren (App Modules Grid) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Modul Layanan SIM Pesantren
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Pintas cepat ke modul administrasi, akademik, asrama, dan perizinan.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500">
            {modules.length} Modul Tersedia
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.name}
                href={mod.href}
                className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-emerald-500/40 dark:hover:border-emerald-500/30 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${mod.bgIcon} transition-colors group-hover:bg-emerald-600 group-hover:text-white`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    {mod.badge && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {mod.badge}
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-slate-800 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {mod.name}
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                    {mod.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-semibold text-slate-400 dark:text-zinc-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  <span>Buka Modul</span>
                  <ArrowRight className="h-3.5 w-3.5 transform transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 6. TailAdmin Recent Activity Table (RecentOrders style) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <CreditCard className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
              Transaksi & Aktivitas Kasir Terkini
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Daftar penerimaan pembayaran santri dan kuitansi terbaru
            </p>
          </div>

          <Link
            href="/pembayaran"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors self-start sm:self-auto"
          >
            <span>Semua Transaksi</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  <th className="pb-3 px-3">Santri / Penyetor</th>
                  <th className="pb-3 px-3">Kategori</th>
                  <th className="pb-3 px-3">Tanggal Bayar</th>
                  <th className="pb-3 px-3 text-right">Nominal</th>
                  <th className="pb-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs">
                {recentTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs uppercase">
                          {tx.santri_nama.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-zinc-100">
                            {tx.santri_nama}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                            NIS: {tx.santri_nis}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-600 dark:text-zinc-300">
                      {tx.kategori}
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-zinc-400">
                      {tx.tanggal}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                      Rp{tx.nominal.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge
                        variant="light"
                        color={tx.status === 'Lunas' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {tx.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={CreditCard}
            title="Belum Ada Transaksi Terbaru"
            description="Riwayat transaksi pembayaran loket kasir atau kuitansi santri akan tercatat otomatis di sini."
            action={{
              label: '+ Buka Kasir Pembayaran',
              onClick: () => (window.location.href = '/pembayaran'),
            }}
          />
        )}
      </div>

      {/* 7. System Guidelines & Information Notice Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mt-0.5">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Pedoman Alur Pengisian SIM Pesantren
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
              Pastikan data <strong>Lembaga & Kelas</strong> serta <strong>Data Santri</strong> telah lengkap sebelum mencatat tagihan keuangan dan setoran tahfidz harian.
            </p>
          </div>
        </div>

        <Link
          href="/santri"
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-800 dark:text-zinc-200 rounded-xl font-bold text-xs transition-colors shrink-0"
        >
          <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          Kelola Data Santri
        </Link>
      </div>
    </div>
  );
}
