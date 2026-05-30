'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error('Email dan password wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email atau password salah.');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Email belum dikonfirmasi. Cek inbox Anda.');
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        toast.success('Login berhasil! Mengalihkan...');
        router.replace(redirectTo);
        router.refresh();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error('Terjadi kesalahan sistem. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 transition-colors">

      {/* Top bar */}
      <header className="w-full max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white font-extrabold text-lg shadow-md shadow-emerald-500/25">
            P
          </div>
          <span className="font-extrabold text-base tracking-wide bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-200 bg-clip-text text-transparent">
            SIM Pesantren
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main — vertically centered */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">

          {/* Hero text */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 mx-auto mb-2">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Masuk ke Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-xs mx-auto">
              Gunakan akun admin Anda untuk mengelola data pesantren.
            </p>
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-zinc-950/50 overflow-hidden">

            <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-5">

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="nama@pesantren.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-10 pr-12 py-3 text-sm text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="px-6 sm:px-8 pb-6 sm:pb-8">
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-500/[0.04] border border-emerald-100 dark:border-emerald-500/10 text-[11px] text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                <span>Sesi dilindungi enkripsi end-to-end via Supabase Auth.</span>
              </div>
            </div>
          </div>

          {/* Bottom link */}
          <p className="text-center text-xs text-slate-400 dark:text-zinc-600">
            Belum punya akun? Hubungi administrator pesantren.
          </p>

        </div>
      </main>
    </div>
  );
}
