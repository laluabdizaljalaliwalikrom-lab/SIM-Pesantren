'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GridIcon,
  GroupIcon,
  CalenderIcon,
  DollarLineIcon,
  TableIcon,
  HorizontaLDots,
} from '@/components/icons';
import {
  BookOpen,
  Settings,
  GraduationCap,
  Briefcase,
  Coins,
  ShieldCheck,
  BarChart4,
  ChevronDown,
  ClipboardList,
  FileSearch,
  Megaphone,
  Home,
} from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import SidebarWidget from '@/components/layout/SidebarWidget';
import { cn } from '@/lib/utils';

interface SidebarProps {
  userRoleRaw?: string;
  permissions?: any[];
  pesantrenLogo?: string;
  pesantrenName?: string;
  userDisplayName?: string;
  userEmail?: string;
  userFotoUrl?: string;
  userInitial?: string;
}

interface SubMenuItem {
  name: string;
  href: string;
  badge?: string;
}

interface MenuItem {
  name?: string;
  href?: string;
  icon?: React.ElementType;
  heading?: string;
  submenu?: SubMenuItem[];
  badge?: string;
}

const MENU_GROUPS: {
  title: string;
  items: MenuItem[];
}[] = [
  {
    title: 'MENU UTAMA',
    items: [
      { name: 'Dashboard', href: '/admin', icon: GridIcon },
      { name: 'Dashboard Eksekutif', href: '/dashboard-eksekutif', icon: BarChart4 },
      { name: 'Lembaga', href: '/lembaga', icon: TableIcon },
      { name: 'Santri & Data Induk', href: '/santri', icon: GroupIcon },
      { name: 'Kepegawaian', href: '/pegawai', icon: Briefcase },
      {
        name: 'Absensi Pegawai',
        icon: CalenderIcon,
        submenu: [
          { name: 'Riwayat Harian', href: '/absen-pegawai' },
          { name: 'Scan QR', href: '/absen-pegawai/scan' },
          { name: 'Kartu Pegawai', href: '/absen-pegawai/kartu' },
          { name: 'Atur Absensi', href: '/absen-pegawai/atur' },
          { name: 'Rekap Bulanan', href: '/absen-pegawai/rekap' },
        ],
      },
      {
        name: 'Absensi Santri',
        icon: GraduationCap,
        submenu: [
          { name: 'Riwayat Harian', href: '/absen-santri' },
          { name: 'Scan QR', href: '/absen-santri/scan' },
          { name: 'Kartu Santri', href: '/absen-santri/kartu' },
          { name: 'Atur Absensi', href: '/absen-santri/atur' },
          { name: 'Rekap Bulanan', href: '/absen-santri/rekap' },
        ],
      },
      { name: 'PPDB Online', href: '/ppdb', icon: ClipboardList, badge: 'Baru' },
      { name: 'Siaran Pesantren', href: '/siaran', icon: Megaphone },
      { name: 'Asrama & Kamar', href: '/asrama', icon: Home },
    ],
  },
  {
    title: 'AKADEMIK & TAHFIDZ',
    items: [
      { name: 'Tahfidz Tracker', href: '/tahfidz', icon: GraduationCap },
      {
        name: 'Akademik KBM',
        icon: BookOpen,
        submenu: [
          { name: 'Absensi KBM', href: '/akademik/absensi' },
          { name: 'Jadwal Pelajaran', href: '/akademik/jadwal' },
          { name: 'Mata Pelajaran', href: '/akademik/mapel' },
          { name: 'Input Nilai Rapor', href: '/akademik/nilai' },
          { name: 'Laporan Tahfidz', href: '/akademik/tahfidz/laporan' },
        ],
      },
    ],
  },
  {
    title: 'KEUANGAN & KASIR',
    items: [
      { name: 'Kasir Pembayaran', href: '/pembayaran', icon: DollarLineIcon },
      { name: 'Atur Pos Keuangan', href: '/keuangan', icon: Coins },
      { name: 'Laporan Arus Kas', href: '/laporan', icon: BarChart4 },
    ],
  },
  {
    title: 'PENGATURAN',
    items: [
      { name: 'Hak Akses Pengguna', href: '/settings/users', icon: ShieldCheck },
      { name: 'Audit Trail Mutasi', href: '/settings/audit-logs', icon: FileSearch },
      { name: 'Pengaturan Lembaga', href: '/pengaturan', icon: Settings },
    ],
  },
];

