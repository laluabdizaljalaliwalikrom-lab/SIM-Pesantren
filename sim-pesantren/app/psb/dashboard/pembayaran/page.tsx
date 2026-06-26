'use client';

import { useEffect, useState } from 'react';
import { getMyProfil } from '@/services/ppdb-actions';
import { CreditCard, Clock, CheckCircle2, Info, Loader2 } from 'lucide-react';

export default function PembayaranPage() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);
  async function loadData() {
    const res = await getMyProfil();
    if (res.data) setStatus(res.data.status);
    setLoading(false);
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
      <div className="h-40 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6">
        <div className="h-4 w-3/4 bg-slate-100 dark:bg-zinc-800 rounded" />
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Pembayaran</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm">Status dan riwayat pembayaran pendaftaran</p>
        </div>
      </div>

      {(status === 'DITERIMA' || status === 'MENUNGGU_PEMBAYARAN') ? (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-6">
          <div className="flex gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-amber-800 dark:text-amber-300">Menunggu Pembayaran</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Silakan lakukan pembayaran sesuai rincian biaya yang tertera.
              </p>
              <div className="mt-4 bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4 space-y-2 text-sm">
                <p className="font-semibold text-amber-800 dark:text-amber-300">Informasi Pembayaran:</p>
                <p className="text-amber-700 dark:text-amber-400">Transfer ke rekening pesantren (hubungi admin untuk detail rekening).</p>
                <p className="text-amber-700 dark:text-amber-400">Atau bayar langsung ke kasir pesantren.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (status === 'LUNAS' || status === 'SUDAH_DAFTAR_ULANG') ? (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl p-6">
          <div className="flex gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-800 dark:text-emerald-300">Pembayaran Lunas</h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                Pembayaran Anda telah dikonfirmasi. Terima kasih.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6">
          <div className="flex gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 flex items-center justify-center shrink-0">
              <Info className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-zinc-200">Belum Ada Informasi Pembayaran</h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                Status pendaftaran Anda saat ini: <span className="font-semibold capitalize">{status?.toLowerCase().replace(/_/g, ' ')}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
