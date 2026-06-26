'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ClipboardList, GraduationCap, Users, CheckCircle2, Clock, Wallet, FileSearch, Megaphone, RefreshCcw } from 'lucide-react';

export default function AdminPpdbPage() {
  const [stats, setStats] = useState({ total: 0, menunggu: 0, lolos: 0, diterima: 0, gelombangAktif: 0 });

  useEffect(() => {
    async function load() {
      const [totalRes, menungguRes, lolosRes, diterimaRes, gelAktifRes] = await Promise.all([
        supabase.from('calon_santri').select('*', { count: 'exact', head: true }),
        supabase.from('calon_santri').select('*', { count: 'exact', head: true }).eq('status', 'MENUNGGU_VERIFIKASI'),
        supabase.from('calon_santri').select('*', { count: 'exact', head: true }).eq('status', 'LOLOS_ADMIN'),
        supabase.from('calon_santri').select('*', { count: 'exact', head: true }).eq('status', 'DITERIMA'),
        supabase.from('gelombang_pendaftaran').select('*', { count: 'exact', head: true }).eq('aktif', true),
      ]);
      setStats({
        total: totalRes.count || 0,
        menunggu: menungguRes.count || 0,
        lolos: lolosRes.count || 0,
        diterima: diterimaRes.count || 0,
        gelombangAktif: gelAktifRes.count || 0,
      });
    }
    load();
  }, []);

  const statCards = [
    { label: 'Total Pendaftar', value: stats.total, icon: Users, color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
    { label: 'Menunggu Verifikasi', value: stats.menunggu, icon: Clock, color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
    { label: 'Lolos Admin', value: stats.lolos, icon: CheckCircle2, color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
    { label: 'Diterima', value: stats.diterima, icon: GraduationCap, color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
    { label: 'Gelombang Aktif', value: stats.gelombangAktif, icon: RefreshCcw, color: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' },
  ];

  const menu = [
    { href: '/ppdb/gelombang', label: 'Gelombang', icon: ClipboardList, desc: 'Atur gelombang pendaftaran', color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
    { href: '/ppdb/biaya', label: 'Biaya PPDB', icon: Wallet, desc: 'Atur biaya per gelombang & jalur', color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
    { href: '/ppdb/pendaftar', label: 'Pendaftar', icon: Users, desc: 'Lihat & verifikasi calon santri', color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
    { href: '/ppdb/seleksi', label: 'Seleksi', icon: FileSearch, desc: 'Input jadwal & nilai tes', color: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' },
    { href: '/ppdb/pengumuman', label: 'Pengumuman', icon: Megaphone, desc: 'Terbitkan pengumuman hasil', color: 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' },
    { href: '/ppdb/daftar-ulang', label: 'Daftar Ulang', icon: RefreshCcw, desc: 'Konversi ke santri aktif', color: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">PPDB — Dashboard Admin</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">Kelola seluruh proses penerimaan santri baru</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((c) => (
          <div key={c.label} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-10 h-10 rounded-xl ${c.color} flex items-center justify-center`}>
                <c.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{c.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Menu PPDB</div>
        <div className="grid md:grid-cols-3 gap-4">
          {menu.map((m) => (
            <Link key={m.href} href={m.href}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-200 group"
            >
              <div className={`w-12 h-12 rounded-xl ${m.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200`}>
                <m.icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{m.label}</h3>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{m.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
