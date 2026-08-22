'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import {
  getSantriListForAbsensi,
  getRekapBulananSantri,
} from '@/services/absensi-santri-actions';
import { getTanggalLibur } from '@/services/absensi-pegawai-actions';
import type { AbsensiSantri, Santri, TanggalLibur, Kelas } from '@/types/database';
import {
  CalendarRange,
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Filter,
  GraduationCap,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_META: Record<string, { label: string; letter: string; cell: string; chip: string }> = {
  Hadir: {
    label: 'Hadir',
    letter: 'H',
    cell: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  Terlambat: {
    label: 'Terlambat',
    letter: 'T',
    cell: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 font-bold',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  Izin: {
    label: 'Izin',
    letter: 'I',
    cell: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 font-bold',
    chip: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  Sakit: {
    label: 'Sakit',
    letter: 'S',
    cell: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 font-bold',
    chip: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  Alpha: {
    label: 'Alpha',
    letter: 'A',
    cell: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 font-bold',
    chip: 'bg-red-50 text-red-700 border-red-200',
  },
};

const localDateString = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

export default function RekapAbsenSantriPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [absensiMap, setAbsensiMap] = useState<Map<string, Map<string, AbsensiSantri>>>(new Map());
  const [liburDates, setLiburDates] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [santriResult, rekapResult, liburResult, kelasResult] = await Promise.all([
        getSantriListForAbsensi(selectedKelas || undefined),
        getRekapBulananSantri(month, year, selectedKelas || undefined),
        getTanggalLibur(),
        supabase.from('kelas').select('*').order('nama_kelas'),
      ]);

      if (santriResult.success) {
        setSantriList(santriResult.data || []);
      }
      if (kelasResult.data) {
        setKelasList(kelasResult.data);
      }

      if (liburResult.success) {
        const setLibur = new Set<string>();
        (liburResult.data || []).forEach((l) => setLibur.add(l.tanggal));
        setLiburDates(setLibur);
      }

      if (rekapResult.success && rekapResult.data) {
        const map = new Map<string, Map<string, AbsensiSantri>>();
        rekapResult.data.forEach((row: AbsensiSantri) => {
          if (!map.has(row.id_santri)) {
            map.set(row.id_santri, new Map());
          }
          map.get(row.id_santri)!.set(row.tanggal, row);
        });
        setAbsensiMap(map);
      } else {
        setAbsensiMap(new Map());
      }
    } catch {
      toast.error('Gagal memuat rekap absensi santri');
    } finally {
      setLoading(false);
    }
  }, [month, year, selectedKelas]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const filteredSantri = santriList.filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.nama_lengkap.toLowerCase().includes(q) || (s.nis && s.nis.toLowerCase().includes(q));
  });

  const getSantriStats = (santriId: string) => {
    const sMap = absensiMap.get(santriId);
    let hadir = 0;
    let terlambat = 0;
    let izin = 0;
    let sakit = 0;
    let alpha = 0;

    if (sMap) {
      sMap.forEach((rec) => {
        if (rec.status === 'Hadir') hadir++;
        else if (rec.status === 'Terlambat') terlambat++;
        else if (rec.status === 'Izin') izin++;
        else if (rec.status === 'Sakit') sakit++;
        else if (rec.status === 'Alpha') alpha++;
      });
    }

    return { hadir, terlambat, izin, sakit, alpha };
  };

  const handleExportExcel = () => {
    try {
      const dataToExport = filteredSantri.map((s) => {
        const stats = getSantriStats(s.id);
        const sMap = absensiMap.get(s.id);

        const row: Record<string, any> = {
          NIS: s.nis || '-',
          'Nama Santri': s.nama_lengkap,
          Kelas: (s as any).kelas_formal?.nama_kelas || s.rombel_saat_ini || '-',
        };

        daysArray.forEach((d) => {
          const dateStr = localDateString(year, month, d);
          const rec = sMap?.get(dateStr);
          row[`Tgl ${d}`] = rec ? STATUS_META[rec.status]?.letter || '-' : '-';
        });

        row['Total Hadir'] = stats.hadir;
        row['Total Terlambat'] = stats.terlambat;
        row['Total Izin'] = stats.izin;
        row['Total Sakit'] = stats.sakit;
        row['Total Alpha'] = stats.alpha;

        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Absensi Santri');

      XLSX.writeFile(workbook, `Rekap_Absensi_Santri_${monthNames[month - 1]}_${year}.xlsx`);
      toast.success('File Excel berhasil diunduh!');
    } catch {
      toast.error('Gagal mengekspor file Excel');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Navigation Top */}
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <CalendarRange className="w-6 h-6 text-emerald-400" /> Rekapitulasi Absensi Bulanan Santri
            </h1>
            <p className="text-emerald-100/80 text-sm">
              Ringkasan presensi harian santri per bulan ({monthNames[month - 1]} {year}).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Download className="w-4 h-4" /> Ekspor Excel
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm border border-white/20 backdrop-blur-sm transition-all"
            >
              <Printer className="w-4 h-4" /> Cetak
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar Filter Month & Year & Class */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-bold text-slate-900 dark:text-white min-w-[120px] text-center">
              {monthNames[month - 1]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
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

      {/* Rekap Grid Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm font-medium">Menghitung rekapitulasi santri...</p>
          </div>
        ) : filteredSantri.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-base font-semibold">Tidak ada santri ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-zinc-800">
                  <th className="py-3 px-4 sticky left-0 bg-slate-50 dark:bg-zinc-800 z-10 min-w-[160px]">Santri</th>
                  <th className="py-3 px-3 min-w-[80px]">Kelas</th>
                  {daysArray.map((d) => {
                    const dateStr = localDateString(year, month, d);
                    const isLibur = liburDates.has(dateStr);
                    return (
                      <th
                        key={d}
                        className={`py-3 px-1.5 text-center min-w-[28px] ${
                          isLibur ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700' : ''
                        }`}
                      >
                        {d}
                      </th>
                    );
                  })}
                  <th className="py-3 px-2 text-center bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700">H</th>
                  <th className="py-3 px-2 text-center bg-amber-50 dark:bg-amber-950/30 text-amber-700">T</th>
                  <th className="py-3 px-2 text-center bg-blue-50 dark:bg-blue-950/30 text-blue-700">I</th>
                  <th className="py-3 px-2 text-center bg-purple-50 dark:bg-purple-950/30 text-purple-700">S</th>
                  <th className="py-3 px-2 text-center bg-red-50 dark:bg-red-950/30 text-red-700">A</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                {filteredSantri.map((s) => {
                  const stats = getSantriStats(s.id);
                  const sMap = absensiMap.get(s.id);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/30">
                      <td className="py-2.5 px-4 sticky left-0 bg-white dark:bg-zinc-900 z-10 border-r border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                            {getInitials(s.nama_lengkap)}
                          </div>
                          <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[120px]">
                            {s.nama_lengkap}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-400">
                        {(s as any).kelas_formal?.nama_kelas || s.rombel_saat_ini || '-'}
                      </td>

                      {daysArray.map((d) => {
                        const dateStr = localDateString(year, month, d);
                        const rec = sMap?.get(dateStr);
                        const isLibur = liburDates.has(dateStr);

                        if (rec) {
                          const meta = STATUS_META[rec.status];
                          return (
                            <td key={d} className="py-1 px-1 text-center">
                              <span className={`inline-block w-6 h-6 leading-6 rounded text-[10px] ${meta.cell}`}>
                                {meta.letter}
                              </span>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={d}
                            className={`py-1 px-1 text-center ${
                              isLibur ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                            }`}
                          >
                            <span className="text-slate-300 dark:text-zinc-700">-</span>
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-2 text-center font-bold text-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20">
                        {stats.hadir}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                        {stats.terlambat}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-blue-700 bg-blue-50/50 dark:bg-blue-950/20">
                        {stats.izin}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-purple-700 bg-purple-50/50 dark:bg-purple-950/20">
                        {stats.sakit}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-red-700 bg-red-50/50 dark:bg-red-950/20">
                        {stats.alpha}
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
