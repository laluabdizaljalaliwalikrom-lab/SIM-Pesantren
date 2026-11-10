'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { Dropdown } from '@/components/ui/dropdown/Dropdown';
import { DropdownItem } from '@/components/ui/dropdown/DropdownItem';

interface UserDropdownProps {
  userDisplayName: string;
  userRole: string;
  userEmail?: string;
  userFotoUrl?: string | null;
  userInitial?: string;
  onLogout: () => void;
  loggingOut?: boolean;
}

export default function UserDropdown({
  userDisplayName,
  userRole,
  userEmail,
  userFotoUrl,
  userInitial = 'U',
  onLogout,
  loggingOut = false,
}: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="dropdown-toggle flex items-center text-gray-700 dark:text-gray-400 group cursor-pointer focus:outline-none"
        aria-label="User Profile"
      >
        <span className="me-2.5 h-10 w-10 overflow-hidden rounded-full ring-2 ring-emerald-500/20 flex items-center justify-center shrink-0">
          {userFotoUrl ? (
            <img
              src={userFotoUrl}
              alt={userDisplayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {userInitial}
            </div>
          )}
        </span>

        <div className="me-1 hidden text-left xl:block">
          <span className="block text-theme-sm font-semibold text-gray-800 dark:text-white/90 leading-tight">
            {userDisplayName}
          </span>
          <span className="block text-theme-xs font-medium text-emerald-600 dark:text-emerald-400">
            {userRole || 'Admin'}
          </span>
        </div>

        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 group-hover:text-gray-700 dark:group-hover:text-gray-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-3 w-64 rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="border-b border-gray-100 pb-3 px-1 dark:border-gray-800">
          <span className="block text-theme-sm font-bold text-gray-800 dark:text-white/90 truncate">
            {userDisplayName}
          </span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400 truncate">
            {userEmail || userRole}
          </span>
        </div>

        <ul className="flex flex-col gap-1 border-b border-gray-100 py-2 dark:border-gray-800">
          <li>
            <DropdownItem
              tag="a"
              href="/profile"
              onItemClick={closeDropdown}
              className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-theme-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <User className="h-4 w-4 text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
              <span>Profil Saya</span>
            </DropdownItem>
          </li>
          {userRole === 'Super Admin' && (
            <li>
              <DropdownItem
                tag="a"
                href="/pengaturan"
                onItemClick={closeDropdown}
                className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-theme-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <Settings className="h-4 w-4 text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                <span>Pengaturan Sistem</span>
              </DropdownItem>
            </li>
          )}
        </ul>

        <div className="pt-2 px-1">
          <button
            onClick={() => {
              closeDropdown();
              onLogout();
            }}
            disabled={loggingOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-theme-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors cursor-pointer disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            <span>{loggingOut ? 'Memproses...' : 'Keluar (Sign Out)'}</span>
          </button>
        </div>
      </Dropdown>
    </div>
  );
}
