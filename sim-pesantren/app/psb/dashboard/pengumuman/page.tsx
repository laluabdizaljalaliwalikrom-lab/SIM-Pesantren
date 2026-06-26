'use client';

import { useEffect, useState } from 'react';
import { getMyProfil } from '@/services/ppdb-actions';
import { CalonSantri, PengumumanPpdb } from '@/types/database';
import { Megaphone, FileText, Loader2, PartyPopper, Frown } from 'lucide-react';

const resultConfig: Record<string, { icon: any; color: string; bg: string; label: string; message: string }> = {
  DITERIMA: {
    icon: PartyPopper,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30',
    label: 'Selamat! Anda DITERIMA',
    message: 'Silakan cek rincian biaya dan lakukan pembayaran untuk daftar ulang.',
  },
  MENUNGGU_PEMBAYARAN: {
    icon: PartyPopper,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30',
    label: 'Anda DITERIMA — Segera lakukan pembayaran',
    message: 'Silakan cek rincian biaya dan lakukan pembayaran untuk daftar ulang.',
  },
  LUNAS: {
    icon: PartyPopper,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30',
    label: 'Selamat! Anda LUNAS',
    message: 'Pembayaran Anda telah dikonfirmasi. Terima kasih.',
  },
  SUDAH_DAFTAR_ULANG: {
    icon: PartyPopper,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30',
    label: 'Selamat! Anda sudah terdaftar sebagai santri',
    message: 'Selamat bergabung di pesantren kami!',
  },
  TIDAK_DITERIMA: {
    icon: Frown,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/30',
    label: 'Mohon maaf, Anda belum diterima',
    message: 'Tetap semangat dan dapat mencoba di gelombang mendatang.',
  },
};

export default function PengumumanPage() {
  const [data, setData] = useState<CalonSantri | null>(null);
  const [pengumuman, setPengumuman] = useState<PengumumanPpdb[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const res = await getMyProfil();
    if (res.data) {
      setData(res.data);
      if (res.data.id_gelombang) {
        const supabase = (await import('@/lib/supabase')).supabase;
        const { data: list } = await supabase.from('pengumuman_ppdb').select('*').eq('id_gelombang', res.data.id_gelombang).order('tanggal_terbit', { ascending: false });
        if (list) setPengumuman(list);
      }
    }
    setLoading(false);
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
      <div className="h-32 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6">
        <div className="h-4 w-3/4 bg-slate-100 dark:bg-zinc-800 rounded" />
      </div>
    </div>
  );

  const result = data ? resultConfig[data.status] : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <Megaphone className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Pengumuman</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm">Informasi hasil seleksi PPDB</p>
        </div>
      </div>

      {result && (
        <div className={`rounded-2xl p-6 border ${result.bg}`}>
          <div className="flex gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${result.color} ${result.bg}`}>
              <result.icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className={`font-bold text-lg ${result.color}`}>{result.label}</h3>
              <p className={`text-sm mt-1 ${result.color.replace('600', '700').replace('400', '300')}`}>
                {result.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {pengumuman.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-center shadow-inner mb-4">
            <Megaphone className="h-8 w-8" />
          </div>
          <h3 className="font-bold text-base text-slate-800 dark:text-white">Belum Ada Pengumuman</h3>
          <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1 max-w-xs">
            Pengumuman akan muncul di sini setelah admin menerbitkannya.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pengumuman.map((p) => (
            <div key={p.id} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-zinc-200">{p.judul}</h3>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5">
                        {new Date(p.tanggal_terbit).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {p.konten && (
                    <p className="text-sm text-slate-600 dark:text-zinc-400 mt-3 whitespace-pre-line">{p.konten}</p>
                  )}
                  {p.file_url && (
                    <a href={p.file_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mt-3">
                      <FileText className="h-3.5 w-3.5" /> Download Lampiran
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
