'use client';

import { useEffect, useState } from 'react';
import { getBiayaByGelombang, upsertBiayaPpdb, getAllGelombang } from '@/services/ppdb-actions';
import { BiayaPpdb, GelombangPendaftaran } from '@/types/database';
import { Plus, Save, Trash2, Loader2 } from 'lucide-react';

export default function BiayaPpdbPage() {
  const [gelombangList, setGelombangList] = useState<GelombangPendaftaran[]>([]);
  const [selectedGelombang, setSelectedGelombang] = useState('');
  const [items, setItems] = useState<Partial<BiayaPpdb>[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getAllGelombang().then(res => {
      if (res.data) {
        setGelombangList(res.data);
        if (res.data.length > 0) setSelectedGelombang(res.data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedGelombang) loadBiaya();
  }, [selectedGelombang]);

  async function loadBiaya() {
    setLoading(true);
    const res = await getBiayaByGelombang(selectedGelombang);
    if (res.data && res.data.length > 0) {
      setItems(res.data);
    } else {
      setItems([{ nama_biaya: '', nominal_reguler: 0, nominal_prestasi: 0, nominal_afirmasi: 0, wajib: true, id_gelombang: selectedGelombang }]);
    }
    setLoading(false);
  }

  function addRow() {
    setItems([...items, { nama_biaya: '', nominal_reguler: 0, nominal_prestasi: 0, nominal_afirmasi: 0, wajib: true, id_gelombang: selectedGelombang }]);
  }

  function removeRow(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, field: string, value: any) {
    const updated = items.map((item, i) => i === idx ? { ...item, [field]: value } : item);
    setItems(updated);
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    const payload = items.map(item => ({
      id: item.id,
      id_gelombang: selectedGelombang,
      nama_biaya: item.nama_biaya || '',
      nominal_reguler: item.nominal_reguler || 0,
      nominal_prestasi: item.nominal_prestasi || 0,
      nominal_afirmasi: item.nominal_afirmasi || 0,
      wajib: item.wajib ?? true,
      keterangan: item.keterangan,
    }));
    const res = await upsertBiayaPpdb(payload as any);
    setSaving(false);
    if (res.error) setMessage(res.error);
    else {
      setMessage('Biaya berhasil disimpan!');
      loadBiaya();
    }
  }

  const inputClass = "w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm";

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Biaya PPDB</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">Atur nominal biaya per gelombang & jalur pendaftaran</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-4 flex items-center gap-3">
        <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider shrink-0">Pilih Gelombang:</label>
        <select value={selectedGelombang} onChange={(e) => setSelectedGelombang(e.target.value)}
          className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm max-w-xs">
          {gelombangList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
        </select>
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

      {loading ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden animate-pulse">
          <div className="h-12 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-800" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 border-b border-slate-100 dark:border-zinc-800 px-6 flex items-center gap-4">
              <div className="h-4 flex-1 bg-slate-100 dark:bg-zinc-800 rounded" />
              <div className="h-4 w-20 bg-slate-100 dark:bg-zinc-800 rounded" />
              <div className="h-4 w-20 bg-slate-100 dark:bg-zinc-800 rounded" />
              <div className="h-4 w-20 bg-slate-100 dark:bg-zinc-800 rounded" />
              <div className="h-4 w-10 bg-slate-100 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Nama Biaya</th>
                  <th className="py-4 px-6 text-right">Reguler</th>
                  <th className="py-4 px-6 text-right">Prestasi</th>
                  <th className="py-4 px-6 text-right">Afirmasi</th>
                  <th className="py-4 px-6 text-center">Wajib</th>
                  <th className="py-4 px-6 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-sm text-slate-700 dark:text-zinc-300">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 transition-all duration-200">
                    <td className="py-3 px-6">
                      <input type="text" value={item.nama_biaya || ''} onChange={(e) => updateRow(idx, 'nama_biaya', e.target.value)}
                        className={inputClass} placeholder="Nama biaya" />
                    </td>
                    <td className="py-3 px-6">
                      <input type="number" value={item.nominal_reguler || 0} onChange={(e) => updateRow(idx, 'nominal_reguler', parseInt(e.target.value) || 0)}
                        className={`${inputClass} text-right`} />
                    </td>
                    <td className="py-3 px-6">
                      <input type="number" value={item.nominal_prestasi || 0} onChange={(e) => updateRow(idx, 'nominal_prestasi', parseInt(e.target.value) || 0)}
                        className={`${inputClass} text-right`} />
                    </td>
                    <td className="py-3 px-6">
                      <input type="number" value={item.nominal_afirmasi || 0} onChange={(e) => updateRow(idx, 'nominal_afirmasi', parseInt(e.target.value) || 0)}
                        className={`${inputClass} text-right`} />
                    </td>
                    <td className="py-3 px-6 text-center">
                      <input type="checkbox" checked={item.wajib ?? true} onChange={(e) => updateRow(idx, 'wajib', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500" />
                    </td>
                    <td className="py-3 px-6 text-center">
                      <button onClick={() => removeRow(idx)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all" title="Hapus">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={addRow} className="flex items-center justify-center gap-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold px-4 py-2.5 rounded-xl transition-all text-sm shadow-sm">
          <Plus className="h-4 w-4" /> Tambah Baris
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Semua
        </button>
      </div>
    </div>
  );
}
