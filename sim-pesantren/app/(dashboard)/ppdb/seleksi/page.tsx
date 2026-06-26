'use client';

import { useEffect, useState } from 'react';
import { getAllCalonSantri, getHasilSeleksi, upsertHasilSeleksi, updateStatusCalonSantri } from '@/services/ppdb-actions';
import { CalonSantri, HasilSeleksi } from '@/types/database';
import { ClipboardList, X, Save, ThumbsUp, ThumbsDown, Loader2, Calculator } from 'lucide-react';

export default function SeleksiPage() {
  const [list, setList] = useState<CalonSantri[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CalonSantri | null>(null);
  const [hasil, setHasil] = useState<HasilSeleksi | null>(null);
  const [nilai, setNilai] = useState({ nilai_tes_tulis: 0, nilai_baca_quran: 0, nilai_wawancara: 0, tanggal_tes: '', jam_tes: '', ruang_tes: '', id_penguji: '', catatan: '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const res = await getAllCalonSantri({ status: 'MENUNGGU_SELEKSI' });
    if (res.data) setList(res.data);
    setLoading(false);
  }

  async function openSeleksi(item: CalonSantri) {
    setSelected(item);
    const res = await getHasilSeleksi(item.id);
    if (res.data) {
      setHasil(res.data);
      setNilai({
        nilai_tes_tulis: res.data.nilai_tes_tulis || 0,
        nilai_baca_quran: res.data.nilai_baca_quran || 0,
        nilai_wawancara: res.data.nilai_wawancara || 0,
        tanggal_tes: res.data.tanggal_tes?.split('T')[0] || '',
        jam_tes: res.data.jam_tes?.slice(0, 5) || '',
        ruang_tes: res.data.ruang_tes || '',
        id_penguji: res.data.id_penguji || '',
        catatan: res.data.catatan || '',
      });
    } else {
      setHasil(null);
      setNilai({ nilai_tes_tulis: 0, nilai_baca_quran: 0, nilai_wawancara: 0, tanggal_tes: '', jam_tes: '', ruang_tes: '', id_penguji: '', catatan: '' });
    }
    setMessage('');
  }

  const nilaiAkhir = Math.round((nilai.nilai_tes_tulis + nilai.nilai_baca_quran + nilai.nilai_wawancara) / 3);

  async function handleSave(lulus: boolean) {
    if (!selected) return;
    setSaving(true);
    const payload = { id_calon_santri: selected.id, ...nilai, nilai_akhir: nilaiAkhir, lulus };
    const res = await upsertHasilSeleksi(payload);
    if (res.error) setMessage(res.error);
    else {
      if (lulus) {
        await updateStatusCalonSantri(selected.id, 'DITERIMA');
      } else {
        await updateStatusCalonSantri(selected.id, 'TIDAK_DITERIMA');
      }
      setMessage('Data seleksi berhasil disimpan!');
      setSelected(null);
      loadData();
    }
    setSaving(false);
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-64 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
      <div className="h-64 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-slate-100 dark:border-zinc-800 px-6 flex items-center">
            <div className="h-4 w-48 bg-slate-100 dark:bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  const inputClass = "w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm";

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Seleksi</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">Input jadwal & nilai tes calon santri</p>
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

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Nama</th>
                <th className="py-4 px-6">Jalur</th>
                <th className="py-4 px-6">Asal Sekolah</th>
                <th className="py-4 px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-sm text-slate-700 dark:text-zinc-300">
              {list.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 transition-all duration-200">
                  <td className="py-4 px-6 font-semibold text-slate-800 dark:text-zinc-200">{item.nama_lengkap}</td>
                  <td className="py-4 px-6 capitalize">{item.jalur_pendaftaran}</td>
                  <td className="py-4 px-6 text-slate-500 dark:text-zinc-400">{item.asal_sekolah || '-'}</td>
                  <td className="py-4 px-6 text-center">
                    <button onClick={() => openSeleksi(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/10 transition-all">
                      <ClipboardList className="h-3 w-3" /> Input Nilai
                    </button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-center shadow-inner mb-4">
                        <ClipboardList className="h-8 w-8" />
                      </div>
                      <h3 className="font-bold text-base text-slate-800 dark:text-white">Tidak Ada Calon Santri</h3>
                      <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1 max-w-xs">Tidak ada calon santri yang perlu diseleksi saat ini.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
            <div className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Seleksi: {selected.nama_lengkap}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Jadwal Tes</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Tanggal</label>
                    <input type="date" value={nilai.tanggal_tes} onChange={(e) => setNilai({ ...nilai, tanggal_tes: e.target.value })}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Jam</label>
                    <input type="time" value={nilai.jam_tes} onChange={(e) => setNilai({ ...nilai, jam_tes: e.target.value })}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Ruang</label>
                    <input type="text" value={nilai.ruang_tes} onChange={(e) => setNilai({ ...nilai, ruang_tes: e.target.value })}
                      className={inputClass} />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Nilai Tes</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Tes Tulis (0-100)</label>
                    <input type="number" min={0} max={100} value={nilai.nilai_tes_tulis} onChange={(e) => setNilai({ ...nilai, nilai_tes_tulis: parseInt(e.target.value) || 0 })}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Baca Quran (0-100)</label>
                    <input type="number" min={0} max={100} value={nilai.nilai_baca_quran} onChange={(e) => setNilai({ ...nilai, nilai_baca_quran: parseInt(e.target.value) || 0 })}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Wawancara (0-100)</label>
                    <input type="number" min={0} max={100} value={nilai.nilai_wawancara} onChange={(e) => setNilai({ ...nilai, nilai_wawancara: parseInt(e.target.value) || 0 })}
                      className={inputClass} />
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-xl px-4 py-3">
                  <Calculator className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-sm text-slate-700 dark:text-zinc-300">
                    Nilai Akhir: <span className="font-bold text-emerald-600 dark:text-emerald-400">{nilaiAkhir}</span>
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Catatan</label>
                <textarea value={nilai.catatan} onChange={(e) => setNilai({ ...nilai, catatan: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" rows={2} />
              </div>
            </div>
            <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/50">
              <button onClick={() => setSelected(null)}
                className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-xl font-bold text-xs">
                Batal
              </button>
              <div className="flex gap-2">
                <button onClick={() => handleSave(false)} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-xl font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed">
                  <ThumbsDown className="h-3 w-3" /> Tidak Lulus
                </button>
                <button onClick={() => handleSave(true)} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/10 disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3" />}
                  Lulus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
