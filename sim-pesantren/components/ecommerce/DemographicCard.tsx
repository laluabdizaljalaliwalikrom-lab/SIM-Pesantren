'use client';

import React, { useState } from 'react';
import { MoreDotIcon } from '@/components/icons';
import { School, BookOpen, GraduationCap, Users } from 'lucide-react';
import { Dropdown } from '@/components/ui/dropdown/Dropdown';
import { DropdownItem } from '@/components/ui/dropdown/DropdownItem';

interface DemographicCardProps {
  totalSantri?: number;
}

export default function DemographicCard({ totalSantri = 2755 }: DemographicCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  const demographics = [
    {
      label: 'Madrasah Tsanawiyah (MTs)',
      count: Math.round(totalSantri * 0.45) || 1240,
      percentage: '45%',
      color: 'bg-emerald-500',
      icon: School,
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Madrasah Aliyah (MA)',
      count: Math.round(totalSantri * 0.32) || 880,
      percentage: '32%',
      color: 'bg-cyan-500',
      icon: BookOpen,
      iconBg: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    },
    {
      label: 'Takhassus Tahfidz Al-Quran',
      count: Math.round(totalSantri * 0.15) || 415,
      percentage: '15%',
      color: 'bg-teal-500',
      icon: GraduationCap,
      iconBg: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400',
    },
    {
      label: "I'dad Lughawi / Persiapan",
      count: Math.round(totalSantri * 0.08) || 220,
      percentage: '8%',
      color: 'bg-indigo-500',
      icon: Users,
      iconBg: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Distribusi Santri Berdasarkan Jenjang
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Komposisi santri aktif di unit pendidikan pesantren
          </p>
        </div>

        <div className="relative">
          <button
            onClick={toggleDropdown}
            className="dropdown-toggle p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
            aria-label="Opsi Distribusi"
          >
            <MoreDotIcon className="size-5" />
          </button>
          <Dropdown isOpen={isOpen} onClose={closeDropdown} className="w-40 p-1.5">
            <DropdownItem onItemClick={closeDropdown}>
              Lihat Detail
            </DropdownItem>
            <DropdownItem onItemClick={closeDropdown}>
              Kelola Jenjang
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {/* Visual Summary Banner */}
      <div className="my-5 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-white/3 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Total Santri Terdaftar
          </span>
          <h4 className="text-2xl font-bold text-gray-800 dark:text-white/90 mt-0.5">
            {totalSantri.toLocaleString('id-ID')} Santri
          </h4>
        </div>
        <div className="flex -space-x-2">
          {demographics.map((item, idx) => (
            <div
              key={idx}
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white dark:border-gray-900 ${item.iconBg}`}
              title={item.label}
            >
              <item.icon className="h-4 w-4" />
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown Items with TailAdmin Bars */}
      <div className="space-y-4">
        {demographics.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="truncate">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">
                    {item.label}
                  </p>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {item.count.toLocaleString('id-ID')} Santri
                  </span>
                </div>
              </div>

              <div className="flex w-full max-w-[140px] sm:max-w-[160px] items-center gap-3 shrink-0">
                <div className="relative h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-500`}
                    style={{ width: item.percentage }}
                  />
                </div>
                <span className="w-9 text-right text-xs font-semibold text-gray-800 dark:text-white/90">
                  {item.percentage}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
