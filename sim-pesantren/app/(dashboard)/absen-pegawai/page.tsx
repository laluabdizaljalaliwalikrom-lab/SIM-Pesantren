'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { AbsensiPegawai } from '@/types/database';
import { getAbsensiHariIni, deleteAbsensi, getTanggalLibur } from '@/services/absensi-pegawai-actions';
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

export default function AbsenPegawaiPage() {
  const [absensiList, setAbsensiList] = useState<AbsensiPegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [allPegawaiCount, setAllPegawaiCount] = useState(0);
  const [liburDates, setLiburDates] = useState<Set<string>>(new Set());
  const [liburKeterangan, setLiburKeterangan] = useState<string | null>(null);
  const [hariKerja, setHariKerja] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getAbsensiHariIni(selectedDate);
      if (result.success) {
        setAbsensiList(result.data || []);
      } else {
        toast.error(result.error || 'Gagal memuat data');
      }

      const [countResult, liburResult, profileResult] = await Promise.all([
        supabase.from('pegawai').select('*', { count: 'exact', head: true }).eq('status', 'Aktif'),
        getTanggalLibur(),
        supabase.from('pesantren_profile').select('hari_kerja').maybeSingle(),
      ]);

      setAllPegawaiCount(countResult.count || 0);

      if (liburResult.success) {
        const liburMap = new Map<string, string>();
        (liburResult.data || []).forEach((l) => liburMap.set(l.tanggal, l.keterangan || ''));
        setLiburDates(new Set(liburMap.keys()));
        setLiburKeterangan(liburMap.get(selectedDate) ?? null);
      }

      const raw = profileResult.data?.hari_kerja as number[] | undefined;
      setHariKerja(raw && raw.length > 0 ? raw : [0, 1, 2, 3, 4, 5, 6]);
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const filtered = absensiList.filter((a) => {
    const name = a.pegawai?.nama_lengkap?.toLowerCase() || '';
    const nip = a.pegawai?.nip?.toLowerCase() || '';
    const matchSearch =
      !searchQuery || name.includes(searchQuery.toLowerCase()) || nip.includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'Semua' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    hadir: absensiList.filter((a) => a.status === 'Hadir').length,
    terlambat: absensiList.filter((a) => a.status === 'Terlambat').length,
    izin: absensiList.filter((a) => a.status === 'Izin').length,
    sakit: absensiList.filter((a) => a.status === 'Sakit').length,
    alpha: 0,
  };

  const isLibur = liburDates.has(selectedDate);
  const isWeeklyOff = !hariKerja.includes(new Date(selectedDate + 'T00:00:00').getDay());
  const todayStr = new Date().toISOString().split('T')[0];
  if (!isLibur && !isWeeklyOff && selectedDate <= todayStr) {
    stats.alpha = Math.max(0, allPegawaiCount - absensiList.length);
  }

  const formatTime = (iso?: string | null) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Absensi Pegawai
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            Riwayat kehadiran pegawai harian
          </p>
        </div>
        <Link
          href="/absen-pegawai/scan"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-500/25"
        >
          <QrCode className="h-5 w-5" />
          Scan QR
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Hadir', value: stats.hadir, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Terlambat', value: stats.terlambat, icon: Timer, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Izin', value: stats.izin, icon: FileText, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Sakit', value: stats.sakit, icon: Stethoscope, color: 'text-purple-600 dark:text-purple-400' },
          { label: 'Alpha', value: stats.alpha, icon: XCircle, color: 'text-red-600 dark:text-red-400' },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-4 flex items-center gap-3"
          >
            <div className={`${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">{s.label}</p>
            </div>
          </div>
        ))}
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
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
          >
            <option value="Semua">Semua Status</option>
            <option value="Hadir">Hadir</option>
            <option value="Terlambat">Terlambat</option>
            <option value="Izin">Izin</option>
            <option value="Sakit">Sakit</option>
            <option value="Alpha">Alpha</option>
          </select>
        </div>
      </div>

      {isLibur && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{' '}
            adalah {isWeeklyOff && !isLibur ? 'hari libur mingguan' : 'hari libur'}
            {liburKeterangan && ` — ${liburKeterangan}`}. Hari ini tidak dihitung sebagai Alpha.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-12 text-center">
          <UserCheck className="h-12 w-12 mx-auto text-slate-300 dark:text-zinc-600 mb-3" />
          <p className="text-slate-500 dark:text-zinc-400 font-medium">Belum ada data absensi</p>
          <p className="text-sm text-slate-400 dark:text-zinc-500 mt-1">
            Mulai scan QR pegawai untuk mencatat kehadiran
          </p>
          <Link
            href="/absen-pegawai/scan"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <QrCode className="h-4 w-4" />
            Buka Scanner
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-zinc-400">Pegawai</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-zinc-400">NIP</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-zinc-400">Jabatan</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-zinc-400">Jam Masuk</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-zinc-400">Jam Keluar</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-zinc-400">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-zinc-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const sc = STATUS_CONFIG[item.status];
                  const StatusIcon = sc.icon;
                  const nama = item.pegawai?.nama_lengkap || '-';
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.pegawai?.foto_url ? (
                            <Image
                              src={item.pegawai.foto_url}
                              alt={nama}
                              width={36}
                              height={36}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                              {getInitials(nama)}
                            </div>
                          )}
                          <span className="font-medium text-slate-900 dark:text-white">{nama}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-zinc-400">{item.pegawai?.nip || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-zinc-400">{item.pegawai?.jabatan || '-'}</td>
                      <td className="px-4 py-3 text-center text-slate-900 dark:text-white font-mono">{formatTime(item.jam_masuk)}</td>
                      <td className="px-4 py-3 text-center text-slate-900 dark:text-white font-mono">{formatTime(item.jam_keluar)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${sc.badge}`}>
                          <StatusIcon className="h-3 w-3" />
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