export function Sidebar({
  userRoleRaw,
  permissions,
  pesantrenLogo,
  pesantrenName = 'SIM Pesantren',
}: SidebarProps) {
  const pathname = usePathname();
  const {
    isExpanded,
    isMobileOpen,
    isHovered,
    setIsHovered,
    toggleMobileSidebar,
  } = useSidebar();

  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  const isSuperAdmin = userRoleRaw === 'Super Admin';

  const canAccess = (href: string): boolean => {
    if (href === '/admin') return true;
    if (href.startsWith('/settings')) return isSuperAdmin;
    const pathModuleMap: Record<string, string> = {
      '/santri': 'Santri',
      '/absen-santri': 'Santri',
      '/pegawai': 'Kepegawaian',
      '/absen-pegawai': 'Kepegawaian',
      '/keuangan': 'Keuangan',
      '/pembayaran': 'Keuangan',
      '/laporan': 'Laporan',
      '/dashboard-eksekutif': 'Laporan',
      '/akademik': 'Akademik',
      '/lembaga': 'Lembaga',
      '/asrama': 'Asrama',
      '/siaran': 'Siaran',
      '/perizinan': 'Perizinan',
      '/pelanggaran': 'Pelanggaran',
      '/tahfidz': 'Tahfidz',
      '/pengaturan': 'Pengaturan',
      '/ppdb': 'PPDB',
    };
    const moduleName = pathModuleMap[href];
    if (moduleName && !isSuperAdmin) {
      const modPerm = permissions?.find(
        (p) => p.feature.toLowerCase() === moduleName.toLowerCase()
      );
      return !!(modPerm && modPerm.can_view);
    }
    return true;
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  // Automatically expand active submenu on pathname change
  useEffect(() => {
    MENU_GROUPS.forEach((group) => {
      group.items.forEach((item) => {
        if (item.submenu) {
          const hasActiveChild = item.submenu.some((sub) => isActive(sub.href));
          if (hasActiveChild) {
            setOpenSubmenus((prev) => ({ ...prev, [item.name!]: true }));
          }
        }
      });
    });
  }, [pathname]);

  const toggleSubmenu = (name: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const isFullyOpen = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-50 flex h-full flex-col border-r border-gray-200 bg-white text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900',
        isFullyOpen ? 'w-[290px] px-5' : 'w-[90px] px-3',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'
      )}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Brand Logo Header */}
      <div
        className={cn(
          'flex h-20 items-center border-b border-gray-100 dark:border-gray-800',
          !isFullyOpen ? 'justify-center' : 'justify-start'
        )}
      >
        <Link
          href="/admin"
          onClick={() => isMobileOpen && toggleMobileSidebar()}
          className="flex items-center gap-3 group"
        >
          {pesantrenLogo ? (
            <img
              src={pesantrenLogo}
              alt="Logo"
              className={cn(
                'rounded-xl object-contain drop-shadow-xs transition-all duration-200',
                isFullyOpen ? 'h-10 w-auto' : 'h-9 w-auto'
              )}
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-theme-xs">
              SP
            </div>
          )}

          {isFullyOpen && (
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white leading-tight truncate">
                {pesantrenName}
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
                SIM Pesantren
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Menu */}
      <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto py-5 duration-300 ease-linear">
        <nav className="space-y-6">
          {MENU_GROUPS.map((group, gIdx) => {
            // Check if group has any visible items
            const visibleItems = group.items.filter((item) => {
              if (item.href) return canAccess(item.href);
              if (item.submenu) {
                return item.submenu.some((sub) => canAccess(sub.href));
              }
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={gIdx}>
                <h2
                  className={cn(
                    'mb-3 flex text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500',
                    !isFullyOpen ? 'justify-center' : 'justify-start px-3'
                  )}
                >
                  {isFullyOpen ? group.title : <HorizontaLDots className="h-4 w-4" />}
                </h2>

                <ul className="flex flex-col gap-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon || GridIcon;

                    // 1. Single Link Item
                    if (item.href) {
                      const active = isActive(item.href);
                      return (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            onClick={() => isMobileOpen && toggleMobileSidebar()}
                            className={cn(
                              'group menu-item',
                              active ? 'menu-item-active' : 'menu-item-inactive',
                              !isFullyOpen ? 'justify-center px-0' : 'justify-start'
                            )}
                            title={!isFullyOpen ? item.name : undefined}
                          >
                            <span
                              className={cn(
                                active
                                  ? 'menu-item-icon-active'
                                  : 'menu-item-icon-inactive'
                              )}
                            >
                              <Icon className="h-5 w-5 shrink-0" />
                            </span>

                            {isFullyOpen && (
                              <span className="flex-1 truncate text-xs font-semibold">
                                {item.name}
                              </span>
                            )}

                            {isFullyOpen && item.badge && (
                              <span
                                className={cn(
                                  'menu-dropdown-badge ms-auto',
                                  active
                                    ? 'menu-dropdown-badge-active'
                                    : 'menu-dropdown-badge-inactive'
                                )}
                              >
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    }

                    // 2. Submenu Accordion Item
                    if (item.submenu) {
                      const isSubActive = item.submenu.some((s) => isActive(s.href));
                      const isOpen = openSubmenus[item.name!] ?? isSubActive;

                      return (
                        <li key={item.name}>
                          <button
                            type="button"
                            onClick={() => toggleSubmenu(item.name!)}
                            className={cn(
                              'group menu-item w-full cursor-pointer',
                              isSubActive ? 'menu-item-active' : 'menu-item-inactive',
                              !isFullyOpen ? 'justify-center px-0' : 'justify-start'
                            )}
                            title={!isFullyOpen ? item.name : undefined}
                          >
                            <span
                              className={cn(
                                isSubActive
                                  ? 'menu-item-icon-active'
                                  : 'menu-item-icon-inactive'
                              )}
                            >
                              <Icon className="h-5 w-5 shrink-0" />
                            </span>

                            {isFullyOpen && (
                              <span className="flex-1 text-left truncate text-xs font-semibold">
                                {item.name}
                              </span>
                            )}

                            {isFullyOpen && (
                              <ChevronDown
                                className={cn(
                                  'ms-auto h-4 w-4 shrink-0 transition-transform duration-200 text-gray-400',
                                  isOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
                                )}
                              />
                            )}
                          </button>

                          {/* Submenu links */}
                          {isFullyOpen && isOpen && (
                            <ul className="ms-8 mt-1 space-y-1 border-l-2 border-gray-100 dark:border-gray-800 pl-2">
                              {item.submenu.map((subItem) => {
                                if (!canAccess(subItem.href)) return null;
                                const subActive = isActive(subItem.href);
                                return (
                                  <li key={subItem.name}>
                                    <Link
                                      href={subItem.href}
                                      onClick={() =>
                                        isMobileOpen && toggleMobileSidebar()
                                      }
                                      className={cn(
                                        'menu-dropdown-item text-xs',
                                        subActive
                                          ? 'menu-dropdown-item-active font-semibold'
                                          : 'menu-dropdown-item-inactive'
                                      )}
                                    >
                                      <span className="truncate">{subItem.name}</span>
                                      {subItem.badge && (
                                        <span className="menu-dropdown-badge ms-auto menu-dropdown-badge-active">
                                          {subItem.badge}
                                        </span>
                                      )}
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </li>
                      );
                    }

                    return null;
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Bottom Widget Card (TailAdmin signature) */}
        {isFullyOpen && <SidebarWidget />}
      </div>
    </aside>
  );
}

export default Sidebar;
