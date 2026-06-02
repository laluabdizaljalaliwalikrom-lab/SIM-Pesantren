'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  User,
  Phone,
  Mail,
  Lock,
  Save,
  Loader2,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
import { uploadFotoUser } from '@/services/storage-actions';

export default function ProfilePage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState<boolean>(false);

  const [form, setForm] = useState({
    nama_lengkap: '',
    no_hp: '',
    email: '',
    password: '',
    confirmPassword: '',
    foto_url: ''
  });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || '');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      }

      setForm({
        nama_lengkap: profile?.nama_lengkap || '',
        no_hp: profile?.no_hp || '',
        email: user.email || '',
        password: '',
        confirmPassword: '',
        foto_url: profile?.foto_url || ''
      });

      setUserRole(profile?.role || 'Pengguna');
    } catch (err: any) {
      console.error('Error loading profile:', err);
      toast.error('Gagal mengambil data profil Anda.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (form.password && form.password !== form.confirmPassword) {
      toast.error('Konfirmasi kata sandi tidak cocok!');
      return;
    }

    if (form.password && form.password.length < 6) {
      toast.error('Kata sandi minimal harus 6 karakter!');
      return;
    }

    setSaving(true);
    try {
      let uploadedFotoUrl = form.foto_url;

      // 1. Upload profile photo if file is selected
      if (fotoFile) {
        setUploadingFoto(true);
        try {
          const extension = fotoFile.name.split('.').pop() || 'jpg';
          const uniqueFileName = `avatar_${Date.now()}.${extension}`;
          uploadedFotoUrl = await uploadFotoUser(fotoFile, userId, uniqueFileName);
        } catch (uploadErr: any) {
          console.error('Gagal mengunggah foto profil:', uploadErr);
          toast.error('Gagal mengunggah foto profil: ' + uploadErr.message);
          setUploadingFoto(false);
          setSaving(false);
          return;
        }
        setUploadingFoto(false);
      }

      // 2. Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nama_lengkap: form.nama_lengkap,
          no_hp: form.no_hp,
          foto_url: uploadedFotoUrl
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // 3. Update Email & Password in Auth if changed
      const authUpdates: any = {};
      let isAuthUpdated = false;

      if (form.email !== userEmail) {
        authUpdates.email = form.email;
        isAuthUpdated = true;
      }

      if (form.password) {
        authUpdates.password = form.password;
        isAuthUpdated = true;
      }

      if (isAuthUpdated) {
        const { error: authError } = await supabase.auth.updateUser(authUpdates);
        if (authError) {
          throw new Error('Profil berhasil disimpan, namun gagal memperbarui kredensial login: ' + authError.message);
        }
        if (authUpdates.email) {
          toast.success('Permintaan perubahan email berhasil dikirim. Silakan periksa kotak masuk email lama & baru Anda.');
        } else {
          toast.success('Kata sandi berhasil diperbarui!');
        }
      }

      toast.success('Profil berhasil disimpan!');
      setFotoFile(null);
      
      // Update local state email representation
      if (form.email !== userEmail && !authUpdates.email) {
        setUserEmail(form.email);
      }

      // Refresh window/state to propagate changes to sidebar & header
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] w-full flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Memuat profil Anda...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      
      {/* Welcome & Info Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-500 p-6 md:p-8 text-white shadow-xl shadow-emerald-600/10">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 h-36 w-36 rounded-full bg-white/10 blur-xl" />
        <div className="absolute bottom-0 left-0 -mb-6 -ml-6 h-32 w-32 rounded-full bg-white/5 blur-lg" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Pengaturan Profil</h1>
            <p className="text-xs md:text-sm text-emerald-50/90 mt-1 max-w-lg leading-relaxed">
              Kelola informasi pribadi, kontak, alamat email, serta kata sandi akun Anda di sini.
            </p>
          </div>
          <div className="inline-flex items-center self-start sm:self-auto gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            <span className="text-xs font-bold uppercase tracking-wider">{userRole}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Avatar Upload */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 flex flex-col items-center justify-center space-y-4 shadow-sm transition-colors duration-200">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 text-center w-full pb-2 border-b border-slate-100 dark:border-zinc-800">
            Foto Profil
          </h3>
          <div className="py-4">
            <ImageUpload
              value={fotoFile || form.foto_url}
              onChange={(file) => setFotoFile(file)}
              loading={uploadingFoto}
              shape="circle"
              label=""
            />
          </div>
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 text-center leading-relaxed max-w-[180px]">
            Gunakan format PNG, JPG, atau JPEG. File otomatis dikompresi ke maksimal 500KB.
          </p>
        </div>

        {/* Right Column: Fields */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Biodata */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-sm transition-colors duration-200">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 pb-2 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-500" />
              Biodata Pribadi
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    name="nama_lengkap"
                    required
                    value={form.nama_lengkap}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  Nomor HP / WhatsApp
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    name="no_hp"
                    value={form.no_hp}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    placeholder="Contoh: 08123456789"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Account Credentials */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-sm transition-colors duration-200">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 pb-2 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-500" />
              Kredensial Akun (Login)
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  Alamat Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    placeholder="nama@email.com"
                  />
                </div>
                {form.email !== userEmail && (
                  <div className="flex items-start gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium leading-relaxed bg-amber-50 dark:bg-amber-500/5 p-2 rounded-lg border border-amber-100 dark:border-amber-500/10">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>Perubahan email membutuhkan verifikasi tautan yang dikirimkan ke email lama & baru sebelum aktif.</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                      placeholder="Kosongkan jika tidak diubah"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    Konfirmasi Kata Sandi
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                      placeholder="Ketik ulang kata sandi baru"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => fetchProfile()}
              disabled={saving}
              className="px-5 py-2.5 text-xs font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700/80 rounded-xl transition-all disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/10 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>

        </div>

      </form>

    </div>
  );
}
