'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  User, 
  FileText, 
  Save, 
  Loader2, 
  Info,
  ShieldAlert,
  ImageIcon,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
import HeroSlidesManager from '@/components/HeroSlidesManager';
import { uploadLogoPesantren, uploadFotoPimpinan } from '@/services/storage-actions';

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), { ssr: false, loading: () => <div className="h-[350px] bg-slate-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div> });

const HARI_KERJA_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 0, label: 'Ahad' },
];

const DEFAULT_HARI_KERJA = [0, 1, 2, 3, 4, 5, 6];

export default function PengaturanPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'umum' | 'kontak' | 'visimisi' | 'landing' | 'absensi'>('umum');
  
  const [profileId, setProfileId] = useState<string>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [fotoPimpinanFile, setFotoPimpinanFile] = useState<File | null>(null);
  const [uploadingFotoPimpinan, setUploadingFotoPimpinan] = useState<boolean>(false);
  
  const [form, setForm] = useState({
    nama_pesantren: '',
    npsn: '',
    nspp: '',
    nama_pimpinan: '',
    alamat: '',
    telepon: '',
    email: '',
    website: '',
    visi: '',
    misi: '',
    logo_url: '',
    foto_pimpinan_url: '',
    kartu_belakang_teks: ''
  });


  const [landingForm, setLandingForm] = useState({
    tagline_title: '',
    tagline_description: '',
    status_pendaftaran: true,
    medsos_facebook: '',
    medsos_instagram: '',
    medsos_youtube: ''
  });

  const [absensiForm, setAbsensiForm] = useState({
    jam_batas_masuk: '07:30',
    jam_batas_pulang: '16:00',
    jam_batas_masuk_santri: '07:00',
    jam_batas_pulang_santri: '14:00',
    latitude: '' as string,
    longitude: '' as string,
    radius_meter: 500,
    hari_kerja: DEFAULT_HARI_KERJA as number[],
  });
  const [detectingLocation, setDetectingLocation] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      // 1. Fetch user role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        const role = profile?.role || 'Wali Santri';
        setIsAdmin(role === 'Super Admin');
      }

      // 2. Fetch pesantren profile
      const { data, error } = await supabase
        .from('pesantren_profile')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfileId(data.id);
        setForm({
          nama_pesantren: data.nama_pesantren || '',
          npsn: data.npsn || '',
          nspp: data.nspp || '',
          nama_pimpinan: data.nama_pimpinan || '',
          alamat: data.alamat || '',
          telepon: data.telepon || '',
          email: data.email || '',
          website: data.website || '',
          visi: data.visi || '',
          misi: data.misi || '',
          logo_url: data.logo_url || '',
          foto_pimpinan_url: data.foto_pimpinan_url || '',
          kartu_belakang_teks: data.kartu_belakang_teks || ''
        });

        setAbsensiForm({
          jam_batas_masuk: data.jam_batas_masuk || '07:30',
          jam_batas_pulang: data.jam_batas_pulang || '16:00',
          jam_batas_masuk_santri: data.jam_batas_masuk_santri || '07:00',
          jam_batas_pulang_santri: data.jam_batas_pulang_santri || '14:00',
          latitude: data.latitude != null ? String(data.latitude) : '',
          longitude: data.longitude != null ? String(data.longitude) : '',
          radius_meter: data.radius_meter || 500,
          hari_kerja: data.hari_kerja && data.hari_kerja.length > 0 ? data.hari_kerja : DEFAULT_HARI_KERJA,
        });
      }

      // 3. Fetch landing page settings
      const { data: landingData } = await supabase
        .from('landing_page_settings')
        .select('*')
        .maybeSingle();

      if (landingData) {
        setLandingForm({
          tagline_title: landingData.tagline_title || '',
          tagline_description: landingData.tagline_description || '',
          status_pendaftaran: landingData.status_pendaftaran !== undefined ? landingData.status_pendaftaran : true,
          medsos_facebook: landingData.medsos_facebook || '',
          medsos_instagram: landingData.medsos_instagram || '',
          medsos_youtube: landingData.medsos_youtube || ''
        });
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error('Gagal mengambil data profil pesantren.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!isMounted) return;
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          if (isMounted) {
            const role = profile?.role || 'Wali Santri';
            setIsAdmin(role === 'Super Admin');
          }
        }

        const { data, error } = await supabase
          .from('pesantren_profile')
          .select('*')
          .maybeSingle();

        if (error) throw error;
        if (!isMounted) return;

        if (data) {
          setProfileId(data.id);
          setForm({
            nama_pesantren: data.nama_pesantren || '',
            npsn: data.npsn || '',
            nspp: data.nspp || '',
            nama_pimpinan: data.nama_pimpinan || '',
            alamat: data.alamat || '',
            telepon: data.telepon || '',
            email: data.email || '',
            website: data.website || '',
            visi: data.visi || '',
            misi: data.misi || '',
            logo_url: data.logo_url || '',
            foto_pimpinan_url: data.foto_pimpinan_url || '',
            kartu_belakang_teks: data.kartu_belakang_teks || ''
          });

          setAbsensiForm({
            jam_batas_masuk: data.jam_batas_masuk || '07:30',
            jam_batas_pulang: data.jam_batas_pulang || '16:00',
            jam_batas_masuk_santri: data.jam_batas_masuk_santri || '07:00',
            jam_batas_pulang_santri: data.jam_batas_pulang_santri || '14:00',
            latitude: data.latitude != null ? String(data.latitude) : '',
            longitude: data.longitude != null ? String(data.longitude) : '',
            radius_meter: data.radius_meter || 500,
            hari_kerja: data.hari_kerja && data.hari_kerja.length > 0 ? data.hari_kerja : DEFAULT_HARI_KERJA,
          });
        }

        const { data: landingData } = await supabase
          .from('landing_page_settings')
          .select('*')
          .maybeSingle();

        if (!isMounted) return;

        if (landingData) {
          setLandingForm({
            tagline_title: landingData.tagline_title || '',
            tagline_description: landingData.tagline_description || '',
            status_pendaftaran: landingData.status_pendaftaran !== undefined ? landingData.status_pendaftaran : true,
            medsos_facebook: landingData.medsos_facebook || '',
            medsos_instagram: landingData.medsos_instagram || '',
            medsos_youtube: landingData.medsos_youtube || ''
          });
        }
      } catch (err: unknown) {
        console.error(err);
        toast.error('Gagal mengambil data profil pesantren.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Akses ditolak. Anda tidak memiliki izin untuk mengubah pengaturan.');
      return;
    }

    setSaving(true);
    try {
      let uploadedLogoUrl = form.logo_url;
      let uploadedFotoPimpinanUrl = form.foto_pimpinan_url;
      
      // Upload new logo if selected
      if (logoFile) {
        setUploadingLogo(true);
        try {
          const extension = logoFile.name.split('.').pop() || 'png';
          const uniqueFileName = `logo_${Date.now()}.${extension}`;
          uploadedLogoUrl = await uploadLogoPesantren(logoFile, uniqueFileName);
        } catch (uploadErr: unknown) {
          console.error('Gagal mengunggah logo:', uploadErr);
          const uploadMsg = uploadErr instanceof Error ? uploadErr.message : 'Gagal upload logo';
          toast.error('Gagal mengunggah logo pesantren: ' + uploadMsg);
          setUploadingLogo(false);
          setSaving(false);
          return;
        }
        setUploadingLogo(false);
      }

      // Upload new pimpinan photo if selected
      if (fotoPimpinanFile) {
        setUploadingFotoPimpinan(true);
        try {
          const extension = fotoPimpinanFile.name.split('.').pop() || 'png';
          const uniqueFileName = `pimpinan_${Date.now()}.${extension}`;
          uploadedFotoPimpinanUrl = await uploadFotoPimpinan(fotoPimpinanFile, uniqueFileName);
        } catch (uploadErr: unknown) {
          console.error('Gagal mengunggah foto pimpinan:', uploadErr);
          const uploadMsg = uploadErr instanceof Error ? uploadErr.message : 'Gagal upload foto pimpinan';
          toast.error('Gagal mengunggah foto pimpinan: ' + uploadMsg);
          setUploadingFotoPimpinan(false);
          setSaving(false);
          return;
        }
        setUploadingFotoPimpinan(false);
      }

      let error;
      const submissionData = {
        ...form,
        logo_url: uploadedLogoUrl,
        foto_pimpinan_url: uploadedFotoPimpinanUrl,
        jam_batas_masuk: absensiForm.jam_batas_masuk || null,
        jam_batas_pulang: absensiForm.jam_batas_pulang || null,
        jam_batas_masuk_santri: absensiForm.jam_batas_masuk_santri || null,
        jam_batas_pulang_santri: absensiForm.jam_batas_pulang_santri || null,
        latitude: absensiForm.latitude ? Number(absensiForm.latitude) : null,
        longitude: absensiForm.longitude ? Number(absensiForm.longitude) : null,
        radius_meter: absensiForm.radius_meter || null,
        hari_kerja: absensiForm.hari_kerja,
      };

      if (profileId) {
        const { error: updateErr } = await supabase
          .from('pesantren_profile')
          .update({
            ...submissionData,
            updated_at: new Date().toISOString()
          })
          .eq('id', profileId);
        error = updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('pesantren_profile')
          .insert([submissionData]);
        error = insertErr;
      }

      if (error) throw error;

      // Update/Upsert landing page settings
      const { error: landingErr } = await supabase
        .from('landing_page_settings')
        .upsert({
          id: 1,
          ...landingForm
        });

      if (landingErr) throw landingErr;

      toast.success('Profil pesantren & Landing Page berhasil disimpan!');
      setLogoFile(null); // Reset selection
      setFotoPimpinanFile(null); // Reset selection
      await fetchData();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan profil pesantren.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDetectLocation = () => {
    if (!isAdmin || !navigator.geolocation) {
      toast.error('Geolokasi tidak didukung di perangkat/browser ini.');
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAbsensiForm(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setDetectingLocation(false);
        toast.success('Lokasi terdeteksi! Cek marker pada peta.');
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'Izin lokasi ditolak. Izinkan akses lokasi di browser lalu coba lagi.',
          2: 'Posisi tidak dapat ditentukan. Pastikan GPS diaktifkan.',
          3: 'Waktu deteksi lokasi habis. Coba lagi.',
        };
        setDetectingLocation(false);
        toast.error(messages[err.code] || 'Gagal mendeteksi lokasi.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
          <p className="text-slate-500 dark:text-zinc-400 text-sm font-semibold">Memuat pengaturan sistem...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'umum', label: 'Informasi Umum', icon: Building2 },
    { id: 'kontak', label: 'Kontak & Media', icon: Phone },
    { id: 'visimisi', label: 'Visi & Misi', icon: FileText },
    { id: 'absensi', label: 'Absensi', icon: Clock },
    { id: 'landing', label: 'Landing Page', icon: Globe },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Profil & Pengaturan Pesantren
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">
            Sesuaikan informasi lembaga, kontak resmi, dan visi misi pesantren.
          </p>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-amber-500/[0.06] border border-amber-500/20 text-amber-700 dark:text-amber-400 p-4 rounded-2xl text-xs sm:text-sm flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Mode Lihat Saja:</span> Anda tidak memiliki hak akses mengubah profil pesantren. Hubungi Super Admin untuk membuat perubahan.
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-1.5 shadow-sm">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <TabIcon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* TAB: Informasi Umum */}
        {activeTab === 'umum' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-500" />
                Data Lembaga
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Nama Pesantren *</label>
                  <input type="text" value={form.nama_pesantren} onChange={(e) => setForm(prev => ({ ...prev, nama_pesantren: e.target.value }))} disabled={!isAdmin} required
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">NPSN</label>
                  <input type="text" value={form.npsn} onChange={(e) => setForm(prev => ({ ...prev, npsn: e.target.value }))} disabled={!isAdmin}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">NSPP</label>
                  <input type="text" value={form.nspp} onChange={(e) => setForm(prev => ({ ...prev, nspp: e.target.value }))} disabled={!isAdmin}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Nama Pimpinan / Pengasuh Utama</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input type="text" placeholder="Contoh: K.H. Abu Bakar" value={form.nama_pimpinan} onChange={(e) => setForm(prev => ({ ...prev, nama_pimpinan: e.target.value }))} disabled={!isAdmin}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl pl-11 pr-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Alamat Lengkap Pesantren</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <textarea placeholder="Jl. Antigravity No. 42, RT 01/RW 02..." value={form.alamat} onChange={(e) => setForm(prev => ({ ...prev, alamat: e.target.value }))} disabled={!isAdmin} rows={3}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl pl-11 pr-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm resize-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col items-center">
                <h3 className="w-full font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
                  Logo Pesantren
                </h3>
                <ImageUpload value={logoFile || form.logo_url} onChange={(file) => { if (!isAdmin) { toast.error('Anda tidak memiliki izin untuk mengunggah logo.'); return; } setLogoFile(file); }} loading={uploadingLogo} shape="square" label="" />
                <p className="text-[10px] text-slate-400 text-center italic mt-1">Gunakan format PNG/JPG maksimal 500KB. Gambar otomatis dikompresi.</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col items-center">
                <h3 className="w-full font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
                  Foto Pimpinan Pesantren
                </h3>
                <ImageUpload value={fotoPimpinanFile || form.foto_pimpinan_url} onChange={(file) => { if (!isAdmin) { toast.error('Anda tidak memiliki izin untuk mengunggah foto pimpinan.'); return; } setFotoPimpinanFile(file); }} loading={uploadingFotoPimpinan} shape="square" label="" />
                <p className="text-[10px] text-slate-400 text-center italic mt-1">Foto pimpinan untuk sambutan landing page. Format PNG/JPG maks 500KB.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Kontak & Media */}
        {activeTab === 'kontak' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
                <Phone className="h-4 w-4 text-purple-500" />
                Kontak Resmi
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Nomor Telepon / WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input type="text" placeholder="0812..." value={form.telepon} onChange={(e) => setForm(prev => ({ ...prev, telepon: e.target.value }))} disabled={!isAdmin}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl pl-11 pr-4 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Email Resmi</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input type="email" placeholder="pondok@pesantren.com" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} disabled={!isAdmin}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl pl-11 pr-4 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Website Resmi</label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input type="url" placeholder="https://..." value={form.website} onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))} disabled={!isAdmin}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl pl-11 pr-4 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
                <Globe className="h-4 w-4 text-sky-500" />
                Media Sosial
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Facebook URL</label>
                  <input type="url" value={landingForm.medsos_facebook} onChange={(e) => setLandingForm(prev => ({ ...prev, medsos_facebook: e.target.value }))} disabled={!isAdmin} placeholder="https://facebook.com/..."
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Instagram URL</label>
                  <input type="url" value={landingForm.medsos_instagram} onChange={(e) => setLandingForm(prev => ({ ...prev, medsos_instagram: e.target.value }))} disabled={!isAdmin} placeholder="https://instagram.com/..."
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Youtube URL</label>
                  <input type="url" value={landingForm.medsos_youtube} onChange={(e) => setLandingForm(prev => ({ ...prev, medsos_youtube: e.target.value }))} disabled={!isAdmin} placeholder="https://youtube.com/..."
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Visi & Misi */}
        {activeTab === 'visimisi' && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Visi & Misi Lembaga
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Visi Pesantren</label>
                <textarea placeholder="Tuliskan visi pesantren disini..." value={form.visi} onChange={(e) => setForm(prev => ({ ...prev, visi: e.target.value }))} disabled={!isAdmin} rows={4}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Misi Pesantren</label>
                <textarea placeholder="1. Mendidik santri secara islami&#10;2. Menyelenggarakan kajian kitab..." value={form.misi} onChange={(e) => setForm(prev => ({ ...prev, misi: e.target.value }))} disabled={!isAdmin} rows={6}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Teks Belakang Kartu Pegawai</label>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2">Teks custom yang ditampilkan di bagian belakang kartu pegawai (setelah informasi kontak)</p>
                <textarea placeholder="Contoh:&#10;Dilarang memindahtangankan kartu ini kepada pihak lain.&#10;Kartu harus dibawa setiap saat selama berada di lingkungan pesantren." value={form.kartu_belakang_teks} onChange={(e) => setForm(prev => ({ ...prev, kartu_belakang_teks: e.target.value }))} disabled={!isAdmin} rows={4}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'absensi' && (
          <div className="space-y-6">
            {/* Bagian 1: Pengaturan Absensi Pegawai */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-500" />
                Pengaturan Absensi Pegawai & Asatidz
              </h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Hari Kerja Mingguan Pegawai</label>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2">Hari yang tidak dipilih dianggap libur mingguan dan tidak dihitung sebagai Alpha.</p>
                  <div className="flex flex-wrap gap-2">
                    {HARI_KERJA_OPTIONS.map((day) => {
                      const isActive = absensiForm.hari_kerja.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          disabled={!isAdmin}
                          onClick={() => {
                            const next = isActive
                              ? absensiForm.hari_kerja.filter((d) => d !== day.value)
                              : [...absensiForm.hari_kerja, day.value];
                            if (next.length === 0) {
                              toast.error('Minimal satu hari kerja harus dipilih');
                              return;
                            }
                            setAbsensiForm((prev) => ({ ...prev, hari_kerja: next }));
                          }}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all disabled:opacity-60 ${
                            isActive
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500 hover:border-slate-300 dark:hover:border-zinc-600'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Jam Batas Masuk Pegawai</label>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2">Pegawai yang scan sebelum jam ini berstatus Hadir, setelahnya Terlambat.</p>
                    <input
                      type="time"
                      value={absensiForm.jam_batas_masuk}
                      onChange={(e) => setAbsensiForm(prev => ({ ...prev, jam_batas_masuk: e.target.value }))}
                      disabled={!isAdmin}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Jam Minimal Absen Pulang Pegawai</label>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2">Scan absen pulang pegawai sebelum jam ini akan ditolak.</p>
                    <input
                      type="time"
                      value={absensiForm.jam_batas_pulang}
                      onChange={(e) => setAbsensiForm(prev => ({ ...prev, jam_batas_pulang: e.target.value }))}
                      disabled={!isAdmin}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian 2: Pengaturan Absensi Santri */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-500" />
                Pengaturan Absensi Santri
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Jam Batas Masuk Santri</label>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2">Santri yang scan sebelum jam ini berstatus Hadir, setelahnya Terlambat.</p>
                  <input
                    type="time"
                    value={absensiForm.jam_batas_masuk_santri}
                    onChange={(e) => setAbsensiForm(prev => ({ ...prev, jam_batas_masuk_santri: e.target.value }))}
                    disabled={!isAdmin}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-sky-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Jam Minimal Absen Pulang Santri</label>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2">Scan kepulangan/checkout santri sebelum jam ini akan ditolak.</p>
                  <input
                    type="time"
                    value={absensiForm.jam_batas_pulang_santri}
                    onChange={(e) => setAbsensiForm(prev => ({ ...prev, jam_batas_pulang_santri: e.target.value }))}
                    disabled={!isAdmin}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-sky-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Bagian 3: Lokasi & Geofencing GPS */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-500" />
                Lokasi Pusat & Radius Geofencing (GPS)
              </h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Radius Geofencing (meter)</label>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2">Jarak maksimal dari titik pusat yang diizinkan untuk absen. Di luar radius = scan ditolak.</p>
                  <input
                    type="number"
                    min={50}
                    step={50}
                    value={absensiForm.radius_meter}
                    onChange={(e) => setAbsensiForm(prev => ({ ...prev, radius_meter: Number(e.target.value) }))}
                    disabled={!isAdmin}
                    placeholder="500"
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Titik Pusat Pesantren</label>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={!isAdmin || detectingLocation}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {detectingLocation ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5" />
                      )}
                      {detectingLocation ? 'Mendeteksi...' : 'Deteksi Lokasi Saya'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2">Klik pada peta, seret marker, atau gunakan tombol deteksi untuk menentukan lokasi pusat pesantren.</p>
                  <div className="flex gap-3 mb-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase mb-1">Latitude</label>
                      <input
                        type="text"
                        value={absensiForm.latitude}
                        onChange={(e) => setAbsensiForm(prev => ({ ...prev, latitude: e.target.value }))}
                        disabled={!isAdmin}
                        placeholder="-6.200000"
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm font-mono text-xs"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase mb-1">Longitude</label>
                      <input
                        type="text"
                        value={absensiForm.longitude}
                        onChange={(e) => setAbsensiForm(prev => ({ ...prev, longitude: e.target.value }))}
                        disabled={!isAdmin}
                        placeholder="106.800000"
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800">
                    <LeafletMap
                      latitude={absensiForm.latitude ? Number(absensiForm.latitude) : -6.200000}
                      longitude={absensiForm.longitude ? Number(absensiForm.longitude) : 106.800000}
                      radius={absensiForm.radius_meter}
                      draggable={isAdmin}
                      onPositionChange={(lat, lng) => {
                        setAbsensiForm(prev => ({ ...prev, latitude: String(lat), longitude: String(lng) }));
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Landing Page */}
        {activeTab === 'landing' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-500" />
                Pengaturan Landing Page Publik
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Judul / Tagline Utama</label>
                  <input type="text" value={landingForm.tagline_title} onChange={(e) => setLandingForm(prev => ({ ...prev, tagline_title: e.target.value }))} disabled={!isAdmin} placeholder="Membentuk Generasi Qurani..."
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Deskripsi Tagline</label>
                  <textarea value={landingForm.tagline_description} onChange={(e) => setLandingForm(prev => ({ ...prev, tagline_description: e.target.value }))} disabled={!isAdmin} rows={3} placeholder="Tulis penjelasan singkat landing page..."
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-zinc-900 rounded-xl px-4 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm" />
                </div>
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-zinc-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-zinc-800">
                  <input type="checkbox" id="status_pendaftaran" checked={landingForm.status_pendaftaran} onChange={(e) => setLandingForm(prev => ({ ...prev, status_pendaftaran: e.target.checked }))} disabled={!isAdmin}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 focus:outline-none accent-emerald-600" />
                  <label htmlFor="status_pendaftaran" className="block text-xs font-bold text-slate-700 dark:text-zinc-300 cursor-pointer select-none">
                    Status Pendaftaran Online Aktif (Menampilkan tombol &apos;Daftar Sekarang&apos; di Landing Page &amp; Banner CTA)
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-amber-500" />
                Slideshow Hero Banner
              </h3>
              <HeroSlidesManager isAdmin={isAdmin} />
            </div>
          </div>
        )}

        {/* Save Button */}
        {isAdmin && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4 sticky bottom-4">
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              Konfigurasi ini akan berlaku global di sistem.
            </div>
            <button type="submit" disabled={saving}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Simpan Perubahan
            </button>
          </div>
        )}

      </form>
    </div>
  );
}
