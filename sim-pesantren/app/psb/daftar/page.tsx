'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { daftarCalonSantri } from '@/services/ppdb-actions';
import Link from 'next/link';
import { Loader2, AlertCircle, CheckCircle2, UserPlus, GraduationCap, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';

export default function DaftarPage() {
  const [form, setForm] = useState({ nama_lengkap: '', email: '', no_hp: '', password: '', konfirmasi_password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.nama_lengkap || !form.email || !form.no_hp || !form.password) {
      setError('Semua field wajib diisi.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    if (form.password !== form.konfirmasi_password) {
      setError('Password tidak cocok.');
      return;
    }
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (authError || !authData.user) {
      setError(authError?.message || 'Gagal membuat akun.');
      setLoading(false);
      return;
    }

    const { error: insertError } = await daftarCalonSantri({
      authUserId: authData.user.id,
      nama_lengkap: form.nama_lengkap,
      email: form.email,
      no_hp: form.no_hp,
    });

    setLoading(false);
    if (insertError) setError(insertError.message);
    else setSuccess(true);
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-center shadow-inner mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Pendaftaran Berhasil!</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm">
            Akun Anda telah dibuat. Silakan cek email <strong className="text-slate-700 dark:text-zinc-300">{form.email}</strong> untuk verifikasi (jika diperlukan), lalu login untuk melengkapi data.
          </p>
          <Link href="/psb/login"
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 text-sm mt-4">
            Login Sekarang
          </Link>
        </div>
      </div>
    );
  }

  const inputClass = "w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none transition-all text-sm";
  const inputErrorClass = "w-full bg-slate-50 dark:bg-zinc-950 border border-rose-500 focus:border-rose-500 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none transition-all text-sm";

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <UserPlus className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Buat Akun PPDB</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">Isi data dasar untuk membuat akun pendaftaran</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6">
          {error && (
            <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-xl text-sm mb-6">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Nama Lengkap</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <GraduationCap className="h-4 w-4" />
                </span>
                <input type="text" value={form.nama_lengkap} onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
                  className={inputClass} placeholder="Nama lengkap calon santri" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass} placeholder="contoh@email.com" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">No. HP</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="h-4 w-4" />
                </span>
                <input type="tel" value={form.no_hp} onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
                  className={inputClass} placeholder="0812xxxxxxx" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputClass} placeholder="Minimal 6 karakter" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Konfirmasi Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input type={showPassword ? 'text' : 'password'} value={form.konfirmasi_password} onChange={(e) => setForm({ ...form, konfirmasi_password: e.target.value })}
                  className={form.password !== form.konfirmasi_password && form.konfirmasi_password ? inputErrorClass : inputClass} placeholder="Ulangi password" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-3 rounded-xl shadow-lg shadow-emerald-600/10 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {loading ? 'Memproses...' : 'Buat Akun'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800 text-center">
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Sudah punya akun?{' '}
              <Link href="/psb/login" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                Login di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
