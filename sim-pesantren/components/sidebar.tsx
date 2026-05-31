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
  X, 
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  School,
  Home,
  Briefcase,
  Coins,
  ShieldCheck
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

const MENU_ITEMS = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Lembaga', href: '/lembaga', icon: School },
  { name: 'Asrama', href: '/asrama', icon: Home },
  { name: 'Pegawai', href: '/pegawai', icon: Briefcase },
  { name: 'Santri', href: '/santri', icon: Users },
  { name: 'Tahfidz Tracker', href: '/tahfidz', icon: GraduationCap },
  { name: 'Akademik', href: '/akademik', icon: BookOpen },
  { name: 'Kasir Pembayaran', href: '/pembayaran', icon: CreditCard },
  { name: 'Atur Keuangan', href: '/keuangan', icon: Coins },
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
  userInitial = 'U'
}: SidebarProps) {
  const pathname = usePathname();

  const isSuperAdmin = userRoleRaw === 'admin' || userRoleRaw === 'Super Admin';

  const filteredMenuItems = MENU_ITEMS.filter((item) => {
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

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-emerald-800/20 bg-emerald-950 dark:bg-zinc-950 text-slate-100 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
         } ${isCollapsed ? 'lg:w-20' : 'lg:w-72 w-72'}`}
      >
        {/* Brand / Header */}
        <div className={`flex h-16 items-center border-b border-emerald-800/30 px-4 ${isCollapsed ? 'lg:justify-center' : 'justify-between'}`}>
          <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
            {pesantrenLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pesantrenLogo} alt="Logo" className="h-9 w-9 flex-shrink-0 rounded-lg object-cover shadow-md" />
            ) : (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white font-extrabold text-lg shadow-md shadow-emerald-500/25">
                P
              </div>
            )}
            {!isCollapsed && (
              <div className="animate-fade-in truncate">
                <span className="font-extrabold text-base tracking-wide bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                  {pesantrenName || "SIM Pesantren"}
                </span>
                <p className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">Portal Admin</p>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Trigger */}
          {!isCollapsed && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-800/30 hover:bg-emerald-900/50 text-slate-400 hover:text-white transition-colors"
              title="Sembunyikan Sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-800/30 hover:bg-emerald-900/50 text-slate-300 lg:hidden transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Desktop Expand Button when Collapsed */}
        {isCollapsed && (
          <div className="hidden lg:flex justify-center py-4 border-b border-emerald-800/10">
            <button
              onClick={onToggleCollapse}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-emerald-800/30 hover:bg-emerald-900/50 text-emerald-400 hover:text-white transition-all duration-200"
              title="Tampilkan Sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 px-3 py-6 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => onClose()}
                className={`group flex items-center rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-600 dark:bg-emerald-600 text-white shadow-lg shadow-emerald-600/10'
                    : 'text-slate-300 hover:bg-emerald-900/40 hover:text-white dark:hover:bg-zinc-900/60'
                } ${isCollapsed ? 'justify-center p-3 lg:px-0' : 'gap-3 px-4 py-3'}`}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon
                  className={`h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-emerald-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-emerald-800/30 bg-emerald-950/50 dark:bg-zinc-950/50">
          <Link
            href="/profile"
            onClick={() => onClose()}
            className={`flex items-center gap-3 px-1 transition-all duration-200 hover:opacity-85 ${isCollapsed ? 'justify-center' : ''}`}
            title="Profil Saya"
          >
            {userFotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userFotoUrl}
                alt="Avatar"
                className="h-9 w-9 flex-shrink-0 rounded-full object-cover shadow-sm border border-emerald-500/35"
              />
            ) : (
              <div className="h-9 w-9 flex-shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold uppercase">
                {userInitial}
              </div>
            )}
            {!isCollapsed && (
              <div className="overflow-hidden animate-fade-in">
                <p className="text-xs font-semibold text-white truncate">{userDisplayName}</p>
                <p className="text-[10px] text-emerald-400 font-medium truncate">{userEmail}</p>
              </div>
            )}
          </Link>
        </div>
      </aside>
    </>
  );
}
