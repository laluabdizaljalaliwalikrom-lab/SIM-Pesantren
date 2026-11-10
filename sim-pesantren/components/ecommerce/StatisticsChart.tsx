'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import { Calendar } from 'lucide-react';
import ChartTab from '@/components/common/ChartTab';

const ReactApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
});

const dayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ahad'];

export default function StatisticsChart() {
  const [tab, setTab] = useState<'weekly' | 'monthly' | 'annually'>('weekly');

  const series = [
    {
      name: 'Setoran Tahfidz (Santri)',
      data: [42, 56, 48, 65, 78, 60, 72],
    },
    {
      name: 'Presensi Kehadiran Santri',
      data: [185, 192, 188, 195, 204, 198, 200],
    },
  ];

  const options: ApexOptions = {
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'left',
      labels: {
        colors: '#64748b',
      },
    },
    colors: ['#10b981', '#06b6d4'],
    chart: {
      fontFamily: 'inherit',
      height: 310,
      type: 'area',
      toolbar: {
        show: false,
      },
    },
    stroke: {
      curve: 'smooth',
      width: [2.5, 2.5],
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.05,
      },
    },
    markers: {
      size: 0,
      hover: {
        size: 5,
      },
    },
    grid: {
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
      borderColor: '#e2e8f0',
      strokeDashArray: 3,
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      theme: 'dark',
      x: {
        show: true,
      },
    },
    xaxis: {
      type: 'category',
      categories: dayLabels,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          colors: '#94a3b8',
          fontSize: '11px',
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: '#94a3b8',
          fontSize: '11px',
        },
      },
    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pt-5 pb-5 sm:px-6 sm:pt-6 dark:border-gray-800 dark:bg-gray-900 shadow-theme-xs">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Statistik Aktivitas Santri & Pesantren
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Perbandingan harian setoran tahfidz dan presensi kehadiran santri
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-400">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            <span>Pekan Ini</span>
          </div>

          <ChartTab
            selected={tab}
            onChange={(val) => setTab(val)}
            options={[
              { label: 'Mingguan', value: 'weekly' },
              { label: 'Bulanan', value: 'monthly' },
              { label: 'Tahunan', value: 'annually' },
            ]}
          />
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar pt-2">
        <div className="-ml-4 min-w-[550px] xl:min-w-full pl-2">
          <ReactApexChart
            options={options}
            series={series}
            type="area"
            height={310}
          />
        </div>
      </div>
    </div>
  );
}
