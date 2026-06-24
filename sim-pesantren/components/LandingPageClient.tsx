'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  ArrowRight, 
  BookOpen, 
  Bookmark, 
  MapPin, 
  Phone, 
  Mail, 
  ChevronLeft,
  ChevronRight,
  School,
  Activity,
  Download,
  Quote
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { supabase } from '@/lib/supabase';

interface Slide {
  id: string;
  image_url: string;
  title: string;
  subtitle: string;
  description: string;
}

interface LandingPageClientProps {
  settings: {
    tagline_title: string;
    tagline_description: string;
    status_pendaftaran: boolean;
    telepon: string;
    email: string;
    alamat: string;
    medsos_facebook?: string;
    medsos_instagram?: string;
    medsos_youtube?: string;
  };
  pesantrenLogo?: string;
  pesantrenName?: string;
  pesantrenVisi?: string;
  pesantrenMisi?: string;
  pesantrenPimpinan?: string;
  pesantrenPimpinanFoto?: string;
  stats?: {
    sekolah: number;
    kelas: number;
    santri: number;
    pegawai: number;
  };
  heroSlides?: Slide[];
}

export default function LandingPageClient({ 
  settings, 
  pesantrenLogo, 
  pesantrenName,
  pesantrenVisi = '',
  pesantrenMisi = '',
  pesantrenPimpinan = '',
  pesantrenPimpinanFoto = '',
  stats = { sekolah: 4, kelas: 24, santri: 780, pegawai: 56 },
  heroSlides = []
}: LandingPageClientProps) {
  const slides = heroSlides.length > 0 ? heroSlides : [
    {
      id: 'default-1',
      image_url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=1200&q=80',
      title: 'Kajian Kitab Kuning',
      subtitle: 'Menjaga Tradisi Keilmuan Islam Klasik',
      description: 'Santri dibimbing secara mendalam untuk membaca, memahami, dan mengkontekstualisasikan kitab-kitab salaf (kuning) muktabarah.'
    },
    {
      id: 'default-2',
      image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
      title: "Tahfidzul Qur'an",
      subtitle: 'Mencetak Generasi Hamalatul Qur\'an',
      description: 'Program tahfidz intensif dengan metode tahsin yang presisi serta pemantauan kemajuan hafalan secara berkala.'
    },
    {
      id: 'default-3',
      image_url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80',
      title: 'Pendidikan Karakter',
      subtitle: 'Keseimbangan Spiritual dan Keilmuan Modern',
      description: 'Mengintegrasikan nilai-nilai kepesantrenan dengan keterampilan teknologi dan pendidikan formal berbasis Kurikulum Merdeka.'
    }
  ];
  const brandName = pesantrenName || 'SIM Pesantren';
  const { isInstallable, install } = usePWAInstall();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentTime, setCurrentTime] = useState('');
  const [currentMasehi, setCurrentMasehi] = useState('');
  const [currentHijri, setCurrentHijri] = useState('');
  const [liveStats, setLiveStats] = useState(stats);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentMasehi(new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now));
      
      try {
        const formatter = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });
        setCurrentHijri(formatter.format(now) + ' H');
      } catch (e) {
        setCurrentHijri('');
      }
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [sekolahRes, kelasRes, santriRes, pegawaiRes] = await Promise.all([
          supabase.from('sekolah').select('*', { count: 'exact', head: true }),
          supabase.from('kelas').select('*', { count: 'exact', head: true }),
          supabase.from('santri').select('*', { count: 'exact', head: true }),
          supabase.from('pegawai').select('*', { count: 'exact', head: true })
        ]);
        setLiveStats(prev => ({
          sekolah: sekolahRes.count ?? prev.sekolah,
          kelas: kelasRes.count ?? prev.kelas,
          santri: santriRes.count ?? prev.santri,
          pegawai: pegawaiRes.count ?? prev.pegawai
        }));
      } catch {
        // silent — keep existing values
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 25 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 transition-colors duration-300 font-sans relative selection:bg-emerald-500/30 selection:text-emerald-900 dark:selection:text-emerald-100">
      
      {/* 1. Header / Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-zinc-950/80 border-b border-emerald-100 dark:border-emerald-900/30 shadow-sm transition-colors duration-200">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Top Mini Info Bar (Gregorian, Hijri, Clock & Alamat) */}
          <div className="hidden md:block border-b border-emerald-800/30 dark:border-zinc-800/80 py-2 bg-emerald-900 dark:bg-zinc-900 text-emerald-100 dark:text-zinc-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 lg:px-16 flex items-center justify-between text-[11px] font-medium text-emerald-100/90 dark:text-zinc-400">
              {/* Address with MapPin */}
              <div className="flex items-center gap-1.5 truncate max-w-[50%]">
                <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="truncate leading-none">{settings.alamat}</span>
              </div>
              
              {/* Dates & Live Clock */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-semibold text-amber-400 font-sufi text-xs">{currentHijri}</span>
                <span className="opacity-30">|</span>
                <span>{currentMasehi}</span>
                <span className="opacity-30">|</span>
                <span className="font-mono text-emerald-950 dark:text-amber-400 bg-amber-400 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                  {currentTime}
                </span>
              </div>
            </div>
          </div>

          {/* Main Navbar */}
          <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 lg:px-16 py-3 md:py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 mr-2">
              {pesantrenLogo ? (
                <Image 
                  src={pesantrenLogo} 
                  alt="Logo" 
                  width={42}
                  height={42}
                  className="rounded-lg object-cover shadow-sm shrink-0" 
                />
              ) : (
                <div className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-emerald-600 text-white font-sufi text-lg shadow-md shadow-emerald-600/25 shrink-0">
                  P
                </div>
              )}
              <div className="flex flex-col min-w-0 justify-center">
                <span className="font-sufi font-bold text-[13px] sm:text-base md:text-lg tracking-wide bg-gradient-to-r from-emerald-700 to-emerald-500 dark:from-emerald-400 dark:to-emerald-200 bg-clip-text text-transparent leading-snug truncate max-w-[140px] sm:max-w-none">
                  {brandName}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate font-medium max-w-[160px] hidden sm:block md:hidden lg:block leading-none">
                  {settings.alamat}
                </span>
              </div>
            </div>

            {/* Menu Navigasi */}
            <nav className="hidden md:flex items-center gap-8 text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
              <a href="#home" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Beranda</a>
              <a href="#program" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Program</a>
              <a href="#kontak" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Kontak</a>
            </nav>

            <div className="flex items-center gap-1.5 sm:gap-3">
              <div className="md:hidden text-[10px] font-semibold text-slate-400 dark:text-zinc-500 font-mono tabular-nums leading-none mr-0.5">
                {currentTime}
              </div>
              <ThemeToggle />
              <Link
                href="/login"
                className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 hover:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl transition-all whitespace-nowrap"
              >
                <span className="hidden sm:inline">Masuk</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </motion.div>
      </header>

      <div className="flex flex-col justify-between min-h-screen pt-14 md:pt-24">

      {/* 2. Hero Section */}
      <section id="home" className="relative flex-1 pt-10 pb-20 md:pt-16 md:pb-32 flex items-center justify-center overflow-hidden bg-emerald-50 dark:bg-zinc-950 bg-islamic-pattern">
        {/* Deep emerald and gold glow overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white/90 dark:from-zinc-950/80 dark:via-zinc-950/40 dark:to-zinc-950 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-emerald-500/10 dark:bg-emerald-600/10 blur-[150px] pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-amber-500/10 dark:bg-amber-600/10 blur-[120px] pointer-events-none transform -translate-x-1/3 translate-y-1/3" />
        
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 md:px-12 lg:px-16 grid grid-cols-1 lg:grid-cols-12 gap-16 items-start relative z-10">
          
          {/* Left Side: Tagline Text */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-6 space-y-5 md:space-y-6 text-center lg:text-left"
          >

            <motion.h1 
              variants={fadeInUp}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white leading-[1.2] font-sufi"
            >
              {settings.tagline_title.split(' ').map((word, i) => (
                <span key={i} className={i % 3 === 0 ? "text-emerald-600 dark:text-emerald-450" : ""}>
                  {word}{' '}
                </span>
              ))}
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="text-xs sm:text-sm md:text-base text-slate-500 dark:text-zinc-400 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium"
            >
              {settings.tagline_description}
            </motion.p>

            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2"
            >
              {settings.status_pendaftaran && (
                <Link
                  href="/login?tab=register"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold text-xs px-8 py-4 rounded-2xl shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/40 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0"
                >
                  Daftar Sekarang
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
              <a
                href="#program"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-emerald-100 dark:border-emerald-800/30 hover:border-emerald-300 dark:hover:border-emerald-700 text-slate-700 dark:text-zinc-300 font-semibold text-xs px-8 py-4 rounded-2xl transition-all duration-300"
              >
                Jelajahi Program
              </a>
            </motion.div>
          </motion.div>

          {/* Right Side: Elegant Slideshow Banner */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            className="lg:col-span-6 w-full max-w-xl lg:max-w-none mx-auto relative group/slider"
          >
            {/* Soft decorative glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-amber-500/10 rounded-[2.5rem] blur-[60px] opacity-70 pointer-events-none" />
            
            <div className="relative z-10 overflow-hidden rounded-[2.5rem] border border-white/40 dark:border-zinc-800/80 shadow-2xl bg-white dark:bg-zinc-900 aspect-[4/3] md:aspect-[16/10] lg:aspect-[4/3] xl:aspect-[16/10]">
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.7, ease: 'easeInOut' }}
                  className="absolute inset-0 w-full h-full"
                >
                  {/* Slide Image */}
                  <img 
                    src={slides[currentSlide].image_url} 
                    alt={slides[currentSlide].title} 
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                  
                  {/* Slide Text Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white space-y-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                      {slides[currentSlide].subtitle}
                    </span>
                    <h3 className="text-xl md:text-2xl font-bold font-sufi text-white">
                      {slides[currentSlide].title}
                    </h3>
                    <p className="text-xs text-zinc-200/90 leading-relaxed max-w-md">
                      {slides[currentSlide].description}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation Arrows */}
              <button 
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300 pointer-events-auto"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button 
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300 pointer-events-auto"
                aria-label="Next slide"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Navigation Dots */}
              <div className="absolute bottom-4 right-6 flex items-center gap-1.5 z-20">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all duration-350 ${idx === currentSlide ? 'w-6 bg-amber-400' : 'w-2 bg-white/40 hover:bg-white/60'}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* 2.3. Statistics Section */}
      <section className="relative z-20 -mt-16 max-w-7xl mx-auto px-4 sm:px-8 md:px-12 lg:px-16">
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-emerald-100/50 dark:border-zinc-800/80 rounded-[2.5rem] shadow-xl p-8 md:p-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 divide-y-0 divide-x-0 md:divide-x divide-emerald-100 dark:divide-zinc-800">
            
            {/* Stat 1: Sekolah */}
            <div className="text-center px-4 space-y-2">
              <span className="text-3xl md:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 font-sufi block">
                {liveStats.sekolah}
              </span>
              <span className="text-xs md:text-sm font-bold text-slate-800 dark:text-zinc-200 block">
                Lembaga Pendidikan
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 block leading-tight">
                Formal & Non-Formal
              </span>
            </div>

            {/* Stat 2: Kelas */}
            <div className="text-center px-4 space-y-2">
              <span className="text-3xl md:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 font-sufi block">
                {liveStats.kelas}
              </span>
              <span className="text-xs md:text-sm font-bold text-slate-800 dark:text-zinc-200 block">
                Rombongan Belajar
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 block leading-tight">
                Kelas Aktif Terbina
              </span>
            </div>

            {/* Stat 3: Santri */}
            <div className="text-center px-4 space-y-2 md:border-t-0 border-t border-emerald-50 dark:border-zinc-800 pt-6 md:pt-0">
              <span className="text-3xl md:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 font-sufi block">
                {liveStats.santri.toLocaleString('id-ID')}+
              </span>
              <span className="text-xs md:text-sm font-bold text-slate-800 dark:text-zinc-200 block">
                Santri Aktif
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 block leading-tight">
                Mukim & Non-Mukim
              </span>
            </div>

            {/* Stat 4: Pegawai */}
            <div className="text-center px-4 space-y-2 md:border-t-0 border-t border-emerald-50 dark:border-zinc-800 pt-6 md:pt-0">
              <span className="text-3xl md:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 font-sufi block">
                {liveStats.pegawai}
              </span>
              <span className="text-xs md:text-sm font-bold text-slate-800 dark:text-zinc-200 block">
                Ustaz & Pegawai
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 block leading-tight">
                Pendidik & Tenaga Kependidikan
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* 2.5. Profile, Sambutan & Visi Misi Section */}
      {(pesantrenPimpinan || pesantrenVisi || pesantrenMisi) && (
        <section className="py-24 bg-white dark:bg-zinc-950 relative border-y border-emerald-50 dark:border-zinc-900">
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200 dark:via-emerald-900 to-transparent opacity-50" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 lg:px-16 grid grid-cols-1 lg:grid-cols-12 gap-16 items-start relative z-10">



            
            {/* Column 1: Sambutan Pimpinan (Left) */}
            {pesantrenPimpinan && (
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeInUp}
                className="lg:col-span-7 bg-slate-50 dark:bg-zinc-900/50 rounded-[2.5rem] p-8 md:p-12 border border-slate-100 dark:border-zinc-800/80 relative overflow-hidden"
              >
                <Quote className="absolute -top-4 -left-4 w-32 h-32 text-emerald-500/5 dark:text-emerald-500/5 rotate-180" />
                
                <div className="relative z-10 space-y-8">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-[0.2em] block">
                      Kata Sambutan
                    </span>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white font-sufi">
                      Pimpinan Lembaga
                    </h2>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    {pesantrenPimpinanFoto && (
                      <div className="w-full md:w-40 shrink-0">
                        <div className="aspect-[3/4] relative rounded-2xl overflow-hidden shadow-lg border-4 border-white dark:border-zinc-800">
                          <Image 
                            src={pesantrenPimpinanFoto} 
                            alt={pesantrenPimpinan} 
                            fill
                            sizes="(max-width: 768px) 50vw, 160px"
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex-1 space-y-4 text-slate-600 dark:text-zinc-300">
                      <p className="text-emerald-800 dark:text-emerald-400 font-bold text-[15px]">
                        Assalamu'alaikum Warahmatullahi Wabarakatuh,
                      </p>
                      <p className="italic text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                        "Alhamdulillah, segala puji bagi Allah SWT. Di era digital ini, <strong className="font-semibold text-emerald-700 dark:text-emerald-400">{brandName}</strong> terus berkomitmen memberikan pelayanan pendidikan terbaik, memadukan nilai-nilai salafiyah dengan inovasi sistem manajemen modern."
                      </p>
                      <p className="italic text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                        "Melalui SIM Pesantren ini, kami berharap silaturahmi, transparansi administrasi, dan pemantauan perkembangan santri dapat terjalin secara lebih optimal."
                      </p>
                      <div className="pt-2">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 font-sufi text-lg">{pesantrenPimpinan}</h4>
                        <p className="text-[10px] text-amber-600 dark:text-amber-500 font-bold uppercase tracking-widest mt-0.5">Pengasuh {brandName}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Column 2: Visi & Misi (Right) */}
            {(pesantrenVisi || pesantrenMisi) && (
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={containerVariants}
                className="lg:col-span-5 space-y-8"
              >
                {/* Visi */}
                {pesantrenVisi && (
                  <motion.div variants={fadeInUp} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-px bg-amber-500 flex-1 opacity-50" />
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-[0.2em]">
                        Visi Kami
                      </span>
                      <div className="h-px bg-amber-500 flex-1 opacity-50" />
                    </div>
                    <p className="text-center text-lg md:text-xl font-sufi font-bold text-emerald-800 dark:text-emerald-100 leading-relaxed px-4">
                      "{pesantrenVisi}"
                    </p>
                  </motion.div>
                )}

                {/* Misi */}
                {pesantrenMisi && (
                  <motion.div variants={fadeInUp} className="bg-emerald-50/50 dark:bg-zinc-900/30 rounded-3xl p-8 border border-emerald-100 dark:border-zinc-800/50">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-6 font-sufi text-center">
                      Misi Lembaga
                    </h3>
                    <ul className="space-y-4 text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                      {pesantrenMisi.split('\n').filter(Boolean).map((point, idx) => (
                        <li key={idx} className="flex items-start gap-4">
                          <span className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex-shrink-0 flex items-center justify-center font-bold text-xs font-sufi">
                            {idx + 1}
                          </span>
                          <span className="pt-0.5">{point.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </motion.div>
            )}

          </div>
        </section>
      )}

      {/* 3. Feature / Program Section */}
      <section id="program" className="py-24 bg-slate-50 dark:bg-zinc-950/80 bg-islamic-pattern relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-transparent dark:via-zinc-950/80 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 lg:px-16 space-y-16 relative z-10">
          
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-[0.2em]">
              Layanan Pendidikan
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white font-sufi">
              Program Kurikulum Unggulan
            </h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
              Memadukan kebijaksanaan klasik dengan metode modern. Kami menyelenggarakan kurikulum pendidikan yang seimbang antara ilmu agama, formal akademik, serta pembentukan akhlak karimah.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1: Tahfidz */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInUp}
              className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 border border-slate-100 dark:border-zinc-800 transition-all duration-300 group"
            >
              <div className="h-14 w-14 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <Bookmark className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-sufi mb-3">
                Tahfidz Al-Qur'an
              </h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                Program hafalan intensif dengan target setoran berkala. Riwayat hafalan dan penilaian terpantau langsung secara real-time oleh Wali Santri.
              </p>
            </motion.div>

            {/* Card 2: Formal Dapodik */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInUp}
              className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 border border-slate-100 dark:border-zinc-800 transition-all duration-300 group"
            >
              <div className="h-14 w-14 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <School className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-sufi mb-3">
                Sekolah Formal
              </h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                Penyelenggaraan sekolah formal (SD/SMP/SMA) terakreditasi dengan Kurikulum Merdeka yang terintegrasi langsung dengan server Dapodik.
              </p>
            </motion.div>

            {/* Card 3: Pendidikan Diniyah */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInUp}
              className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 border border-slate-100 dark:border-zinc-800 transition-all duration-300 group"
            >
              <div className="h-14 w-14 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-sufi mb-3">
                Madrasah Diniyah
              </h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                Kurikulum diniyah formal berfokus pada penguasaan kitab kuning, Nahwu, Sharf, Tauhid, Fiqih, serta pembentukan akhlak karimah.
              </p>
            </motion.div>

          </div>

        </div>
      </section>

      {/* 4. Call to Action (CTA) */}
      <section className="py-24 relative overflow-hidden bg-white dark:bg-zinc-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 md:px-12 lg:px-16">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-emerald-800 to-emerald-600 p-10 md:p-16 text-white shadow-2xl text-center border border-emerald-500/30"
          >
            {/* Geometric Overlays inside CTA */}
            <div className="absolute top-0 left-0 w-full h-full bg-islamic-pattern opacity-10 pointer-events-none" />
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-8">
              <h2 className="text-3xl md:text-5xl font-bold text-white font-sufi leading-tight">
                Pendaftaran Santri Baru Telah Dibuka
              </h2>
              <p className="text-sm md:text-base text-emerald-50/90 leading-relaxed">
                Mari bergabung bersama keluarga besar kami. Dapatkan bimbingan intensif hafalan Al-Qur'an, pendidikan formal modern, dan asuhan keagamaan salafiyah yang berkualitas untuk putra-putri Anda.
              </p>
              
              {settings.status_pendaftaran ? (
                <div className="pt-4">
                  <Link
                    href="/login?tab=register"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-500/20 transition-all transform hover:-translate-y-1 active:translate-y-0"
                  >
                    Daftar Santri Online
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="pt-4">
                  <span className="inline-block px-6 py-3 rounded-2xl bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                    Pendaftaran Saat Ini Ditutup
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5. Footer */}
      <footer id="kontak" className="border-t border-emerald-100 dark:border-zinc-900 bg-emerald-950 text-emerald-50">
        
        {/* Main Footer Info */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 lg:px-16 py-16 grid grid-cols-1 md:grid-cols-12 gap-12 text-sm">
          
          <div className="md:col-span-5 space-y-6">
            <div className="flex items-center gap-3">
              {pesantrenLogo ? (
                <Image 
                  src={pesantrenLogo} 
                  alt="Logo" 
                  width={40}
                  height={40}
                  className="rounded-xl object-cover bg-white p-0.5" 
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white font-sufi font-bold text-xl shadow-sm">
                  P
                </div>
              )}
              <span className="font-bold text-lg tracking-wide font-sufi text-white">
                {brandName}
              </span>
            </div>
            <p className="text-emerald-200/80 leading-relaxed max-w-sm">
              Sistem Informasi Manajemen Pesantren modern berfokus pada keunggulan akademik, kelancaran tahfidz, dan efisiensi administrasi asrama.
            </p>
          </div>

          <div className="md:col-span-4 space-y-6">
            <h4 className="font-bold text-white uppercase tracking-widest text-xs">Kontak & Alamat</h4>
            <ul className="space-y-4 text-emerald-200/80">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{settings.alamat}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-amber-500 shrink-0" />
                <span>{settings.telepon}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-amber-500 shrink-0" />
                <span>{settings.email}</span>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-6">
            <h4 className="font-bold text-white uppercase tracking-widest text-xs">Media Sosial</h4>
            <div className="flex items-center gap-3">
              {settings.medsos_facebook && (
                <a 
                  href={settings.medsos_facebook} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="h-10 w-10 rounded-xl bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center text-emerald-400 hover:bg-emerald-800 hover:text-white transition-all"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M9 8H7v3h2v9h3v-9h2.72l.4-3H12V6.5A1 1 0 0 1 13 5.5h1.5V2H12a4 4 0 0 0-4 4z"/>
                  </svg>
                </a>
              )}
              {settings.medsos_instagram && (
                <a 
                  href={settings.medsos_instagram} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="h-10 w-10 rounded-xl bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center text-emerald-400 hover:bg-emerald-800 hover:text-white transition-all"
                >
                  <svg className="h-4 w-4 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </a>
              )}
              {settings.medsos_youtube && (
                <a 
                  href={settings.medsos_youtube} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="h-10 w-10 rounded-xl bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center text-emerald-400 hover:bg-emerald-800 hover:text-white transition-all"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.107C19.53 3.5 12 3.5 12 3.5s-7.53 0-9.388.556a3.003 3.003 0 0 0-2.11 2.107C0 8.022 0 12 0 12s0 3.978.502 5.837a3.003 3.003 0 0 0 2.11 2.107C4.47 20.5 12 20.5 12 20.5s7.53 0 9.388-.556a3.003 3.003 0 0 0 2.11-2.107C24 15.978 24 12 24 12s0-3.978-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-emerald-900/50 py-6 bg-black/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 lg:px-16 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-400/60">
            <p>&copy; {new Date().getFullYear()} {brandName}. Hak Cipta Dilindungi.</p>
            <p>Dibuat dengan dedikasi untuk Pesantren Modern.</p>
          </div>
        </div>

      </footer>

      </div>

      {isInstallable && (
        <button
          onClick={install}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs uppercase tracking-widest rounded-2xl shadow-2xl shadow-amber-500/30 transition-all duration-300 hover:-translate-y-1 active:translate-y-0"
        >
          <Download className="h-4 w-4" />
          Install App
        </button>
      )}

    </div>
  );
}
