'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  BookOpen,
  Users,
  GraduationCap,
  X,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 30;

// ─── Landing statistics for left panel ────────────────────────────────────
const STATS = [
  { icon: Users, label: 'Santri Aktif', value: '500+' },
  { icon: BookOpen, label: 'Program Tahfidz', value: '30 Juz' },
  { icon: GraduationCap, label: 'Alumni', value: '2,000+' },
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  // ── Form state ──
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Brute-force protection ──
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutCountdown, setLockoutCountdown] = useState(0);

  // ── Animation state ──
  const [mounted, setMounted] = useState(false);

  // ── Error state ──
  const [errorMessage, setErrorMessage] = useState('');
  
  // ── Pesantren branding state ──
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [pesantrenName, setPesantrenName] = useState<string>('SIM Pesantren');

  const emailRef = useRef<HTMLInputElement>(null);

  // Mount animation & load brand
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    emailRef.current?.focus();
    
    async function loadBrand() {
      try {
        const res = await fetch('/api/pesantren-profile');
        if (res.ok) {
          const data = await res.json();
          if (data.logo_url) setLogoUrl(data.logo_url);
          if (data.nama_pesantren) setPesantrenName(data.nama_pesantren);
        }
      } catch (err) {
        console.error('Error loading brand info:', err);
      }
    }
    loadBrand();

    return () => clearTimeout(t);
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockoutUntil) return;

    const tick = () => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutUntil(null);
        setLockoutCountdown(0);
        setFailedAttempts(0);
      } else {
        setLockoutCountdown(remaining);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const isLockedOut = lockoutUntil !== null && lockoutUntil > Date.now();

  // ── Login handler ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (isLockedOut) return;

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Email dan password wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);

        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_SECONDS * 1000;
          setLockoutUntil(until);
          setErrorMessage(
            `Terlalu banyak percobaan gagal. Silakan tunggu ${LOCKOUT_SECONDS} detik.`
          );
          toast.error('Akun dikunci sementara', {
            description: `Coba lagi dalam ${LOCKOUT_SECONDS} detik.`,
          });
          return;
        }

        if (error.message.includes('Invalid login credentials')) {
          setErrorMessage(
            `Email atau password salah. (Percobaan ${newAttempts}/${MAX_FAILED_ATTEMPTS})`
          );
        } else if (error.message.includes('Email not confirmed')) {
          setErrorMessage('Email belum dikonfirmasi. Periksa inbox Anda.');
        } else {
          setErrorMessage(error.message);
        }
        return;
      }

      if (data.user) {
        setFailedAttempts(0);
        toast.success('Login berhasil!', {
          description: 'Mengalihkan ke dashboard...',
        });
        router.replace(redirectTo);
        router.refresh();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage('Terjadi kesalahan sistem. Coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-zinc-950 transition-colors">

      {/* ═══════════════════════════════════════════════════════════════
          LEFT PANEL — Illustration (Desktop only)
          ═══════════════════════════════════════════════════════════════ */}
      <div
        className={`hidden lg:flex lg:w-[55%] xl:w-[60%] relative overflow-hidden transition-all duration-1000 ease-out ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Background image */}
        <img
          src="/pesantren-bg.png"
          alt="Kegiatan Pesantren"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Emerald gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/80 via-emerald-800/70 to-teal-900/80" />

        {/* Animated subtle pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">

          {/* Top: Brand */}
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-11 w-11 rounded-xl object-cover border border-white/10 shadow" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm border border-white/10 text-white font-extrabold text-lg">
                P
              </div>
            )}
            <div>
              <span className="font-extrabold text-lg tracking-wide">{pesantrenName || "SIM Pesantren"}</span>
              <p className="text-[10px] text-emerald-200/60 font-medium tracking-wider uppercase">
                Sistem Informasi Manajemen
              </p>
            </div>
          </div>

          {/* Middle: Hero text */}
          <div
            className={`space-y-6 max-w-lg transition-all duration-1000 delay-300 ease-out ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <h2 className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight">
              Mendidik Generasi
              <br />
              <span className="text-emerald-300">Berilmu & Berakhlak</span>
            </h2>
            <p className="text-emerald-100/70 text-base leading-relaxed max-w-md">
              Platform terpadu untuk mengelola data santri, akademik, keuangan,
              tahfidz, dan seluruh operasional pesantren.
            </p>

            {/* Statistics */}
            <div className="flex gap-8 pt-4">
              {STATS.map((s) => (
                <div key={s.label} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <s.icon className="h-4 w-4 text-emerald-400" />
                    <span className="text-2xl font-extrabold">{s.value}</span>
                  </div>
                  <p className="text-[11px] text-emerald-200/50 font-medium uppercase tracking-wider">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: Testimonial quote */}
          <div
            className={`transition-all duration-1000 delay-500 ease-out ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <blockquote className="border-l-2 border-emerald-400/30 pl-4 space-y-2 max-w-md">
              <p className="text-sm text-emerald-100/60 italic leading-relaxed">
                &ldquo;Dengan SIM Pesantren, pengelolaan 500+ santri menjadi jauh lebih
                terstruktur dan transparan.&rdquo;
              </p>
              <cite className="text-[11px] text-emerald-200/40 not-italic font-semibold">
                — KH. Muhammad Fauzan, Pengasuh Pesantren
              </cite>
            </blockquote>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          RIGHT PANEL — Login Form
          ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* Top bar (mobile brand + theme toggle) */}
        <header className="flex items-center justify-between px-6 sm:px-8 h-16 lg:h-20">
          {/* Mobile logo & Back to Home */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-450 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Kembali ke Beranda</span>
              <span className="sm:hidden">Beranda</span>
            </Link>
            
            {/* Mobile logo (hidden on desktop) */}
            <div className="flex items-center gap-2 lg:hidden border-l border-slate-200 dark:border-zinc-800 pl-4">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="h-7 w-7 rounded-lg object-cover shadow-sm" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white font-extrabold text-xs shadow-sm shadow-emerald-500/25">
                  P
                </div>
              )}
              <span className="font-extrabold text-xs bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent truncate max-w-[120px]">
                {pesantrenName || "SIM Pesantren"}
              </span>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {/* Form — vertically centered */}
        <main
          className={`flex-1 flex items-center justify-center px-6 sm:px-8 pb-12 transition-all duration-700 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="w-full max-w-[420px] space-y-8">

            {/* Hero text */}
            <div className="space-y-2">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="h-14 w-14 rounded-2xl object-cover shadow-lg mb-3 animate-fadeIn" />
              ) : (
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 mb-3">
                  <GraduationCap className="h-7 w-7" />
                </div>
              )}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Selamat Datang Kembali
              </h1>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                Masuk ke dashboard untuk mengelola data pesantren Anda.
              </p>
            </div>

            {/* ── Error Banner ── */}
            {errorMessage && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/[0.06] border border-rose-200 dark:border-rose-500/15 animate-[shake_0.35s_ease-in-out]">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-rose-700 dark:text-rose-400">
                    Gagal Masuk
                  </p>
                  <p className="text-[11px] text-rose-600/80 dark:text-rose-300/70 mt-0.5">
                    {errorMessage}
                  </p>
                </div>
                <button
                  onClick={() => setErrorMessage('')}
                  className="text-rose-400 hover:text-rose-600 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* ── Card ── */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-zinc-950/50 overflow-hidden">

              <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-5">

                {/* Email */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-email"
                    className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest"
                  >
                    Alamat Email
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                      ref={emailRef}
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="nama@pesantren.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading || isLockedOut}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest"
                  >
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading || isLockedOut}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-10 pr-12 py-3 text-sm text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 accent-emerald-600 cursor-pointer"
                    />
                    <span className="text-xs text-slate-500 dark:text-zinc-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200 transition-colors">
                      Ingat saya
                    </span>
                  </label>
                </div>

                {/* ── Lockout countdown ── */}
                {isLockedOut && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/[0.06] border border-amber-200 dark:border-amber-500/15 text-[11px] text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>
                      Terlalu banyak percobaan gagal. Coba lagi dalam{' '}
                      <strong className="font-black tabular-nums">{lockoutCountdown}</strong> detik.
                    </span>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || isLockedOut}
                  className="w-full flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : isLockedOut ? (
                    <>
                      <Lock className="h-4 w-4" />
                      Dikunci ({lockoutCountdown}s)
                    </>
                  ) : (
                    <>
                      Masuk ke Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Security badge */}
              <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-500/[0.04] border border-emerald-100 dark:border-emerald-500/10 text-[11px] text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                  <span>Sesi terenkripsi end-to-end via Supabase Auth.</span>
                </div>
              </div>
            </div>

            {/* Bottom note */}
            <p className="text-center text-xs text-slate-400 dark:text-zinc-600">
              Belum punya akun?{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Hubungi administrator pesantren
              </span>
              .
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 sm:px-8 py-4 text-center">
          <p className="text-[10px] text-slate-400 dark:text-zinc-700">
            © {new Date().getFullYear()} SIM Pesantren — Hak Cipta Dilindungi
          </p>
        </footer>
      </div>

      {/* ── Keyframe animations injected via style tag ── */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(5px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
        }
      `}</style>
    </div>
  );
}

// ── Page wrapper with Suspense boundary (required by Next.js for useSearchParams) ──
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500 animate-pulse" />
            <p className="text-xs text-slate-400 dark:text-zinc-600">Memuat...</p>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
