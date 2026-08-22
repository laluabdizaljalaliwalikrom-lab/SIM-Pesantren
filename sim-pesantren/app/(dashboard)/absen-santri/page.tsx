'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { AbsensiSantri, Kelas } from '@/types/database';
import { getAbsensiSantriHariIni, deleteAbsensiSantri } from '@/services/absensi-santri-actions';
import { getTanggalLibur } from '@/services/absensi-pegawai-actions';
import {
  CalendarCheck,
  CheckCircle,
  Loader2,
  QrCode,
  Search,
  Trash2,
  Calendar,
  UserCheck,
  Timer,
  XCircle,
  Stethoscope,
  FileText,
  GraduationCap,
  Sparkles,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  Hadir: { color: 'bg-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20', icon: CheckCircle },
  Terlambat: { color: 'bg-amber-500', badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20', icon: Timer },
  Izin: { color: 'bg-blue-500', badge: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20', icon: FileText },
  Sakit: { color: 'bg-purple-500', badge: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20', icon: Stethoscope },
  Alpha: { color: 'bg-red-500', badge: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20', icon: XCircle },
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

export default function AbsenSantriPage() {
  const [absensiList, setAbsensiList] = useState<AbsensiSantri[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [allSantriCount, setAllSantriCount] = useState(0);
  const [liburKeterangan, setLiburKeterangan] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [result, countResult, liburResult, kelasResult] = await Promise.all([
        getAbsensiSantriHariIni(selectedDate, selectedKelas || undefined),
        supabase.from('santri').select('*', { count: 'exact', head: true }).eq('status', 'aktif'),
        getTanggalLibur(),
        supabase.from('kelas').select('*').order('nama_kelas'),
      ]);

      if (result.success) {
        setAbsensiList(result.data || []);
      } else {
        toast.error(result.error || 'Gagal memuat data absensi santri');
      }

      setAllSantriCount(countResult.count || 0);
      if (kelasResult.data) setKelasList(kelasResult.data);

      if (liburResult.success) {
        const liburMap = new Map<string, string>();
        (liburResult.data || []).forEach((l) => liburMap.set(l.tanggal, l.keterangan || ''));
        setLiburKeterangan(liburMap.get(selectedDate) ?? null);
      }
    } catch {
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedKelas]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus data absensi santri ini?')) return;
    const result = await deleteAbsensiSantri(id);
    if (result.success) {
      toast.success('Data absensi dihapus');
      fetchData();
    } else {
      toast.error(result.error || 'Gagal menghapus');
    }
  };

  const filtered = absensiList.filter((a) => {
    const nama = a.santri?.nama_lengkap?.toLowerCase() || '';
    const nis = a.santri?.nis?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    const matchSearch = nama.includes(q) || nis.includes(q);
    const matchStatus = filterStatus === 'Semua' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const countHadir = absensiList.filter((a) => a.status === 'Hadir').length;
  const countTerlambat = absensiList.filter((a) => a.status === 'Terlambat').length;
  const countIzinSakit = absensiList.filter((a) => a.status === 'Izin' || a.status === 'Sakit').length;
  const countAlpha = absensiList.filter((a) => a.status === 'Alpha').length;
  const countBelumAbsen = Math.max(0, allSantriCount - absensiList.length);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-indigo-950 p-6 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 h-40 w-40 rounded-full bg-teal-400/10 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-300 text-xs font-semibold tracking-wide border border-white/10">
              <Sparkles className="w-3.5 h-3.5" /> Absensi Presensi Santri Harian
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-emerald-400" /> Riwayat Absensi Santri
            </h1>
            <p className="text-emerald-100/80 text-sm max-w-xl">
              Pantau tingkat kehadiran harian santri via QR Code, catat status presensi, serta kelola kartu dan rekap bulanan santri.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/absen-santri/scan"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <QrCode className="w-4 h-4" /> Scan QR Absen
            </Link>
            <Link
              href="/absen-santri/kartu"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm border border-white/20 backdrop-blur-sm transition-all"
            >
              Kartu Santri
            </Link>
            <Link
              href="/absen-santri/atur"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm border border-white/20 backdrop-blur-sm transition-all"
            >
              Atur Absen
            </Link>
            <Link
              href="/absen-santri/rekap"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm border border-white/20 backdrop-blur-sm transition-all"
            >
              Rekap Bulanan
            </Link>
          </div>
        </div>
      </div>

      {liburKeterangan && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm flex items-center gap-3">
          <Calendar className="w-5 h-5 shrink-0 text-amber-600" />
          <span><strong>Hari Libur:</strong> {liburKeterangan}</span>
        </div>
      )}

      {/* Date & Filter Toolbar */}
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

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama / NIS santri..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Hadir</span>
            <CheckCircle className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{countHadir}</p>
          <span className="text-xs text-slate-500 dark:text-zinc-400">Santri tepat waktu</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Terlambat</span>
            <Timer className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{countTerlambat}</p>
          <span className="text-xs text-slate-500 dark:text-zinc-400">Santri terlambat</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Izin / Sakit</span>
            <FileText className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{countIzinSakit}</p>
          <span className="text-xs text-slate-500 dark:text-zinc-400">Keterangan resmi</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-red-600 dark:text-red-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Alpha</span>
            <XCircle className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{countAlpha}</p>
          <span className="text-xs text-slate-500 dark:text-zinc-400">Tanpa keterangan</span>
        </div>

        <div className="col-span-2 md:col-span-1 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Belum Absen</span>
            <UserCheck className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{countBelumAbsen}</p>
          <span className="text-xs text-slate-500 dark:text-zinc-400">Dari total {allSantriCount} santri</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['Semua', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpha'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              filterStatus === st
                ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-sm'
                : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-zinc-400 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm font-medium">Memuat data absensi santri...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-zinc-400 space-y-3">
            <CalendarCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-zinc-700" />
            <p className="text-base font-semibold text-slate-700 dark:text-zinc-300">Belum Ada Catatan Absensi</p>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              {searchQuery ? 'Tidak ada santri yang cocok dengan kata kunci.' : 'Belum ada santri yang melakukan presensi pada tanggal ini.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800">
                  <th className="py-4 px-6">Santri</th>
                  <th className="py-4 px-6">Kelas / Rombel</th>
                  <th className="py-4 px-6">Jam Masuk</th>
                  <th className="py-4 px-6">Jam Keluar</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Keterangan</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-sm">
                {filtered.map((item) => {
                  const s = item.santri;
                  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.Hadir;
                  const IconComp = cfg.icon;

                  const formatTime = (iso?: string | null) => {
                    if (!iso) return '-';
                    const d = new Date(iso);
                    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                  };

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {s?.foto_url ? (
                            <Image
                              src={s.foto_url}
                              alt={s.nama_lengkap || 'Santri'}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-zinc-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-200 dark:border-emerald-800">
                              {s?.nama_lengkap ? getInitials(s.nama_lengkap) : 'S'}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{s?.nama_lengkap || 'Nama Santri'}</p>
                            <p className="text-xs text-slate-500 dark:text-zinc-400">NIS: {s?.nis || '-'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-medium text-slate-700 dark:text-zinc-300">
                        {s?.kelas_formal?.nama_kelas || s?.rombel_saat_ini || '-'}
                      </td>

                      <td className="py-4 px-6 font-mono text-slate-700 dark:text-zinc-300">
                        {formatTime(item.jam_masuk)}
                      </td>

                      <td className="py-4 px-6 font-mono text-slate-700 dark:text-zinc-300">
                        {formatTime(item.jam_keluar)}
                      </td>

                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}>
                          <IconComp className="w-3.5 h-3.5" />
                          {item.status}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-slate-500 dark:text-zinc-400 max-w-xs truncate">
                        {item.keterangan || '-'}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                          title="Hapus Absensi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
