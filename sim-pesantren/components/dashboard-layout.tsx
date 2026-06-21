'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Sidebar } from './sidebar';
import { BottomBar } from './bottom-bar';
import { ThemeToggle } from './ui/theme-toggle';
import { LogOut, ShieldAlert, Loader2, User, ChevronDown, Download, X, Menu } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function Clock() {
  const [dateTime, setDateTime] = useState({ date: '', time: '', hijri: '' });

  useEffect(() => {
    function update() {
      try {
        const now = new Date();
        const optionsDate: Intl.DateTimeFormatOptions = {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        };
        const date = now.toLocaleDateString('id-ID', optionsDate);
        const time = now.toLocaleTimeString('id-ID', {
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        });
        const hijri = now.toLocaleDateString('id-ID', {
          calendar: 'islamic-umalqura', day: 'numeric', month: 'long', year: 'numeric',
        });
        setDateTime({ date, time, hijri });
      } catch {
        // ignore
      }
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <i className="far fa-calendar-alt" />
      <span>{dateTime.date}</span>
      <span className="text-gray-300 dark:text-gray-600">|</span>
      <i className="far fa-clock" />
      <span>{dateTime.time}</span>
      <span className="text-gray-300 dark:text-gray-600 mx-1">•</span>
      <i className="far fa-moon text-emerald-500" />
      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{dateTime.hijri}</span>
    </>
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
  const [pesantrenLogo, setPesantrenLogo] = useState<string>('');
  const [pesantrenName, setPesantrenName] = useState<string>('SIM Pesantren');
  const [pwaDismissed, setPwaDismissed] = useState(false);
  const { isInstallable, install } = usePWAInstall();

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
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nama_lengkap, role, id_role, foto_url')
            .eq('id', user.id)
            .single();

          const name = profile?.nama_lengkap || user.email?.split('@')[0] || 'User';
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

  const isSuperAdmin = userRole === 'Super Admin';

  let hasAccess = true;
  const currentPath = pathname;

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

  const requiredModule = Object.keys(pathModuleMap).find(
    (p) => currentPath === p || currentPath.startsWith(p + '/')
  )
    ? pathModuleMap[Object.keys(pathModuleMap).find((p) => currentPath === p || currentPath.startsWith(p + '/'))!]
    : null;

  if (currentPath.startsWith('/settings/users') || currentPath.startsWith('/settings')) {
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

      <div className="layout-page">
        <header className="layout-header">
          <div className="header-left">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mobile-menu-button"
            >
              <i className="fas fa-bars text-xl" />
            </button>
          </div>

          <div className="header-center">
            <Clock />
          </div>

          <div className="header-right">
            <div className="mr-3">
              <ThemeToggle />
            </div>

            <div className="relative">
                <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-800/60 text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 dark:focus:ring-offset-gray-900 transition ease-in-out duration-150"
              >
                {userFotoUrl ? (
                  <img
                    src={userFotoUrl}
                    alt="Avatar"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold">{userInitial}</span>
                )}
              </button>

              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div
                    className="absolute top-full right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-[#1a1a2e] ring-1 ring-black ring-opacity-5 z-50 origin-top-right border border-gray-200 dark:border-gray-700"
                  >
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="font-medium text-base text-gray-800 dark:text-gray-200">
                        {userDisplayName}
                      </div>
                      <div className="font-medium text-sm text-gray-500 dark:text-gray-400">
                        {userEmail}
                      </div>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center block w-full px-4 py-2 text-start text-sm leading-5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition duration-150 ease-in-out"
                      >
                        <i className="far fa-user w-5 mr-2 text-gray-400 dark:text-gray-500" />
                        Profile
                      </Link>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 py-1">
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        disabled={loggingOut}
                        className="flex items-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 block w-full px-4 py-2 text-start text-sm leading-5 transition duration-150 ease-in-out disabled:opacity-50"
                      >
                        <i className="fas fa-sign-out-alt w-5 mr-2" />
                        Log Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="content-wrapper">
          <main className="content-main">
            {loadingPermissions ? (
              <div className="h-full w-full flex flex-col items-center justify-center gap-3 min-h-[60vh]">
                <Loader2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Memuat Hak Akses...</p>
              </div>
            ) : !hasAccess ? (
              <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center min-h-[60vh]">
                <div className="h-16 w-16 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/50 mb-4">
                  <ShieldAlert className="h-8 w-8" />
                </div>
                <h3 className="text-base font-extrabold text-gray-800 dark:text-gray-200 mb-2">Akses Halaman Ditolak</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed mb-6">
                  Maaf, akun Anda ({userRole}) tidak memiliki izin untuk melihat halaman ini.
                  Silakan hubungi Super Admin jika ini adalah sebuah kekeliruan.
                </p>
                <button
                  onClick={() => router.push('/admin')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all"
                >
                  Kembali ke Dashboard
                </button>
              </div>
            ) : (
              children
            )}
          </main>

          <footer className="content-footer border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f0f1a] py-4 px-6">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <div className="inline-flex items-center gap-3 bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-gray-700 px-5 py-2 rounded-full shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-300">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-50 dark:ring-emerald-900/40" />
                <span className="text-gray-600 dark:text-gray-400 font-medium text-xs">
                  &copy; 2025 &ndash; 2026 SIM Pesantren
                  <span className="text-gray-300 mx-1.5">|</span>
                  By{' '}
                  <strong className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
                    tanpaharta007
                  </strong>
                </span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {isInstallable && !pwaDismissed && (
        <div
          className="fixed bottom-20 lg:bottom-4 right-4 z-50 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white pl-3 pr-2 py-2 rounded-full shadow-lg shadow-emerald-600/20 dark:shadow-emerald-900/40 text-xs font-semibold transition-all duration-200 group cursor-pointer"
          onClick={() => install()}
        >
          <Download className="h-4 w-4 shrink-0" />
          <span className="leading-tight max-w-0 overflow-hidden group-hover:max-w-[60px] transition-all duration-200 whitespace-nowrap">
            Pasang
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

      <BottomBar
        userRoleRaw={userRole}
        permissions={permissions}
        onOpenSidebar={() => setSidebarOpen(true)}
      />
    </>
  );
}
