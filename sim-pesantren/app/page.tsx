import React from 'react';
import { supabase } from '@/lib/supabase';
import LandingPageClient from '@/components/LandingPageClient';

// Enable Incremental Static Regeneration (ISR) with revalidation time of 60 seconds
export const revalidate = 60;

export default async function Page() {
  // Default values to fallback to if tables don't exist or are empty
  let landingSettings = {
    tagline_title: 'Membentuk Generasi Qurani yang Unggul, Cerdas, dan Berakhlak Mulia',
    tagline_description: 'SIM Pesantren menggabungkan metode pembelajaran salafiyah klasik dengan teknologi modern untuk menghadirkan manajemen asrama, hafalan tahfidz, dan administrasi sekolah yang terintegrasi secara profesional.',
    status_pendaftaran: true,
    telepon: '0812-3456-7890',
    email: 'info@pesantrenmodern.sch.id',
    alamat: 'Jl. Pesantren No. 1, Kebayoran, Jakarta Selatan',
    medsos_facebook: 'https://facebook.com',
    medsos_instagram: 'https://instagram.com',
    medsos_youtube: 'https://youtube.com'
  };

  let brandLogo = '';
  let brandName = 'SIM Pesantren';
  let brandVisi = '';
  let brandMisi = '';
  let brandPimpinan = '';
  let brandFotoPimpinan = '';

  try {
    // 1. Fetch landing page settings
    const { data: settingsData } = await supabase
      .from('landing_page_settings')
      .select('*')
      .maybeSingle();

    if (settingsData) {
      landingSettings = {
        ...landingSettings,
        tagline_title: settingsData.tagline_title || landingSettings.tagline_title,
        tagline_description: settingsData.tagline_description || landingSettings.tagline_description,
        status_pendaftaran: settingsData.status_pendaftaran !== undefined ? settingsData.status_pendaftaran : landingSettings.status_pendaftaran,
        medsos_facebook: settingsData.medsos_facebook || landingSettings.medsos_facebook,
        medsos_instagram: settingsData.medsos_instagram || landingSettings.medsos_instagram,
        medsos_youtube: settingsData.medsos_youtube || landingSettings.medsos_youtube
      };
    }

    // 2. Fetch pesantren branding settings
    const { data: brandData } = await supabase
      .from('pesantren_profile')
      .select('logo_url, nama_pesantren, alamat, telepon, email, visi, misi, nama_pimpinan, foto_pimpinan_url')
      .maybeSingle();

    if (brandData) {
      if (brandData.logo_url) brandLogo = brandData.logo_url;
      if (brandData.nama_pesantren) brandName = brandData.nama_pesantren;
      if (brandData.alamat) landingSettings.alamat = brandData.alamat;
      if (brandData.telepon) landingSettings.telepon = brandData.telepon;
      if (brandData.email) landingSettings.email = brandData.email;
      if (brandData.visi) brandVisi = brandData.visi;
      if (brandData.misi) brandMisi = brandData.misi;
      if (brandData.nama_pimpinan) brandPimpinan = brandData.nama_pimpinan;
      if (brandData.foto_pimpinan_url) brandFotoPimpinan = brandData.foto_pimpinan_url;
    }
  } catch (err) {
    console.error('Error fetching landing settings or branding:', err);
  }

  let heroSlides: Array<{
    id: string;
    image_url: string;
    title: string;
    subtitle: string;
    description: string;
  }> = [];

  try {
    const { data: slidesData } = await supabase
      .from('hero_slides')
      .select('id, image_url, title, subtitle, description')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (slidesData && slidesData.length > 0) {
      heroSlides = slidesData;
    }
  } catch (err) {
    console.warn('Could not load hero slides:', err);
  }

  let stats = {
    sekolah: 4,
    kelas: 24,
    santri: 780,
    pegawai: 56
  };

  try {
    const [sekolahRes, kelasRes, santriRes, pegawaiRes] = await Promise.all([
      supabase.from('sekolah').select('*', { count: 'exact', head: true }),
      supabase.from('kelas').select('*', { count: 'exact', head: true }),
      supabase.from('santri').select('*', { count: 'exact', head: true }),
      supabase.from('pegawai').select('*', { count: 'exact', head: true })
    ]);

    if (sekolahRes.count !== null && sekolahRes.count !== undefined) stats.sekolah = sekolahRes.count;
    if (kelasRes.count !== null && kelasRes.count !== undefined) stats.kelas = kelasRes.count;
    if (santriRes.count !== null && santriRes.count !== undefined) stats.santri = santriRes.count;
    if (pegawaiRes.count !== null && pegawaiRes.count !== undefined) stats.pegawai = pegawaiRes.count;
  } catch (err) {
    console.warn('Could not load real-time stats count:', err);
  }

  return (
    <LandingPageClient 
      settings={landingSettings} 
      pesantrenLogo={brandLogo}
      pesantrenName={brandName}
      pesantrenVisi={brandVisi}
      pesantrenMisi={brandMisi}
      pesantrenPimpinan={brandPimpinan}
      pesantrenPimpinanFoto={brandFotoPimpinan}
      stats={stats}
      heroSlides={heroSlides}
    />
  );
}
