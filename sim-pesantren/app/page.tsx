'use client';

import React from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { GraduationCap, ArrowRight, ShieldCheck, HeartHandshake, HelpCircle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 transition-colors duration-300 font-sans flex flex-col justify-between">
      
      {/* Header / Navbar */}
      <header className="max-w-7xl w-full mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white font-extrabold text-lg shadow-md shadow-emerald-500/25">
            P
          </div>
          <span className="font-extrabold text-base tracking-wide bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-200 bg-clip-text text-transparent">
            SIM Pesantren
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl w-full mx-auto px-6 py-12 flex-1 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Side: Text and CTA */}
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
            Sistem Informasi Manajemen Modern
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            Mengelola Pesantren Kini <span className="bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-200 bg-clip-text text-transparent">Lebih Mudah</span> & Aman
          </h1>
          <p className="text-base sm:text-lg text-slate-500 dark:text-zinc-400 max-w-xl mx-auto lg:mx-0">
            Platform tata kelola data santri, riwayat hafalan tahfidz harian, laporan pembayaran SPP, dan perizinan keluar-masuk dengan sistem keamanan tingkat tinggi.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
            <Link
              href="/admin"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Masuk Dashboard Admin
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#fitur"
              className="w-full sm:w-auto flex items-center justify-center gap-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-600 dark:text-slate-300 font-semibold px-6 py-3 rounded-xl transition-all"
            >
              Pelajari Fitur
            </a>
          </div>
        </div>

        {/* Right Side: Bento Mockup Grid */}
        <div className="flex-1 w-full max-w-lg lg:max-w-none grid grid-cols-2 gap-4">
          <div className="space-y-4">
            {/* Box 1: Santri */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm hover:border-emerald-500/20 transition-colors flex flex-col justify-between h-40">
              <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">Data Santri</h4>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Pengelolaan database & asrama terpusat</p>
              </div>
            </div>
            {/* Box 2: Keamanan */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm hover:border-emerald-500/20 transition-colors flex flex-col justify-between h-44">
              <div className="h-10 w-10 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">RLS Terproteksi</h4>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Keamanan data level baris PostgreSQL untuk privasi santri</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-8">
            {/* Box 3: WhatsApp */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm hover:border-emerald-500/20 transition-colors flex flex-col justify-between h-44">
              <div className="h-10 w-10 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-xl flex items-center justify-center">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">Notifikasi WA</h4>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Pemberitahuan otomatis real-time ke nomor HP Wali Santri</p>
              </div>
            </div>
            {/* Box 4: Dukungan */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm hover:border-emerald-500/20 transition-colors flex flex-col justify-between h-40">
              <div className="h-10 w-10 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-xl flex items-center justify-center">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">Bantuan</h4>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Dukungan teknis operasional harian</p>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-zinc-900 py-6 bg-white dark:bg-zinc-900 transition-colors">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-zinc-500">
          <p>&copy; 2026 SIM Pesantren. Hak Cipta Dilindungi.</p>
          <p>Dibuat secara profesional untuk manajemen pesantren modern.</p>
        </div>
      </footer>

    </div>
  );
}
