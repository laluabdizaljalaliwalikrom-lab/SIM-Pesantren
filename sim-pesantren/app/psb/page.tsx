import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { GraduationCap, BookOpen, HeartHandshake, CalendarDays, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

export const revalidate = 60;

export default async function PpdbLandingPage() {
  let brand = { nama_pesantren: 'SIM Pesantren', alamat: '', telepon: '', email: '' };
  try {
    const { data } = await supabase
      .from('pesantren_profile')
      .select('nama_pesantren, alamat, telp, email, logo_url')
      .maybeSingle();
    if (data) brand = { nama_pesantren: data.nama_pesantren, alamat: data.alamat || '', telepon: data.telp || '', email: data.email || '' };
  } catch {}

  let gelombangAktif: any[] = [];
  try {
    const { data } = await supabase
      .from('gelombang_pendaftaran')
      .select('*')
      .eq('aktif', true)
      .gte('tanggal_selesai', new Date().toISOString().split('T')[0])
      .order('tanggal_mulai', { ascending: true });
    if (data) gelombangAktif = data;
  } catch {}

  const jalurInfo = [
    { nama: 'Reguler', icon: BookOpen, desc: 'Pendaftaran umum untuk seluruh calon santri.', color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
    { nama: 'Prestasi', icon: Sparkles, desc: 'Jalur prestasi akademik & non-akademik (hafalan Quran, juara lomba, dll).', color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
    { nama: 'Afirmasi', icon: HeartHandshake, desc: 'Khusus yatim, piatu, yatim piatu, dan kurang mampu.', color: 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' },
  ];

  const tahapan = [
    { icon: GraduationCap, label: 'Daftar Akun', desc: 'Buat akun PPDB dengan data dasar' },
    { icon: CheckCircle, label: 'Lengkapi Berkas', desc: 'Upload dokumen persyaratan' },
    { icon: BookOpen, label: 'Ikuti Seleksi', desc: 'Tes tulis, baca Quran, wawancara' },
    { icon: CalendarDays, label: 'Daftar Ulang', desc: 'Konfirmasi & jadi santri' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4">

      <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -right-32 -top-32 w-96 h-96 bg-emerald-100 dark:bg-emerald-900/20 rounded-full blur-[80px] opacity-60" />
          <div className="absolute -left-32 -bottom-32 w-96 h-96 bg-teal-100 dark:bg-teal-900/20 rounded-full blur-[80px] opacity-50" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold tracking-wide mb-6">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            PPDB {new Date().getFullYear()} Sedang Dibuka
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight mb-4">
            Penerimaan Santri Baru
          </h1>
          <p className="text-lg md:text-xl text-slate-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-10">
            {brand.nama_pesantren} membuka pendaftaran santri baru. Daftar sekarang dan bergabung bersama kami.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/psb/daftar"
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 text-base">
              Daftar Sekarang <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/psb/login"
              className="inline-flex items-center justify-center gap-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold px-8 py-3.5 rounded-xl transition-all text-base shadow-sm">
              Lanjutkan Pendaftaran
            </Link>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Jalur Pendaftaran</h2>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-2">Pilih jalur yang sesuai dengan kriteria Anda</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {jalurInfo.map((j) => (
            <div key={j.nama} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-200">
              <div className={`w-12 h-12 rounded-xl ${j.color} flex items-center justify-center mb-4`}>
                <j.icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-zinc-200">{j.nama}</h3>
              <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1 leading-relaxed">{j.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Tahapan PPDB</h2>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-2">Ikuti langkah-langkah berikut untuk mendaftar</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tahapan.map((t, i) => (
            <div key={t.label} className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 text-center">
              <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shadow-md">
                {i + 1}
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <t.icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-zinc-200">{t.label}</h3>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {gelombangAktif.length > 0 && (
        <section className="pb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Gelombang Aktif</h2>
            <p className="text-slate-500 dark:text-zinc-400 text-sm mt-2">Gelombang pendaftaran yang sedang berjalan</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {gelombangAktif.map((g) => (
              <div key={g.id} className="bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 rounded-2xl shadow-sm p-6 border-l-4 border-l-emerald-500 hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-zinc-200">{g.nama}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20">
                    Aktif
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Buka</p>
                    <p className="font-medium text-slate-700 dark:text-zinc-300">{new Date(g.tanggal_mulai).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Tutup</p>
                    <p className="font-medium text-slate-700 dark:text-zinc-300">{new Date(g.tanggal_selesai).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Kuota</p>
                    <p className="font-medium text-slate-700 dark:text-zinc-300">{g.kuota} santri</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="pb-24 text-center">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-10 md:p-14 shadow-xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">Siap Bergabung?</h2>
          <p className="text-emerald-100 text-sm md:text-base max-w-md mx-auto mb-8">
            Daftar sekarang dan jadilah bagian dari keluarga besar {brand.nama_pesantren}.
          </p>
          <Link href="/psb/daftar"
            className="inline-flex items-center justify-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 font-bold px-8 py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 text-base">
            Daftar Sekarang <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

    </div>
  );
}
