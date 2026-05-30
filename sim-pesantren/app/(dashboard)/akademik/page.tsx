'use client';

import React from 'react';
import Link from 'next/link';
import { 
  BookMarked, 
  GraduationCap, 
  BookOpen, 
  Calendar,
  ChevronRight,
  School,
  Sparkles,
  CalendarCheck
} from 'lucide-react';

const MENU_AKADEMIK = [
  {
    title: 'Input Nilai Akademik',
    description: 'Penginputan nilai ujian dan catatan perkembangan belajar santri per kelas, serta ekspor ke berkas Excel.',
    href: '/akademik/nilai',
    icon: BookMarked,
    color: 'from-emerald-500 to-teal-500',
    hoverColor: 'group-hover:text-emerald-500',
    bgLight: 'bg-emerald-50 dark:bg-emerald-500/5',
    borderLight: 'border-emerald-100 dark:border-emerald-500/10'
  },
  {
    title: 'Pemantauan Tahfidz',
    description: 'Statistik setoran harian, lini masa aktivitas terbaru, serta kurva visual grafik progres hafalan santri.',
    href: '/akademik/tahfidz',
    icon: GraduationCap,
    color: 'from-teal-500 to-cyan-500',
    hoverColor: 'group-hover:text-teal-500',
    bgLight: 'bg-teal-50 dark:bg-teal-500/5',
    borderLight: 'border-teal-100 dark:border-teal-500/10'
  },
  {
    title: 'Absensi KBM',
    description: 'Pencatatan absensi kehadiran santri secara massal pada jam pelajaran aktif guru hari ini.',
    href: '/akademik/absensi',
    icon: CalendarCheck,
    color: 'from-emerald-500 to-teal-500',
    hoverColor: 'group-hover:text-emerald-500',
    bgLight: 'bg-emerald-50 dark:bg-emerald-500/5',
    borderLight: 'border-emerald-100 dark:border-emerald-500/10'
  },
  {
    title: 'Master Mata Pelajaran',
    description: 'Pengaturan dan standardisasi kurikulum mata pelajaran (Diniyah/Pesantren, Kitab Kuning, Umum, dsb).',
    href: '/akademik/mapel',
    icon: BookOpen,
    color: 'from-amber-500 to-orange-500',
    hoverColor: 'group-hover:text-amber-500',
    bgLight: 'bg-amber-50 dark:bg-amber-500/5',
    borderLight: 'border-amber-100 dark:border-amber-500/10'
  },
  {
    title: 'Jadwal Pelajaran',
    description: 'Penyusunan KBM mingguan per kelas (mata pelajaran, jam pelajaran, ustadz pengajar, dan ruang kelas).',
    href: '/akademik/jadwal',
    icon: Calendar,
    color: 'from-blue-500 to-indigo-500',
    hoverColor: 'group-hover:text-blue-500',
    bgLight: 'bg-blue-50 dark:bg-blue-500/5',
    borderLight: 'border-blue-100 dark:border-blue-500/10'
  }
];

export default function AkademikPortalHub() {
  return (
    <div className="p-4 md:p-8 space-y-8 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen transition-colors duration-300">
      
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 max-w-5xl mx-auto">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 mb-3 animate-pulse">
            <Sparkles className="h-3 w-3" />
            Portal Manajemen KBM
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <School className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Menu Utama Akademik
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm mt-1.5">
            Selamat datang di pusat tata kelola kurikulum, jadwal pembelajaran, penilaian siswa, dan pemantauan hafalan pesantren.
          </p>
        </div>
      </div>

      {/* Grid Bento Cards Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {MENU_AKADEMIK.map((menu) => {
          const Icon = menu.icon;
          return (
            <Link
              key={menu.title}
              href={menu.href}
              className="group relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between min-h-[170px]"
            >
              <div className="space-y-4">
                {/* Icon wrapper & title */}
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl ${menu.bgLight} ${menu.borderLight} border flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300`}>
                    <Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className={`font-extrabold text-base text-slate-900 dark:text-white ${menu.hoverColor} transition-colors duration-250`}>
                    {menu.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed font-normal">
                  {menu.description}
                </p>
              </div>

              {/* Bottom arrow CTA */}
              <div className="flex items-center justify-end border-t border-slate-100 dark:border-zinc-800/80 pt-4 mt-4 text-xs font-bold text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                <span className="mr-1 group-hover:mr-2 transition-all">Buka Fitur</span>
                <ChevronRight className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

    </div>
  );
}
