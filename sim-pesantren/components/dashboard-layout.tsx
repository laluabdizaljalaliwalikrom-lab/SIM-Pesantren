'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { BottomBar } from './bottom-bar';
import { ThemeToggle } from './ui/theme-toggle';
import { Menu, Bell, LogOut, ShieldAlert, Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

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
  const [userRoleRaw, setUserRoleRaw] = useState('');
  const [userInitial, setUserInitial] = useState('U');
  const [loggingOut, setLoggingOut] = useState(false);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [pesantrenLogo, setPesantrenLogo] = useState<string>('');
  const [pesantrenName, setPesantrenName] = useState<string>('SIM Pesantren');

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
            .select('nama_lengkap, role')
            .eq('id', user.id)
            .single();

          const name = profile?.nama_lengkap || user.email?.split('@')[0] || 'User';
          const rawRole = profile?.role || 'wali_santri';
          const roleDisplay = rawRole === 'admin' ? 'Super Admin'
                     : rawRole === 'pengasuh' ? 'Pengasuh'
                     : rawRole === 'wali_santri' ? 'Wali Santri'
                     : rawRole;

          setUserDisplayName(name);
          setUserRole(roleDisplay);
          setUserRoleRaw(rawRole);
          setUserInitial(name.charAt(0).toUpperCase());

          // Fetch permissions if not super admin
          if (rawRole === 'admin' || rawRole === 'Super Admin') {
            setLoadingPermissions(false);
          } else {
            // Find role in app_roles
            let nameMatch = 'Wali Santri';
            if (rawRole === 'pengasuh') nameMatch = 'Pengasuh';
            else if (rawRole === 'wali_santri') nameMatch = 'Wali Santri';
            else nameMatch = rawRole;

            const { data: roleData } = await supabase
              .from('app_roles')
              .select('id')
              .eq('name', nameMatch)
              .single();

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
      case '/settings/users':
        return 'Hak Akses & Pengguna';
      case '/pengaturan':
        return 'Pengaturan Sistem';
      default:
        return 'SIM Pesantren';
    }
  };

  // Check access based on active role and path permissions
  const isSuperAdmin = userRoleRaw === 'admin' || userRoleRaw === 'Super Admin';
  
  let hasAccess = true;
  const currentPath = pathname;
  
  const pathModuleMap: Record<string, string> = {
    '/santri': 'Santri',
    '/pegawai': 'Kepegawaian',
    '/keuangan': 'Keuangan',
    '/pembayaran': 'Keuangan',
    '/akademik': 'Akademik',
    '/lembaga': 'Lembaga',
    '/asrama': 'Asrama',
    '/tahfidz': 'Tahfidz',
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
        userRoleRaw={userRoleRaw}
        permissions={permissions}
        pesantrenLogo={pesantrenLogo}
        pesantrenName={pesantrenName}
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

            {/* User Profile Info */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white font-extrabold text-sm shadow-md shadow-emerald-500/10 uppercase">
                {userInitial}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{userDisplayName}</p>
                <p className="text-[10px] text-slate-400 font-medium">{userRole}</p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Logout"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-200 dark:hover:border-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400 text-slate-400 dark:text-zinc-500 transition-colors disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
            </button>

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

      {/* Mobile Bottom Navigation Bar */}
      <BottomBar userRoleRaw={userRoleRaw} permissions={permissions} />
    </div>
  );
}
