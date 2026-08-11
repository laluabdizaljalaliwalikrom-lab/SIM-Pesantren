'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { setAbsensiManual, getAbsensiHariIni, deleteAbsensi } from '@/services/absensi-pegawai-actions';
import type { Pegawai, AbsensiPegawai, StatusAbsensiPegawai } from '@/types/database';
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
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS: { value: StatusAbsensiPegawai; label: string; icon: React.ElementType; color: string }[] = [
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

export default function AturAbsensiPage() {
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [absensiList, setAbsensiList] = useState<AbsensiPegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState<Pegawai | null>(null);
  const [formStatus, setFormStatus] = useState<StatusAbsensiPegawai>('Izin');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formJamMasuk, setFormJamMasuk] = useState('');
  const [formJamKeluar, setFormJamKeluar] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [pegawaiResult, absensiResult] = await Promise.all([
        supabase.from('pegawai').select('*').eq('status', 'Aktif').order('nama_lengkap'),
        getAbsensiHariIni(selectedDate),
      ]);

      if (pegawaiResult.data) setPegawaiList(pegawaiResult.data);
      if (absensiResult.success) setAbsensiList(absensiResult.data || []);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

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

    const result = await setAbsensiManual(
      showModal.id,
      selectedDate,
      formStatus,
      formKeterangan || undefined,
      toIso(formJamMasuk),
      toIso(formJamKeluar)
    );

    if (result.success) {
      toast.success(result.message);
      setShowModal(null);
      setFormKeterangan('');
      setFormJamMasuk('');
      setFormJamKeluar('');
      fetchData();
    } else {
      toast.error(result.error || 'Gagal menyimpan');
    }
    setSaving(null);
  };

  const openModal = (pegawai: Pegawai) => {
    const existing = getAbsensiForPegawai(pegawai.id);
    setShowModal(pegawai);
    setFormStatus(existing?.status || 'Izin');
    setFormKeterangan(existing?.keterangan || '');
    setFormJamMasuk(isoToLocalTime(existing?.jam_masuk));
    setFormJamKeluar(isoToLocalTime(existing?.jam_keluar));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus data absensi ini?')) return;
    const result = await deleteAbsensi(id);
    if (result.success) {
      toast.success('Data absensi dihapus');
      fetchData();
    } else {
      toast.error(result.error || 'Gagal menghapus');
    }
  };

  const getAbsensiForPegawai = (id: string) => absensiList.find((a) => a.id_pegawai === id);

  const filtered = pegawaiList.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.nama_lengkap.toLowerCase().includes(q) ||
      p.nip?.toLowerCase().includes(q) ||
      p.jabatan.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/absen-pegawai"
          className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Atur Absensi Manual
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm">
            Atur status kehadiran & koreksi jam masuk/keluar pegawai
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau NIP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((pegawai) => {
            const absensi = getAbsensiForPegawai(pegawai.id);
            return (
              <div
                key={pegawai.id}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
              >
                {pegawai.foto_url ? (
                  <Image
                    src={pegawai.foto_url}
                    alt={pegawai.nama_lengkap}
                    width={44}
                    height={44}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {getInitials(pegawai.nama_lengkap)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">{pegawai.nama_lengkap}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">{pegawai.jabatan}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {absensi ? (
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${STATUS_BADGE[absensi.status] || ''}`}>
                        {absensi.status}
                      </span>
                      <button
                        onClick={() => openModal(pegawai)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Edit absensi"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(absensi.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => openModal(pegawai)}
                      className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-medium transition-colors"
                    >
                      Atur
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(null)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Atur Absensi</h2>
              <button
                onClick={() => setShowModal(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                <XCircle className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-zinc-800 rounded-xl">
              {showModal.foto_url ? (
                <Image src={showModal.foto_url} alt={showModal.nama_lengkap} width={40} height={40} className="rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                  {getInitials(showModal.nama_lengkap)}
                </div>
              )}
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{showModal.nama_lengkap}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">{showModal.jabatan}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">Tanggal</label>
              <input
                type="date"
                value={selectedDate}
                disabled
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-slate-500 dark:text-zinc-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">Status</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setFormStatus(opt.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        formStatus === opt.value
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                          : 'border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${opt.color}`} />
                      <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Jam Masuk <span className="text-slate-400">(opsional)</span>
                </label>
                <input
                  type="time"
                  value={formJamMasuk}
                  onChange={(e) => setFormJamMasuk(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Jam Keluar <span className="text-slate-400">(opsional)</span>
                </label>
                <input
                  type="time"
                  value={formJamKeluar}
                  onChange={(e) => setFormJamKeluar(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">
                Keterangan <span className="text-slate-400">(opsional)</span>
              </label>
              <textarea
                value={formKeterangan}
                onChange={(e) => setFormKeterangan(e.target.value)}
                placeholder="Contoh: Izin urusan keluarga"
                rows={2}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving === showModal.id}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {saving === showModal.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
