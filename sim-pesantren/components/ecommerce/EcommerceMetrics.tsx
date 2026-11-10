'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  Wallet,
  GraduationCap,
  CalendarCheck,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import Badge from '@/components/ui/badge';

interface EcommerceMetricsProps {
  totalSantri: number;
  saldoKas: number;
  tahfidzHariIni: number;
  santriIzin: number;
  loading?: boolean;
}

export const EcommerceMetrics: React.FC<EcommerceMetricsProps> = ({
  totalSantri,
  saldoKas,
  tahfidzHariIni,
  santriIzin,
  loading = false,
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {/* Metric 1: Total Santri Aktif */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-800 dark:bg-gray-900 shadow-theme-xs">
        <div className="flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
            <Users className="h-6 w-6 text-gray-800 dark:text-white/90" />
          </div>
          <Badge color="success">
            <TrendingUp className="h-3.5 w-3.5" />
            +11.01%
          </Badge>
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Santri Aktif
            </span>
            <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
              {loading ? '...' : totalSantri.toLocaleString('id-ID')}
            </h4>
          </div>

          <Link
            href="/santri"
            className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            <span>Detail</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Metric 2: Kasir & Saldo Kas */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-800 dark:bg-gray-900 shadow-theme-xs">
        <div className="flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
            <Wallet className="h-6 w-6 text-gray-800 dark:text-white/90" />
          </div>
          <Badge color="primary">
            <TrendingUp className="h-3.5 w-3.5" />
            +8.45%
          </Badge>
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Penerimaan Kasir & SPP
            </span>
            <h4 className="mt-2 text-xl font-bold text-gray-800 dark:text-white/90 truncate max-w-[180px] sm:max-w-[210px]">
              {loading ? '...' : `Rp${saldoKas.toLocaleString('id-ID')}`}
            </h4>
          </div>

          <Link
            href="/keuangan"
            className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            <span>Kasir</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Metric 3: Setoran Tahfidz Hari Ini */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-800 dark:bg-gray-900 shadow-theme-xs">
        <div className="flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
            <GraduationCap className="h-6 w-6 text-gray-800 dark:text-white/90" />
          </div>
          <Badge color="info">
            Hari Ini
          </Badge>
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Setoran Tahfidz Hari Ini
            </span>
            <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
              {loading ? '...' : `${tahfidzHariIni.toLocaleString('id-ID')} Santri`}
            </h4>
          </div>

          <Link
            href="/tahfidz"
            className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            <span>Input</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Metric 4: Santri Izin & Sakit */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-800 dark:bg-gray-900 shadow-theme-xs">
        <div className="flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
            <CalendarCheck className="h-6 w-6 text-gray-800 dark:text-white/90" />
          </div>
          <Badge color="warning">
            Perizinan
          </Badge>
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Santri Izin / Asrama
            </span>
            <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
              {loading ? '...' : `${santriIzin.toLocaleString('id-ID')} Santri`}
            </h4>
          </div>

          <Link
            href="/asrama"
            className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
          >
            <span>Lihat</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EcommerceMetrics;
