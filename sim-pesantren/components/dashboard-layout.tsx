'use client';

import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import { BottomBar } from './bottom-bar';
import { ThemeToggle } from './theme-toggle';
import { Menu, Bell } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

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
      case '/admin/santri':
        return 'Data Master Santri';
      case '/admin/tahfidz':
        return 'Tahfidz Tracker';
      case '/admin/akademik':
        return 'Data Akademik';
      case '/admin/pembayaran':
        return 'Manajemen Keuangan';
      case '/admin/pengaturan':
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
                U
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Ustadz Admin</p>
                <p className="text-[10px] text-slate-400 font-medium">Pengasuh Utama</p>
              </div>
            </div>

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
