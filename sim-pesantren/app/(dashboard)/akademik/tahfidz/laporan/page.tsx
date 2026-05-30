'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Santri, PresensiTahfidz, Kelas } from '@/types/database';
import { 
  FileText, 
  Search, 
  Calendar, 
  Download, 
  Printer, 
  TrendingUp, 
  ChevronRight, 
  Award, 
  Loader2, 
  Filter, 
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface StudentReportRow {
  id: string;
  nama_lengkap: string;
  nis: string;
  nama_kelas: string;
  totalSetoran: number;
  juzTerakhir: number;
  totalAyat: number;
  gradeRerata: string;
  grades: string[];
}

export default function LaporanTahfidzPage() {
  const [loading, setLoading] = useState(true);
  const [classList, setClassList] = useState<Kelas[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('Semua');
  
  // Date Filters
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Loaded database records
  const [allSantri, setAllSantri] = useState<any[]>([]);
  const [setoranRecords, setSetoranRecords] = useState<any[]>([]);

  const monthsList = [
    { value: 1, name: 'Januari' },
    { value: 2, name: 'Februari' },
    { value: 3, name: 'Maret' },
    { value: 4, name: 'April' },
    { value: 5, name: 'Mei' },
    { value: 6, name: 'Juni' },
    { value: 7, name: 'Juli' },
    { value: 8, name: 'Agustus' },
    { value: 9, name: 'September' },
    { value: 10, name: 'Oktober' },
    { value: 11, name: 'November' },
    { value: 12, name: 'Desember' }
  ];

  const yearsList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, []);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch Classes
      const { data: classesData, error: classesErr } = await supabase
        .from('kelas')
        .select('*')
        .order('nama_kelas', { ascending: true });
      if (classesErr) throw classesErr;
      setClassList(classesData || []);

      // 2. Fetch Active Santri (with class detail joins)
      const { data: santriData, error: santriErr } = await supabase
        .from('santri')
        .select(`
          id,
          nis,
          nama_lengkap,
          id_kelas_formal,
          id_kelas_non_formal,
          kelas_formal:id_kelas_formal (id, nama_kelas),
          kelas_non_formal:id_kelas_non_formal (id, nama_kelas)
        `)
        .eq('status', 'aktif');
      if (santriErr) throw santriErr;
      setAllSantri(santriData || []);

      // 3. Fetch all Tahfidz records to compute overall progress
      const { data: tahfidzData, error: tahfidzErr } = await supabase
        .from('presensi_tahfidz')
        .select('*')
        .order('tanggal_setoran', { ascending: true });
      if (tahfidzErr) throw tahfidzErr;
      setSetoranRecords(tahfidzData || []);

    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengambil data laporan: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Aggregate and process report rows
  const reportRows: StudentReportRow[] = useMemo(() => {
    // 1. Filter students by class if not "Semua"
    let filteredStudents = allSantri;
    if (selectedClassId !== 'Semua') {
      filteredStudents = allSantri.filter(s => 
        s.id_kelas_formal === selectedClassId || s.id_kelas_non_formal === selectedClassId
      );
    }

    // 2. Filter setoran records for the selected month and year
    const targetStartDate = new Date(selectedYear, selectedMonth - 1, 1);
    const targetEndDate = new Date(selectedYear, selectedMonth, 0); // Last day of month

    const thisMonthSetorans = setoranRecords.filter(r => {
      const d = new Date(r.tanggal_setoran);
      return d >= targetStartDate && d <= targetEndDate;
    });

    // To compute verses count, we need historical context of what the student had memorized before this setoran
    // Let's index student records chronologically by surah
    const chronologicalMap = new Map<string, any[]>(); // key: studentId_surahName
    setoranRecords.forEach(rec => {
      const key = `${rec.id_santri}_${rec.nama_surah}`;
      if (!chronologicalMap.has(key)) {
        chronologicalMap.set(key, []);
      }
      chronologicalMap.get(key)!.push(rec);
    });

    // Compute the report rows
    return filteredStudents.map(student => {
      // Find all setoran records of this student in the target month
      const studentMonthSetorans = thisMonthSetorans.filter(r => r.id_santri === student.id);
      
      let totalAyat = 0;
      let maxJuz = 0;
      const grades: string[] = [];

      studentMonthSetorans.forEach(rec => {
        if (rec.juz > maxJuz) maxJuz = rec.juz;
        if (rec.nilai_kelancaran) grades.push(rec.nilai_kelancaran);

        // Heuristic to compute verses: find the record right before this one for this surah
        const key = `${student.id}_${rec.nama_surah}`;
        const surahHistory = chronologicalMap.get(key) || [];
        const currentIndex = surahHistory.findIndex(h => h.id === rec.id);
        
        let prevAyat = 0;
        if (currentIndex > 0) {
          prevAyat = surahHistory[currentIndex - 1].ayat_terakhir;
        }

        const addedAyat = rec.ayat_terakhir - prevAyat;
        totalAyat += addedAyat > 0 ? addedAyat : rec.ayat_terakhir;
      });

      // Rata-rata Kelancaran Grade
      let avgGrade = '-';
      if (grades.length > 0) {
        const gradeValueMap: Record<string, number> = { 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
        const sumValues = grades.reduce((acc, g) => acc + (gradeValueMap[g] || 3), 0);
        const avgVal = Math.round(sumValues / grades.length);
        if (avgVal >= 4) avgGrade = 'A';
        else if (avgVal === 3) avgGrade = 'B';
        else if (avgVal === 2) avgGrade = 'C';
        else avgGrade = 'D';
      }

      // Latest class name label
      const className = student.kelas_formal?.nama_kelas || student.kelas_non_formal?.nama_kelas || 'Tanpa Kelas';

      return {
        id: student.id,
        nama_lengkap: student.nama_lengkap,
        nis: student.nis,
        nama_kelas: className,
        totalSetoran: studentMonthSetorans.length,
        juzTerakhir: maxJuz,
        totalAyat,
        gradeRerata: avgGrade,
        grades
      };
    });
  }, [allSantri, setoranRecords, selectedMonth, selectedYear, selectedClassId]);

  // Apply search query filter
  const filteredReportRows = useMemo(() => {
    if (!searchQuery.trim()) return reportRows;
    const term = searchQuery.toLowerCase();
    return reportRows.filter(r => 
      r.nama_lengkap.toLowerCase().includes(term) ||
      r.nis.includes(term) ||
      r.nama_kelas.toLowerCase().includes(term)
    );
  }, [reportRows, searchQuery]);

  // Compute Weekly Verse Stats for Bar Chart visualization
  const weeklyStats = useMemo(() => {
    // 4 weeks definition
    const weeklyAyatSums = [0, 0, 0, 0]; // Week 1, 2, 3, 4+

    // Filter setoran records for the selected month and year
    const targetStartDate = new Date(selectedYear, selectedMonth - 1, 1);
    const targetEndDate = new Date(selectedYear, selectedMonth, 0);

    const thisMonthSetorans = setoranRecords.filter(r => {
      const d = new Date(r.tanggal_setoran);
      return d >= targetStartDate && d <= targetEndDate;
    });

    // Filter by class if applicable
    let classFilteredSetorans = thisMonthSetorans;
    if (selectedClassId !== 'Semua') {
      const classStudentIds = new Set(allSantri
        .filter(s => s.id_kelas_formal === selectedClassId || s.id_kelas_non_formal === selectedClassId)
        .map(s => s.id)
      );
      classFilteredSetorans = thisMonthSetorans.filter(r => classStudentIds.has(r.id_santri));
    }

    // Index all history to compute verse increments
    const chronologicalMap = new Map<string, any[]>();
    setoranRecords.forEach(rec => {
      const key = `${rec.id_santri}_${rec.nama_surah}`;
      if (!chronologicalMap.has(key)) {
        chronologicalMap.set(key, []);
      }
      chronologicalMap.get(key)!.push(rec);
    });

    classFilteredSetorans.forEach(rec => {
      const dateVal = new Date(rec.tanggal_setoran);
      const day = dateVal.getDate();

      // Determine week index (0-3)
      let wIdx = 0;
      if (day <= 7) wIdx = 0;
      else if (day <= 14) wIdx = 1;
      else if (day <= 21) wIdx = 2;
      else wIdx = 3;

      // Verse increment heuristic
      const key = `${rec.id_santri}_${rec.nama_surah}`;
      const surahHistory = chronologicalMap.get(key) || [];
      const currentIndex = surahHistory.findIndex(h => h.id === rec.id);
      
      let prevAyat = 0;
      if (currentIndex > 0) {
        prevAyat = surahHistory[currentIndex - 1].ayat_terakhir;
      }
      const addedAyat = rec.ayat_terakhir - prevAyat;
      const count = addedAyat > 0 ? addedAyat : rec.ayat_terakhir;

      weeklyAyatSums[wIdx] += count;
    });

    const maxVal = Math.max(...weeklyAyatSums, 1);
    return weeklyAyatSums.map((val, idx) => ({
      label: idx === 3 ? 'Minggu 4+' : `Minggu ${idx + 1}`,
      value: val,
      percentage: (val / maxVal) * 100
    }));
  }, [allSantri, setoranRecords, selectedMonth, selectedYear, selectedClassId]);

  // Export to Excel handler
  const handleExportExcel = () => {
    if (filteredReportRows.length === 0) {
      toast.warning('Tidak ada data untuk diekspor.');
      return;
    }

    const dataToExport = filteredReportRows.map(r => ({
      'NIS': r.nis,
      'Nama Santri': r.nama_lengkap,
      'Kelas': r.nama_kelas,
      'Total Setoran': r.totalSetoran,
      'Capaian Juz': r.juzTerakhir > 0 ? `Juz ${r.juzTerakhir}` : '-',
      'Jumlah Ayat': r.totalAyat,
      'Kelancaran Rerata': r.gradeRerata !== '-' ? `Grade ${r.gradeRerata}` : '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Tahfidz');

    // Title / Month formatting
    const className = selectedClassId !== 'Semua' 
      ? classList.find(c => c.id === selectedClassId)?.nama_kelas 
      : 'Semua Kelas';
    const monthName = monthsList.find(m => m.value === selectedMonth)?.name;

    XLSX.writeFile(workbook, `Laporan_Tahfidz_${className}_${monthName}_${selectedYear}.xlsx`);
    toast.success('Laporan berhasil diunduh dalam format Excel.');
  };

  // Print PDF Trigger
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen transition-colors duration-300">
      
      {/* Header Panel (Hidden on print) */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-450 border border-emerald-200/50 mb-3">
            <Award className="h-3.5 w-3.5" />
            Akademik / Tahfidz
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Progres Tahfidz Bulanan
          </h1>
          <p className="text-slate-550 dark:text-zinc-400 text-xs sm:text-sm mt-1">
            Rekapitulasi setoran ayat, juz capaian, dan kualitas hafalan santri per periode bulanan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-350 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            Unduh Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-600/10 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Cetak PDF
          </button>
        </div>
      </div>

      {/* FILTER CONTROL CARD (Hidden on print) */}
      <div className="max-w-6xl mx-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4 print:hidden">
        <h3 className="text-xs font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5" />
          Filter & Pencarian Laporan
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Month Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1.5">Bulan</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs sm:text-sm"
            >
              {monthsList.map(m => (
                <option key={m.value} value={m.value}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1.5">Tahun</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs sm:text-sm"
            >
              {yearsList.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1.5">Filter Kelas</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs sm:text-sm"
            >
              <option value="Semua">Semua Kelas</option>
              {classList.map(c => (
                <option key={c.id} value={c.id}>{c.nama_kelas}</option>
              ))}
            </select>
          </div>

          {/* Search name/class */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1.5">Cari Santri</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau NIS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY HEADER (Only visible when printing) */}
      <div className="hidden print:block text-center space-y-2 border-b-2 border-slate-900 pb-4 max-w-6xl mx-auto">
        <h2 className="text-xl font-bold tracking-wider text-slate-900">SIM PESANTREN - LAPORAN PROGRES TAHFIDZ</h2>
        <p className="text-xs text-slate-600">
          Periode: {monthsList.find(m => m.value === selectedMonth)?.name} {selectedYear} &bull; Kelas: {selectedClassId !== 'Semua' ? classList.find(c => c.id === selectedClassId)?.nama_kelas : 'Semua Kelas'}
        </p>
        <p className="text-[10px] text-slate-400">Dicetak pada tanggal: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* MAIN CONTENT BLOCK */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Weekly Statistics Graph (1/3 width, hidden on print unless explicitly styled) */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4 print:border-none print:shadow-none print:p-0">
          <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-4.5 w-4.5 text-emerald-600" />
            Statistik Ayat disetor Mingguan
          </h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500">
            Total pertambahan hafalan ayat pada periode ini.
          </p>

          <div className="space-y-4 pt-3">
            {weeklyStats.map((w, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-zinc-400">{w.label}</span>
                  <span className="text-emerald-700 dark:text-emerald-450 font-bold font-mono">{w.value} Ayat</span>
                </div>
                
                <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-3.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${w.value > 0 ? w.percentage : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200/40 dark:border-zinc-850 p-3 rounded-xl flex items-start gap-2.5 mt-5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-normal">
              Grafik di atas menghitung progres ayat baru yang disetor. Ustadz diimbau memantau kontinuitas mingguan santri.
            </p>
          </div>
        </div>

        {/* Right Column: Report Main Table (2/3 width) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none print:col-span-3">
          
          <div className="p-5 border-b border-slate-100 dark:border-zinc-850 flex items-center justify-between print:hidden">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-emerald-600" />
              Tabel Rekapitulasi Progres Santri
            </h3>
            <span className="text-xs text-slate-450 dark:text-zinc-500">
              Total {filteredReportRows.length} Santri
            </span>
          </div>

          {loading ? (
            <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-slate-400 text-sm">Menyusun laporan progres...</p>
            </div>
          ) : filteredReportRows.length === 0 ? (
            <div className="py-20 text-center">
              <FileText className="h-12 w-12 text-slate-350 mx-auto mb-3" />
              <h4 className="font-bold text-slate-800 dark:text-white">Tidak ada data setoran</h4>
              <p className="text-slate-450 text-xs mt-1.5">Tidak ada log hafalan tercatat pada periode ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse print:text-xs">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-slate-450 text-[10px] font-bold uppercase tracking-wider print:bg-slate-100">
                    <th className="py-3 px-5">NIS</th>
                    <th className="py-3 px-5">Nama Santri</th>
                    <th className="py-3 px-5">Kelas</th>
                    <th className="py-3 px-5 text-center">Setoran</th>
                    <th className="py-3 px-5 text-center">Juz Terakhir</th>
                    <th className="py-3 px-5 text-center">Jumlah Ayat</th>
                    <th className="py-3 px-5 text-center">Kualitas Rerata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-xs sm:text-sm">
                  {filteredReportRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/30 dark:hover:bg-zinc-950/10 transition-colors">
                      {/* NIS */}
                      <td className="py-3 px-5 font-mono text-[11px] text-slate-500">
                        {row.nis}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-5 font-bold text-slate-900 dark:text-white print:text-slate-900">
                        {row.nama_lengkap}
                      </td>

                      {/* Class */}
                      <td className="py-3 px-5 text-slate-600 dark:text-zinc-350">
                        {row.nama_kelas}
                      </td>

                      {/* Total Setoran */}
                      <td className="py-3 px-5 text-center font-bold text-slate-700 dark:text-zinc-200">
                        {row.totalSetoran}x
                      </td>

                      {/* Juz Terakhir */}
                      <td className="py-3 px-5 text-center">
                        {row.juzTerakhir > 0 ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-500/20 print:border-none print:bg-none print:text-slate-950">
                            Juz {row.juzTerakhir}
                          </span>
                        ) : (
                          <span className="text-slate-350 italic">-</span>
                        )}
                      </td>

                      {/* Total Ayat */}
                      <td className="py-3 px-5 text-center font-bold font-mono text-slate-700 dark:text-zinc-200">
                        {row.totalAyat}
                      </td>

                      {/* Kualitas Rerata Grade */}
                      <td className="py-3 px-5 text-center">
                        {row.gradeRerata !== '-' ? (
                          <span className={`inline-flex px-1.5 py-0.5 rounded font-black text-[9.5px] ${
                            row.gradeRerata === 'A'
                              ? 'bg-emerald-100 text-emerald-850 dark:bg-emerald-500/15 dark:text-emerald-400'
                              : row.gradeRerata === 'B'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400'
                              : row.gradeRerata === 'C'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-450'
                          } print:bg-none print:text-slate-900 print:font-bold`}>
                            Grade {row.gradeRerata}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SIGNATURE SECTION (Only visible on print) */}
          <div className="hidden print:flex justify-between items-center mt-12 px-10 text-xs text-slate-800">
            <div className="text-center space-y-12">
              <p>Mengetahui,<br /><strong className="font-bold">Kepala Madrasah / Kepengasuhan</strong></p>
              <p className="border-t border-slate-500 pt-1 w-40 mx-auto font-bold">( _______________________ )</p>
            </div>
            <div className="text-center space-y-12">
              <p>Tanggal: ___________________<br /><strong className="font-bold">Ustadz Pengampu Tahfidz</strong></p>
              <p className="border-t border-slate-500 pt-1 w-40 mx-auto font-bold">( _______________________ )</p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
