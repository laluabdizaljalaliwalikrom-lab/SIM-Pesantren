'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useSidebar } from '@/context/SidebarContext';
import { Sidebar } from './sidebar';
import Backdrop from '@/components/layout/Backdrop';
import UserDropdown from '@/components/header/UserDropdown';
import NotificationDropdown from '@/components/header/NotificationDropdown';
import ThemeToggleButton from '@/components/common/ThemeToggleButton';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import {
  Menu,
  X,
  Search,
  Calendar,
  Clock as ClockIcon,
  Moon,
  ShieldAlert,
  Loader2,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function LiveClock() {
  const [dateTime, setDateTime] = useState({ date: '', time: '', hijri: '' });

  useEffect(() => {
    function update() {
      try {
        const now = new Date();
        const optionsDate: Intl.DateTimeFormatOptions = {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        };
        const date = now.toLocaleDateString('id-ID', optionsDate);
        const time = now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
        const hijri = now.toLocaleDateString('id-ID', {
          calendar: 'islamic-umalqura',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        setDateTime({ date, time, hijri });
      } catch {
        // fallback
      }
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-white/3 border border-gray-200 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300">
      <div className="flex items-center gap-1.5 font-medium">
        <Calendar className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
        <span>{dateTime.date}</span>
      </div>
      <span className="text-gray-300 dark:text-gray-700">|</span>
      <div className="flex items-center gap-1.5 font-mono font-medium">
        <ClockIcon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
        <span>{dateTime.time}</span>
      </div>
      <span className="text-gray-300 dark:text-gray-700">•</span>
      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
        <Moon className="h-3 w-3" />
        <span>{dateTime.hijri}</span>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isExpanded, isHovered, isMobileOpen, toggleSidebar, toggleMobileSidebar } =
    useSidebar();
  const pathname = usePathname();
  const router = useRouter();

  const [userDisplayName, setUserDisplayName] = useState('Admin');
  const [userRole, setUserRole] = useState('');
  const [userInitial, setUserInitial] = useState('A');
  const [userEmail, setUserEmail] = useState('');
  const [userFotoUrl, setUserFotoUrl] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pesantrenLogo, setPesantrenLogo] = useState<string>('');
  const [pesantrenName, setPesantrenName] = useState<string>('SIM Pesantren');
  const [pwaDismissed, setPwaDismissed] = useState(false);
  const { isInstallable, install } = usePWAInstall();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    async function loadPesantrenProfile() {
      try {
        const { data } = await supabase
          .from('pesantren_profile')
          .select('logo_url, nama_pesantren')
          .maybeSingle();
        if (data) {
          if (data.logo_url) setPesantrenLogo(data.logo_url);
          if (data.nama_pesantren) setPesantrenName(data.nama_pesantren);
        }
      } catch {
        // ignore
      }
    }
    loadPesantrenProfile();
  }, []);

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nama_lengkap, role, id_role, foto_url')
            .eq('id', user.id)
            .single();

          const name =
            profile?.nama_lengkap || user.email?.split('@')[0] || 'User';
          const roleDisplay = profile?.role || 'Admin';

          setUserDisplayName(name);
          setUserRole(roleDisplay);
          setUserInitial(name.charAt(0).toUpperCase());
          setUserEmail(user.email || '');
          setUserFotoUrl(profile?.foto_url || null);

          if (roleDisplay === 'Super Admin') {
            setLoadingPermissions(false);
          } else if (profile?.id_role) {
            const { data: perms } = await supabase
              .from('role_permissions')
              .select('*')
              .eq('id_role', profile.id_role);
            setPermissions(perms || []);
            setLoadingPermissions(false);
          } else {
            setLoadingPermissions(false);
          }
        } else {
          setLoadingPermissions(false);
        }
      } catch {
        setLoadingPermissions(false);
      }
    }
    loadUser();
  }, []);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      toast.success('Berhasil logout.');
      router.replace('/login');
      router.refresh();
    } catch {
      toast.error('Gagal logout. Coba lagi.');
    } finally {
      setLoggingOut(false);
    }
  }, [router]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/santri?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleToggle = () => {
    if (window.innerWidth >= 1280) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const isSuperAdmin = userRole === 'Super Admin';

  let hasAccess = true;
  const currentPath = pathname;

  const pathModuleMap: Record<string, string> = {
    '/ppdb': 'PPDB',
    '/santri': 'Santri',
    '/absen-santri': 'Santri',
    '/pegawai': 'Kepegawaian',
    '/absen-pegawai': 'Kepegawaian',
    '/keuangan': 'Keuangan',
    '/pembayaran': 'Keuangan',
    '/laporan': 'Keuangan',
    '/akademik': 'Akademik',
    '/lembaga': 'Lembaga',
    '/asrama': 'Asrama',
    '/tahfidz': 'Tahfidz',
    '/pengaturan': 'Pengaturan',
  };

  const requiredModule = Object.keys(pathModuleMap).find(
    (p) => currentPath === p || currentPath.startsWith(p + '/')
  )
    ? pathModuleMap[
        Object.keys(pathModuleMap).find(
          (p) => currentPath === p || currentPath.startsWith(p + '/')
        )!
      ]
    : null;

  if (
    currentPath.startsWith('/settings/users') ||
    currentPath.startsWith('/settings')
  ) {
    if (!isSuperAdmin) hasAccess = false;
  } else if (requiredModule && !isSuperAdmin) {
    const modPerm = permissions.find(
      (p) => p.feature.toLowerCase() === requiredModule.toLowerCase()
    );
    if (!modPerm || !modPerm.can_view) {
      hasAccess = false;
    }
  }

  // Dynamic class for main content margin based on TailAdmin sidebar state
  const mainContentMargin = isMobileOpen
    ? 'ml-0'
    : isExpanded || isHovered
    ? 'xl:ml-[290px]'
    : 'xl:ml-[90px]';

  return (
    <div className="min-h-screen xl:flex bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar and Mobile Backdrop */}
      <Sidebar
        userRoleRaw={userRole}
        permissions={permissions}
        pesantrenLogo={pesantrenLogo}
        pesantrenName={pesantrenName}
        userDisplayName={userDisplayName}
        userEmail={userEmail}
        userFotoUrl={userFotoUrl || undefined}
        userInitial={userInitial}
      />
      <Backdrop />

      {/* Main Content Area */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out',
          mainContentMargin
        )}
      >
        {/* TailAdmin Sticky AppHeader */}
        <header className="sticky top-0 z-40 flex w-full border-b border-gray-200 bg-white/95 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/95">
          <div className="flex grow items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              {/* Toggle Sidebar Button */}
              <button
                onClick={handleToggle}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Toggle Sidebar"
              >
                {isMobileOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>

              {/* Search Bar with ⌘ K */}
              <form
                onSubmit={handleSearchSubmit}
                className="relative hidden sm:block w-64 md:w-80 lg:w-96"
              >
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
                  <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari santri, kasir, modul... (Ctrl+K)"
                  className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50/50 py-2 ps-10 pe-14 text-xs text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none dark:border-gray-800 dark:bg-white/3 dark:text-white/90 dark:placeholder:text-gray-500 transition-colors"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 pointer-events-none">
                  <span>⌘</span>
                  <span>K</span>
                </div>
              </form>
            </div>

            {/* Header Center: Realtime Gregorian & Islamic Hijri Calendar */}
            <div className="hidden lg:flex items-center">
              <LiveClock />
            </div>

            {/* Header Right: Theme Toggle, Notifications, User Dropdown */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <ThemeToggleButton />
              <NotificationDropdown />
              <UserDropdown
                userDisplayName={userDisplayName}
                userRole={userRole}
                userEmail={userEmail}
                userFotoUrl={userFotoUrl}
                userInitial={userInitial}
                onLogout={handleLogout}
                loggingOut={loggingOut}
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {loadingPermissions ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-3 min-h-[60vh]">
              <Loader2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Memuat Hak Akses...
              </p>
            </div>
          ) : !hasAccess ? (
            <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center min-h-[60vh]">
              <div className="h-16 w-16 rounded-2xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/50 mb-4 shadow-sm">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                Akses Halaman Dibatasi
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed mb-6">
                Akun Anda ({userRole}) tidak memiliki izin untuk melihat modul
                ini. Silakan hubungi Super Admin jika membutuhkan akses.
              </p>
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all duration-200 active:scale-95 cursor-pointer"
              >
                Kembali ke Dashboard
              </button>
            </div>
          ) : (
            children
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 py-4 px-6 text-center mt-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <div className="inline-flex items-center gap-3 bg-gray-50 dark:bg-white/3 border border-gray-200 dark:border-gray-800 px-4 py-1.5 rounded-full shadow-theme-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-50 dark:ring-emerald-900/40" />
              <span className="text-gray-600 dark:text-gray-400 font-medium text-xs">
                &copy; {new Date().getFullYear()} SIM Pesantren
                <span className="text-gray-300 dark:text-gray-700 mx-1.5">|</span>
                TailAdmin Template Standard
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* PWA Install Notification Pill */}
      {isInstallable && !pwaDismissed && (
        <div
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white pl-3.5 pr-2 py-2 rounded-full shadow-lg shadow-emerald-600/25 text-xs font-semibold transition-all duration-200 group cursor-pointer"
          onClick={() => install()}
        >
          <Download className="h-4 w-4 shrink-0" />
          <span>Pasang Aplikasi SIM Pesantren</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPwaDismissed(true);
            }}
            className="p-1 hover:bg-white/20 rounded-full transition-colors ml-1"
            aria-label="Tutup Banner PWA"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default DashboardLayout;
