'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function SidebarWidget() {
  return (
    <div className="mt-auto px-3 pb-6 pt-4">
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/60 p-4 text-center dark:border-emerald-500/15 dark:bg-emerald-950/30">
        <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
          <Sparkles className="h-4 w-4" />
        </div>
        <h4 className="text-xs font-bold text-gray-900 dark:text-white">
          SIM Pesantren v2.4
        </h4>
        <p className="mt-1 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
          Sistem manajemen santri, kasir, dan tahfidz terpadu.
        </p>
        <Link
          href="/admin"
          className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
        >
          <span>Pusat Bantuan</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
