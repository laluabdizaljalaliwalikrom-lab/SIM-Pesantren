'use client';

import { useEffect, useState } from 'react';
import { getAllCalonSantri, updateStatusCalonSantri } from '@/services/ppdb-actions';
import { CalonSantri } from '@/types/database';
import { Eye, X, CheckCircle2, XCircle, ArrowRight, GraduationCap, ThumbsDown, Loader2, Search } from 'lucide-react';

const statusColors: Record<string, string> = {
  MENUNGGU_VERIFIKASI: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  LOLOS_ADMIN: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  DITOLAK: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
  MENUNGGU_SELEKSI: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
  DITERIMA: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  TIDAK_DITERIMA: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
  MENUNGGU_PEMBAYARAN: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20',
  LUNAS: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-500/20',
  SUDAH_DAFTAR_ULANG: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20',
};

const statusLabels: Record<string, string> = {
  MENUNGGU_VERIFIKASI: 'Menunggu Verifikasi',
  LOLOS_ADMIN: 'Lolos Verifikasi',
  DITOLAK: 'Ditolak',
  MENUNGGU_SELEKSI: 'Menunggu Seleksi',
  DITERIMA: 'Diterima',
  TIDAK_DITERIMA: 'Tidak Diterima',
  MENUNGGU_PEMBAYARAN: 'Menunggu Pembayaran',
  LUNAS: 'Lunas',
  SUDAH_DAFTAR_ULANG: 'Sudah Daftar Ulang',
};

