'use client';

import { useEffect, useState } from 'react';
import { getMyProfil } from '@/services/ppdb-actions';
import { CalonSantri, GelombangPendaftaran } from '@/types/database';
import Link from 'next/link';
import { LayoutDashboard, UserCircle, Wallet, CreditCard, Megaphone, CheckCircle2, Clock, ArrowRight, Loader2 } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  MENUNGGU_VERIFIKASI: { label: 'Menunggu Verifikasi', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' },
  LOLOS_ADMIN: { label: 'Lolos Verifikasi', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' },
  DITOLAK: { label: 'Ditolak', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20' },
  MENUNGGU_SELEKSI: { label: 'Menunggu Seleksi', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20' },
  DITERIMA: { label: 'Diterima', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' },
  TIDAK_DITERIMA: { label: 'Tidak Diterima', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20' },
  MENUNGGU_PEMBAYARAN: { label: 'Menunggu Pembayaran', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20' },
  LUNAS: { label: 'Lunas', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20' },
  SUDAH_DAFTAR_ULANG: { label: 'Sudah Daftar Ulang', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20' },
};

const quickLinks = [
  { href: '/psb/dashboard/profil', icon: UserCircle, label: 'Profil & Berkas', desc: 'Lengkapi data diri dan upload dokumen', color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
  { href: '/psb/dashboard/biaya', icon: Wallet, label: 'Rincian Biaya', desc: 'Lihat biaya sesuai jalur pendaftaran', color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  { href: '/psb/dashboard/pembayaran', icon: CreditCard, label: 'Pembayaran', desc: 'Cek status & riwayat pembayaran', color: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' },
  { href: '/psb/dashboard/pengumuman', icon: Megaphone, label: 'Pengumuman', desc: 'Lihat hasil seleksi', color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
];

export default function PpdbDashboardPage() {
  const [data, setData] = useState<CalonSantri | null>(null);
  const [gelombang, setGelombang] = useState<GelombangPendaftaran | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const res = await getMyProfil();
    if (res.data) {
      setData(res.data);
      if (res.data.id_gelombang) {
        const supabase = (await import('@/lib/supabase')).supabase;
        const { data: g } = await supabase.from('gelombang_pendaftaran').select('*').eq('id', res.data.id_gelombang).single();
        if (g) setGelombang(g);
      }
    }
    setLoading(false);
  }

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-72 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
      <div className="h-24 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-32 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800" />
        <div className="h-32 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800" />
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-center shadow-inner mb-4">
        <LayoutDashboard className="h-8 w-8" />
      </div>
      <h3 className="font-bold text-base text-slate-800 dark:text-white">Silakan Login Terlebih Dahulu</h3>
      <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1">Anda perlu login untuk mengakses dashboard.</p>
      <Link href="/psb/login" className="mt-4 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 transition-all text-sm">
        Login <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );

  const statusInfo = statusConfig[data.status] || { label: data.status, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700' };

  const steps = [
    { step: 1, label: 'Lengkapi Data & Berkas', done: !!data.tempat_lahir && !!data.scan_kk, link: '/psb/dashboard/profil' },
    { step: 2, label: 'Verifikasi Berkas', done: data.status !== 'MENUNGGU_VERIFIKASI', link: null },
    { step: 3, label: 'Seleksi (Tes & Wawancara)', done: ['DITERIMA', 'TIDAK_DITERIMA', 'MENUNGGU_PEMBAYARAN', 'LUNAS', 'SUDAH_DAFTAR_ULANG'].includes(data.status), link: null },
    { step: 4, label: 'Pengumuman', done: ['DITERIMA', 'TIDAK_DITERIMA', 'MENUNGGU_PEMBAYARAN', 'LUNAS', 'SUDAH_DAFTAR_ULANG'].includes(data.status), link: '/psb/dashboard/pengumuman' },
    { step: 5, label: 'Pembayaran & Daftar Ulang', done: ['LUNAS', 'SUDAH_DAFTAR_ULANG'].includes(data.status), link: '/psb/dashboard/pembayaran' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Selamat datang, {data.nama_lengkap}
        </h1>
        <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">Status pendaftaran Anda:</p>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border mt-2 ${statusInfo.bg} ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {gelombang && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Gelombang: {gelombang.nama}</p>
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 ml-6">
            Pendaftaran hingga {new Date(gelombang.tanggal_selesai).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6">
        <h2 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-4">Tahapan PPDB</h2>
        <div className="space-y-3">
          {steps.map((item) => {
            const isActive = !item.done;
            return (
              <div key={item.step} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                  item.done
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'
                }`}>
                  {item.done ? <CheckCircle2 className="h-4 w-4" /> : item.step}
                </div>
                <p className={`text-sm flex-1 ${item.done ? 'text-slate-500 dark:text-zinc-400 line-through' : 'text-slate-800 dark:text-zinc-200 font-medium'}`}>
                  {item.label}
                </p>
                {isActive && item.link && (
                  <Link href={item.link}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                    Lengkapi <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Menu Cepat</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickLinks.map((card) => (
            <Link key={card.href} href={card.href}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-200 group">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                  <card.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{card.label}</h3>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{card.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
