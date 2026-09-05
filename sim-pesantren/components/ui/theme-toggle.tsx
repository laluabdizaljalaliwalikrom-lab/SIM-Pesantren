'use client';

import React, { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

const emptySubscribe = () => () => {};

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return <div className={`h-9.5 w-9.5 rounded-xl bg-slate-100 dark:bg-zinc-850 animate-pulse shrink-0 ${className}`} />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`group relative flex h-9.5 w-9.5 items-center justify-center rounded-xl border transition-all duration-300 active:scale-90 focus:outline-none shrink-0 cursor-pointer overflow-hidden ${
        isDark
          ? 'bg-zinc-900/80 border-zinc-800 text-amber-400 hover:border-amber-400/30 hover:bg-zinc-800/90 shadow-sm shadow-black/20'
          : 'bg-white/90 border-slate-200/90 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/40 shadow-sm shadow-slate-200/50'
      } backdrop-blur-md ${className}`}
      role="switch"
      aria-checked={isDark}
      title={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
      aria-label={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
    >
      {/* Dynamic ambient halo background on hover */}
      <div
        className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
          isDark
            ? 'bg-gradient-to-tr from-amber-500/10 via-amber-400/5 to-transparent'
            : 'bg-gradient-to-tr from-emerald-500/10 via-teal-400/5 to-transparent'
        }`}
      />

      {/* Sun Icon: Renders when dark or light, morphing with 3D rotation & scale */}
      <div className="relative flex items-center justify-center">
        <Sun
          className={`h-4.5 w-4.5 transition-all duration-500 transform ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isDark
              ? 'rotate-90 scale-0 opacity-0 absolute'
              : 'rotate-0 scale-100 opacity-100 text-amber-500 group-hover:rotate-45'
          }`}
          strokeWidth={2.2}
        />

        {/* Moon Icon */}
        <Moon
          className={`h-4.5 w-4.5 transition-all duration-500 transform ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isDark
              ? 'rotate-0 scale-100 opacity-100 text-amber-300 group-hover:-rotate-12'
              : '-rotate-90 scale-0 opacity-0 absolute text-slate-400'
          }`}
          strokeWidth={2.2}
        />
      </div>
    </button>
  );
}


