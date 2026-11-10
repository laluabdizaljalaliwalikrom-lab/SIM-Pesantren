'use client';

import React from 'react';
import Link from 'next/link';
import {
  GroupIcon,
  DollarLineIcon,
  CalenderIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BoxIconLine,
} from '@/components/icons';
import Badge from '@/components/ui/badge/Badge';

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
      {/* <!-- Metric 1: Santri Aktif --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          <GroupIcon className="size-6 text-gray-800 dark:text-white/90" />
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total Santri Aktif
            </span>
            <h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">
              {loading ? '...' : totalSantri.toLocaleString('id-ID')}
            </h4>
          </div>
          <Link href="/santri">
            <Badge color="success">
              <ArrowUpIcon className="size-3" />
              11.01%
            </Badge>
          </Link>
        </div>
      </div>

      {/* <!-- Metric 2: Kasir & SPP --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          <DollarLineIcon className="size-6 text-gray-800 dark:text-white/90" />
        </div>
        <div className="mt-5 flex items-end justify-between">
          <div className="min-w-0 pr-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate block">
              Penerimaan Kasir & SPP
            </span>
            <h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90 truncate">
              {loading ? '...' : `Rp${saldoKas.toLocaleString('id-ID')}`}
            </h4>
          </div>

          <Link href="/pembayaran">
            <Badge color="primary">
              <ArrowUpIcon className="size-3" />
              8.45%
            </Badge>
          </Link>
        </div>
      </div>

      {/* <!-- Metric 3: Tahfidz Quran --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          <BoxIconLine className="size-6 text-gray-800 dark:text-white/90" />
        </div>
        <div className="mt-5 flex items-end justify-between">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Setoran Tahfidz Hari Ini
            </span>
            <h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">
              {loading ? '...' : `${tahfidzHariIni.toLocaleString('id-ID')} Santri`}
            </h4>
          </div>

          <Link href="/tahfidz">
            <Badge color="info">
              <ArrowUpIcon className="size-3" />
              Hari Ini
            </Badge>
          </Link>
        </div>
      </div>

      {/* <!-- Metric 4: Perizinan & Asrama --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          <CalenderIcon className="size-6 text-gray-800 dark:text-white/90" />
        </div>
        <div className="mt-5 flex items-end justify-between">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Santri Izin / Asrama
            </span>
            <h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">
              {loading ? '...' : `${santriIzin.toLocaleString('id-ID')} Santri`}
            </h4>
          </div>

          <Link href="/asrama">
            <Badge color="warning">
              <ArrowDownIcon className="size-3" />
              Izin
            </Badge>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EcommerceMetrics;
