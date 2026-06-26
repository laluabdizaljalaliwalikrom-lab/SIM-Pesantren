'use client';

import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function PpdbPublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/psb/dashboard');

  if (isDashboard) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/psb" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center group-hover:bg-emerald-700 transition-colors shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
              PPDB <span className="text-emerald-600 dark:text-emerald-400">Online</span>
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/psb"
              className="text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              Beranda
            </Link>
            <Link href="/psb/login"
              className="inline-flex items-center justify-center gap-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold px-4 py-2 rounded-xl transition-all text-sm shadow-sm">
              Masuk
            </Link>
            <Link href="/psb/daftar"
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/10 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 text-sm">
              Daftar
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <p className="text-xs text-slate-400 dark:text-zinc-500">
            &copy; {new Date().getFullYear()} SIM Pesantren — PPDB Online
          </p>
          <Link href="/" className="text-xs text-slate-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            &larr; Kembali ke Beranda
          </Link>
        </div>
      </footer>
    </div>
  );
}
