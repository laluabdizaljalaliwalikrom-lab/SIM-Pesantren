'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import {
  getPegawaiList,
  getRekapBulanan,
  getTanggalLibur,
  addTanggalLibur,
  deleteTanggalLibur,
  updateHariKerja,
} from '@/services/absensi-pegawai-actions';
import type { AbsensiPegawai, Pegawai, TanggalLibur } from '@/types/database';
import {
  CalendarRange,
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  Sun,
  Plus,
  Trash2,
  BarChart3,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_META: Record<string, { label: string; letter: string; cell: string; chip: string }> = {
  Hadir: {
    label: 'Hadir',
    letter: 'H',
    cell: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    chip: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  },
  Terlambat: {
    label: 'Terlambat',
    letter: 'T',
    cell: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    chip: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  },
  Izin: {
    label: 'Izin',
    letter: 'I',
    cell: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    chip: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
  },
  Sakit: {
    label: 'Sakit',
    letter: 'S',
    cell: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
    chip: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20',
  },
  Alpha: {
    label: 'Alpha',
    letter: 'A',
    cell: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
    chip: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20',
  },
};

const localDateString = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const HARI_KERJA_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 0, label: 'Ahad' },
];

const DEFAULT_HARI_KERJA = [0, 1, 2, 3, 4, 5, 6];

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

const formatNama = (p: Pegawai) => {
  const parts: string[] = [];
  if (p.gelar_depan) parts.push(p.gelar_depan);
  parts.push(p.nama_lengkap);
  if (p.gelar_belakang) parts.push(p.gelar_belakang);
  return parts.join(' ');
};

export default function RekapAbsenPegawaiPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [absensiList, setAbsensiList] = useState<AbsensiPegawai[]>([]);
  const [liburList, setLiburList] = useState<TanggalLibur[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJabatan, setFilterJabatan] = useState('Semua');
  const [liburDate, setLiburDate] = useState('');
  const [liburKeterangan, setLiburKeterangan] = useState('');
  const [savingLibur, setSavingLibur] = useState(false);
  const [deletingLibur, setDeletingLibur] = useState<string | null>(null);
  const [hariKerja, setHariKerja] = useState<number[]>(DEFAULT_HARI_KERJA);
  const [savingHariKerja, setSavingHariKerja] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [pegawaiResult, rekapResult, liburResult, profileResult] = await Promise.all([
        getPegawaiList(),
        getRekapBulanan(month, year),
        getTanggalLibur(),
        supabase.from('pesantren_profile').select('hari_kerja').maybeSingle(),
      ]);

      if (pegawaiResult.success) setPegawaiList(pegawaiResult.data || []);
      else toast.error(pegawaiResult.error || 'Gagal memuat pegawai');

      if (rekapResult.success) setAbsensiList((rekapResult.data || []) as AbsensiPegawai[]);
      else toast.error(rekapResult.error || 'Gagal memuat rekap');

      if (liburResult.success) setLiburList(liburResult.data || []);
      else toast.error(liburResult.error || 'Gagal memuat hari libur');

      const raw = profileResult.data?.hari_kerja as number[] | undefined;
      setHariKerja(raw && raw.length > 0 ? raw : DEFAULT_HARI_KERJA);
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const liburDates = new Set(liburList.map((l) => l.tanggal));
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
  const isFutureMonth = year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth() + 1);

  const dayInfo: { date: string; type: 'working' | 'libur' | 'future'; day: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = localDateString(year, month, d);
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    const isWeeklyOff = !hariKerja.includes(dayOfWeek);
    if (isFutureMonth || (isCurrentMonth && d > today.getDate())) {
      dayInfo.push({ date: dateStr, type: 'future', day: d });
    } else if (liburDates.has(dateStr)) {
      dayInfo.push({ date: dateStr, type: 'libur', day: d });
    } else if (isWeeklyOff) {
      dayInfo.push({ date: dateStr, type: 'libur', day: d });
    } else {
      dayInfo.push({ date: dateStr, type: 'working', day: d });
    }
  }
  const workingDays = dayInfo.filter((di) => di.type === 'working').length;

  const absensiByPegawai = new Map<string, Map<string, AbsensiPegawai>>();
  absensiList.forEach((a) => {
    if (!absensiByPegawai.has(a.id_pegawai)) absensiByPegawai.set(a.id_pegawai, new Map());
    absensiByPegawai.get(a.id_pegawai)!.set(a.tanggal, a);
  });

  const jabatanList = Array.from(new Set(pegawaiList.map((p) => p.jabatan))).sort();

  const filteredPegawai = pegawaiList.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !searchQuery || formatNama(p).toLowerCase().includes(q) || p.nip?.toLowerCase().includes(q);
    const matchJabatan = filterJabatan === 'Semua' || p.jabatan === filterJabatan;
    return matchSearch && matchJabatan;
  });

  const buildSummary = (p: Pegawai) => {
    const records = absensiByPegawai.get(p.id) || new Map<string, AbsensiPegawai>();
    const counts = { Hadir: 0, Terlambat: 0, Izin: 0, Sakit: 0, Alpha: 0 };
    let counted = 0;
    dayInfo.forEach((di) => {
      if (di.type !== 'working') return;
      counted++;
      const status = records.get(di.date)?.status;
      if (status && status in counts) counts[status]++;
      else counts.Alpha++;
    });
    const hadir = counts.Hadir + counts.Terlambat;
    const persen = counted > 0 ? Math.round((hadir / counted) * 100) : 0;
    return { ...counts, hadir, counted, persen };
  };

  const totals = filteredPegawai.reduce(
    (acc, p) => {
      const s = buildSummary(p);
      acc.hadir += s.Hadir;
      acc.terlambat += s.Terlambat;
      acc.izin += s.Izin;
      acc.sakit += s.Sakit;
      acc.alpha += s.Alpha;
      return acc;
    },
    { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpha: 0 }
  );

  const handleAddLibur = async () => {
    if (!liburDate) {
      toast.error('Pilih tanggal libur');
      return;
    }
    setSavingLibur(true);
    const result = await addTanggalLibur(liburDate, liburKeterangan || undefined);
    if (result.success) {
      toast.success(result.message);
      setLiburDate('');
      setLiburKeterangan('');
      fetchData();
    } else {
      toast.error(result.error || 'Gagal menambah hari libur');
    }
    setSavingLibur(false);
  };

  const handleDeleteLibur = async (id: string) => {
    if (!confirm('Yakin ingin menghapus tanggal libur ini?')) return;
    setDeletingLibur(id);
    const result = await deleteTanggalLibur(id);
    if (result.success) {
      toast.success(result.message);
      fetchData();
    } else {
      toast.error(result.error || 'Gagal menghapus hari libur');
    }
    setDeletingLibur(null);
  };

  const handleExport = () => {
    const rekapRows = filteredPegawai.map((p) => {
      const records = absensiByPegawai.get(p.id) || new Map<string, AbsensiPegawai>();
      const s = buildSummary(p);
      const row: Record<string, string | number> = {
        Nama: formatNama(p),
        NIP: p.nip || '-',
        Jabatan: p.jabatan,
      };
      dayInfo.forEach((di) => {
        const rec = records.get(di.date);
        if (di.type === 'libur') row[String(di.day)] = 'L';
        else if (di.type === 'future') row[String(di.day)] = '';
        else row[String(di.day)] = rec ? STATUS_META[rec.status].letter : 'A';
      });
      row['Hadir'] = s.Hadir;
      row['Terlambat'] = s.Terlambat;
      row['Izin'] = s.Izin;
      row['Sakit'] = s.Sakit;
      row['Alpha'] = s.Alpha;
      row['Persentase (%)'] = s.persen;
      return row;
    });

    const summaryRows = filteredPegawai.map((p) => {
      const s = buildSummary(p);
      return {
        Nama: formatNama(p),
        NIP: p.nip || '-',
        Jabatan: p.jabatan,
        Hadir: s.Hadir,
        Terlambat: s.Terlambat,
        Izin: s.Izin,
        Sakit: s.Sakit,
        Alpha: s.Alpha,
        'Total Hari Kerja': s.counted,
        'Persentase Kehadiran (%)': s.persen,
      };
    });

    const wb = XLSX.utils.book_new();
    const wsRekap = XLSX.utils.json_to_sheet(rekapRows);
    XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekap');
    const wsRingkasan = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan');

    const monthName = new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long' });
    XLSX.writeFile(wb, `Rekap_Absensi_Pegawai_${monthName}_${year}.xlsx`);
    toast.success('Rekap berhasil diunduh');
  };

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  };

  const toggleHariKerja = async (value: number) => {
    if (savingHariKerja) return;
    const next = hariKerja.includes(value)
      ? hariKerja.filter((d) => d !== value)
      : [...hariKerja, value];
    if (next.length === 0) {
      toast.error('Minimal satu hari kerja harus dipilih');
      return;
    }
    setHariKerja(next);
    setSavingHariKerja(true);
    const result = await updateHariKerja(next);
    if (result.success) {
      toast.success(result.message);
      fetchData();
    } else {
      toast.error(result.error || 'Gagal memperbarui hari kerja');
      setHariKerja(hariKerja);
    }
    setSavingHariKerja(false);
  };

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/absen-pegawai"
            className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarRange className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              Rekap Absensi Pegawai
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 text-sm">
              Matriks kehadiran & rekap bulanan pegawai
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-emerald-500/25"
        >
          <Download className="h-4 w-4" />
          Export Excel
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-zinc-400" />
            </button>
            <input
              type="month"
              value={`${year}-${String(month).padStart(2, '0')}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number);
                if (y && m) {
                  setYear(y);
                  setMonth(m);
                }
              }}
              className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            />
            <button
              onClick={() => changeMonth(1)}
              className="p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-slate-600 dark:text-zinc-400" />
            </button>
          </div>
          <div className="relative flex-1 w-full lg:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau NIP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            />
          </div>
          <select
            value={filterJabatan}
            onChange={(e) => setFilterJabatan(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
          >
            <option value="Semua">Semua Jabatan</option>
            {jabatanList.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Hadir', value: totals.hadir, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Terlambat', value: totals.terlambat, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Izin', value: totals.izin, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Sakit', value: totals.sakit, color: 'text-purple-600 dark:text-purple-400' },
          { label: 'Alpha', value: totals.alpha, color: 'text-red-600 dark:text-red-400' },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-4"
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 dark:text-zinc-400">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50">
                  <th className="sticky left-0 z-10 bg-slate-50 dark:bg-zinc-800/95 text-left px-4 py-3 font-medium text-slate-600 dark:text-zinc-400 min-w-[180px]">
                    Pegawai
                  </th>
                  {dayInfo.map((di) => (
                    <th
                      key={di.date}
                      className={`px-1.5 py-3 text-center font-medium text-slate-600 dark:text-zinc-400 min-w-[30px] ${
                        di.type === 'libur'
                          ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10'
                          : di.type === 'future'
                            ? 'text-slate-300 dark:text-zinc-600'
                            : ''
                      }`}
                    >
                      {di.day}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-medium text-slate-600 dark:text-zinc-400 min-w-[52px]">Hadir</th>
                  <th className="px-3 py-3 text-center font-medium text-slate-600 dark:text-zinc-400 min-w-[52px]">T</th>
                  <th className="px-3 py-3 text-center font-medium text-slate-600 dark:text-zinc-400 min-w-[52px]">I</th>
                  <th className="px-3 py-3 text-center font-medium text-slate-600 dark:text-zinc-400 min-w-[52px]">S</th>
                  <th className="px-3 py-3 text-center font-medium text-slate-600 dark:text-zinc-400 min-w-[52px]">A</th>
                  <th className="px-3 py-3 text-center font-medium text-slate-600 dark:text-zinc-400 min-w-[72px]">%</th>
                </tr>
              </thead>
              <tbody>
                {filteredPegawai.map((p) => {
                  const records = absensiByPegawai.get(p.id) || new Map<string, AbsensiPegawai>();
                  const s = buildSummary(p);
                  return (
                    <tr key={p.id} className="border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="sticky left-0 z-10 bg-white dark:bg-zinc-900 px-4 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-[160px]">
                          {p.foto_url ? (
                            <Image
                              src={p.foto_url}
                              alt={p.nama_lengkap}
                              width={28}
                              height={28}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                              {getInitials(p.nama_lengkap)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white text-[13px] truncate">{formatNama(p)}</p>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">{p.jabatan}</p>
                          </div>
                        </div>
                      </td>
                      {dayInfo.map((di) => {
                        if (di.type === 'libur') {
                          return (
                            <td key={di.date} className="px-1.5 py-2.5 text-center bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 text-[11px] font-bold">
                              L
                            </td>
                          );
                        }
                        if (di.type === 'future') {
                          return <td key={di.date} className="px-1.5 py-2.5 text-center text-slate-300 dark:text-zinc-600 text-[11px]">·</td>;
                        }
                        const status = records.get(di.date)?.status || 'Alpha';
                        const meta = STATUS_META[status];
                        return (
                          <td key={di.date} className={`px-1.5 py-2.5 text-center text-[11px] font-bold rounded-sm ${meta.cell}`}>
                            {meta.letter}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">{s.Hadir}</td>
                      <td className="px-3 py-2.5 text-center text-amber-600 dark:text-amber-400">{s.Terlambat}</td>
                      <td className="px-3 py-2.5 text-center text-blue-600 dark:text-blue-400">{s.Izin}</td>
                      <td className="px-3 py-2.5 text-center text-purple-600 dark:text-purple-400">{s.Sakit}</td>
                      <td className="px-3 py-2.5 text-center text-red-600 dark:text-red-400">{s.Alpha}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-slate-900 dark:text-white">{s.persen}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-200 dark:border-zinc-800 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-zinc-400">
            <span>Hari kerja bulan {monthLabel}: <b className="text-slate-900 dark:text-white">{workingDays} hari</b></span>
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <span key={key} className="inline-flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-sm ${meta.cell}`}>{meta.letter}</span>
                {meta.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-50 dark:bg-amber-500/10 text-amber-500 border border-amber-200 dark:border-amber-500/20 text-center text-[9px] font-bold">L</span>
              Libur
            </span>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sun className="h-5 w-5 text-amber-500" />
            Kelola Hari Libur
          </h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              type="date"
              value={liburDate}
              onChange={(e) => setLiburDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            />
            <input
              type="text"
              placeholder="Keterangan (contoh: Libur Nasional)"
              value={liburKeterangan}
              onChange={(e) => setLiburKeterangan(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            />
            <button
              onClick={handleAddLibur}
              disabled={savingLibur}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {savingLibur ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Tambah
            </button>
          </div>
        </div>
        <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mr-1">
              Hari Kerja Mingguan
            </span>
            {HARI_KERJA_OPTIONS.map((day) => {
              const isActive = hariKerja.includes(day.value);
              return (
                <button
                  key={day.value}
                  onClick={() => toggleHariKerja(day.value)}
                  disabled={savingHariKerja}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all disabled:opacity-50 ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500 hover:border-slate-300 dark:hover:border-zinc-600'
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
            {savingHariKerja && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
          </div>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1.5">
            Hari yang tidak dipilih otomatis ditandai libur (<b className="text-amber-500">L</b>) dan tidak dihitung sebagai Alpha.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {liburList.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-zinc-500">
              Belum ada tanggal libur terdaftar.
            </p>
          ) : (
            liburList.map((l) => (
              <div
                key={l.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg text-xs text-amber-800 dark:text-amber-300"
              >
                <span className="font-medium">
                  {new Date(l.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {l.keterangan && <span className="text-amber-700 dark:text-amber-400">— {l.keterangan}</span>}
                <button
                  onClick={() => handleDeleteLibur(l.id)}
                  disabled={deletingLibur === l.id}
                  className="p-0.5 text-amber-500 hover:text-red-500 transition-colors"
                  title="Hapus"
                >
                  {deletingLibur === l.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-4 flex items-start gap-3">
        <BarChart3 className="h-5 w-5 text-slate-400 mt-0.5" />
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          Hari kerja: <b className="text-slate-900 dark:text-white">{HARI_KERJA_OPTIONS.filter((h) => hariKerja.includes(h.value)).map((h) => h.label).join(', ')}</b>
          {HARI_KERJA_OPTIONS.filter((h) => !hariKerja.includes(h.value)).length > 0 && (
            <>, libur mingguan: <b className="text-amber-500">{HARI_KERJA_OPTIONS.filter((h) => !hariKerja.includes(h.value)).map((h) => h.label).join(', ')}</b></>
          )}
          . Hari yang ditandai <b className="text-amber-500">L</b> (libur) tidak dihitung dalam Alpha. Status Hadir + Terlambat
          diperhitungkan sebagai kehadiran untuk menghitung persentase. Titik <b>·</b> = tanggal mendatang.
        </p>
      </div>
    </div>
  );
}
