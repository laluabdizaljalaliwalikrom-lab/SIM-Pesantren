'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Santri } from '@/types/database';
import { Loader2, Search, BookOpen, CheckCircle, ChevronDown, User, Calendar, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface RefSurah {
  id: number;
  nama_surah: string;
  jumlah_ayat: number;
}

function getJuzFromSurah(surahId: number): number {
  if (surahId >= 78) return 30; // Juz Amma
  if (surahId === 1) return 1;
  if (surahId === 2) return 1;
  if (surahId === 3) return 3;
  if (surahId === 4) return 4;
  if (surahId === 5) return 6;
  if (surahId === 6) return 7;
  if (surahId === 7) return 8;
  if (surahId === 8) return 9;
  if (surahId === 9) return 10;
  if (surahId === 10) return 11;
  if (surahId === 11) return 11;
  if (surahId === 12) return 12;
  if (surahId === 13) return 13;
  if (surahId === 14) return 13;
  if (surahId === 15) return 14;
  if (surahId === 16) return 14;
  if (surahId === 17) return 15;
  if (surahId === 18) return 15;
  if (surahId === 19) return 16;
  if (surahId === 20) return 16;
  if (surahId === 21) return 17;
  if (surahId === 22) return 17;
  if (surahId === 23) return 18;
  if (surahId === 24) return 18;
  if (surahId === 25) return 18;
  if (surahId === 26) return 19;
  if (surahId === 27) return 19;
  if (surahId === 28) return 20;
  if (surahId === 29) return 20;
  if (surahId === 30) return 21;
  if (surahId === 31) return 21;
  if (surahId === 32) return 21;
  if (surahId === 33) return 21;
  if (surahId === 34) return 22;
  if (surahId === 35) return 22;
  if (surahId === 36) return 22;
  if (surahId === 37) return 23;
  if (surahId === 38) return 23;
  if (surahId === 39) return 23;
  if (surahId === 40) return 24;
  if (surahId === 41) return 24;
  if (surahId === 42) return 25;
  if (surahId === 43) return 25;
  if (surahId === 44) return 25;
  if (surahId === 45) return 25;
  if (surahId === 46) return 26;
  if (surahId === 47) return 26;
  if (surahId === 48) return 26;
  if (surahId === 49) return 26;
  if (surahId === 50) return 26;
  if (surahId === 51) return 26;
  if (surahId === 52) return 27;
  if (surahId === 53) return 27;
  if (surahId === 54) return 27;
  if (surahId === 55) return 27;
  if (surahId === 56) return 27;
  if (surahId === 57) return 27;
  if (surahId === 58) return 28;
  if (surahId === 59) return 28;
  if (surahId === 60) return 28;
  if (surahId === 61) return 28;
  if (surahId === 62) return 28;
  if (surahId === 63) return 28;
  if (surahId === 64) return 28;
  if (surahId === 65) return 28;
  if (surahId === 66) return 28;
  if (surahId === 67) return 29;
  if (surahId === 68) return 29;
  if (surahId === 69) return 29;
  if (surahId === 70) return 29;
  if (surahId === 71) return 29;
  if (surahId === 72) return 29;
  if (surahId === 73) return 29;
  if (surahId === 74) return 29;
  if (surahId === 75) return 29;
  if (surahId === 76) return 29;
  if (surahId === 77) return 29;
  return 1;
}

interface RefBook {
  id: string;
  nama_kitab: string;
  jumlah_item: number; // hadits or bait count
}

interface FormSetoranTahfidzProps {
  santriList: Pick<Santri, 'id' | 'nis' | 'nama_lengkap'>[];
  onSuccess: () => void;
  activeTab: 'quran' | 'hadits' | 'matan' | 'tahsin' | 'ujian';
}

export default function FormSetoranTahfidz({ santriList, onSuccess, activeTab }: FormSetoranTahfidzProps) {
  // Loading states
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reference lists
  const [surahList, setSurahList] = useState<RefSurah[]>([]);
  const [haditsKitabs, setHaditsKitabs] = useState<RefBook[]>([]);
  const [matanKitabs, setMatanKitabs] = useState<RefBook[]>([]);

  // Search/combobox states
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // User Profile Name (Penyimak)
  const [penyimakName, setPenyimakName] = useState('Memuat...');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Form states
  const [idSantri, setIdSantri] = useState('');
  const [tanggalSetoran, setTanggalSetoran] = useState(() => new Date().toISOString().split('T')[0]);
  const [jenisSetoran, setJenisSetoran] = useState<'Ziyadah' | 'Murojaah'>('Ziyadah');
  const [nilai, setNilai] = useState<'A+' | 'A' | 'B' | 'C' | 'D'>('A');
  const [catatan, setCatatan] = useState('');

  // Tab-specific states
  // Quran
  const [selectedSurah, setSelectedSurah] = useState<RefSurah | null>(null);
  const [ayatMulai, setAyatMulai] = useState<number>(1);
  const [ayatSelesai, setAyatSelesai] = useState<number>(1);

  // Hadits / Matan
  const [selectedBook, setSelectedBook] = useState<RefBook | null>(null);
  const [haditsKe, setHaditsKe] = useState<number>(1);
  const [baitMulai, setBaitMulai] = useState<number>(1);
  const [baitSelesai, setBaitSelesai] = useState<number>(1);

  // Tahsin
  const [jilidTahsin, setJilidTahsin] = useState<number>(1);
  const [halamanTahsin, setHalamanTahsin] = useState<number>(1);

  // Ujian
  const [materiUjian, setMateriUjian] = useState('');

  // Fetch logged-in user profile (Penyimak)
  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) {
          setPenyimakName('Tidak Terautentikasi');
          return;
        }
        setCurrentUserId(user.id);

        const { data: profile, error: profErr } = await supabase
          .from('profiles')
          .select('nama_lengkap')
          .eq('id', user.id)
          .single();

        if (profErr || !profile) {
          setPenyimakName(user.email || 'Ustadz / Pengasuh');
        } else {
          setPenyimakName(profile.nama_lengkap);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setPenyimakName('Penyimak');
      }
    }
    fetchUserProfile();
  }, []);

  // Fetch reference lists (Surah, Hadits, Matan)
  useEffect(() => {
    async function loadData() {
      setLoadingItems(true);
      try {
        // Load Surahs
        const { data: surahData } = await supabase
          .from('ref_surah')
          .select('id, nama_surah, jumlah_ayat')
          .order('id', { ascending: true });
        
        if (surahData) setSurahList(surahData);

        // Load Hadits Books
        const { data: haditsData } = await supabase
          .from('ref_hadits')
          .select('id, nama_kitab, jumlah_hadits')
          .order('nama_kitab', { ascending: true });

        if (haditsData && haditsData.length > 0) {
          setHaditsKitabs(haditsData.map(h => ({ id: h.id, nama_kitab: h.nama_kitab, jumlah_item: h.jumlah_hadits })));
        } else {
          // Fallback static
          setHaditsKitabs([
            { id: '1', nama_kitab: "Arba'in Nawawi", jumlah_item: 42 },
            { id: '2', nama_kitab: 'Riyadhus Shalihin', jumlah_item: 1896 },
          ]);
        }

        // Load Matan Books
        const { data: matanData } = await supabase
          .from('ref_matan')
          .select('id, nama_kitab, jumlah_bait')
          .order('nama_kitab', { ascending: true });

        if (matanData && matanData.length > 0) {
          setMatanKitabs(matanData.map(m => ({ id: m.id, nama_kitab: m.nama_kitab, jumlah_item: m.jumlah_bait })));
        } else {
          // Fallback static
          setMatanKitabs([
            { id: '1', nama_kitab: 'Tuhfatul Athfal', jumlah_item: 61 },
            { id: '2', nama_kitab: 'Al-Jazariyah', jumlah_item: 109 },
          ]);
        }
      } catch (err) {
        console.error('Error loading reference lists:', err);
        // Set hardcoded fallback
        setHaditsKitabs([
          { id: '1', nama_kitab: "Arba'in Nawawi", jumlah_item: 42 },
          { id: '2', nama_kitab: 'Riyadhus Shalihin', jumlah_item: 1896 },
        ]);
        setMatanKitabs([
          { id: '1', nama_kitab: 'Tuhfatul Athfal', jumlah_item: 61 },
          { id: '2', nama_kitab: 'Al-Jazariyah', jumlah_item: 109 },
        ]);
      } finally {
        setLoadingItems(false);
      }
    }
    loadData();
  }, [activeTab]);

  // Handle outside click for combobox
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter items based on query
  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return surahList;
    return surahList.filter(s =>
      s.nama_surah.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toString() === searchQuery.trim()
    );
  }, [surahList, searchQuery]);

  const filteredBooks = useMemo(() => {
    const list = activeTab === 'hadits' ? haditsKitabs : matanKitabs;
    if (!searchQuery.trim()) return list;
    return list.filter(b => b.nama_kitab.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeTab, haditsKitabs, matanKitabs, searchQuery]);

  // Reset form when tab changes
  useEffect(() => {
    setSelectedSurah(null);
    setSelectedBook(null);
    setSearchQuery('');
    setAyatMulai(1);
    setAyatSelesai(1);
    setBaitMulai(1);
    setBaitSelesai(1);
    setHaditsKe(1);
    setJilidTahsin(1);
    setHalamanTahsin(1);
    setMateriUjian('');
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idSantri) {
      toast.error('Pilih santri terlebih dahulu.');
      return;
    }

    // Validation per tab
    if (activeTab === 'quran') {
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
    } else if (activeTab === 'hadits') {
      if (!selectedBook) {
        toast.error('Pilih kitab terlebih dahulu.');
        return;
      }
      if (haditsKe > selectedBook.jumlah_item) {
        toast.error(`Nomor hadits melebihi batas kitab (${selectedBook.jumlah_item} hadits).`);
        return;
      }
    } else if (activeTab === 'matan') {
      if (!selectedBook) {
        toast.error('Pilih matan terlebih dahulu.');
        return;
      }
      if (baitMulai > selectedBook.jumlah_item || baitSelesai > selectedBook.jumlah_item) {
        toast.error(`Jumlah bait melebihi batas matan (${selectedBook.jumlah_item} bait).`);
        return;
      }
      if (baitSelesai < baitMulai) {
        toast.error('Bait selesai tidak boleh kurang dari bait mulai.');
        return;
      }
    } else if (activeTab === 'ujian') {
      if (!materiUjian.trim()) {
        toast.error('Isi materi ujian terlebih dahulu.');
        return;
      }
    }

    setSubmitting(true);
    try {
      // Build insertion payload
      const payload: any = {
        id_santri: idSantri,
        tanggal_setoran: tanggalSetoran,
        tipe_setoran: activeTab,
        penyimak: penyimakName,
        jenis_setoran: jenisSetoran,
        nilai_custom: nilai,
        nilai_kelancaran: nilai === 'A+' ? 'A' : nilai as any, // fallback for legacy enum constraint
        catatan: catatan.trim() || null,
        id_ustadz: currentUserId,
      };

      if (activeTab === 'quran' && selectedSurah) {
        payload.juz = getJuzFromSurah(selectedSurah.id);
        payload.nama_surah = selectedSurah.nama_surah;
        payload.ayat_mulai = Number(ayatMulai);
        payload.ayat_terakhir = Number(ayatSelesai);
      } else if (activeTab === 'hadits' && selectedBook) {
        payload.kitab_hadits_matan = selectedBook.nama_kitab;
        payload.hadits_ke = Number(haditsKe);
        payload.nama_surah = selectedBook.nama_kitab; // fallback for non-null column
        payload.juz = 1; // fallback
        payload.ayat_terakhir = Number(haditsKe); // fallback
      } else if (activeTab === 'matan' && selectedBook) {
        payload.kitab_hadits_matan = selectedBook.nama_kitab;
        payload.ayat_mulai = Number(baitMulai);
        payload.ayat_terakhir = Number(baitSelesai);
        payload.nama_surah = selectedBook.nama_kitab; // fallback for non-null column
        payload.juz = 1; // fallback
      } else if (activeTab === 'tahsin') {
        payload.jilid_tahsin = Number(jilidTahsin);
        payload.halaman_tahsin = Number(halamanTahsin);
        payload.nama_surah = `Tahsin Jilid ${jilidTahsin}`; // fallback for non-null column
        payload.juz = jilidTahsin; // fallback
        payload.ayat_terakhir = halamanTahsin; // fallback
      } else if (activeTab === 'ujian') {
        payload.materi_ujian = materiUjian;
        payload.nama_surah = `Ujian: ${materiUjian}`; // fallback for non-null column
        payload.juz = 1; // fallback
        payload.ayat_terakhir = 1; // fallback
      }

      const { error } = await supabase
        .from('presensi_tahfidz')
        .insert([payload]);

      if (error) throw error;

      toast.success(`Setoran ${activeTab.toUpperCase()} berhasil disimpan!`);
      
      // Reset form variables (keep student and date)
      setCatatan('');
      setSelectedSurah(null);
      setSelectedBook(null);
      setSearchQuery('');
      setMateriUjian('');
      
      onSuccess();
    } catch (err: any) {
      console.error('Error saving setoran:', err);
      toast.error('Gagal menyimpan data: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="h-4.5 w-4.5 text-emerald-600" />
          Input Setoran {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </h3>
        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-450 px-2 py-0.5 rounded-full font-bold">
          Aktif
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Tanggal Setoran */}
        <div>
          <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-550 uppercase mb-1.5">
            Tanggal *
          </label>
          <input
            type="date"
            required
            value={tanggalSetoran}
            onChange={(e) => setTanggalSetoran(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm font-mono"
          />
        </div>

        {/* Pilih Santri */}
        <div>
          <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-550 uppercase mb-1.5">
            Nama Santri *
          </label>
          <select
            required
            value={idSantri}
            onChange={(e) => setIdSantri(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm"
          >
            <option value="">Pilih santri</option>
            {santriList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama_lengkap} (NIS: {s.nis})
              </option>
            ))}
          </select>
        </div>

        {/* Nama Penyimak (Automatic from auth user) */}
        <div>
          <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-550 uppercase mb-1.5">
            Nama Penyimak *
          </label>
          <div className="w-full bg-slate-100 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-850 rounded-xl px-3 py-2.5 text-slate-550 dark:text-zinc-400 text-xs sm:text-sm flex items-center gap-2 select-none">
            <User className="h-4 w-4 text-slate-400" />
            {penyimakName}
          </div>
        </div>

        {/* Jenis Setoran */}
        <div>
          <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-550 uppercase mb-1.5">
            Jenis Setoran *
          </label>
          <select
            required
            value={jenisSetoran}
            onChange={(e) => setJenisSetoran(e.target.value as any)}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm"
          >
            <option value="Ziyadah">Ziyadah</option>
            <option value="Murojaah">Murojaah</option>
          </select>
        </div>

        {/* --- QURAN TAB INPUTS --- */}
        {activeTab === 'quran' && (
          <>
            {/* Pilih Surah - Combobox */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-550 uppercase mb-1.5">
                Surah *
              </label>
              <div 
                onClick={() => !loadingItems && setIsDropdownOpen(true)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 flex items-center justify-between cursor-pointer focus-within:border-emerald-500 transition-all"
              >
                <span className={`text-xs sm:text-sm ${selectedSurah ? 'text-slate-800 dark:text-zinc-100 font-medium' : 'text-slate-400'}`}>
                  {selectedSurah ? `${selectedSurah.id}. ${selectedSurah.nama_surah} (${selectedSurah.jumlah_ayat} ayat)` : 'Pilih surah'}
                </span>
                {loadingItems ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>

              {isDropdownOpen && (
                <div className="absolute z-30 w-full mt-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-56">
                  <div className="p-2 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2 bg-slate-50/50 dark:bg-zinc-950/20">
                    <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Cari surah..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-0"
                    />
                  </div>
                  <div className="overflow-y-auto divide-y divide-slate-55 dark:divide-zinc-850">
                    {filteredSurahs.length === 0 ? (
                      <p className="p-3 text-xs text-slate-400 italic text-center">Surah tidak ditemukan</p>
                    ) : (
                      filteredSurahs.map((surah) => (
                        <button
                          key={surah.id}
                          type="button"
                          onClick={() => {
                            setSelectedSurah(surah);
                            setSearchQuery('');
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-55 dark:hover:bg-zinc-800/40 text-xs sm:text-sm flex items-center justify-between text-slate-700 dark:text-zinc-300"
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

            {/* Juz is calculated automatically from selected Surah */}

            {/* Ayat Mulai & Selesai */}
            {selectedSurah && (
              <div className="grid grid-cols-2 gap-4 bg-emerald-50/20 dark:bg-emerald-500/5 p-4 rounded-xl border border-emerald-100/30">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-emerald-700 dark:text-emerald-450 uppercase mb-1.5">
                    Ayat Dari *
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
                    Ayat Sampai *
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
          </>
        )}

        {/* --- HADITS TAB INPUTS --- */}
        {activeTab === 'hadits' && (
          <>
            {/* Pilih Kitab Hadits */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-550 uppercase mb-1.5">
                Kitab Hadits *
              </label>
              <div 
                onClick={() => !loadingItems && setIsDropdownOpen(true)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 flex items-center justify-between cursor-pointer focus-within:border-emerald-500 transition-all"
              >
                <span className={`text-xs sm:text-sm ${selectedBook ? 'text-slate-800 dark:text-zinc-100 font-medium' : 'text-slate-400'}`}>
                  {selectedBook ? `${selectedBook.nama_kitab} (${selectedBook.jumlah_item} hadits)` : 'Pilih kitab'}
                </span>
                {loadingItems ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>

              {isDropdownOpen && (
                <div className="absolute z-30 w-full mt-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-56">
                  <div className="p-2 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2 bg-slate-50/50 dark:bg-zinc-950/20">
                    <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Cari kitab..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-0"
                    />
                  </div>
                  <div className="overflow-y-auto divide-y divide-slate-55 dark:divide-zinc-850">
                    {filteredBooks.length === 0 ? (
                      <p className="p-3 text-xs text-slate-400 italic text-center">Kitab tidak ditemukan</p>
                    ) : (
                      filteredBooks.map((book) => (
                        <button
                          key={book.id}
                          type="button"
                          onClick={() => {
                            setSelectedBook(book);
                            setSearchQuery('');
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-55 dark:hover:bg-zinc-800/40 text-xs sm:text-sm flex items-center justify-between text-slate-700 dark:text-zinc-300"
                        >
                          <span className="font-semibold">{book.nama_kitab}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{book.jumlah_item} Hadits</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Hadits Ke- */}
            {selectedBook && (
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-550 uppercase mb-1.5">
                  Hadits Ke- (1-{selectedBook.jumlah_item}) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={selectedBook.jumlah_item}
                  value={haditsKe}
                  onChange={(e) => setHaditsKe(Math.min(Number(e.target.value), selectedBook.jumlah_item))}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm font-mono"
                />
              </div>
            )}
          </>
        )}

        {/* --- MATAN TAB INPUTS --- */}
        {activeTab === 'matan' && (
          <>
            {/* Pilih Kitab Matan */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-550 uppercase mb-1.5">
                Kitab Matan *
              </label>
              <div 
                onClick={() => !loadingItems && setIsDropdownOpen(true)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 flex items-center justify-between cursor-pointer focus-within:border-emerald-500 transition-all"
              >
                <span className={`text-xs sm:text-sm ${selectedBook ? 'text-slate-800 dark:text-zinc-100 font-medium' : 'text-slate-400'}`}>
                  {selectedBook ? `${selectedBook.nama_kitab} (${selectedBook.jumlah_item} bait)` : 'Pilih kitab'}
                </span>
                {loadingItems ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>

              {isDropdownOpen && (
                <div className="absolute z-30 w-full mt-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-56">
                  <div className="p-2 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2 bg-slate-50/50 dark:bg-zinc-950/20">
                    <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Cari kitab..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-0"
                    />
                  </div>
                  <div className="overflow-y-auto divide-y divide-slate-55 dark:divide-zinc-850">
                    {filteredBooks.length === 0 ? (
                      <p className="p-3 text-xs text-slate-400 italic text-center">Kitab tidak ditemukan</p>
                    ) : (
                      filteredBooks.map((book) => (
                        <button
                          key={book.id}
                          type="button"
                          onClick={() => {
                            setSelectedBook(book);
                            setSearchQuery('');
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-55 dark:hover:bg-zinc-800/40 text-xs sm:text-sm flex items-center justify-between text-slate-700 dark:text-zinc-300"
                        >
                          <span className="font-semibold">{book.nama_kitab}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{book.jumlah_item} Bait</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bait Mulai & Bait Selesai */}
            {selectedBook && (
              <div className="grid grid-cols-2 gap-4 bg-emerald-50/20 dark:bg-emerald-500/5 p-4 rounded-xl border border-emerald-100/30">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-emerald-700 dark:text-emerald-450 uppercase mb-1.5">
                    Bait Dari *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={selectedBook.jumlah_item}
                    value={baitMulai}
                    onChange={(e) => setBaitMulai(Math.min(Number(e.target.value), selectedBook.jumlah_item))}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-emerald-700 dark:text-emerald-450 uppercase mb-1.5">
                    Bait Sampai *
                  </label>
                  <input
                    type="number"
                    required
                    min={baitMulai}
                    max={selectedBook.jumlah_item}
                    value={baitSelesai}
                    onChange={(e) => setBaitSelesai(Math.min(Number(e.target.value), selectedBook.jumlah_item))}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* --- TAHSIN TAB INPUTS --- */}
        {activeTab === 'tahsin' && (
          <div className="grid grid-cols-2 gap-4 bg-emerald-50/20 dark:bg-emerald-500/5 p-4 rounded-xl border border-emerald-100/30">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-emerald-700 dark:text-emerald-450 uppercase mb-1.5">
                Jilid *
              </label>
              <select
                value={jilidTahsin}
                onChange={(e) => setJilidTahsin(Number(e.target.value))}
                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm font-mono"
              >
                {[1, 2, 3, 4, 5, 6].map(j => (
                  <option key={j} value={j}>Jilid {j}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-emerald-700 dark:text-emerald-450 uppercase mb-1.5">
                Halaman *
              </label>
              <input
                type="number"
                required
                min={1}
                value={halamanTahsin}
                onChange={(e) => setHalamanTahsin(Math.max(1, Number(e.target.value)))}
                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm font-mono"
              />
            </div>
          </div>
        )}

        {/* --- UJIAN TAB INPUTS --- */}
        {activeTab === 'ujian' && (
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-550 uppercase mb-1.5">
              Materi Ujian *
            </label>
            <input
              type="text"
              required
              placeholder="cth: Juz 30, Kitab Tuhfatul Athfal"
              value={materiUjian}
              onChange={(e) => setMateriUjian(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm"
            />
          </div>
        )}

        {/* Nilai / Kualitas */}
        <div>
          <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-550 uppercase mb-1.5">
            Nilai *
          </label>
          <select
            required
            value={nilai}
            onChange={(e) => setNilai(e.target.value as any)}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm font-mono"
          >
            <option value="A+">A+</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </div>

        {/* Catatan */}
        <div>
          <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-550 uppercase mb-1.5">
            Catatan (Opsional)
          </label>
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Catatan tambahan..."
            rows={3}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || !idSantri || (activeTab === 'quran' && !selectedSurah) || (activeTab === 'hadits' && !selectedBook) || (activeTab === 'matan' && !selectedBook)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-md shadow-emerald-600/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm"
        >
          {submitting ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <CheckCircle className="h-4.5 w-4.5" />}
          Simpan Data
        </button>

      </form>
    </div>
  );
}
