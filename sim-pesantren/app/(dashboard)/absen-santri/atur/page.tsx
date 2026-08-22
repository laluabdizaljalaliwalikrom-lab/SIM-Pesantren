'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { setAbsensiSantriManual, getAbsensiSantriHariIni, deleteAbsensiSantri } from '@/services/absensi-santri-actions';
import type { Santri, AbsensiSantri, StatusAbsensiSantri, Kelas } from '@/types/database';
import {
  Settings,
  ArrowLeft,
  Search,
  Loader2,
  Save,
  Calendar,
  FileText,
  Trash2,
  Stethoscope,
  XCircle,
  CheckCircle,
  Timer,
  Pencil,
  Clock,
  Filter,
  GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS: { value: StatusAbsensiSantri; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'Hadir', label: 'Hadir', icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400' },
  { value: 'Terlambat', label: 'Terlambat', icon: Timer, color: 'text-amber-600 dark:text-amber-400' },
  { value: 'Izin', label: 'Izin', icon: FileText, color: 'text-blue-600 dark:text-blue-400' },
  { value: 'Sakit', label: 'Sakit', icon: Stethoscope, color: 'text-purple-600 dark:text-purple-400' },
  { value: 'Alpha', label: 'Alpha', icon: XCircle, color: 'text-red-600 dark:text-red-400' },
];

const STATUS_BADGE: Record<string, string> = {
  Hadir: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  Terlambat: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  Izin: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
  Sakit: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20',
  Alpha: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20',
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

const isoToLocalTime = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function AturAbsensiSantriPage() {
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [absensiList, setAbsensiList] = useState<AbsensiSantri[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState<Santri | null>(null);
  const [formStatus, setFormStatus] = useState<StatusAbsensiSantri>('Izin');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formJamMasuk, setFormJamMasuk] = useState('');
  const [formJamKeluar, setFormJamKeluar] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase.from('santri').select('*, kelas_formal:id_kelas_formal(id, nama_kelas)').eq('status', 'aktif').order('nama_lengkap');
      if (selectedKelas) {
        query = query.eq('id_kelas_formal', selectedKelas);
      }

      const [santriResult, absensiResult, kelasResult] = await Promise.all([
        query,
        getAbsensiSantriHariIni(selectedDate, selectedKelas || undefined),
        supabase.from('kelas').select('*').order('nama_kelas'),
      ]);

      if (santriResult.data) setSantriList(santriResult.data);
      if (absensiResult.success) setAbsensiList(absensiResult.data || []);
      if (kelasResult.data) setKelasList(kelasResult.data);
    } catch {
      toast.error('Gagal memuat data santri');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedKelas]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!showModal) return;
    setSaving(showModal.id);

    const toIso = (time: string) => {
      if (!time) return null;
      return new Date(`${selectedDate}T${time}:00`).toISOString();
    };

    const result = await setAbsensiSantriManual(
      showModal.id,
      selectedDate,
      formStatus,
      formKeterangan || undefined,
      toIso(formJamMasuk),
      toIso(formJamKeluar)
    );

    setSaving(null);
    if (result.success) {
      toast.success(result.message);
      setShowModal(null);
      fetchData();
    } else {
      toast.error(result.error || 'Gagal menyimpan absensi');
    }
  };

  const handleQuickStatus = async (santri: Santri, status: StatusAbsensiSantri) => {
    setSaving(santri.id);
    const now = new Date();
    const jamMasukIso = status === 'Hadir' || status === 'Terlambat' ? now.toISOString() : null;

    const result = await setAbsensiSantriManual(
      santri.id,
      selectedDate,
      status,
      undefined,
      jamMasukIso,
      null
    );

    setSaving(null);
    if (result.success) {
      toast.success(`${santri.nama_lengkap} diatur: ${status}`);
      fetchData();
    } else {
      toast.error(result.error || 'Gagal mengubah status');
    }
  };

  const handleDeleteAbsensi = async (id: string) => {
    if (!confirm('Hapus pencatatan absensi santri ini?')) return;
    const res = await deleteAbsensiSantri(id);
    if (res.success) {
      toast.success('Pencatatan absensi dihapus');
      fetchData();
    } else {
      toast.error(res.error || 'Gagal menghapus');
    }
  };

  const openModalForSantri = (santri: Santri) => {
    const existing = absensiList.find((a) => a.id_santri === santri.id);
    setShowModal(santri);
    setFormStatus(existing?.status || 'Izin');
    setFormKeterangan(existing?.keterangan || '');
    setFormJamMasuk(isoToLocalTime(existing?.jam_masuk));
    setFormJamKeluar(isoToLocalTime(existing?.jam_keluar));
  };

  const filtered = santriList.filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.nama_lengkap.toLowerCase().includes(q) || (s.nis && s.nis.toLowerCase().includes(q));
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/absen-santri"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Riwayat
        </Link>
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-indigo-950 p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 backdrop-blur-md rounded-2xl border border-emerald-500/30">
            <Settings className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-emerald-400" /> Atur Absensi Santri Manual
            </h1>
            <p className="text-emerald-100/80 text-sm mt-0.5">
              Kelola status kehadiran santri secara cepat (Hadir, Terlambat, Izin, Sakit, Alpha).
            </p>
          </div>
        </div>
      </div>

      {/* Date & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700">
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-800 dark:text-zinc-200 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_kelas}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari santri..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Santri Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm font-medium">Memuat data santri...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-base font-semibold">Tidak ada santri ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800">
                  <th className="py-4 px-6">Santri</th>
                  <th className="py-4 px-6">Kelas</th>
                  <th className="py-4 px-6">Status Hari Ini</th>
                  <th className="py-4 px-6">Set Status Cepat</th>
                  <th className="py-4 px-6 text-right">Detail / Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-sm">
                {filtered.map((s) => {
                  const existing = absensiList.find((a) => a.id_santri === s.id);
                  const isSavingThis = saving === s.id;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {s.foto_url ? (
                            <Image
                              src={s.foto_url}
                              alt={s.nama_lengkap}
                              width={36}
                              height={36}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-zinc-700"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-xs">
                              {getInitials(s.nama_lengkap)}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{s.nama_lengkap}</p>
                            <p className="text-xs text-slate-500">NIS: {s.nis || '-'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-slate-700 dark:text-zinc-300 font-medium">
                        {(s as any).kelas_formal?.nama_kelas || s.rombel_saat_ini || '-'}
                      </td>

                      <td className="py-4 px-6">
                        {existing ? (
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGE[existing.status]}`}>
                              {existing.status}
                            </span>
                            {existing.keterangan && (
                              <span className="text-xs text-slate-400 italic">({existing.keterangan})</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Belum absen</span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              disabled={isSavingThis}
                              onClick={() => handleQuickStatus(s, opt.value)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                existing?.status === opt.value
                                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-500 dark:text-slate-950 font-bold'
                                  : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openModalForSantri(s)}
                            className="p-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Edit Absensi Detail"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {existing && (
                            <button
                              onClick={() => handleDeleteAbsensi(existing.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                              title="Hapus Record Absensi"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Detail Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-zinc-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Pencil className="w-5 h-5 text-emerald-500" /> Detail Absensi: {showModal.nama_lengkap}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">Status Presence</label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormStatus(opt.value)}
                      className={`p-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                        formStatus === opt.value
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
                      }`}
                    >
                      <opt.icon className="w-3.5 h-3.5" /> {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" /> Jam Masuk
                  </label>
                  <input
                    type="time"
                    value={formJamMasuk}
                    onChange={(e) => setFormJamMasuk(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" /> Jam Keluar
                  </label>
                  <input
                    type="time"
                    value={formJamKeluar}
                    onChange={(e) => setFormJamKeluar(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">Catatan / Keterangan</label>
                <textarea
                  rows={2}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Contoh: Izin acara keluarga, Sakit demam..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!!saving}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
