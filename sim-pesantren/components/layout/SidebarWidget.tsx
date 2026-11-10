'use client';

import React from 'react';
import Link from 'next/link';

export default function SidebarWidget() {
  return (
    <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-white/[0.03]">
      <h3 className="mb-2 text-theme-sm font-semibold text-gray-900 dark:text-white">
        SIM Pesantren Pro
      </h3>
      <p className="mb-4 text-theme-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        Sistem terpadu santri, keuangan kasir, tahfidz, dan asrama.
      </p>
      <Link
        href="/admin"
        className="flex items-center justify-center p-2.5 font-medium text-white rounded-lg bg-emerald-600 text-theme-xs hover:bg-emerald-700 shadow-theme-xs transition-colors"
      >
        Panduan Aplikasi
      </Link>
    </div>
  );
}
