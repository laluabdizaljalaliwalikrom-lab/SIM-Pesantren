'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Santri, KelancaranGrade } from '@/types/database';
import { Loader2, Search, BookOpen, AlertCircle, Sparkles, CheckCircle, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface RefSurah {
  id: number;
  nama_surah: string;
  jumlah_ayat: number;
}

interface FormSetoranTahfidzProps {
  santriList: Pick<Santri, 'id' | 'nis' | 'nama_lengkap'>[];
  onSuccess: () => void;
}

export default function FormSetoranTahfidz({ santriList, onSuccess }: FormSetoranTahfidzProps) {
  // Loading states
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Database Data
  const [surahList, setSurahList] = useState<RefSurah[]>([]);

  // Search & Combobox states for Surah
  const [surahSearch, setSurahSearch] = useState('');
  const [isSurahDropdownOpen, setIsSurahDropdownOpen] = useState(false);
  const surahDropdownRef = useRef<HTMLDivElement>(null);

  // Form states
  const [idSantri, setIdSantri] = useState('');
  const [tanggalSetoran, setTanggalSetoran] = useState(() => new Date().toISOString().split('T')[0]);
  const [juz, setJuz] = useState<number>(1);
  const [selectedSurah, setSelectedSurah] = useState<RefSurah | null>(null);
  const [ayatMulai, setAyatMulai] = useState<number>(1);
  const [ayatSelesai, setAyatSelesai] = useState<number>(1);
  const [nilaiKelancaran, setNilaiKelancaran] = useState<KelancaranGrade>('A');

  // Load ref_surah
  useEffect(() => {
    async function loadSurah() {
      try {
        setLoadingSurah(true);
        const { data, error } = await supabase
          .from('ref_surah')
          .select('id, nama_surah, jumlah_ayat')
          .order('id', { ascending: true });
        
        if (error) throw error;
        setSurahList(data || []);
      } catch (err: any) {
        console.error('Gagal mengambil data surah:', err);
        toast.error('Gagal mengambil daftar surah Al-Qur\'an');
      } finally {
        setLoadingSurah(false);
      }
    }
    loadSurah();
  }, []);

  // Filter surah list based on search term
  const filteredSurahList = useMemo(() => {
    if (!surahSearch.trim()) return surahList;
    return surahList.filter(s =>
      s.nama_surah.toLowerCase().includes(surahSearch.toLowerCase()) ||
      s.id.toString() === surahSearch.trim()
    );
  }, [surahList, surahSearch]);

  // Click outside surah dropdown handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (surahDropdownRef.current && !surahDropdownRef.current.contains(event.target as Node)) {
        setIsSurahDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch last setoran to auto-suggest Ayat Mulai
  useEffect(() => {
    if (!idSantri || !selectedSurah) return;

    const surahName = selectedSurah.nama_surah;
    const maxAyat = selectedSurah.jumlah_ayat;

    async function fetchLastSetoran() {
      try {
        const { data, error } = await supabase
          .from('presensi_tahfidz')
          .select('ayat_terakhir, juz')
          .eq('id_santri', idSantri)
          .eq('nama_surah', surahName)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const nextAyat = data[0].ayat_terakhir + 1;
          
          if (nextAyat <= maxAyat) {
            setAyatMulai(nextAyat);
            setAyatSelesai(nextAyat);
          } else {
            // Already finished this surah
            setAyatMulai(1);
            setAyatSelesai(1);
            toast.info(`Santri sudah menyelesaikan Surah ${surahName} sebelumnya.`);
          }

          if (data[0].juz) {
            setJuz(data[0].juz);
          }
        } else {
          // No previous record for this surah
          setAyatMulai(1);
          setAyatSelesai(1);
        }
      } catch (err) {
        console.error('Error fetching last setoran:', err);
      }
    }

    fetchLastSetoran();
  }, [idSantri, selectedSurah]);

  // Preview Text
  const previewText = useMemo(() => {
    if (!selectedSurah) return 'Silakan pilih surah untuk melihat preview setoran.';
    return `Menyetor Surah ${selectedSurah.nama_surah} ayat ${ayatMulai}-${ayatSelesai}`;
  }, [selectedSurah, ayatMulai, ayatSelesai]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idSantri) {
      toast.error('Pilih santri terlebih dahulu.');
      return;
    }
    if (!selectedSurah) {
      toast.error('Pilih surah terlebih dahulu.');
      return;
    }
    if (ayatMulai > selectedSurah.jumlah_ayat || ayatSelesai > selectedSurah.jumlah_ayat) {
      toast.error(`Jumlah ayat melebihi batas surah (${selectedSurah.jumlah_ayat} ayat).`);
      return;
    }
    if (ayatSelesai < ayatMulai) {
      toast.error('Ayat selesai tidak boleh kurang dari ayat mulai.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        id_santri: idSantri,
        tanggal_setoran: tanggalSetoran,
        juz: Number(juz),
        nama_surah: selectedSurah.nama_surah,
        ayat_terakhir: Number(ayatSelesai), // Saved into the database schema
        nilai_kelancaran: nilaiKelancaran,
        id_ustadz: user?.id || null,
      };

      const { error } = await supabase
        .from('presensi_tahfidz')
        .insert([payload]);

      if (error) throw error;

      toast.success('Setoran hafalan berhasil disimpan!');
      
      // Reset form fields except student and date for faster consecutive inputs
      setSelectedSurah(null);
      setSurahSearch('');
      setAyatMulai(1);
      setAyatSelesai(1);
      
      onSuccess();
    } catch (err: any) {
      console.error('Error saving setoran:', err);
      toast.error('Gagal menyimpan setoran: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="h-4.5 w-4.5 text-emerald-600" />
          Input Setoran Cerdas
        </h3>
        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-450 px-2 py-0.5 rounded-full font-bold">
          Emerald Theme
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Pilih Santri */}
        <div>
          <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
            Nama Santri *
          </label>
          <select
            required
            value={idSantri}
            onChange={(e) => {
              setIdSantri(e.target.value);
              setSelectedSurah(null); // Reset surah when student changes to reload suggestions
              setSurahSearch('');
            }}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm"
          >
            <option value="">-- Pilih Santri --</option>
            {santriList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama_lengkap} (NIS: {s.nis})
              </option>
            ))}
          </select>
        </div>

        {/* Tanggal & Juz */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
              Tanggal Setoran *
            </label>
            <input
              type="date"
              required
              value={tanggalSetoran}
              onChange={(e) => setTanggalSetoran(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
              Juz Ke- (1-30) *
            </label>
            <input
              type="number"
              required
              min={1}
              max={30}
              value={juz}
              onChange={(e) => setJuz(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm font-mono"
            />
          </div>
        </div>

        {/* Pilihan Surah - Searchable Combobox */}
        <div className="relative" ref={surahDropdownRef}>
          <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
            Pilih Surah *
          </label>
          <div 
            onClick={() => !loadingSurah && setIsSurahDropdownOpen(true)}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 flex items-center justify-between cursor-pointer focus-within:border-emerald-500 transition-all"
          >
            <span className={`text-xs sm:text-sm ${selectedSurah ? 'text-slate-800 dark:text-zinc-100 font-medium' : 'text-slate-400'}`}>
              {selectedSurah ? `${selectedSurah.id}. ${selectedSurah.nama_surah} (${selectedSurah.jumlah_ayat} ayat)` : 'Cari surah...'}
            </span>
            {loadingSurah ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>

          {/* Surah Dropdown Content */}
          {isSurahDropdownOpen && (
            <div className="absolute z-30 w-full mt-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-56">
              <div className="p-2 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2 bg-slate-50/50 dark:bg-zinc-950/20">
                <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Ketik nama atau nomor surah..."
                  value={surahSearch}
                  onChange={(e) => setSurahSearch(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-0"
                />
              </div>
              <div className="overflow-y-auto divide-y divide-slate-50 dark:divide-zinc-850">
                {filteredSurahList.length === 0 ? (
                  <p className="p-3 text-xs text-slate-400 italic text-center">Surah tidak ditemukan</p>
                ) : (
                  filteredSurahList.map((surah) => (
                    <button
                      key={surah.id}
                      type="button"
                      onClick={() => {
                        setSelectedSurah(surah);
                        setSurahSearch('');
                        setIsSurahDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800/40 text-xs sm:text-sm flex items-center justify-between text-slate-700 dark:text-zinc-300"
                    >
                      <span className="font-semibold">{surah.id}. {surah.nama_surah}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{surah.jumlah_ayat} Ayat</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ayat Mulai & Ayat Selesai */}
        {selectedSurah && (
          <div className="grid grid-cols-2 gap-4 bg-emerald-50/20 dark:bg-emerald-500/5 p-4 rounded-xl border border-emerald-100/30">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-emerald-700 dark:text-emerald-450 uppercase mb-1.5">
                Ayat Mulai (1-{selectedSurah.jumlah_ayat})
              </label>
              <input
                type="number"
                required
                min={1}
                max={selectedSurah.jumlah_ayat}
                value={ayatMulai}
                onChange={(e) => setAyatMulai(Math.min(Number(e.target.value), selectedSurah.jumlah_ayat))}
                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-emerald-700 dark:text-emerald-450 uppercase mb-1.5">
                Ayat Selesai (1-{selectedSurah.jumlah_ayat})
              </label>
              <input
                type="number"
                required
                min={ayatMulai}
                max={selectedSurah.jumlah_ayat}
                value={ayatSelesai}
                onChange={(e) => setAyatSelesai(Math.min(Number(e.target.value), selectedSurah.jumlah_ayat))}
                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm font-mono"
              />
            </div>
          </div>
        )}

        {/* Preview Hafalan Box */}
        {selectedSurah && (
          <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-850 p-3.5 rounded-xl flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0" />
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-400">Preview Setoran</span>
              <p className="text-xs text-slate-700 dark:text-zinc-300 font-semibold">{previewText}</p>
            </div>
          </div>
        )}

        {/* Kualitas Kelancaran */}
        <div>
          <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
            Kualitas Kelancaran *
          </label>
          <select
            required
            value={nilaiKelancaran}
            onChange={(e) => setNilaiKelancaran(e.target.value as KelancaranGrade)}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm"
          >
            <option value="A">Grade A : Sangat Lancar</option>
            <option value="B">Grade B : Lancar</option>
            <option value="C">Grade C : Cukup</option>
            <option value="D">Grade D : Kurang</option>
          </select>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || !idSantri || !selectedSurah}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-md shadow-emerald-600/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm"
        >
          {submitting ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <CheckCircle className="h-4.5 w-4.5" />}
          Simpan Setoran
        </button>

      </form>
    </div>
  );
}
