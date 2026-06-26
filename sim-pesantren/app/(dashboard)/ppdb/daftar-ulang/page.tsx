'use client';

import { useEffect, useState } from 'react';
import { getAllCalonSantri, konversiKeSantri, updateStatusCalonSantri } from '@/services/ppdb-actions';
import { CalonSantri } from '@/types/database';
import { RefreshCcw, CheckCircle2, Loader2 } from 'lucide-react';

export default function DaftarUlangPage() {
  const [list, setList] = useState<CalonSantri[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'diterima' | 'lunas'>('diterima');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const res = await getAllCalonSantri({ status: tab === 'diterima' ? 'DITERIMA' : 'LUNAS' });
    if (res.data) setList(res.data);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [tab]);

  async function handleKonfirmasiBayar(id: string) {
    setActionLoading(id);
    const res = await updateStatusCalonSantri(id, 'LUNAS');
    setActionLoading(null);
    if (res.error) setMessage(res.error);
    else { setMessage('Status diubah ke LUNAS'); loadData(); }
  }

  async function handleKonversi(id: string) {
    if (!confirm('Konversi calon santri ini menjadi santri aktif?')) return;
    setActionLoading(id);
    setMessage('');
    const res = await konversiKeSantri(id);
    setActionLoading(null);
    if (res.error) setMessage(res.error);
    else { setMessage('Berhasil dikonversi menjadi santri!'); loadData(); }
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-64 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
      <div className="h-12 bg-slate-100 dark:bg-zinc-800 rounded-xl" />
      <div className="h-64 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-slate-100 dark:border-zinc-800 px-6 flex items-center">
            <div className="h-4 w-48 bg-slate-100 dark:bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Daftar Ulang</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">Konfirmasi pembayaran & konversi calon santri menjadi santri aktif</p>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${
          message.includes('berhasil')
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30'
            : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/30'
        }`}>
          {message}
        </div>
      )}

      <div className="flex bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl self-start border border-slate-200 dark:border-zinc-800/80">
        <button onClick={() => setTab('diterima')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
          tab === 'diterima'
            ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
            : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
        }`}>
          Diterima (Belum Bayar)
        </button>
        <button onClick={() => setTab('lunas')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
          tab === 'lunas'
            ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
            : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
        }`}>
          Lunas (Siap Konversi)
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Nama</th>
                <th className="py-4 px-6">Jalur</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-sm text-slate-700 dark:text-zinc-300">
              {list.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 transition-all duration-200">
                  <td className="py-4 px-6 font-semibold text-slate-800 dark:text-zinc-200">{item.nama_lengkap}</td>
                  <td className="py-4 px-6 capitalize text-slate-600 dark:text-zinc-400">{item.jalur_pendaftaran}</td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      item.status === 'LUNAS'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                        : 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20'
                    }`}>
                      {item.status === 'LUNAS' ? 'Lunas' : 'Diterima'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    {tab === 'diterima' && (
                      <button onClick={() => handleKonfirmasiBayar(item.id)} disabled={actionLoading === item.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {actionLoading === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        Konfirmasi Bayar
                      </button>
                    )}
                    {tab === 'lunas' && (
                      <button onClick={() => handleKonversi(item.id)} disabled={actionLoading === item.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {actionLoading === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
                        Konversi ke Santri
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-center shadow-inner mb-4">
                        <RefreshCcw className="h-8 w-8" />
                      </div>
                      <h3 className="font-bold text-base text-slate-800 dark:text-white">Tidak Ada Data</h3>
                      <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1 max-w-xs">
                        {tab === 'diterima' ? 'Belum ada calon santri yang diterima.' : 'Belum ada calon santri yang lunas.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
