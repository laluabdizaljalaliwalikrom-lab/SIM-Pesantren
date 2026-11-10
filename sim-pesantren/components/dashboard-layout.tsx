'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Sidebar } from './sidebar';
import { BottomBar } from './bottom-bar';
import { ThemeToggle } from './ui/theme-toggle';
import {
  LogOut,
  ShieldAlert,
  Loader2,
  User,
  ChevronDown,
  Download,
  X,
  Menu,
  Search,
  Bell,
  Sparkles,
  ExternalLink,
  Settings,
  Calendar,
  Clock as ClockIcon,
  Moon,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { usePWAInstall } from '@/hooks/usePWAInstall';

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
    <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-300">
      <div className="flex items-center gap-1.5 font-medium">
        <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
        <span>{dateTime.date}</span>
      </div>
      <span className="text-slate-300 dark:text-zinc-700">|</span>
      <div className="flex items-center gap-1.5 font-mono font-medium">
        <ClockIcon className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
        <span>{dateTime.time}</span>
      </div>
      <span className="text-slate-300 dark:text-zinc-700">•</span>
      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
        <Moon className="h-3 w-3" />
        <span>{dateTime.hijri}</span>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const [userDisplayName, setUserDisplayName] = useState('User');
  const [userRole, setUserRole] = useState('');
  const [userInitial, setUserInitial] = useState('U');
  const [userEmail, setUserEmail] = useState('');
  const [userFotoUrl, setUserFotoUrl] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
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
          const roleDisplay = profile?.role || 'Wali Santri';

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

  return (
    <>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={true}
        onToggleCollapse={() => {}}
        userRoleRaw={userRole}
        permissions={permissions}
        pesantrenLogo={pesantrenLogo}
        pesantrenName={pesantrenName}
        userDisplayName={userDisplayName}
        userEmail={userEmail}
        userFotoUrl={userFotoUrl || undefined}
        userInitial={userInitial}
      />

      <div className="layout-page flex flex-col min-h-screen bg-slate-50 dark:bg-zinc-950">
        {/* TailAdmin Style Header */}
        <header className="sticky top-0 z-30 h-18 w-full border-b border-slate-200/90 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Header Left */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mobile-menu-button lg:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 active:scale-95 transition-all"
              aria-label="Toggle Sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* TailAdmin Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative hidden sm:block w-64 md:w-80 lg:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari data santri, kasir, atau modul... (Ctrl+K)"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </form>
          </div>

          {/* Header Center: Realtime Gregorian & Islamic Hijri Calendar */}
          <div className="hidden lg:flex items-center">
            <LiveClock />
          </div>

          {/* Header Right: Actions, Theme, and Profile Dropdown */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Dark Mode Toggle */}
            <ThemeToggle />

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-800 hover:bg-slate-100/70 dark:hover:bg-zinc-800/60 transition-all duration-200 cursor-pointer"
                aria-expanded={profileDropdownOpen}
              >
                {userFotoUrl ? (
                  <img
                    src={userFotoUrl}
                    alt="Avatar"
                    className="w-8.5 h-8.5 rounded-xl object-cover ring-2 ring-emerald-500/20"
                  />
                ) : (
                  <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {userInitial}
                  </div>
                )}
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 leading-tight">
                    {userDisplayName}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {userRole || 'Admin'}
                  </span>
                </div>
                <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
              </button>

              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 w-56 rounded-2xl shadow-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800">
                      <p className="font-bold text-sm text-slate-900 dark:text-zinc-100 truncate">
                        {userDisplayName}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 truncate mt-0.5">
                        {userEmail || userRole}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/70 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        <User className="h-4 w-4 text-slate-400 dark:text-zinc-500" />
                        Profil Pengguna
                      </Link>

                      {isSuperAdmin && (
                        <Link
                          href="/pengaturan"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/70 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        >
                          <Settings className="h-4 w-4 text-slate-400 dark:text-zinc-500" />
                          Pengaturan Lembaga
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-slate-100 dark:border-zinc-800 pt-1">
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        disabled={loggingOut}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-start text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-50"
                      >
                        <LogOut className="h-4 w-4" />
                        {loggingOut ? 'Memproses Keluar...' : 'Keluar (Logout)'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="content-wrapper flex-1 flex flex-col w-full">
          <main className="content-main flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8">
            {loadingPermissions ? (
              <div className="h-full w-full flex flex-col items-center justify-center gap-3 min-h-[60vh]">
                <Loader2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
                <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
                  Memuat Hak Akses...
                </p>
              </div>
            ) : !hasAccess ? (
              <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center min-h-[60vh]">
                <div className="h-16 w-16 rounded-2xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/50 mb-4 shadow-sm">
                  <ShieldAlert className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-2">
                  Akses Halaman Dibatasi
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm leading-relaxed mb-6">
                  Akun Anda ({userRole}) tidak memiliki izin untuk melihat modul
                  ini. Silakan hubungi Super Admin jika membutuhkan akses.
                </p>
                <button
                  onClick={() => router.push('/admin')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all duration-200 active:scale-95"
                >
                  Kembali ke Dashboard
                </button>
              </div>
            ) : (
              children
            )}
          </main>

          {/* Footer */}
          <footer className="content-footer border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-4 px-6 text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <div className="inline-flex items-center gap-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-5 py-2 rounded-full shadow-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-50 dark:ring-emerald-900/40" />
                <span className="text-slate-600 dark:text-zinc-400 font-medium text-xs">
                  &copy; {new Date().getFullYear()} SIM Pesantren
                  <span className="text-slate-300 dark:text-zinc-700 mx-1.5">|</span>
                  Sistem Informasi Manajemen Terpadu
                </span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* PWA Install Notification Pill */}
      {isInstallable && !pwaDismissed && (
        <div
          className="fixed bottom-20 lg:bottom-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white pl-3.5 pr-2 py-2 rounded-full shadow-lg shadow-emerald-600/25 text-xs font-semibold transition-all duration-200 group cursor-pointer"
          onClick={() => install()}
        >
          <Download className="h-4 w-4 shrink-0" />
          <span className="leading-tight max-w-0 overflow-hidden group-hover:max-w-[70px] transition-all duration-200 whitespace-nowrap">
            Pasang PWA
          </span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              setPwaDismissed(true);
            }}
            className="flex items-center justify-center h-5 w-5 rounded-full hover:bg-white/20 transition-colors shrink-0 ml-0.5"
          >
            <X className="h-3 w-3" />
          </span>
        </div>
      )}

      {/* Bottom bar for mobile */}
      <BottomBar
        userRoleRaw={userRole}
        permissions={permissions}
        onOpenSidebar={() => setSidebarOpen(true)}
      />
    </>
  );
}

export default DashboardLayout;
