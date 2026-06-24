'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-14 h-7 rounded-full bg-slate-200 dark:bg-zinc-800 animate-pulse" />;
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative flex items-center w-14 h-7 rounded-full border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 transition-colors duration-300 focus:outline-none shrink-0"
      role="switch"
      aria-checked={isDark}
      title={isDark ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
    >
      <span className="absolute inset-0 rounded-full overflow-hidden">
        <span
          className={`absolute inset-0 rounded-full transition-opacity duration-500 ${
            isDark
              ? 'opacity-100 bg-gradient-to-r from-zinc-800 to-zinc-900'
              : 'opacity-0'
          }`}
        />
      </span>
      <Sun
        className={`absolute left-1.5 h-3.5 w-3.5 z-10 pointer-events-none transition-all duration-500 ${
          isDark
            ? 'text-zinc-500 opacity-40 scale-75'
            : 'text-amber-500 opacity-100 scale-100'
        }`}
      />
      <Moon
        className={`absolute right-1.5 h-3.5 w-3.5 z-10 pointer-events-none transition-all duration-500 ${
          isDark
            ? 'text-blue-300 opacity-100 scale-100'
            : 'text-zinc-400 opacity-40 scale-75'
        }`}
      />
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white dark:bg-zinc-950 shadow-md border border-slate-200 dark:border-zinc-600 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isDark ? 'translate-x-7' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
