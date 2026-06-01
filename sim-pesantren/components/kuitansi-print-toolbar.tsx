'use client';

import React from 'react';
import { PrinterIcon } from 'lucide-react';

export function KuitansiPrintToolbar() {
  return (
    <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Kuitansi Pembayaran</h1>
      </div>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md shadow-emerald-600/10 transition-all active:scale-95"
      >
        <PrinterIcon className="h-4 w-4" />
        Cetak Kuitansi
      </button>
    </div>
  );
}