export default function PendaftarPage() {
  const [list, setList] = useState<CalonSantri[]>([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CalonSantri | null>(null);
  const [catatan, setCatatan] = useState('');
  const [tempStatus, setTempStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadData(); }, [filter]);

  async function loadData() {
    setLoading(true);
    const res = await getAllCalonSantri(filter ? { status: filter } : undefined);
    if (res.data) setList(res.data);
    setLoading(false);
  }

  async function handleStatus(id: string, status: string) {
    setActionLoading(true);
    await updateStatusCalonSantri(id, status, catatan);
    setActionLoading(false);
    setSelected(null);
    loadData();
  }

  const filtered = search
    ? list.filter(item => item.nama_lengkap.toLowerCase().includes(search.toLowerCase()) || item.email?.toLowerCase().includes(search.toLowerCase()))
    : list;

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Pendaftar</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">Daftar calon santri</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm">
          <option value="">Semua Status</option>
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-4">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input type="text" placeholder="Cari berdasarkan nama atau email..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-2 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none transition-all duration-200 text-sm" />
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Nama</th>
                <th className="py-4 px-6">Kontak</th>
                <th className="py-4 px-6">Jalur</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-sm text-slate-700 dark:text-zinc-300">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 transition-all duration-200">
                  <td className="py-4 px-6">
                    <p className="font-semibold text-slate-800 dark:text-zinc-200">{item.nama_lengkap}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-slate-500 dark:text-zinc-400">{item.email}</p>
                    <p className="text-slate-400 dark:text-zinc-500 text-xs">{item.no_hp}</p>
                  </td>
                  <td className="py-4 px-6">
                    <span className="capitalize text-slate-600 dark:text-zinc-400">{item.jalur_pendaftaran}</span>
                    {item.jenis_afirmasi && <p className="text-xs text-slate-400 dark:text-zinc-500 capitalize">{item.jenis_afirmasi}</p>}
                    {item.jenis_prestasi && <p className="text-xs text-slate-400 dark:text-zinc-500">{item.jenis_prestasi}</p>}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors[item.status] || 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'}`}>
                      {statusLabels[item.status] || item.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button onClick={() => { setSelected(item); setCatatan(item.catatan_admin || ''); setTempStatus(item.status); }}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all" title="Detail">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-center shadow-inner mb-4">
                        <Search className="h-8 w-8" />
                      </div>
                      <h3 className="font-bold text-base text-slate-800 dark:text-white">
                        {search ? 'Pencarian Tidak Ditemukan' : 'Belum Ada Pendaftar'}
                      </h3>
                      <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1 max-w-xs">
                        {search ? 'Coba gunakan kata kunci lain.' : 'Belum ada calon santri yang mendaftar.'}
                      </p>
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
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Detail Pendaftar</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{selected.nama_lengkap}</h2>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border mt-1 ${statusColors[selected.status]}`}>
                    {statusLabels[selected.status] || selected.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Email</p>
                  <p className="font-medium text-slate-800 dark:text-zinc-200">{selected.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">No. HP</p>
                  <p className="font-medium text-slate-800 dark:text-zinc-200">{selected.no_hp}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Jalur</p>
                  <p className="font-medium capitalize text-slate-800 dark:text-zinc-200">{selected.jalur_pendaftaran}</p>
                  {selected.jenis_afirmasi && <p className="text-xs text-slate-400 capitalize">{selected.jenis_afirmasi}</p>}
                  {selected.jenis_prestasi && <p className="text-xs text-slate-400">{selected.jenis_prestasi}</p>}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Tempat / Tgl Lahir</p>
                  <p className="font-medium text-slate-800 dark:text-zinc-200">
                    {selected.tempat_lahir || '-'} / {selected.tanggal_lahir ? new Date(selected.tanggal_lahir).toLocaleDateString('id-ID') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">NIK</p>
                  <p className="font-medium text-slate-800 dark:text-zinc-200">{selected.nik || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Jenis Kelamin</p>
                  <p className="font-medium text-slate-800 dark:text-zinc-200">{selected.jenis_kelamin === 'L' ? 'Laki-laki' : selected.jenis_kelamin === 'P' ? 'Perempuan' : '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Alamat</p>
                  <p className="font-medium text-slate-800 dark:text-zinc-200">{selected.alamat || '-'}</p>
                </div>
                {selected.nama_ayah && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Ayah</p>
                    <p className="font-medium text-slate-800 dark:text-zinc-200">{selected.nama_ayah}</p>
                  </div>
                )}
                {selected.nama_ibu && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Ibu</p>
                    <p className="font-medium text-slate-800 dark:text-zinc-200">{selected.nama_ibu}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Dokumen</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Pas Foto', url: selected.foto_url },
                    { label: 'Akte', url: selected.scan_akte },
                    { label: 'KK', url: selected.scan_kk },
                    ...(selected.jalur_pendaftaran === 'afirmasi' ? [
                      { label: 'KIP', url: selected.scan_kip },
                      { label: 'Surat Ket.', url: selected.surat_keterangan },
                    ] : []),
                  ].map((d) => (
                    <div key={d.label} className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2">
                      <p className="text-xs text-slate-500 dark:text-zinc-400">{d.label}</p>
                      {d.url ? (
                        <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline">Lihat</a>
                      ) : (
                        <span className="text-sm text-slate-400 dark:text-zinc-600">-</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Status Pendaftaran</label>
                  <select value={tempStatus} onChange={(e) => setTempStatus(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm">
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Catatan Admin</label>
                  <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" rows={2} />
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 bg-slate-50/50 dark:bg-zinc-900/50 flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Aksi Cepat Status</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleStatus(selected.id, 'LOLOS_ADMIN')} disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-lg font-bold text-xs disabled:opacity-50">
                    <CheckCircle2 className="h-3 w-3" />
                    Setujui
                  </button>
                  <button onClick={() => handleStatus(selected.id, 'DITOLAK')} disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-lg font-bold text-xs disabled:opacity-50">
                    <XCircle className="h-3 w-3" />
                    Tolak
                  </button>
                  <button onClick={() => handleStatus(selected.id, 'MENUNGGU_SELEKSI')} disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 rounded-lg font-bold text-xs disabled:opacity-50">
                    <ArrowRight className="h-3 w-3" />
                    Ke Seleksi
                  </button>
                  <button onClick={() => handleStatus(selected.id, 'DITERIMA')} disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 dark:bg-teal-500/10 hover:bg-teal-100 dark:hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20 rounded-lg font-bold text-xs disabled:opacity-50">
                    <GraduationCap className="h-3 w-3" />
                    Terima
                  </button>
                  <button onClick={() => handleStatus(selected.id, 'TIDAK_DITERIMA')} disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-lg font-bold text-xs disabled:opacity-50">
                    <ThumbsDown className="h-3 w-3" />
                    Tidak Lulus
                  </button>
                </div>
              </div>
              <div className="border-t border-slate-100 dark:border-zinc-800 pt-3 flex items-center justify-between gap-4">
                <span className="text-xs text-slate-400 dark:text-zinc-500">
                  Ubah status secara manual menggunakan pilihan di atas, lalu tekan Simpan.
                </span>
                <button onClick={() => handleStatus(selected.id, tempStatus)} disabled={actionLoading}
                  className="flex items-center justify-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-w-[120px]">
                  {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
