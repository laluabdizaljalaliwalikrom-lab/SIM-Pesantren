'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import { MoreHorizontal, ArrowUp, ArrowDown } from 'lucide-react';
import { Dropdown } from '@/components/ui/dropdown/Dropdown';
import { DropdownItem } from '@/components/ui/dropdown/DropdownItem';

const ReactApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
});

export default function MonthlyTarget() {
  const [isOpen, setIsOpen] = useState(false);

  const series = [85.5];
  const options: ApexOptions = {
    colors: ['#10b981'],
    chart: {
      fontFamily: 'inherit',
      type: 'radialBar',
      height: 330,
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        hollow: {
          size: '80%',
        },
        track: {
          background: '#E4E7EC',
          strokeWidth: '100%',
          margin: 5,
        },
        dataLabels: {
          name: {
            show: false,
          },
          value: {
            fontSize: '36px',
            fontWeight: '700',
            offsetY: -35,
            color: '#1D2939',
            formatter: (val) => `${val}%`,
          },
        },
      },
    },
    fill: {
      type: 'solid',
      colors: ['#10b981'],
    },
    stroke: {
      lineCap: 'round',
    },
    labels: ['Progress'],
  };

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/3 shadow-theme-xs">
      <div className="rounded-2xl bg-white px-5 pt-5 pb-5 sm:px-6 sm:pt-6 sm:pb-8 dark:bg-gray-900">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Target Capaian Bulan Ini
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Target kelancaran SPP & hafalan tahfidz santri
            </p>
          </div>

          <div className="relative">
            <button
              onClick={toggleDropdown}
              className="dropdown-toggle p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
              aria-label="Opsi Target"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            <Dropdown isOpen={isOpen} onClose={closeDropdown} className="w-40 p-1.5">
              <DropdownItem onItemClick={closeDropdown}>
                Ubah Target
              </DropdownItem>
              <DropdownItem onItemClick={closeDropdown}>
                Laporan Lengkap
              </DropdownItem>
            </Dropdown>
          </div>
        </div>

        <div className="relative">
          <div className="max-h-45 overflow-hidden flex items-center justify-center">
            <ReactApexChart
              options={options}
              series={series}
              type="radialBar"
              height={310}
            />
          </div>

          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            +10.5% vs Lalu
          </span>
        </div>

        <p className="mx-auto mt-4 w-full max-w-xs text-center text-xs text-gray-500 sm:text-sm dark:text-gray-400 leading-relaxed">
          Alhamdulillah, 85.5% target hafalan Quran dan tagihan SPP santri bulan ini tercapai.
        </p>
      </div>

      <div className="flex items-center justify-around gap-2 px-4 py-3 sm:px-6 sm:py-4">
        <div className="text-center">
          <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">
            Target
          </p>
          <p className="flex items-center justify-center gap-1 text-sm sm:text-base font-bold text-gray-800 dark:text-white/90">
            500 Juz
            <ArrowDown className="h-3.5 w-3.5 text-rose-500" />
          </p>
        </div>

        <div className="h-7 w-px bg-gray-200 dark:bg-gray-800" />

        <div className="text-center">
          <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">
            Realisasi
          </p>
          <p className="flex items-center justify-center gap-1 text-sm sm:text-base font-bold text-gray-800 dark:text-white/90">
            428 Juz
            <ArrowUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </p>
        </div>

        <div className="h-7 w-px bg-gray-200 dark:bg-gray-800" />

        <div className="text-center">
          <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">
            Hari Ini
          </p>
          <p className="flex items-center justify-center gap-1 text-sm sm:text-base font-bold text-gray-800 dark:text-white/90">
            28 Juz
            <ArrowUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </p>
        </div>
      </div>
    </div>
  );
}
