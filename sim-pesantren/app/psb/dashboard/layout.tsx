'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getMyProfil } from '@/services/ppdb-actions';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  LayoutDashboard,
  UserCircle,
  Wallet,
  CreditCard,
  Megaphone,
  LogOut,
  GraduationCap,
  Menu,
  X,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

const navItems = [
  { href: '/psb/dashboard', label: 'Beranda', icon: LayoutDashboard },
  { href: '/psb/dashboard/profil', label: 'Profil & Berkas', icon: UserCircle },
  { href: '/psb/dashboard/biaya', label: 'Rincian Biaya', icon: Wallet },
  { href: '/psb/dashboard/pembayaran', label: 'Pembayaran', icon: CreditCard },
  { href: '/psb/dashboard/pengumuman', label: 'Pengumuman', icon: Megaphone },
];

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

export default function PpdbDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const [userDisplayName, setUserDisplayName] = useState('Calon Santri');
  const [userEmail, setUserEmail] = useState('');
  const [userInitial, setUserInitial] = useState('C');
  const [pesantrenLogo, setPesantrenLogo] = useState('');
  const [pesantrenName, setPesantrenName] = useState('SIM Pesantren');

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
      } catch {}
    }
    loadPesantrenProfile();
  }, []);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data } = await getMyProfil();
        if (data) {
          setUserDisplayName(data.nama_lengkap || 'Calon Santri');
          setUserEmail(data.email || '');
          setUserInitial((data.nama_lengkap || 'C').charAt(0).toUpperCase());
        }
      } catch {}
    }
    loadUser();
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/psb/login');
    router.refresh();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div className="layout-overlay show" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`layout-sidebar custom-scrollbar ${
          sidebarOpen ? 'toggled-mobile' : ''
        }`}
        data-hover={isHovered ? 'true' : 'false'}
      >
        <div className="flex flex-col h-full w-full">
          {/* Logo */}
          <div className="logo-container">
            <Link
              href="/psb/dashboard"
              onClick={() => setSidebarOpen(false)}
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
            <div className="sidebar-heading">Menu Santri</div>
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`sidebar-item group ${active ? 'active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer / User */}
          <div className="sidebar-footer p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a2e]">
            <Link
              href="/psb/dashboard/profil"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-1 transition-all duration-200 hover:opacity-85"
              title="Profil Saya"
            >
              <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold uppercase text-sm">
                {userInitial}
              </div>
              <div className="sidebar-footer-text overflow-hidden min-w-0">
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {userDisplayName}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate">
                  {userEmail}
                </p>
              </div>
              <ChevronRight className="sidebar-footer-text h-3.5 w-3.5 text-gray-300 dark:text-gray-600 ml-auto shrink-0" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Page Wrapper */}
      <div className="layout-page">
        <header className="layout-header">
          <div className="header-left">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mobile-menu-button"
              style={{ display: 'block' }} // Force block for mobile view
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="md:hidden flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800 dark:text-white">Dashboard Santri</span>
            </div>
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
                <span className="text-sm font-semibold">{userInitial}</span>
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
                      <div className="font-medium text-base text-gray-800 dark:text-gray-200 truncate">
                        {userDisplayName}
                      </div>
                      <div className="font-medium text-sm text-gray-500 dark:text-gray-400 truncate">
                        {userEmail}
                      </div>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/psb/dashboard/profil"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center block w-full px-4 py-2 text-start text-sm leading-5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition duration-150 ease-in-out"
                      >
                        <UserCircle className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                        Profil Saya
                      </Link>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 py-1">
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 block w-full px-4 py-2 text-start text-sm leading-5 transition duration-150 ease-in-out"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
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
            {children}
          </main>

          <footer className="content-footer border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f0f1a] py-4 px-6">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <div className="inline-flex items-center gap-3 bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-gray-700 px-5 py-2 rounded-full shadow-sm hover:shadow-md transition-all duration-300">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-50 dark:ring-emerald-900/40" />
                <span className="text-gray-600 dark:text-gray-400 font-medium text-xs">
                  &copy; 2025 &ndash; 2026 SIM Pesantren
                  <span className="text-gray-300 mx-1.5">|</span>
                  PPDB Online
                </span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Bottom Bar Mobile */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex lg:hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-slate-200/80 dark:border-zinc-800/80 px-2 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
        aria-label="Bottom navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center justify-center py-2.5 gap-1 rounded-xl mx-0.5 my-1.5 text-[10px] font-bold tracking-wide transition-all duration-200 active:scale-95 select-none ${
                active
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
              }`}
            >
              {active && (
                <span className="absolute inset-0 rounded-xl bg-emerald-50 dark:bg-emerald-500/10" />
              )}
              <span className="relative flex items-center justify-center">
                <Icon className={`h-5 w-5 transition-all duration-200 ${active ? 'scale-110' : 'scale-100'}`} strokeWidth={active ? 2.5 : 2} />
                {active && (
                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                )}
              </span>
              <span className="relative truncate max-w-[64px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="h-16 lg:hidden" />
    </div>
  );
}
