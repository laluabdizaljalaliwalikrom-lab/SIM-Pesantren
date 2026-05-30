'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Mencegah mismatch hidrasi antara Server dan Client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-10 w-10 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse" />
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
      title={isDark ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
    >
      <div className="relative h-5 w-5 overflow-hidden">
        {/* Ikon Matahari */}
        <span
          className={`absolute inset-0 flex items-center justify-center transition-all duration-500 transform ${
            isDark 
              ? 'rotate-0 scale-100 opacity-100 text-amber-400' 
              : 'rotate-90 scale-0 opacity-0'
          }`}
        >
          <Sun className="h-5 w-5 fill-amber-400/10" />
        </span>

        {/* Ikon Bulan */}
        <span
          className={`absolute inset-0 flex items-center justify-center transition-all duration-500 transform ${
            isDark 
              ? '-rotate-90 scale-0 opacity-0' 
              : 'rotate-0 scale-100 opacity-100 text-indigo-500'
          }`}
        >
          <Moon className="h-5 w-5 fill-indigo-500/10" />
        </span>
      </div>
    </button>
  );
}
