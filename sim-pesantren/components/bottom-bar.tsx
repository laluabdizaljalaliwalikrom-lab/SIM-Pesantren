'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CreditCard,
  Settings,
  GraduationCap,
  School,
  Home,
  Briefcase,
  Coins,
  ShieldCheck,
  Menu,
} from 'lucide-react';

interface BottomBarProps {
  userRoleRaw?: string;
  permissions?: any[];
  onOpenSidebar: () => void;
}

const BOTTOM_NAV_ITEMS = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Lembaga', href: '/lembaga', icon: School },
  { name: 'Asrama', href: '/asrama', icon: Home },
  { name: 'Pegawai', href: '/pegawai', icon: Briefcase },
  { name: 'Santri', href: '/santri', icon: Users },
  { name: 'Tahfidz', href: '/tahfidz', icon: GraduationCap },
  { name: 'Akademik', href: '/akademik', icon: BookOpen },
  { name: 'Pembayaran', href: '/pembayaran', icon: CreditCard },
  { name: 'Keuangan', href: '/keuangan', icon: Coins },
  { name: 'Hak Akses', href: '/settings/users', icon: ShieldCheck },
  { name: 'Pengaturan', href: '/pengaturan', icon: Settings },
];

export function BottomBar({ userRoleRaw, permissions, onOpenSidebar }: BottomBarProps) {
  const pathname = usePathname();

  const isSuperAdmin = userRoleRaw === 'admin' || userRoleRaw === 'Super Admin';

  const filteredItems = BOTTOM_NAV_ITEMS.filter((item) => {
    // Dashboard always visible
    if (item.href === '/admin') return true;

    // Hak Akses is admin only
    if (item.href.startsWith('/settings')) return isSuperAdmin;

    // Check custom permissions mapping
    const pathModuleMap: Record<string, string> = {
      '/santri': 'Santri',
      '/pegawai': 'Kepegawaian',
      '/keuangan': 'Keuangan',
      '/pembayaran': 'Keuangan',
      '/akademik': 'Akademik',
      '/lembaga': 'Lembaga',
      '/asrama': 'Asrama',
      '/tahfidz': 'Tahfidz',
      '/pengaturan': 'Pengaturan',
    };

    const moduleName = pathModuleMap[item.href];
    if (moduleName && !isSuperAdmin) {
      const modPerm = permissions?.find(
        (p) => p.feature.toLowerCase() === moduleName.toLowerCase()
      );
      return !!(modPerm && modPerm.can_view);
    }

    return true;
  });

  // If filtered items are more than 5, render the first 4 items and add a "Menu" button to trigger the sidebar.
  const showMoreButton = filteredItems.length > 5;
  const displayItems = showMoreButton ? filteredItems.slice(0, 4) : filteredItems;

  return (
    <nav
      className={`
        fixed bottom-0 left-0 right-0 z-40
        flex lg:hidden
        bg-white/80 dark:bg-zinc-900/80
        backdrop-blur-xl
        border-t border-slate-200/80 dark:border-zinc-800/80
        px-2 pb-safe
        shadow-[0_-4px_24px_rgba(0,0,0,0.06)]
      `}
      aria-label="Bottom navigation"
    >
      {displayItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`
              relative flex flex-1 flex-col items-center justify-center
              py-2.5 gap-1 rounded-xl mx-0.5 my-1.5
              text-[10px] font-bold tracking-wide
              transition-all duration-200 active:scale-95 select-none
              ${isActive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
              }
            `}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && (
              <span className="absolute inset-0 rounded-xl bg-emerald-50 dark:bg-emerald-500/10" />
            )}

            <span className="relative flex items-center justify-center">
              <Icon
                className={`
                  h-5 w-5 transition-all duration-200
                  ${isActive ? 'scale-110' : 'scale-100'}
                `}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {isActive && (
                <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
            </span>

            <span className="relative truncate max-w-[64px]">{item.name}</span>
          </Link>
        );
      })}

      {showMoreButton && (
        <button
          onClick={onOpenSidebar}
          className="relative flex flex-1 flex-col items-center justify-center py-2.5 gap-1 rounded-xl mx-0.5 my-1.5 text-[10px] font-bold tracking-wide transition-all duration-200 active:scale-95 select-none text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300"
        >
          <span className="relative flex items-center justify-center">
            <Menu className="h-5 w-5 scale-100" strokeWidth={2} />
          </span>
          <span className="relative">Menu</span>
        </button>
      )}
    </nav>
  );
}

