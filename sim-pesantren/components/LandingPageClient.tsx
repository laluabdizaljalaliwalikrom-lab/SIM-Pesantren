'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, Variants } from 'framer-motion';
import { 
  GraduationCap, 
  ArrowRight, 
  BookOpen, 
  Bookmark, 
  MapPin, 
  Phone, 
  Mail, 
  ChevronRight,
  Sparkles,
  School,
  Activity
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

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
}

export default function LandingPageClient({ 
  settings, 
  pesantrenLogo, 
  pesantrenName,
  pesantrenVisi = '',
  pesantrenMisi = '',
  pesantrenPimpinan = '',
  pesantrenPimpinanFoto = ''
}: LandingPageClientProps) {
  const brandName = pesantrenName || 'SIM Pesantren';

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
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 transition-colors duration-300 font-sans flex flex-col justify-between overflow-x-hidden">
      
      {/* 1. Header / Navbar */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-zinc-900/70 border-b border-slate-200/50 dark:border-zinc-800/50 transition-colors duration-200"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {pesantrenLogo ? (
              <Image 
                src={pesantrenLogo} 
                alt="Logo" 
                width={36}
                height={36}
                className="rounded-lg object-cover shadow-md" 
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white font-extrabold text-lg shadow-md shadow-emerald-500/25">
                P
              </div>
            )}
            <span className="font-extrabold text-base tracking-wide bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-200 bg-clip-text text-transparent truncate max-w-[150px] sm:max-w-xs">
              {brandName}
            </span>
          </div>

          {/* Menu Navigasi */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            <a href="#home" className="hover:text-emerald-600 dark:hover:text-emerald-450 transition-colors">Home</a>
            <a href="#program" className="hover:text-emerald-600 dark:hover:text-emerald-450 transition-colors">Program</a>
            <a href="#kontak" className="hover:text-emerald-600 dark:hover:text-emerald-450 transition-colors">Kontak</a>
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:border-emerald-500 bg-emerald-50/20 dark:bg-emerald-500/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-all"
            >
              Login
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </motion.header>

      {/* 2. Hero Section */}
      <section id="home" className="relative flex-1 py-16 md:py-24 flex items-center justify-center bg-radial-gradient">
        {/* Soft background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl w-full mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Left Side: Tagline Text */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-7 space-y-6 text-center lg:text-left"
          >
            <motion.span 
              variants={fadeInUp}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
            >
              <Sparkles className="h-3 w-3 text-emerald-500" />
              SIM Pesantren Terintegrasi
            </motion.span>
            
            <motion.h1 
              variants={fadeInUp}
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]"
            >
              {settings.tagline_title}
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="text-sm sm:text-base text-slate-500 dark:text-zinc-400 max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              {settings.tagline_description}
            </motion.p>

            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4"
            >
              {settings.status_pendaftaran && (
                <Link
                  href="/login?tab=register"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/25 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Daftar Sekarang
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
              <a
                href="#program"
                className="w-full sm:w-auto flex items-center justify-center gap-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900/60 text-slate-600 dark:text-slate-350 font-bold text-xs px-6 py-3.5 rounded-2xl transition-all"
              >
                Pelajari Lebih Lanjut
              </a>
            </motion.div>
          </motion.div>

          {/* Right Side: Decorative mosque/pesantren placeholder with beautiful premium bento mockup */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="lg:col-span-5 w-full max-w-lg lg:max-w-none mx-auto relative"
          >
            {/* Ambient Shadow glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-3xl blur-2xl opacity-50" />
            
            {/* Interactive features card grid */}
            <div className="relative grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-5 rounded-3xl shadow-sm flex flex-col justify-between h-36 transform hover:-translate-y-1 transition-all duration-200">
                  <div className="h-9 w-9 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wide">Data Santri</h4>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Database, data wali, & asrama</p>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-5 rounded-3xl shadow-sm flex flex-col justify-between h-40 transform hover:-translate-y-1 transition-all duration-200">
                  <div className="h-9 w-9 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl flex items-center justify-center">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wide">Tahfidz Tracker</h4>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Laporan perkembangan setoran hafalan real-time</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6">
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-5 rounded-3xl shadow-sm flex flex-col justify-between h-40 transform hover:-translate-y-1 transition-all duration-200">
                  <div className="h-9 w-9 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-xl flex items-center justify-center">
                    <School className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wide">Lembaga Formal</h4>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Sekolah formal tingkat SD/SMP/SMA terintegrasi Dapodik</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-5 rounded-3xl shadow-sm flex flex-col justify-between h-36 transform hover:-translate-y-1 transition-all duration-200">
                  <div className="h-9 w-9 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                    <Bookmark className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wide">Kitab Kuning</h4>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Kurikulum Diniyah & kajian kitab terstruktur</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* 2.5. Profile, Sambutan & Visi Misi Section */}
      {(pesantrenPimpinan || pesantrenVisi || pesantrenMisi) && (
        <section className="py-20 bg-slate-100/50 dark:bg-zinc-950 border-t border-slate-200/50 dark:border-zinc-900 transition-colors">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Column 1: Sambutan Pimpinan (Left) */}
            {pesantrenPimpinan && (
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeInUp}
                className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-850 rounded-3xl p-6 md:p-8 shadow-sm space-y-6"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450 uppercase tracking-widest">
                    Sambutan Pimpinan
                  </span>
                  <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">
                    Kata Sambutan Pimpinan Lembaga
                  </h2>
                </div>
                
                <div className="h-px bg-slate-100 dark:bg-zinc-800" />
                
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {pesantrenPimpinanFoto && (
                    <div className="w-full md:w-1/3 shrink-0">
                      <Image 
                        src={pesantrenPimpinanFoto} 
                        alt={pesantrenPimpinan} 
                        width={300}
                        height={400}
                        className="w-full h-56 md:h-72 object-cover rounded-2xl border border-slate-200 dark:border-zinc-850 shadow-md"
                      />
                    </div>
                  )}
                  <div className="flex-1 space-y-4 text-xs md:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed italic">
                    <p>
                      Assalamu'alaikum Warahmatullahi Wabarakatuh,
                    </p>
                    <p>
                      Alhamdulillah, segala puji bagi Allah SWT yang telah melimpahkan rahmat and hidayah-Nya kepada kita semua. Di era teknologi digital ini, {brandName} terus berkomitmen untuk memberikan pelayanan pendidikan terbaik dengan memadukan nilai-nilai luhur kepesantrenan tradisional (salaf) dengan inovasi sistem manajemen modern.
                    </p>
                    <p>
                      Melalui platform SIM Pesantren ini, kami berharap silaturahmi, transparansi administrasi, dan koordinasi perkembangan belajar santri baik secara akademis formal maupun tahfidz Al-Qur'an dengan para wali santri dapat terjalin secara lebih optimal.
                    </p>
                    <p>
                      Wassalamu'alaikum Warahmatullahi Wabarakatuh.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 pt-2">
                  {pesantrenPimpinanFoto ? (
                    <Image 
                      src={pesantrenPimpinanFoto} 
                      alt={pesantrenPimpinan} 
                      width={40}
                      height={40}
                      className="rounded-full object-cover border border-emerald-500/20"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-450 font-bold text-sm">
                      {pesantrenPimpinan.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs md:text-sm">{pesantrenPimpinan}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">Pimpinan {brandName}</p>
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
                variants={fadeInUp}
                className="lg:col-span-5 space-y-6"
              >
                {/* Visi */}
                {pesantrenVisi && (
                  <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-850 rounded-3xl p-6 shadow-sm space-y-3">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450 uppercase tracking-widest block">
                      Visi Kami
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                      Visi
                    </h3>
                    <p className="text-xs md:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed font-semibold">
                      {pesantrenVisi}
                    </p>
                  </div>
                )}

                {/* Misi */}
                {pesantrenMisi && (
                  <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-850 rounded-3xl p-6 shadow-sm space-y-3">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450 uppercase tracking-widest block">
                      Misi Kami
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                      Misi
                    </h3>
                    <ul className="space-y-2 text-xs md:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed list-none pl-0">
                      {pesantrenMisi.split('\n').filter(Boolean).map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0 flex items-center justify-center text-emerald-600 dark:text-emerald-450 font-bold text-[9px]">
                            {idx + 1}
                          </span>
                          <span>{point.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}

          </div>
        </section>
      )}

      {/* 3. Feature / Program Section */}
      <section id="program" className="py-20 bg-white dark:bg-zinc-900/40 border-y border-slate-200/50 dark:border-zinc-900 transition-colors">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          
          <div className="text-center max-w-xl mx-auto space-y-2.5">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450 uppercase tracking-widest">
              Layanan Pendidikan
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Program Kurikulum Unggulan
            </h2>
            <p className="text-xs text-slate-400 dark:text-zinc-500 leading-relaxed">
              Kami menyelenggarakan kurikulum pendidikan yang seimbang antara ilmu agama, formal akademik, serta pembentukan karakter.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Tahfidz */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInUp}
              className="bg-slate-50 dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800/80 p-6 rounded-3xl hover:border-emerald-500/30 dark:hover:border-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300"
            >
              <div className="h-10 w-10 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4">
                <Bookmark className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-2">
                Tahfidz Al-Qur'an
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Program hafalan Qur'an intensif dengan target setoran berkala yang teratur. Data riwayat setoran, juz, surah, dan nilai kelancaran dipantau langsung oleh Wali Santri secara online.
              </p>
            </motion.div>

            {/* Card 2: Formal Dapodik */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInUp}
              className="bg-slate-50 dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800/80 p-6 rounded-3xl hover:border-emerald-500/30 dark:hover:border-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300"
            >
              <div className="h-10 w-10 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl flex items-center justify-center mb-4">
                <School className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-2">
                Sekolah Formal (Dapodik)
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Penyelenggaraan sekolah formal di bawah Kemendikbud (SD, SMP, SMA) dengan Kurikulum Merdeka terbaru yang lengkap, terstruktur, serta terintegrasi langsung dengan server Dapodik nasional.
              </p>
            </motion.div>

            {/* Card 3: Pendidikan Diniyah Kemenag */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInUp}
              className="bg-slate-50 dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800/80 p-6 rounded-3xl hover:border-emerald-500/30 dark:hover:border-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300"
            >
              <div className="h-10 w-10 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-2xl flex items-center justify-center mb-4">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-2">
                Madrasah Diniyah (Kemenag)
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Kurikulum diniyah formal standar Kemenag (Ula, Wustha, Ulya) berfokus pada penguasaan kitab kuning, Nahwu, Sharf, Tauhid, Fiqih, Aqidah, dan materi akhlak keagamaan khas pesantren.
              </p>
            </motion.div>

          </div>

        </div>
      </section>

      {/* 4. Call to Action (CTA) */}
      <section className="py-16 md:py-20 relative overflow-hidden bg-slate-50 dark:bg-zinc-950">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-500 p-8 md:p-12 text-white shadow-xl text-center"
          >
            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-white/5 blur-lg pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Pendaftaran Santri Baru Telah Dibuka!
              </h2>
              <p className="text-xs md:text-sm text-emerald-50/90 leading-relaxed">
                Mari bergabung bersama keluarga besar kami. Dapatkan bimbingan intensif hafalan Al-Qur'an, pendidikan formal modern, dan asuhan keagamaan salafiyah yang berkualitas untuk putra-putri Anda.
              </p>
              
              {settings.status_pendaftaran ? (
                <div className="pt-2">
                  <Link
                    href="/login?tab=register"
                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-emerald-700 hover:bg-emerald-50 font-bold text-xs rounded-2xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Daftar Santri Online
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <span className="inline-block px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-wider">
                  Pendaftaran Gelombang Ini Sedang Ditutup
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5. Footer */}
      <footer id="kontak" className="border-t border-slate-200 dark:border-zinc-900 bg-white dark:bg-zinc-900 transition-colors">
        
        {/* Main Footer Info */}
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-12 gap-8 text-xs">
          
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              {pesantrenLogo ? (
                <Image 
                  src={pesantrenLogo} 
                  alt="Logo" 
                  width={32}
                  height={32}
                  className="rounded-lg object-cover" 
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white font-extrabold text-base shadow-sm">
                  P
                </div>
              )}
              <span className="font-extrabold text-sm tracking-wide text-slate-800 dark:text-zinc-200">
                {brandName}
              </span>
            </div>
            <p className="text-slate-400 dark:text-zinc-500 leading-relaxed max-w-sm">
              Sistem Informasi Manajemen Pesantren modern berfokus pada keunggulan akademik, kelancaran tahfidz, dan efisiensi administrasi asrama.
            </p>
          </div>

          <div className="md:col-span-4 space-y-4">
            <h4 className="font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Kontak & Alamat</h4>
            <ul className="space-y-3 text-slate-500 dark:text-zinc-400">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{settings.alamat}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{settings.telepon}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{settings.email}</span>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-4">
            <h4 className="font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Media Sosial</h4>
            <div className="flex items-center gap-3">
              {settings.medsos_facebook && (
                <a 
                  href={settings.medsos_facebook} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="h-8 w-8 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
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
                  className="h-8 w-8 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
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
                  className="h-8 w-8 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
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
        <div className="border-t border-slate-200 dark:border-zinc-900 py-6 bg-slate-50 dark:bg-zinc-950/60 transition-colors">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-400 dark:text-zinc-500">
            <p>&copy; 2026 {brandName}. Hak Cipta Dilindungi.</p>
            <p>Dibuat secara profesional untuk manajemen pesantren modern.</p>
          </div>
        </div>

      </footer>

    </div>
  );
}
