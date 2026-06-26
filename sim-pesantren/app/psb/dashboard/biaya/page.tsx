'use client';

import { useEffect, useState } from 'react';
import { getMyProfil } from '@/services/ppdb-actions';
import { CalonSantri, BiayaPpdb } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { Wallet, Info } from 'lucide-react';

export default function BiayaPage() {
  const [data, setData] = useState<CalonSantri | null>(null);
  const [biayaList, setBiayaList] = useState<BiayaPpdb[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const res = await getMyProfil();
    if (res.data) {
      setData(res.data);
      if (res.data.id_gelombang) {
        const { data: biaya } = await supabase.from('biaya_ppdb').select('*').eq('id_gelombang', res.data.id_gelombang).order('created_at', { ascending: true });
        if (biaya) setBiayaList(biaya);
      }
    }
    setLoading(false);
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
      <div className="h-64 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-slate-100 dark:border-zinc-800 px-6 flex items-center">
            <div className="h-4 w-48 bg-slate-100 dark:bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-center shadow-inner mb-4">
        <Wallet className="h-8 w-8" />
      </div>
      <h3 className="font-bold text-base text-slate-800 dark:text-white">Silakan Login Terlebih Dahulu</h3>
    </div>
  );

  const jalur = data.jalur_pendaftaran;
  const getNominal = (b: BiayaPpdb) => {
    if (jalur === 'prestasi') return b.nominal_prestasi;
    if (jalur === 'afirmasi') return b.nominal_afirmasi;
    return b.nominal_reguler;
  };
  const totalWajib = biayaList.reduce((sum, b) => sum + (b.wajib ? getNominal(b) : 0), 0);
  const totalOpsional = biayaList.filter(b => !b.wajib).reduce((sum, b) => sum + getNominal(b), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Rincian Biaya</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm">
            Jalur pendaftaran: <span className="font-semibold capitalize text-emerald-600 dark:text-emerald-400">{jalur}</span>
          </p>
        </div>
      </div>

      {biayaList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-center shadow-inner mb-4">
            <Wallet className="h-8 w-8" />
          </div>
          <h3 className="font-bold text-base text-slate-800 dark:text-white">Biaya Belum Ditentukan</h3>
          <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1 max-w-xs">Biaya untuk gelombang ini belum ditentukan oleh admin.</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Biaya</th>
                  <th className="py-4 px-6 text-right">Nominal</th>
                  <th className="py-4 px-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-sm text-slate-700 dark:text-zinc-300">
                {biayaList.map((b) => {
                  const nominal = getNominal(b);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 transition-all duration-200">
                      <td className="py-4 px-6">
                        <p className="font-semibold text-slate-800 dark:text-zinc-200">{b.nama_biaya}</p>
                        {b.keterangan && <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{b.keterangan}</p>}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-800 dark:text-zinc-200">
                        Rp {nominal.toLocaleString('id-ID')}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {b.wajib ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20">
                            Wajib
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700">
                            Opsional
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50/70 dark:bg-zinc-900/50 border-t border-slate-200 dark:border-zinc-800">
                  <td className="py-4 px-6 font-bold text-slate-700 dark:text-zinc-300">Total Wajib</td>
                  <td className="py-4 px-6 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                    Rp {totalWajib.toLocaleString('id-ID')}
                  </td>
                  <td />
                </tr>
                <tr className="bg-slate-50/70 dark:bg-zinc-900/50">
                  <td className="py-4 px-6 font-bold text-slate-700 dark:text-zinc-300">Total Keseluruhan</td>
                  <td className="py-4 px-6 text-right font-extrabold text-slate-800 dark:text-white">
                    Rp {(totalWajib + totalOpsional).toLocaleString('id-ID')}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-start gap-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4">
            <Info className="h-4 w-4 text-slate-400 dark:text-zinc-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-400 dark:text-zinc-500">
              Biaya dapat berubah sesuai kebijakan pesantren. Hubungi admin untuk informasi lebih lanjut.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
