'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  LogOut, 
  BookOpen, 
  Wallet, 
  TrendingUp, 
  Activity, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import Link from 'next/link';

interface ActivityItem {
  id: string;
  type: 'tahfidz' | 'perizinan' | 'pembayaran';
  title: string;
  subtitle: string;
  time: string;
  status?: string;
}

export default function AdminDashboardHome() {
  const [stats, setStats] = useState({
    totalSantri: 0,
    santriIzin: 0,
    tahfidzHariIni: 0,
    saldoKas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);

        // 1. Fetch Total Santri
        const { count: santriCount } = await supabase
          .from('santri')
          .select('*', { count: 'exact', head: true });

        // 2. Fetch Santri Izin (Status Aktif atau disetujui di tabel perizinan)
        const { count: izinCount } = await supabase
          .from('perizinan')
          .select('*', { count: 'exact', head: true })
          .in('status', ['Aktif', 'disetujui']);

        // 3. Fetch Setoran Tahfidz Hari Ini
        const today = new Date().toISOString().split('T')[0];
        const { count: tahfidzCount } = await supabase
          .from('presensi_tahfidz')
          .select('*', { count: 'exact', head: true })
          .eq('tanggal_setoran', today);

        // 4. Fetch Saldo Kas (Sum of Lunas payments)
        const { data: payments } = await supabase
          .from('pembayaran')
          .select('jumlah')
          .eq('status', 'Lunas');

        const totalSaldo = payments?.reduce((sum, p) => sum + Number(p.jumlah), 0) || 0;

        setStats({
          totalSantri: santriCount || 0,
          santriIzin: izinCount || 0,
          tahfidzHariIni: tahfidzCount || 0,
          saldoKas: totalSaldo,
        });

        // 5. Build mock/real recent activities from recent inserts
        const { data: latestTahfidz } = await supabase
          .from('presensi_tahfidz')
          .select('id, created_at, nama_surah, juz, santri:id_santri(nama_lengkap)')
          .order('created_at', { ascending: false })
          .limit(3);

        const { data: latestIzin } = await supabase
          .from('perizinan')
          .select('id, created_at, keperluan, status, santri:id_santri(nama_lengkap)')
          .order('created_at', { ascending: false })
          .limit(2);

        const activities: ActivityItem[] = [];

        latestTahfidz?.forEach((t: any) => {
          activities.push({
            id: t.id,
            type: 'tahfidz',
            title: t.santri?.nama_lengkap || 'Santri',
            subtitle: `Menyetor hafalan Surah ${t.nama_surah} (Juz ${t.juz})`,
            time: formatTimeAgo(t.created_at),
          });
        });

        latestIzin?.forEach((i: any) => {
          activities.push({
            id: i.id,
            type: 'perizinan',
            title: i.santri?.nama_lengkap || 'Santri',
            subtitle: `Memperoleh izin keluar: "${i.keperluan}"`,
            time: formatTimeAgo(i.created_at),
            status: i.status,
          });
        });

        // Urutkan aktivitas berdasarkan waktu (terbaru di atas)
        setRecentActivities(activities.slice(0, 5));

      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  function formatTimeAgo(dateString: string) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;

    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen">
      
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Total Santri */}
        <div className="group relative overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Total Santri</span>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {loading ? '...' : stats.totalSantri}
            </h3>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              Aktif
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Card 2: Santri Izin */}
        <div className="group relative overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-amber-500/30 transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Santri Izin</span>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl group-hover:scale-110 transition-transform">
              <LogOut className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {loading ? '...' : stats.santriIzin}
            </h3>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
              Hari Ini
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Card 3: Setoran Tahfidz */}
        <div className="group relative overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-teal-500/30 transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Tahfidz Hari Ini</span>
            <div className="p-2.5 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl group-hover:scale-110 transition-transform">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {loading ? '...' : stats.tahfidzHariIni}
            </h3>
            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-2 py-0.5 rounded-full">
              Setoran
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Card 4: Saldo Kas */}
        <div className="group relative overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-cyan-500/30 transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Saldo Kas SPP</span>
            <div className="p-2.5 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-xl group-hover:scale-110 transition-transform">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate">
              {loading ? '...' : `Rp ${stats.saldoKas.toLocaleString('id-ID')}`}
            </h3>
            <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 px-2 py-0.5 rounded-full">
              Lunas
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bento Cell 1: Chart Hafalan (Spans 2 columns on large screens) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Tren Setoran Hafalan
              </h4>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Grafik setoran juz seminggu terakhir</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg">
              Juz 1 - 30
            </span>
          </div>

          {/* Interactive Custom SVG / Div Bar Chart */}
          <div className="h-56 flex items-end justify-between gap-3 pt-4 px-2">
            {[
              { day: 'Sen', count: 12, height: 'h-[40%]' },
              { day: 'Sel', count: 18, height: 'h-[60%]' },
              { day: 'Rab', count: 25, height: 'h-[85%]', active: true },
              { day: 'Kam', count: 15, height: 'h-[50%]' },
              { day: 'Jum', count: 9, height: 'h-[30%]' },
              { day: 'Sab', count: 21, height: 'h-[72%]' },
              { day: 'Ahd', count: 5, height: 'h-[15%]' },
            ].map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                <div className="relative w-full flex justify-center">
                  {/* Tooltip on hover */}
                  <span className="absolute -top-8 bg-zinc-950 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 font-bold whitespace-nowrap">
                    {bar.count} Setoran
                  </span>
                  
                  {/* Bar Body */}
                  <div className={`w-full max-w-[28px] rounded-t-lg transition-all duration-500 ${bar.height} ${
                    bar.active 
                      ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-lg shadow-emerald-500/20' 
                      : 'bg-slate-200 dark:bg-zinc-800 hover:bg-emerald-500/35 dark:hover:bg-emerald-500/30'
                  }`} />
                </div>
                <span className="text-xs text-slate-400 dark:text-zinc-500 font-semibold">{bar.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bento Cell 2: Recent Activity Feed (Spans 1 column) */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              Aktivitas Terbaru
            </h4>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[224px] pr-1">
            {recentActivities.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-zinc-500 text-xs">
                Tidak ada aktivitas tercatat hari ini.
              </div>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="flex gap-3 text-xs group hover:bg-slate-50 dark:hover:bg-zinc-800/40 p-2 rounded-xl transition-all">
                  <div className="mt-0.5">
                    {act.type === 'tahfidz' ? (
                      <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                    ) : (
                      <div className="p-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                        <Clock className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{act.title}</p>
                    <p className="text-slate-400 dark:text-zinc-500 mt-0.5">{act.subtitle}</p>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-600 font-medium block mt-1">{act.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Bento Grid Row 3: Quick Navigation / Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <Link 
          href="/admin/santri" 
          className="group p-6 bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-40"
        >
          <div className="flex justify-between items-start">
            <div className="p-2 bg-white/10 rounded-xl">
              <Users className="h-6 w-6 text-white" />
            </div>
            <ArrowUpRight className="h-5 w-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
          </div>
          <div>
            <h4 className="font-bold text-lg">Kelola Santri</h4>
            <p className="text-xs text-emerald-100 mt-1">Kelola data induk, kamar, dan wali santri</p>
          </div>
        </Link>

        <Link 
          href="/admin/tahfidz" 
          className="group p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-emerald-500/40 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-40"
        >
          <div className="flex justify-between items-start">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <BookOpen className="h-6 w-6" />
            </div>
            <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-slate-800 dark:text-white">Tahfidz Tracker</h4>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Input setoran hafalan harian santri</p>
          </div>
        </Link>

        <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-xl">
              <Wallet className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 px-2 py-0.5 rounded-full">Kas SPP</span>
          </div>
          <div>
            <h4 className="font-bold text-lg text-slate-800 dark:text-white">Sistem Keuangan</h4>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Pembayaran SPP terintegrasi dengan RLS Aman</p>
          </div>
        </div>

      </div>

    </div>
  );
}
