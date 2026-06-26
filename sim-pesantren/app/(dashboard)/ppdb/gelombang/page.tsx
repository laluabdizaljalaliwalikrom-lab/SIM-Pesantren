'use client';

import { useEffect, useState } from 'react';
import { getAllGelombang, createGelombang, updateGelombang, deleteGelombang } from '@/services/ppdb-actions';
import { GelombangPendaftaran, TahunAjaran } from '@/types/database';
import { Plus, Pencil, Trash2, Loader2, X, Calendar, Users } from 'lucide-react';

export default function GelombangPage() {
  const [list, setList] = useState<GelombangPendaftaran[]>([]);
  const [tahunAjaran, setTahunAjaran] = useState<TahunAjaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<GelombangPendaftaran | null>(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ nama: '', tanggal_mulai: '', tanggal_selesai: '', kuota: 50, id_tahun_ajaran: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const res = await getAllGelombang();
      if (res.error) { setError(res.error); setLoading(false); return; }
      if (res.data) setList(res.data);
      const supabase = (await import('@/lib/supabase')).supabase;
      const { data: ta } = await supabase.from('tahun_ajaran').select('*').order('nama_tahun', { ascending: false });
      if (ta) setTahunAjaran(ta);
    } catch (e: any) {
      setError(e?.message || 'Terjadi kesalahan saat memuat data.');
    }
    setLoading(false);
  }

  function openCreate() {
    setEditItem(null);
    setForm({ nama: '', tanggal_mulai: '', tanggal_selesai: '', kuota: 50, id_tahun_ajaran: '' });
    setShowModal(true);
  }

  function openEdit(item: GelombangPendaftaran) {
    setEditItem(item);
    setForm({ nama: item.nama, tanggal_mulai: item.tanggal_mulai.split('T')[0], tanggal_selesai: item.tanggal_selesai.split('T')[0], kuota: item.kuota, id_tahun_ajaran: item.id_tahun_ajaran || '' });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    if (editItem) {
      const res = await updateGelombang(editItem.id, form);
      if (res.error) setMessage(res.error);
    } else {
      const res = await createGelombang(form);
      if (res.error) setMessage(res.error);
    }
    setSaving(false);
    setShowModal(false);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus gelombang ini?')) return;
    const res = await deleteGelombang(id);
    if (res.error) setMessage(res.error);
    else loadData();
  }

  async function toggleAktif(item: GelombangPendaftaran) {
    await updateGelombang(item.id, { aktif: !item.aktif });
    loadData();
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-64 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
      <div className="h-64 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
        {Array.from({ length: 5 }).map((_, i) => (
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
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Gelombang Pendaftaran</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">Atur gelombang penerimaan santri baru</p>
        </div>
        <button onClick={openCreate} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 text-sm">
          <Plus className="h-4 w-4" /> Gelombang Baru
        </button>
      </div>

      {message && (
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-xl text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Nama</th>
                <th className="py-4 px-6">Tanggal</th>
                <th className="py-4 px-6 text-center">Kuota</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-sm text-slate-700 dark:text-zinc-300">
              {list.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 transition-all duration-200">
                  <td className="py-4 px-6">
                    <p className="font-semibold text-slate-800 dark:text-zinc-200">{item.nama}</p>
                    {item.id_tahun_ajaran && (
                      <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                        {tahunAjaran.find(ta => ta.id === item.id_tahun_ajaran)?.nama_tahun || ''}
                      </p>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(item.tanggal_mulai).toLocaleDateString('id-ID')} — {new Date(item.tanggal_selesai).toLocaleDateString('id-ID')}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="inline-flex items-center gap-1.5 text-slate-600 dark:text-zinc-400">
                      <Users className="h-3.5 w-3.5" />
                      <span>{item.kuota}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button onClick={() => toggleAktif(item)} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${
                      item.aktif
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
                    }`}>
                      {item.aktif ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all" title="Hapus">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-center shadow-inner mb-4">
                        <Calendar className="h-8 w-8" />
                      </div>
                      <h3 className="font-bold text-base text-slate-800 dark:text-white">Belum Ada Gelombang</h3>
                      <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1 max-w-xs">Buat gelombang pendaftaran baru untuk memulai PPDB.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            <div className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editItem ? 'Edit Gelombang' : 'Gelombang Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Nama Gelombang</label>
                <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Tgl Mulai</label>
                  <input type="date" value={form.tanggal_mulai} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Tgl Selesai</label>
                  <input type="date" value={form.tanggal_selesai} onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Kuota</label>
                <input type="number" value={form.kuota} onChange={(e) => setForm({ ...form, kuota: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Tahun Ajaran</label>
                <select value={form.id_tahun_ajaran} onChange={(e) => setForm({ ...form, id_tahun_ajaran: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm">
                  <option value="">Pilih tahun ajaran</option>
                  {tahunAjaran.map((ta) => (
                    <option key={ta.id} value={ta.id}>{ta.nama_tahun}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-zinc-900/50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-xl font-bold text-xs">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/10 disabled:opacity-50 disabled:cursor-not-allowed">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
