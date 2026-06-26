'use client';

import { useEffect, useState } from 'react';
import { getPengumumanByGelombang, createPengumuman, deletePengumuman, getAllGelombang } from '@/services/ppdb-actions';
import { PengumumanPpdb, GelombangPendaftaran } from '@/types/database';
import { Plus, Trash2, X, Loader2, Megaphone, FileText } from 'lucide-react';

export default function PengumumanAdminPage() {
  const [gelombangList, setGelombangList] = useState<GelombangPendaftaran[]>([]);
  const [selectedGelombang, setSelectedGelombang] = useState('');
  const [pengumuman, setPengumuman] = useState<PengumumanPpdb[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ judul: '', konten: '', file_url: '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAllGelombang().then(res => {
      if (res.data) {
        setGelombangList(res.data);
        if (res.data.length > 0) setSelectedGelombang(res.data[0].id);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedGelombang) loadPengumuman();
  }, [selectedGelombang]);

  async function loadPengumuman() {
    const res = await getPengumumanByGelombang(selectedGelombang);
    if (res.data) setPengumuman(res.data);
  }

  async function handleCreate() {
    setSaving(true);
    setMessage('');
    const res = await createPengumuman({ ...form, id_gelombang: selectedGelombang });
    setSaving(false);
    if (res.error) setMessage(res.error);
    else { setShowModal(false); setForm({ judul: '', konten: '', file_url: '' }); loadPengumuman(); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus pengumuman ini?')) return;
    await deletePengumuman(id);
    loadPengumuman();
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-64 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
      <div className="h-48 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6">
        <div className="h-4 w-full bg-slate-100 dark:bg-zinc-800 rounded mb-3" />
        <div className="h-4 w-3/4 bg-slate-100 dark:bg-zinc-800 rounded" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Pengumuman PPDB</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">Kelola pengumuman hasil seleksi</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 text-sm">
          <Plus className="h-4 w-4" /> Pengumuman Baru
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-4 flex items-center gap-3">
        <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider shrink-0">Gelombang:</label>
        <select value={selectedGelombang} onChange={(e) => setSelectedGelombang(e.target.value)}
          className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm max-w-xs">
          {gelombangList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
        </select>
      </div>

      {message && (
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-xl text-sm">
          {message}
        </div>
      )}

      <div className="space-y-4">
        {pengumuman.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm">
            <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-center shadow-inner mb-4">
              <Megaphone className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-base text-slate-800 dark:text-white">Belum Ada Pengumuman</h3>
            <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1 max-w-xs">Buat pengumuman untuk memberitahukan hasil seleksi.</p>
          </div>
        ) : (
          pengumuman.map((p) => (
            <div key={p.id} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <Megaphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-zinc-200">{p.judul}</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5">
                      {new Date(p.tanggal_terbit).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleDelete(p.id)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all" title="Hapus">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {p.konten && (
                <p className="text-sm text-slate-600 dark:text-zinc-400 mt-3 whitespace-pre-line ml-[52px]">{p.konten}</p>
              )}
              {p.file_url && (
                <a href={p.file_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:underline ml-[52px] mt-3">
                  <FileText className="h-3.5 w-3.5" /> Download Lampiran
                </a>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            <div className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Pengumuman Baru</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Judul</label>
                <input type="text" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Konten</label>
                <textarea value={form.konten} onChange={(e) => setForm({ ...form, konten: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" rows={5} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">File URL (opsional)</label>
                <input type="text" value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" placeholder="URL PDF/lampiran" />
              </div>
            </div>
            <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-zinc-900/50">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-xl font-bold text-xs">
                Batal
              </button>
              <button onClick={handleCreate} disabled={saving}
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
