'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  BarChart4,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CalendarCheck,
  FileSearch,
  Megaphone,
  X,
  Sparkles,
} from 'lucide-react';
import { ThemeToggle } from './ui/theme-toggle';
import Badge from './ui/badge';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
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
}

interface MenuItem {
  name?: string;
  href?: string;
  icon?: React.ElementType;
  heading?: string;
  submenu?: SubMenuItem[];
  badge?: string;
}

const MENU_ITEMS: MenuItem[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Dashboard Eksekutif', href: '/dashboard-eksekutif', icon: BarChart4 },
  { heading: 'Modul Utama' },
  { name: 'Lembaga', href: '/lembaga', icon: School },
  { name: 'Santri', href: '/santri', icon: Users },
  { name: 'Pegawai', href: '/pegawai', icon: Briefcase },
  {
    name: 'Absensi Pegawai',
    icon: CalendarCheck,
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
  { name: 'PPDB', href: '/ppdb', icon: ClipboardList, badge: 'New' },
  { name: 'Siaran', href: '/siaran', icon: Megaphone },
  { name: 'Asrama', href: '/asrama', icon: Home },
  { heading: 'Akademik & Tahfidz' },
  { name: 'Tahfidz Tracker', href: '/tahfidz', icon: GraduationCap },
  {
    name: 'Akademik',
    icon: BookOpen,
    submenu: [
      { name: 'Absensi', href: '/akademik/absensi' },
      { name: 'Jadwal', href: '/akademik/jadwal' },
      { name: 'Mapel', href: '/akademik/mapel' },
      { name: 'Nilai', href: '/akademik/nilai' },
      { name: 'Tahfidz', href: '/akademik/tahfidz' },
      { name: 'Laporan Tahfidz', href: '/akademik/tahfidz/laporan' },
    ],
  },
  { heading: 'Keuangan' },
  { name: 'Kasir Pembayaran', href: '/pembayaran', icon: CreditCard },
  { name: 'Atur Keuangan', href: '/keuangan', icon: Coins },
  { name: 'Laporan Keuangan', href: '/laporan', icon: BarChart4 },
  { heading: 'Pengaturan' },
  { name: 'Hak Akses', href: '/settings/users', icon: ShieldCheck },
  { name: 'Audit Trail', href: '/settings/audit-logs', icon: FileSearch },
  { name: 'Pengaturan', href: '/pengaturan', icon: Settings },
];

export function Sidebar({
  isOpen,
  onClose,
  isCollapsed,
  userRoleRaw,
  permissions,
  pesantrenLogo,
  pesantrenName = 'SIM Pesantren',
  userDisplayName = 'User',
  userEmail = '',
  userFotoUrl,
  userInitial = 'U',
}: SidebarProps) {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);
    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      el.removeEventListener('mouseenter', handleMouseEnter);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const isDesktopHovered = isHovered;
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

  const toggleSubmenu = (name: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="layout-overlay show fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        ref={sidebarRef}
        className={`layout-sidebar custom-scrollbar border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all duration-300 ${
          isOpen ? 'toggled-mobile' : ''
        }`}
        data-hover={isDesktopHovered ? 'true' : 'false'}
      >
        <div className="flex flex-col h-full w-full">
          {/* Logo Container (TailAdmin Style) */}
          <div className="logo-container h-18 border-b border-slate-100 dark:border-zinc-800/80 px-4 flex items-center justify-between">
            <Link
              href="/admin"
              onClick={() => onClose()}
              className="flex items-center gap-3 group"
            >
              <div className="logo-full flex items-center gap-3">
                {pesantrenLogo ? (
                  <img
                    src={pesantrenLogo}
                    alt="Logo"
                    className="block h-10 w-auto rounded-xl object-contain drop-shadow-sm"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20">
                    SP
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                    {pesantrenName}
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
                    Sistem Terpadu
                  </span>
                </div>
              </div>

              <div className="logo-mini">
                {pesantrenLogo ? (
                  <img
                    src={pesantrenLogo}
                    alt="Logo"
                    className="block h-8 w-auto rounded-lg"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-xs shadow-md">
                    SP
                  </div>
                )}
              </div>
            </Link>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label="Tutup Menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="sidebar-menu custom-scrollbar flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {MENU_ITEMS.map((item, idx) => {
              if (item.heading) {
                return (
                  <div
                    key={`heading-${idx}`}
                    className="sidebar-heading px-3 pt-4 pb-1 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-zinc-500"
                  >
                    {item.heading}
                  </div>
                );
              }

              // Single link item
              if (item.href && item.icon) {
                if (!canAccess(item.href)) return null;
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => onClose()}
                    className={`sidebar-item group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      active
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-100'
                    }`}
                    aria-current={active ? 'page' : undefined}
                    title={isCollapsed && !isDesktopHovered ? item.name : undefined}
                  >
                    <Icon
                      className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                        active
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-300'
                      }`}
                    />
                    <span className="flex-1 flex items-center justify-between gap-2 min-w-0">
                      <span className="truncate">{item.name}</span>
                      {item.badge && (
                        <Badge variant="solid" color="primary" size="sm">
                          {item.badge}
                        </Badge>
                      )}
                    </span>
                  </Link>
                );
              }

              // Submenu item
              if (item.submenu && item.icon) {
                const hasAccessibleChildren = item.submenu.some((s) =>
                  canAccess(s.href)
                );
                if (!hasAccessibleChildren) return null;

                const isSubActive = item.submenu.some((s) => isActive(s.href));
                const Icon = item.icon;
                const subOpen = openSubmenus[item.name!] ?? isSubActive;

                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      onClick={() => toggleSubmenu(item.name!)}
                      className={`sidebar-item w-full group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                        isSubActive
                          ? 'bg-slate-100/70 text-slate-900 dark:bg-zinc-800/80 dark:text-zinc-100'
                          : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-100'
                      }`}
                    >
                      <Icon
                        className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                          isSubActive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-300'
                        }`}
                      />
                      <span className="flex-1 text-left truncate">{item.name}</span>
                      <ChevronDown
                        className={`chevron-icon h-4 w-4 shrink-0 transition-transform duration-200 ${
                          subOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500'
                        }`}
                      />
                    </button>

                    {subOpen && (
                      <div className="submenu-container pl-7 pr-1 py-1 space-y-1">
                        {item.submenu.map((sub) => {
                          if (!canAccess(sub.href)) return null;
                          const subActive = isActive(sub.href);
                          return (
                            <Link
                              key={sub.name}
                              href={sub.href}
                              onClick={() => onClose()}
                              aria-current={subActive ? 'page' : undefined}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                subActive
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 font-bold'
                                  : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100/70 dark:hover:bg-zinc-800/50 hover:text-slate-800 dark:hover:text-zinc-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all ${
                                  subActive
                                    ? 'bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900/60'
                                    : 'bg-slate-300 dark:bg-zinc-600'
                                }`}
                              />
                              <span className="truncate">{sub.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return null;
            })}
          </nav>

          {/* TailAdmin Sidebar Widget Card */}
          <div className="sidebar-footer p-3 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
            <div className="sidebar-footer-text rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold text-slate-800 dark:text-zinc-200">
                  SIM Pesantren
                </span>
                <span className="ml-auto text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                  v0.1
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-zinc-500 leading-snug">
                Sistem Terpadu Manajemen Pondok Pesantren
              </p>
            </div>

            {/* User Profile Pill in Sidebar */}
            <Link
              href="/profile"
              onClick={() => onClose()}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-zinc-800/60 transition-colors"
              title="Profil Saya"
            >
              {userFotoUrl ? (
                <img
                  src={userFotoUrl}
                  alt="Avatar"
                  className="h-9 w-9 shrink-0 rounded-xl object-cover ring-2 ring-emerald-500/20"
                />
              ) : (
                <div className="h-9 w-9 shrink-0 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                  {userInitial}
                </div>
              )}
              <div className="sidebar-footer-text overflow-hidden min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate leading-tight">
                  {userDisplayName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                  {userRoleRaw || 'Admin'}
                </p>
              </div>
              <ChevronRight className="sidebar-footer-text h-4 w-4 text-slate-300 dark:text-zinc-600 ml-auto shrink-0" />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
