'use client';

import React from 'react';
import Link from 'next/link';
import { Filter, ArrowRight, CreditCard, Receipt } from 'lucide-react';
import Badge from '@/components/ui/badge';
import EmptyState from '@/components/empty-state';

export interface RecentTransactionItem {
  id: string;
  santri_nama: string;
  santri_nis: string;
  kategori: string;
  nominal: number;
  tanggal: string;
  status: string;
}

interface RecentOrdersProps {
  transactions: RecentTransactionItem[];
}

export default function RecentOrders({ transactions }: RecentOrdersProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pt-4 pb-3 sm:px-6 dark:border-gray-800 dark:bg-gray-900 shadow-theme-xs">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Transaksi Kasir & Pembayaran Terkini
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Daftar kuitansi pembayaran SPP dan tagihan santri terverifikasi
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/pembayaran"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/5 transition-colors"
          >
            <Filter className="h-3.5 w-3.5 text-gray-500" />
            <span>Filter Transaksi</span>
          </Link>

          <Link
            href="/pembayaran"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Buka Kasir</span>
          </Link>
        </div>
      </div>

      {transactions.length > 0 ? (
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Santri / Penyetor
                </th>
                <th className="py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">
                  Nominal
                </th>
                <th className="py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">
                  Status
                </th>
                <th className="py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">
                  Kuitansi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
              {transactions.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50/60 dark:hover:bg-white/2 transition-colors"
                >
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs uppercase">
                        {item.santri_nama.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">
                          {item.santri_nama}
                        </p>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          NIS: {item.santri_nis}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-xs font-medium text-gray-600 dark:text-gray-300">
                    {item.kategori}
                  </td>
                  <td className="py-3.5 px-3 text-xs text-gray-500 dark:text-gray-400">
                    {item.tanggal}
                  </td>
                  <td className="py-3.5 px-3 text-sm font-bold text-gray-900 dark:text-white text-right">
                    Rp{item.nominal.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <Badge
                      color={item.status === 'Lunas' ? 'success' : 'warning'}
                      size="sm"
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <Link
                      href="/pembayaran"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      <span>Cetak</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-6">
          <EmptyState
            icon={CreditCard}
            title="Belum Ada Transaksi Terbaru"
            description="Riwayat transaksi penerimaan pembayaran loket kasir santri akan otomatis muncul di sini."
            action={{
              label: '+ Buka Kasir Pembayaran',
              onClick: () => {
                window.location.href = '/pembayaran';
              },
            }}
          />
        </div>
      )}
    </div>
  );
}
