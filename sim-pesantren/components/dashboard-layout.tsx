'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { BottomBar } from './bottom-bar';
import { ThemeToggle } from './ui/theme-toggle';
import { Menu, Bell, LogOut } from 'lucide-react';
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
  const [userInitial, setUserInitial] = useState('U');
  const [loggingOut, setLoggingOut] = useState(false);

  // Fetch current session user
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to get profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('nama_lengkap, role')
          .eq('id', user.id)
          .single();

        const name = profile?.nama_lengkap || user.email?.split('@')[0] || 'User';
        const role = profile?.role === 'admin' ? 'Super Admin'
                   : profile?.role === 'pengasuh' ? 'Pengasuh'
                   : 'Wali Santri';

        setUserDisplayName(name);
        setUserRole(role);
        setUserInitial(name.charAt(0).toUpperCase());
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-zinc-950 transition-colors duration-200">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
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
          {children}
        </main>

      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomBar />
    </div>
  );
}
