'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Info, Sparkles } from 'lucide-react';
import { BellIcon, CloseIcon } from '@/components/icons';
import { Dropdown } from '@/components/ui/dropdown/Dropdown';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifying, setNotifying] = useState(true);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setNotifying(false);
    }
  };

  const closeDropdown = () => setIsOpen(false);

  const notifications = [
    {
      id: 1,
      title: 'Setoran Tahfidz Selesai',
      desc: '12 santri telah menyelesaikan target hafalan juz 30.',
      time: '10 menit lalu',
      icon: CheckCircle2,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      id: 2,
      title: 'Pembayaran Kasir Masuk',
      desc: 'Penerimaan SPP santri baru telah diverifikasi.',
      time: '1 jam lalu',
      icon: Sparkles,
      color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-500/10',
    },
    {
      id: 3,
      title: 'Pengajuan Izin Santri',
      desc: '2 santri mengajukan perizinan kepulangan.',
      time: '3 jam lalu',
      icon: Info,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="dropdown-toggle relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white cursor-pointer"
        aria-label="Notifikasi"
      >
        {notifying && (
          <span className="absolute top-0.5 right-0.5 z-10 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        )}
        <BellIcon className="size-5" />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-3 w-80 sm:w-92 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
          <h5 className="text-sm font-bold text-gray-800 dark:text-white/90">
            Notifikasi Sistem
          </h5>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            3 Baru
          </span>
        </div>

        <ul className="divide-y divide-gray-100 dark:divide-gray-800 py-1 max-h-72 overflow-y-auto custom-scrollbar">
          {notifications.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-white/90 truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                      {item.desc}
                    </p>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">
                      {item.time}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-gray-100 pt-2 text-center dark:border-gray-800">
          <Link
            href="/admin"
            onClick={closeDropdown}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Lihat Semua Aktivitas
          </Link>
        </div>
      </Dropdown>
    </div>
  );
}
