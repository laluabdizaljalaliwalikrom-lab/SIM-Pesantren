'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from './sidebar';
import { BottomBar } from './bottom-bar';
import { ThemeToggle } from './ui/theme-toggle';
import { Menu, Bell, LogOut, ShieldAlert, Loader2, User, ChevronDown, Download, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Logged-in user state
  const [userDisplayName, setUserDisplayName] = useState('User');
  const [userRole, setUserRole] = useState('');
  const [userRoleId, setUserRoleId] = useState<string | null>(null);
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

  // Fetch pesantren profile
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
      } catch (err) {
        console.error('Error loading pesantren profile:', err);
      }
    }
    loadPesantrenProfile();
  }, []);

  // Fetch current session user
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Try to get profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('nama_lengkap, role, id_role, foto_url')
            .eq('id', user.id)
            .single();

          const name = profile?.nama_lengkap || user.email?.split('@')[0] || 'User';
          const roleDisplay = profile?.role || 'Wali Santri';

          setUserDisplayName(name);
          setUserRole(roleDisplay);
          setUserRoleId(profile?.id_role || null);
          setUserInitial(name.charAt(0).toUpperCase());
          setUserEmail(user.email || '');
          setUserFotoUrl(profile?.foto_url || null);

          // Fetch permissions if not super admin
          const isSuperAdmin = roleDisplay === 'Super Admin';
          if (isSuperAdmin) {
            setLoadingPermissions(false);
          } else if (profile?.id_role) {
            const { data: permData } = await supabase
              .from('role_permissions')
              .select('*')
              .eq('id_role', profile.id_role);

            if (roleData) {
              const { data: perms } = await supabase
                .from('role_permissions')
                .select('*')
                .eq('id_role', roleData.id);
              setPermissions(perms || []);
            }
            setLoadingPermissions(false);
          }
        } else {
          setLoadingPermissions(false);
        }
      } catch (err) {
        console.error('Error loading user permissions:', err);
        setLoadingPermissions(false);
      }
    }
    loadUser();
  }, []);

  // Logout handler
  const handleLogout = async () => {
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
  };

  // Determine page title based on path
  const getPageTitle = () => {
    switch (pathname) {
      case '/admin':
        return 'Dashboard Utama';
      case '/lembaga':
        return 'Sekolah & Kelas';
      case '/asrama':
        return 'Manajemen Asrama';
      case '/pegawai':
        return 'Data Kepegawaian';
      case '/santri':
        return 'Data Master Santri';
      case '/tahfidz':
        return 'Tahfidz Tracker';
      case '/akademik':
        return 'Data Akademik';
      case '/pembayaran':
        return 'Kasir Pembayaran';
      case '/keuangan':
        return 'Atur Keuangan';
      case '/laporan':
        return 'Laporan Keuangan';
      case '/settings/users':
        return 'Hak Akses & Pengguna';
      case '/pengaturan':
        return 'Pengaturan Sistem';
      case '/profile':
        return 'Profil Saya';
      default:
        return 'SIM Pesantren';
    }
  };

  // Check access based on active role and path permissions
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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-zinc-950 transition-colors duration-200">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        userRoleRaw={userRole}
        permissions={permissions}
        pesantrenLogo={pesantrenLogo}
        pesantrenName={pesantrenName}
        userDisplayName={userDisplayName}
        userEmail={userEmail}
        userFotoUrl={userFotoUrl || undefined}
        userInitial={userInitial}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* Topbar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 shadow-sm z-30 transition-colors duration-200">
          
          {/* Left Side: Mobile Menu Trigger & Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 lg:hidden transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 hidden sm:block">
              {getPageTitle()}
            </h2>
          </div>

          {/* Right Side: Actions */}
          <div className="flex items-center gap-4">
            {/* Notification Icon */}
            <button className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
            </button>

            {/* Dark/Light Mode Toggle */}
            <ThemeToggle />

            <div className="h-6 w-px bg-slate-200 dark:bg-zinc-800" />

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800/50 p-1.5 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-850 transition-all duration-200"
              >
                {userFotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={userFotoUrl}
                    alt="Avatar"
                    className="h-9 w-9 rounded-lg object-cover shadow-sm border border-emerald-500/25"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white font-extrabold text-sm shadow-md shadow-emerald-500/10 uppercase">
                    {userInitial}
                  </div>
                )}
                <div className="hidden md:block text-left mr-1">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[120px]">{userDisplayName}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{userRole}</p>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-450 transition-transform duration-200 hidden md:block ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileDropdownOpen && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-3 duration-150">
                    <Link
                      href="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-zinc-350 hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      <User className="h-4 w-4 text-emerald-500" />
                      Profil Saya
                    </Link>
                    <div className="h-px bg-slate-100 dark:bg-zinc-800 my-1" />
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      disabled={loggingOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/5 transition-colors disabled:opacity-50 text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Keluar (Logout)
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>

        </header>

        {/* Dynamic Page Router Children */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-zinc-950 transition-colors duration-200 pb-20 lg:pb-0">
          {loadingPermissions ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Memuat Hak Akses...</p>
            </div>
          ) : !hasAccess ? (
            <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-950/50 mb-4 shadow-lg shadow-rose-600/5 animate-pulse">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-zinc-100 mb-2">Akses Halaman Ditolak</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm leading-relaxed mb-6">
                Maaf, akun Anda ({userRole}) tidak memiliki izin (hak akses) untuk melihat halaman ini. Silakan hubungi Super Admin jika ini adalah sebuah kekeliruan.
              </p>
              <button
                onClick={() => router.push('/admin')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/10 active:scale-95 transition-all"
              >
                Kembali ke Dashboard
              </button>
            </div>
          ) : (
            children
          )}
        </main>

      </div>

      {/* PWA Install Button */}
      {isInstallable && !pwaDismissed && (
        <div className="fixed bottom-20 lg:bottom-4 right-4 z-50 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white pl-3 pr-2 py-2 rounded-full shadow-lg shadow-emerald-600/20 text-xs font-semibold transition-all duration-200 group cursor-pointer"
          onClick={() => install()}
        >
          <Download className="h-4 w-4 shrink-0" />
          <span className="leading-tight max-w-0 overflow-hidden group-hover:max-w-[60px] transition-all duration-200 whitespace-nowrap">Pasang</span>
          <span
            onClick={(e) => { e.stopPropagation(); setPwaDismissed(true); }}
            className="flex items-center justify-center h-5 w-5 rounded-full hover:bg-white/20 transition-colors shrink-0 ml-0.5"
          >
            <X className="h-3 w-3" />
          </span>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
          <BottomBar userRoleRaw={userRole} permissions={permissions} onOpenSidebar={() => setSidebarOpen(true)} />
    </div>
  );
}
