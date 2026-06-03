'use client';

import React, { useState, useEffect } from 'react';
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
  Info,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Pagi';
  if (h < 15) return 'Siang';
  if (h < 18) return 'Sore';
  return 'Malam';
}

export default function AdminDashboardHome() {
  const [stats, setStats] = useState({ totalSantri: 0, santriIzin: 0, tahfidzHariIni: 0, saldoKas: 0 });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Admin');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nama_lengkap, role')
            .eq('id', user.id)
            .single();
          if (profile) {
            setUserName(profile.nama_lengkap || 'Admin');
            setUserRole(profile.role || '');
          }
        }

        const { count: santriCount } = await supabase
          .from('santri').select('*', { count: 'exact', head: true });

        const { count: izinCount } = await supabase
          .from('perizinan').select('*', { count: 'exact', head: true })
          .in('status', ['Aktif', 'disetujui']);

        const today = new Date().toISOString().split('T')[0];
        const { count: tahfidzCount } = await supabase
          .from('presensi_tahfidz').select('*', { count: 'exact', head: true })
          .eq('tanggal_setoran', today);

        const { data: payments } = await supabase
          .from('pembayaran').select('jumlah').eq('status', 'Lunas');

        const totalSaldo = payments?.reduce((s, p) => s + Number(p.jumlah), 0) || 0;

        setStats({
          totalSantri: santriCount || 0,
          santriIzin: izinCount || 0,
          tahfidzHariIni: tahfidzCount || 0,
          saldoKas: totalSaldo,
        });
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const modules = [
    { name: 'Lembaga', href: '/lembaga', icon: School, color: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white', desc: 'Sekolah & kelas', accent: '#6366f1' },
    { name: 'Santri', href: '/santri', icon: Users, color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white', desc: 'Data induk & wali santri', accent: '#10b981' },
    { name: 'Pegawai', href: '/pegawai', icon: Briefcase, color: 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white', desc: 'Data kepegawaian', accent: '#f43f5e' },
    { name: 'Asrama', href: '/asrama', icon: Home, color: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 group-hover:bg-violet-600 group-hover:text-white', desc: 'Kamar, pelanggaran & izin', accent: '#8b5cf6' },
    { name: 'Tahfidz', href: '/tahfidz', icon: GraduationCap, color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 group-hover:bg-orange-600 group-hover:text-white', desc: 'Setoran hafalan harian', accent: '#f59e0b' },
    { name: 'Akademik', href: '/akademik', icon: BookOpen, color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white', desc: 'Nilai, absensi & jadwal', accent: '#3b82f6' },
    { name: 'Pembayaran', href: '/pembayaran', icon: CreditCard, color: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-600 group-hover:text-white', desc: 'Kasir & kuitansi', accent: '#06b6d4' },
    { name: 'Keuangan', href: '/keuangan', icon: BarChart4, color: 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white', desc: 'Laporan keuangan', accent: '#14b8a6' },
  ];

  return (
    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">

        {/* Hero Card */}
        <div className="hero-card fade-up">
          <div className="absolute -right-24 -top-24 w-72 h-72 bg-emerald-50 dark:bg-emerald-900/20 rounded-full blur-[60px] opacity-60 pointer-events-none" />
          <div className="absolute -left-16 -bottom-20 w-64 h-64 bg-teal-50 dark:bg-teal-900/20 rounded-full blur-[60px] opacity-50 pointer-events-none" />

          <div className="relative z-10 p-7 md:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-emerald-800 dark:bg-emerald-700 text-white">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full -ml-3" />
                    <span className="ml-1">{userRole || 'Admin'}</span>
                  </span>
                </div>
                <h3 className="text-3xl md:text-4xl font-medium tracking-tight text-slate-900 dark:text-white mb-2">
                  Selamat {getGreeting()}, <span className="shimmer-text">{userName}</span>!
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed max-w-xl">
                  Selamat datang di <span className="text-emerald-600 dark:text-emerald-400 font-semibold">SIM Pesantren</span>.
                  Pilih modul di bawah untuk memulai.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <Link
                  href="/pengaturan"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all font-semibold text-sm"
                >
                  <Cog className="h-4 w-4" /> Pengaturan Sistem
                </Link>

                <div className="bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3 flex items-center gap-4 shadow-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Total Santri</p>
                    <p className="text-slate-800 dark:text-slate-200 font-bold text-lg">
                      {loading ? '...' : stats.totalSantri}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card fade-up delay-1 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Santri Izin</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{loading ? '...' : stats.santriIzin}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="stat-card fade-up delay-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Tahfidz Hari Ini</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{loading ? '...' : stats.tahfidzHariIni}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="stat-card fade-up delay-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Saldo Kas SPP</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {loading ? '...' : `Rp${stats.saldoKas.toLocaleString('id-ID')}`}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="stat-card fade-up delay-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Aplikasi</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">v0.1</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BarChart4 className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Main Grid: Modules + Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-5">

            {/* Modul Aplikasi */}
            <div className="fade-up delay-2">
              <div className="section-label">Modul Aplikasi</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {modules.map((mod) => (
                  <Link key={mod.name} href={mod.href} className="module-card group">
                    <div className={`module-icon ${mod.color} transition-colors`}>
                      <mod.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {mod.name}
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{mod.desc}</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                    <style>{`.module-card:hover::after { background: ${mod.accent}; }`}</style>
                  </Link>
                ))}
              </div>
            </div>

          </div>

          {/* Info Sidebar */}
          <div className="space-y-4 fade-up delay-4">

            <div>
              <div className="section-label">Pengaturan</div>
              <div className="bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
                <Link href="/pengaturan" className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-600 dark:group-hover:bg-slate-700 group-hover:text-white transition-colors flex items-center justify-center text-sm">
                    <Cog className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">Pengaturan</span>
                  <ArrowRight className="h-3 w-3 ml-auto text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400" />
                </Link>
                <Link href="/settings/users" className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-600 dark:group-hover:bg-slate-700 group-hover:text-white transition-colors flex items-center justify-center text-sm">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">Hak Akses</span>
                  <ArrowRight className="h-3 w-3 ml-auto text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400" />
                </Link>
              </div>
            </div>

            <div>
              <div className="section-label">Info Sistem</div>
              <div className="bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-4 space-y-3">
                <div className="flex gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                  <Info className="h-4 w-4 text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">SIM Pesantren v0.1</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Sistem Informasi Manajemen Pondok Pesantren terintegrasi.</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
                  <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                    <strong>Catatan:</strong> Selalu utamakan pengisian data Santri sebelum modul lainnya.
                  </p>
                </div>

                <Link
                  href="/santri"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-sm font-semibold hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                >
                  <Users className="h-3.5 w-3.5" /> Kelola Santri
                </Link>
              </div>
            </div>

          </div>
        </div>

      </div>
    );
  }
