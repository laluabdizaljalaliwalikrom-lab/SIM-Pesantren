'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import { MoreDotIcon } from '@/components/icons';
import { Dropdown } from '@/components/ui/dropdown/Dropdown';
import { DropdownItem } from '@/components/ui/dropdown/DropdownItem';

const ReactApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
});

const monthLabels = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export default function MonthlySalesChart() {
  const [isOpen, setIsOpen] = useState(false);

  const series = [
    {
      name: 'Penerimaan Kasir (Jt)',
      data: [168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 112],
    },
  ];

  const options: ApexOptions = {
    colors: ['#10b981'],
    chart: {
      fontFamily: 'inherit',
      type: 'bar',
      height: 180,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '39%',
        borderRadius: 5,
        borderRadiusApplication: 'end',
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 4,
      colors: ['transparent'],
    },
    xaxis: {
      categories: monthLabels,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      tickPlacement: 'on',
      labels: {
        style: {
          colors: '#94a3b8',
          fontSize: '11px',
        },
      },
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'left',
      fontFamily: 'inherit',
    },
    yaxis: {
      labels: {
        style: {
          colors: '#94a3b8',
          fontSize: '11px',
        },
        formatter: (val) => `${val}Jt`,
      },
    },
    grid: {
      yaxis: {
        lines: {
          show: true,
        },
      },
      borderColor: '#e2e8f0',
      strokeDashArray: 3,
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val) => `Rp ${val} Juta`,
      },
    },
  };

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 pb-5 sm:px-6 sm:pt-6 dark:border-gray-800 dark:bg-gray-900 shadow-theme-xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Arus Kas & Penerimaan Bulanan
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Akumulasi transaksi kasir, pembayaran SPP, & operasional pesantren per bulan
          </p>
        </div>

        <div className="relative">
          <button
            onClick={toggleDropdown}
            className="dropdown-toggle p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
            aria-label="Opsi Grafik"
          >
            <MoreDotIcon className="size-5" />
          </button>
          <Dropdown isOpen={isOpen} onClose={closeDropdown} className="w-40 p-1.5">
            <DropdownItem onItemClick={closeDropdown}>
              Lihat Detail
            </DropdownItem>
            <DropdownItem onItemClick={closeDropdown}>
              Ekspor Data
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar pt-2">
        <div className="-ml-4 min-w-[500px] xl:min-w-full pl-2">
          <ReactApexChart
            options={options}
            series={series}
            type="bar"
            height={200}
          />
        </div>
      </div>
    </div>
  );
}
