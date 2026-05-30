'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Award, BookOpen, Calendar, HelpCircle, Loader2, Sparkles } from 'lucide-react';

interface KartuProgresTahfidzProps {
  idSantri: string;
}

export default function KartuProgresTahfidz({ idSantri }: KartuProgresTahfidzProps) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);

  // Fetch student tahfidz records
  useEffect(() => {
    if (!idSantri) return;

    async function loadData() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('presensi_tahfidz')
          .select('*')
          .eq('id_santri', idSantri)
          .order('tanggal_setoran', { ascending: true }); // chronological

        if (error) throw error;
        setRecords(data || []);
      } catch (err) {
        console.error('Error loading tahfidz progress card data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [idSantri]);

  // Calculations for stats
  const stats = useMemo(() => {
    if (records.length === 0) {
      return {
        juzTerakhir: 0,
        totalSurah: 0,
        predikat: 'Belum ada data',
        percentage: 0,
        lastSetoranText: '-'
      };
    }

    // 1. Capaian Juz (Max Juz)
    let maxJuz = 0;
    const distinctSurahs = new Set<string>();
    const grades: string[] = [];

    records.forEach(rec => {
      if (rec.juz > maxJuz) maxJuz = rec.juz;
      if (rec.nama_surah) distinctSurahs.add(rec.nama_surah);
      if (rec.nilai_kelancaran) grades.push(rec.nilai_kelancaran);
    });

    // Target 30 Juz. Percentage calculation
    const targetJuz = 30;
    const percentage = Math.min(Math.round((maxJuz / targetJuz) * 100), 100);

    // 2. Predikat (average of grades)
    let predikat = 'Cukup (Jayyid)';
    if (grades.length > 0) {
      const gradeValueMap: Record<string, number> = { 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
      const sumValues = grades.reduce((acc, g) => acc + (gradeValueMap[g] || 3), 0);
      const avgVal = Math.round(sumValues / grades.length);
      if (avgVal >= 4) predikat = 'Sangat Lancar (Mumtaz)';
      else if (avgVal === 3) predikat = 'Lancar (Jayyid Jiddan)';
      else if (avgVal === 2) predikat = 'Cukup (Jayyid)';
      else predikat = 'Kurang (Maqbul)';
    }

    // 3. Last Setoran details
    const lastRec = records[records.length - 1];
    let lastSetoranText = '-';
    if (lastRec) {
      // Find previous setoran for the same surah to determine starting verse
      const sameSurahRecs = records.filter(r => r.nama_surah === lastRec.nama_surah);
      const currentIndex = sameSurahRecs.findIndex(r => r.id === lastRec.id);
      
      let ayatMulai = 1;
      if (currentIndex > 0) {
        ayatMulai = sameSurahRecs[currentIndex - 1].ayat_terakhir + 1;
      }
      
      lastSetoranText = `Surah ${lastRec.nama_surah} ayat ${ayatMulai}-${lastRec.ayat_terakhir}`;
    }

    return {
      juzTerakhir: maxJuz,
      totalSurah: distinctSurahs.size,
      predikat,
      percentage,
      lastSetoranText
    };
  }, [records]);

  // Calendar Highlight data (Current Month Setorans)
  const calendarData = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-indexed
    const currentYear = today.getFullYear();

    // Get number of days in the current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Find first day of the month to pad weekly grid
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday, 1 is Monday

    // Map setoran dates in this month
    const setoranDays = new Set<number>();
    records.forEach(rec => {
      const d = new Date(rec.tanggal_setoran);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        setoranDays.add(d.getDate());
      }
    });

    const daysArray = [];
    // Padding for days of the week from the previous month
    for (let i = 0; i < (firstDayIndex === 0 ? 6 : firstDayIndex - 1); i++) {
      daysArray.push({ day: null, isSetor: false });
    }

    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      daysArray.push({
        day: d,
        isSetor: setoranDays.has(d)
      });
    }

    const monthName = today.toLocaleString('id-ID', { month: 'long' });
    return { daysArray, monthName, currentYear };
  }, [records]);

  // Progress Ring configurations
  const radius = 38;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.percentage / 100) * circumference;

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-8 rounded-2xl flex flex-col items-center justify-center gap-2 h-72">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
        <p className="text-xs text-slate-450">Memuat profil tahfidz...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      {/* Emerald Gradient Header Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[9px] uppercase tracking-wider bg-white/15 px-2 py-0.5 rounded font-bold">
            Target: 30 Juz
          </span>
          <h3 className="font-extrabold text-base flex items-center gap-1.5 mt-1">
            <Sparkles className="h-4.5 w-4.5 text-emerald-300" />
            Pencarian Capaian Hafalan
          </h3>
        </div>

        {/* Progress Ring Element */}
        <div className="relative flex items-center justify-center h-20 w-20 flex-shrink-0">
          <svg className="h-full w-full transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r={radius}
              className="stroke-white/10"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              className="stroke-white transition-all duration-500 ease-out"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-sm font-black font-mono leading-none">{stats.percentage}%</span>
            <span className="text-[7.5px] uppercase font-bold text-emerald-200 mt-0.5">Selesai</span>
          </div>
        </div>
      </div>

      {/* Main Stats Area */}
      <div className="p-5 space-y-4 flex-1">
        {/* Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-850 p-3 rounded-xl space-y-0.5">
            <span className="block text-[8.5px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Hafalan Terakhir</span>
            <p className="text-xs text-slate-800 dark:text-zinc-200 font-bold truncate" title={stats.lastSetoranText}>
              {stats.lastSetoranText}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-850 p-3 rounded-xl space-y-0.5">
            <span className="block text-[8.5px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Total Hafalan</span>
            <p className="text-xs text-slate-800 dark:text-zinc-200 font-bold">
              {stats.juzTerakhir} Juz ({stats.totalSurah} Surah)
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-850 p-3 rounded-xl space-y-0.5 sm:col-span-2">
            <span className="block text-[8.5px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Predikat Kualitas</span>
            <p className="text-xs text-emerald-700 dark:text-emerald-450 font-extrabold flex items-center gap-1">
              <Award className="h-4 w-4 text-emerald-500" />
              {stats.predikat}
            </p>
          </div>
        </div>

        {/* Calendar Setoran Highlights */}
        <div className="space-y-2 border-t border-slate-100 dark:border-zinc-800/80 pt-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Kalender Keaktifan Setoran
            </span>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold bg-slate-100 dark:bg-zinc-950 px-2 py-0.5 rounded">
              {calendarData.monthName} {calendarData.currentYear}
            </span>
          </div>

          {/* Grid Layout representing Calendar Days */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((day, idx) => (
              <span key={idx} className="text-[9px] font-bold text-slate-450 mb-1">{day}</span>
            ))}

            {calendarData.daysArray.map((cell, idx) => {
              if (cell.day === null) {
                return <span key={idx} className="h-6 w-full" />;
              }
              return (
                <div 
                  key={idx} 
                  className={`h-6 w-full flex items-center justify-center rounded-lg text-[9.5px] font-bold font-mono transition-colors ${
                    cell.isSetor 
                      ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500/20' 
                      : 'bg-slate-50 dark:bg-zinc-950 text-slate-400 dark:text-zinc-650 hover:bg-slate-100/60'
                  }`}
                  title={cell.isSetor ? `Ada setoran pada tanggal ${cell.day}` : undefined}
                >
                  {cell.day}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
