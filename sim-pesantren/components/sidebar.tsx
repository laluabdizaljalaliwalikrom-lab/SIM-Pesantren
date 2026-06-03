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
} from 'lucide-react';

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
  { heading: 'Modul Utama' },
  { name: 'Lembaga', href: '/lembaga', icon: School },
  { name: 'Santri', href: '/santri', icon: Users },
  { name: 'Pegawai', href: '/pegawai', icon: Briefcase },
  { name: 'Asrama', href: '/asrama', icon: Home },
  { heading: 'Akademik & Tahfidz' },
  { name: 'Tahfidz Tracker', href: '/tahfidz', icon: GraduationCap },
  {
    name: 'Akademik', icon: BookOpen,
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
  { name: 'Pengaturan', href: '/pengaturan', icon: Settings },
];

export function Sidebar({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
  userRoleRaw,
  permissions,
  pesantrenLogo,
  pesantrenName,
  userDisplayName = 'User',
  userEmail = '',
  userFotoUrl,
  userInitial = 'U',
}: SidebarProps) {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  // Desktop hover detection
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
      '/pegawai': 'Kepegawaian',
      '/keuangan': 'Keuangan',
      '/pembayaran': 'Keuangan',
      '/laporan': 'Keuangan',
      '/akademik': 'Akademik',
      '/lembaga': 'Lembaga',
      '/asrama': 'Asrama',
      '/tahfidz': 'Tahfidz',
      '/pengaturan': 'Pengaturan',
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
        <div className="layout-overlay show" onClick={onClose} />
      )}

      <aside
        ref={sidebarRef}
        className={`layout-sidebar custom-scrollbar ${
          isOpen ? 'toggled-mobile' : ''
        }`}
        data-hover={isDesktopHovered ? 'true' : 'false'}
      >
        <div className="flex flex-col h-full w-full">
          {/* Logo */}
          <div className="logo-container">
            <Link
              href="/admin"
              onClick={() => onClose()}
              className="w-full flex items-center justify-start"
            >
              <div className="logo-full flex items-center gap-3">
                {pesantrenLogo ? (
                  <img
                    src={pesantrenLogo}
                    alt="Logo"
                    className="block h-10 w-auto rounded-lg"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white font-extrabold text-lg shadow-md">
                    SP
                  </div>
                )}
                <span className="text-xl font-bold tracking-tight leading-none whitespace-nowrap">
                  <span className="text-emerald-600">SIM</span>{' '}
                  <span className="text-teal-600">Pesantren</span>
                </span>
              </div>
              <div className="logo-mini">
                {pesantrenLogo ? (
                  <img
                    src={pesantrenLogo}
                    alt="Logo"
                    className="block h-8 w-auto"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 text-white font-extrabold shadow-md">
                    SP
                  </div>
                )}
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="sidebar-menu custom-scrollbar">
            {MENU_ITEMS.map((item, idx) => {
              if (item.heading) {
                return (
                  <div key={`heading-${idx}`} className="sidebar-heading">
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
                    className={`sidebar-item group ${active ? 'active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    title={isCollapsed && !isDesktopHovered ? item.name : undefined}
                  >
                    <Icon />
                    <span className="flex-1 flex items-center gap-2">
                      <span>{item.name}</span>
                      {item.badge && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-full ml-auto">
                          {item.badge}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              }

              // Submenu item
              if (item.submenu && item.icon) {
                const hasAccessibleChildren = item.submenu.some((s) => canAccess(s.href));
                if (!hasAccessibleChildren) return null;

                const isSubActive = item.submenu.some((s) => isActive(s.href));
                const Icon = item.icon;
                const subOpen = openSubmenus[item.name!] ?? isSubActive;

                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleSubmenu(item.name!)}
                      className={`sidebar-item w-full ${isSubActive ? 'active' : ''}`}
                    >
                      <Icon />
                      <span className="flex-1 text-left">{item.name}</span>
                      <ChevronDown
                        className={`chevron-icon ${
                          subOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {subOpen && (
                      <div className="submenu-container">
                        {item.submenu.map((sub) => {
                          if (!canAccess(sub.href)) return null;
                          const subActive = isActive(sub.href);
                          return (
                            <Link
                              key={sub.name}
                              href={sub.href}
                              onClick={() => onClose()}
                              aria-current={subActive ? 'page' : undefined}
                              className={subActive ? 'active-dropdown-item' : ''}
                            >
                              {sub.name}
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

          {/* Sidebar Footer / User */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a2e]">
            <Link
              href="/profile"
              onClick={() => onClose()}
              className="flex items-center gap-3 px-1 transition-all duration-200 hover:opacity-85"
              title="Profil Saya"
            >
              {userFotoUrl ? (
                <img
                  src={userFotoUrl}
                  alt="Avatar"
                  className="h-9 w-9 flex-shrink-0 rounded-lg object-cover shadow-sm border border-emerald-200 dark:border-emerald-800"
                />
              ) : (
                <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold uppercase text-sm">
                  {userInitial}
                </div>
              )}
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {userDisplayName}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate">
                  {userEmail || userRoleRaw}
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 ml-auto shrink-0" />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
