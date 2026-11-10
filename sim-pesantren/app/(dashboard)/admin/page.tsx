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
  Sparkles,
  ClipboardList,
  CalendarCheck,
  Megaphone,
  Info,
  Layers,
} from 'lucide-react';
import PageBreadcrumb from '@/components/common/PageBreadcrumb';
import EcommerceMetrics from '@/components/ecommerce/EcommerceMetrics';
import MonthlySalesChart from '@/components/ecommerce/MonthlySalesChart';
import MonthlyTarget from '@/components/ecommerce/MonthlyTarget';
import StatisticsChart from '@/components/ecommerce/StatisticsChart';
import DemographicCard from '@/components/ecommerce/DemographicCard';
import RecentOrders, {
  RecentTransactionItem,
} from '@/components/ecommerce/RecentOrders';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Pagi';
  if (h < 15) return 'Siang';
  if (h < 18) return 'Sore';
  return 'Malam';
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
  const [recentTransactions, setRecentTransactions] = useState<
    RecentTransactionItem[]
  >([]);

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
          groupPayments?.reduce((s, p) => s + Number(p.total_bayar || 0), 0) ||
          0;
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
          const formatted: RecentTransactionItem[] = recentPayData.map(
            (item: any) => ({
              id: item.id,
              santri_nama: item.santri?.nama_lengkap || 'Santri',
              santri_nis: item.santri?.nis || '-',
              kategori: 'Pembayaran Kasir / SPP',
              nominal: Number(item.jumlah || 0),
              tanggal:
                item.tanggal_bayar ||
                item.created_at?.split('T')[0] ||
                today,
              status: item.status || 'Lunas',
            })
          );
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

  // Modul layanan pesantren
  const allModules = [
    {
      name: 'Santri & Data Induk',
      href: '/santri',
      icon: Users,
      desc: 'Pusat data induk santri, wali, dan biodata Dapodik santri',
      bgIcon: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      badge: `${stats.totalSantri} Santri`,
    },
    {
      name: 'Kasir & Pembayaran',
      href: '/pembayaran',
      icon: CreditCard,
      desc: 'Loket kasir, cetak kuitansi resmi, & pelunasan tagihan SPP',
      bgIcon: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
      badge: 'Kasir',
    },
    {
      name: 'Tahfidz Tracker',
      href: '/tahfidz',
      icon: GraduationCap,
      desc: 'Pencatatan setoran hafalan Quran, hadits, & mutabaah santri',
      bgIcon: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400',
      badge: 'Tahfidz',
    },
    {
      name: 'Absensi Santri',
      href: '/absen-santri',
      icon: CalendarCheck,
      desc: 'Scan QR presensi santri harian & rekapitulasi kehadiran',
      bgIcon: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
      badge: 'Presensi',
    },
    {
      name: 'Kepegawaian',
      href: '/pegawai',
      icon: Briefcase,
      desc: 'Manajemen ustadz, asatidz, guru madrasah, & staf pesantren',
      bgIcon: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      badge: `${stats.totalPegawai} Staf`,
    },
    {
      name: 'Asrama & Kamar',
      href: '/asrama',
      icon: Home,
      desc: 'Kamar santri, inventaris gedung, perizinan pulang & asrama',
      bgIcon: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
      badge: `${stats.totalKamar} Kamar`,
    },
    {
      name: 'Akademik KBM',
      href: '/akademik',
      icon: BookOpen,
      desc: 'Jadwal pelajaran madrasah, mata pelajaran & input rapor',
      bgIcon: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400',
      badge: 'KBM',
    },
    {
      name: 'Lembaga & Madrasah',
      href: '/lembaga',
      icon: School,
      desc: 'Struktur madrasah, jenjang MTs/MA & rombel kelas santri',
      bgIcon: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
      badge: 'Unit',
    },
    {
      name: 'Keuangan & Laporan',
      href: '/keuangan',
      icon: Wallet,
      desc: 'Master pos biaya, tagihan santri, & arus kas masuk-keluar',
      bgIcon: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      badge: 'Keuangan',
    },
    {
      name: 'PPDB Online',
      href: '/ppdb',
      icon: ClipboardList,
      desc: 'Penerimaan santri baru, ujian seleksi, & gelombang pendaftaran',
      bgIcon: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
      badge: 'Baru',
    },
    {
      name: 'Siaran & Broadcast',
      href: '/siaran',
      icon: Megaphone,
      desc: 'Broadcast pengumuman ke wali santri via WhatsApp terpadu',
      bgIcon: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
      badge: 'Siaran',
    },
    {
      name: 'Dashboard Eksekutif',
      href: '/dashboard-eksekutif',
      icon: BarChart4,
      desc: 'Ringkasan visual analitik pesantren untuk pimpinan & kyai',
      bgIcon: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400',
      badge: 'Analitik',
    },
  ];

  const modules = allModules.filter((m) => canAccessModule(m.href));

  return (
    <div className="space-y-6">
      {/* 1. TailAdmin Standard PageBreadcrumb */}
      <PageBreadcrumb pageTitle="Admin Dashboard" />

      {/* 2. TailAdmin Welcome Hero Card */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 md:p-8 dark:border-gray-800 dark:bg-gray-900 shadow-theme-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Hak Akses: {userRole}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-800 dark:text-white/90 leading-tight">
              Selamat {getGreeting()},{' '}
              <span className="text-emerald-600 dark:text-emerald-400">
                {userName}
              </span>
              !
            </h2>

            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              Selamat datang di portal administrasi <strong>SIM Pesantren</strong> berbasis template <strong>TailAdmin</strong>.
              Seluruh rekapan presensi, setoran hafalan Quran, dan arus kas loket kasir terhubung secara real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isSuperAdmin && (
              <Link
                href="/pengaturan"
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-xs font-semibold shadow-theme-xs dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/5 transition-colors"
              >
                <Cog className="h-4 w-4" />
                <span>Pengaturan Sistem</span>
              </Link>
            )}

            <Link
              href="/santri"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-theme-xs transition-colors"
            >
              <Users className="h-4 w-4" />
              <span>+ Tambah Santri</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. TailAdmin Master Dashboard Grid */}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Left Col Top: EcommerceMetrics + MonthlySalesChart (col-span-12 xl:col-span-7) */}
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <EcommerceMetrics
            totalSantri={stats.totalSantri}
            saldoKas={stats.saldoKas}
            tahfidzHariIni={stats.tahfidzHariIni}
            santriIzin={stats.santriIzin}
            loading={loading}
          />

          <MonthlySalesChart />
        </div>

        {/* Right Col Top: MonthlyTarget (col-span-12 xl:col-span-5) */}
        <div className="col-span-12 xl:col-span-5">
          <MonthlyTarget />
        </div>

        {/* Middle: StatisticsChart (col-span-12) */}
        <div className="col-span-12">
          <StatisticsChart />
        </div>

        {/* Left Col Bottom: DemographicCard (col-span-12 xl:col-span-5) */}
        <div className="col-span-12 xl:col-span-5">
          <DemographicCard totalSantri={stats.totalSantri} />
        </div>

        {/* Right Col Bottom: RecentOrders (col-span-12 xl:col-span-7) */}
        <div className="col-span-12 xl:col-span-7">
          <RecentOrders transactions={recentTransactions} />
        </div>

        {/* Full Width Bottom: Modul Layanan SIM Pesantren (TailAdmin ComponentCard layout) */}
        <div className="col-span-12">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-gray-900 shadow-theme-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Modul Layanan SIM Pesantren
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Akses langsung ke seluruh sistem administrasi, kasir keuangan, KBM madrasah, dan asrama santri
                </p>
              </div>

              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
                {modules.length} Modul Aktif
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {modules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <Link
                    key={mod.name}
                    href={mod.href}
                    className="group relative flex flex-col justify-between p-5 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 hover:border-emerald-500/40 dark:hover:border-emerald-500/30 shadow-theme-xs hover:shadow-theme-sm transition-all duration-200"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl ${mod.bgIcon} group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        {mod.badge && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {mod.badge}
                          </span>
                        )}
                      </div>

                      <h4 className="font-semibold text-sm text-gray-800 dark:text-white/90 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {mod.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {mod.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs font-medium text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      <span>Buka Modul</span>
                      <ArrowRight className="h-3.5 w-3.5 transform transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Full Width: Guidelines Notice Banner */}
        <div className="col-span-12">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 shadow-theme-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-white/90">
                  Pedoman Alur Pengisian SIM Pesantren
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  Pastikan kelengkapan master data <strong>Lembaga & Madrasah</strong> serta <strong>Data Santri</strong> telah tervalidasi sebelum melakukan pencatatan tagihan kasir dan setoran tahfidz harian.
                </p>
              </div>
            </div>

            <Link
              href="/santri"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold text-xs transition-colors shrink-0"
            >
              <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Kelola Data Santri
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
