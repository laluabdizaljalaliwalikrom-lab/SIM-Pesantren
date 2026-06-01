'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Sekolah, Kelas, Mapel } from '@/types/database';
import { 
  BookOpen, 
  School, 
  Layers, 
  BookMarked,
  Save, 
  Download, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Info,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface NilaiInputState {
  id_santri: string;
  nis: string;
  nama_lengkap: string;
  nilai: string; // string untuk memudahkan handling input kosong
  catatan: string;
}

export default function NilaiAkademikPage() {
  // Master Data dari Database
  const [sekolahList, setSekolahList] = useState<Sekolah[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  
  // State Filter Aktif
  const [selectedSekolah, setSelectedSekolah] = useState<string>('');
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [selectedMapel, setSelectedMapel] = useState<string>('');

  // State Data Santri & Nilai
  const [loadingMaster, setLoadingMaster] = useState<boolean>(true);
  const [loadingSantri, setLoadingSantri] = useState<boolean>(false);
  const [nilaiList, setNilaiList] = useState<NilaiInputState[]>([]);
  
  // State Submitting & Saving
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // State Mata Pelajaran dari tabel mapel
  const [mapelList, setMapelList] = useState<Mapel[]>([]);

  // State tambahan untuk nilai
  const [semester, setSemester] = useState<number>(1);
  const [tahunAjaran, setTahunAjaran] = useState<string>('2025/2026');
  const [jenisUjian, setJenisUjian] = useState<string>('Harian');

  // Fetch data sekolah dan kelas untuk filter utama
  const fetchMasterData = useCallback(async () => {
    try {
      setLoadingMaster(true);
      
      // Fetch Sekolah
      const { data: sekolahData, error: sekolahErr } = await supabase
        .from('sekolah')
        .select('*')
        .order('nama_sekolah', { ascending: true });

      if (sekolahErr) throw sekolahErr;
      setSekolahList(sekolahData || []);

      // Fetch Kelas
      const { data: kelasData, error: kelasErr } = await supabase
        .from('kelas')
        .select('*')
        .order('tingkat', { ascending: true })
        .order('nama_kelas', { ascending: true });

      if (kelasErr) throw kelasErr;
      setKelasList(kelasData || []);

      // Fetch Mapel
      const { data: mapelData, error: mapelErr } = await supabase
        .from('mapel')
        .select('*')
        .order('nama_mapel', { ascending: true });

      if (mapelErr) throw mapelErr;
      setMapelList(mapelData || []);

      // Fetch Tahun Ajaran aktif
      const { data: taData, error: taErr } = await supabase
        .from('tahun_ajaran')
        .select('*')
        .eq('status_aktif', true)
        .single();

      if (taErr && taErr.code !== 'PGRST116') throw taErr; // PGRST116 = not found
      if (taData) {
        setTahunAjaran(taData.nama_tahun);
      }

      // Fetch Semester aktif
      if (taData) {
        const { data: semData, error: semErr } = await supabase
          .from('semester')
          .select('*')
          .eq('id_tahun_ajaran', taData.id)
          .eq('status_aktif', true)
          .single();

        if (semErr && semErr.code !== 'PGRST116') throw semErr;
        if (semData) {
          setSemester(semData.nama_semester === 'Ganjil' ? 1 : 2);
        }
      }

    } catch (err: any) {
      console.error('Error fetching master data:', err);
      toast.error('Gagal memuat data filter sekolah/kelas.');
    } finally {
      setLoadingMaster(false);
    }
  }, []);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  // Handler load siswa & nilai jika filter lengkap terisi
  const handleLoadSantriDanNilai = useCallback(async () => {
    if (!selectedSekolah || !selectedKelas || !selectedMapel) return;

    try {
      setLoadingSantri(true);
      
      // Dapatkan info detail sekolah aktif (formal / non-formal)
      const sekolahAktif = sekolahList.find(s => s.id === selectedSekolah);
      if (!sekolahAktif) return;

      const queryField = sekolahAktif.kategori === 'Formal' ? 'id_kelas_formal' : 'id_kelas_non_formal';

      // 1. Fetch Santri di Kelas terpilih
      const { data: santriData, error: santriErr } = await supabase
        .from('santri')
        .select('id, nis, nama_lengkap')
        .eq(queryField, selectedKelas)
        .eq('status', 'aktif')
        .order('nama_lengkap', { ascending: true });

      if (santriErr) throw santriErr;
      const daftarSantri = santriData || [];

      if (daftarSantri.length === 0) {
        setNilaiList([]);
        toast.info('Tidak ada santri aktif di kelas ini.');
        return;
      }

      // 2. Fetch Nilai Akademik yang sudah di-input sebelumnya
      const { data: nilaiData, error: nilaiErr } = await supabase
        .from('nilai')
        .select('id, id_santri, nilai_angka, catatan')
        .eq('id_kelas', selectedKelas)
        .eq('id_mapel', selectedMapel)
        .eq('semester', semester)
        .eq('tahun_ajaran', tahunAjaran);

      if (nilaiErr) throw nilaiErr;
      const mapNilai = new Map<string, { nilai_angka: number; catatan: string; id: string }>();
      (nilaiData || []).forEach(n => {
        mapNilai.set(n.id_santri, { nilai_angka: n.nilai_angka, catatan: n.catatan || '', id: n.id });
      });

      // 3. Gabungkan santri dengan nilai (jika belum ada nilai, set kosong)
      const gabungan: NilaiInputState[] = daftarSantri.map(s => {
        const exist = mapNilai.get(s.id);
        return {
          id_santri: s.id,
          nis: s.nis,
          nama_lengkap: s.nama_lengkap,
          nilai: exist ? exist.nilai_angka.toString() : '',
          catatan: exist ? exist.catatan : ''
        };
      });

      setNilaiList(gabungan);

    } catch (err: any) {
      console.error('Error loading santri/grades:', err);
      toast.error('Gagal mengambil daftar santri dan nilai.');
    } finally {
      setLoadingSantri(false);
    }
  }, [selectedSekolah, selectedKelas, selectedMapel, semester, tahunAjaran, sekolahList]);

  // Trigger loading otomatis setiap kali filter berubah
  useEffect(() => {
    handleLoadSantriDanNilai();
  }, [selectedSekolah, selectedKelas, selectedMapel, semester, tahunAjaran, handleLoadSantriDanNilai]);

  // Dapatkan opsi kelas yang difilter berdasarkan sekolah terpilih
  const kelasFiltered = kelasList.filter(k => k.id_sekolah === selectedSekolah);

  // Dapatkan opsi mapel yang difilter berdasarkan sekolah terpilih
  const mapelFiltered = mapelList.filter(m => !m.id_sekolah || m.id_sekolah === selectedSekolah);

  // Update nilai secara lokal pada state table
  const handleNilaiChange = (index: number, value: string) => {
    // Validasi input numerik & batas 0-100
    if (value !== '') {
      const num = Number(value);
      if (isNaN(num) || num < 0 || num > 100) return;
    }
    
    setNilaiList(prev => {
      const updated = [...prev];
      updated[index].nilai = value;
      return updated;
    });
  };

  // Update catatan secara lokal
  const handleCatatanChange = (index: number, value: string) => {
    setNilaiList(prev => {
      const updated = [...prev];
      updated[index].catatan = value;
      return updated;
    });
  };

  // Simpan Semua (manual upsert karena tidak ada unique constraint)
  const handleSimpanSemua = async () => {
    if (nilaiList.length === 0) return;

    const daftarDiisi = nilaiList.filter(item => item.nilai.trim() !== '');
    if (daftarDiisi.length === 0) {
      toast.warning('Silakan isi setidaknya satu nilai sebelum menyimpan.');
      return;
    }

    try {
      setIsSaving(true);

      // Ambil data user untuk created_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User tidak terautentikasi');

      // Ambil existing records untuk kelas + mapel + semester ini
      const { data: existing } = await supabase
        .from('nilai')
        .select('id, id_santri')
        .eq('id_kelas', selectedKelas)
        .eq('id_mapel', selectedMapel)
        .eq('semester', semester)
        .eq('tahun_ajaran', tahunAjaran);

      const existingMap = new Map<string, string>();
      (existing || []).forEach(e => existingMap.set(e.id_santri, e.id));

      const errors: string[] = [];

      for (const item of daftarDiisi) {
        const recordId = existingMap.get(item.id_santri);

        if (recordId) {
          const { error } = await supabase
            .from('nilai')
            .update({ nilai_angka: Number(item.nilai), catatan: item.catatan.trim() || null })
            .eq('id', recordId);
          if (error) errors.push(error.message);
        } else {
          const { error } = await supabase
            .from('nilai')
            .insert({
              id_santri: item.id_santri,
              id_kelas: selectedKelas,
              id_mapel: selectedMapel,
              nilai_angka: Number(item.nilai),
              catatan: item.catatan.trim() || null,
              semester,
              tahun_ajaran: tahunAjaran,
              jenis_ujian: jenisUjian,
              created_by: user.id,
            });
          if (error) errors.push(error.message);
        }
      }

      if (errors.length > 0) {
        toast.error('Beberapa nilai gagal disimpan: ' + errors.join(', '));
      } else {
        toast.success('Semua nilai berhasil disimpan!');
      }
      await handleLoadSantriDanNilai();
    } catch (err: any) {
      console.error('Error saving grades:', err);
      toast.error('Gagal menyimpan nilai: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Ekspor Excel (.xlsx)
  const handleEksporExcel = () => {
    if (nilaiList.length === 0) {
      toast.warning('Tidak ada data untuk diekspor.');
      return;
    }

    const kelasNama = kelasList.find(k => k.id === selectedKelas)?.nama_kelas || 'Kelas';
    
    // Format data untuk sheet excel
    const excelRows = nilaiList.map((item, idx) => ({
      'No': idx + 1,
      'NIS': item.nis,
      'Nama Lengkap': item.nama_lengkap,
      'Mata Pelajaran': selectedMapel,
      'Nilai': item.nilai !== '' ? Number(item.nilai) : 'Belum Diisi',
      'Catatan': item.catatan || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Nilai');

    // Buat nama berkas dinamis
    const cleanFileName = `Rekap_Nilai_${kelasNama.replace(/\s+/g, '_')}_${selectedMapel.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(workbook, cleanFileName);
    toast.success('Rekap nilai berhasil diunduh!');
  };

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen transition-colors duration-300">
      
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookMarked className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Input Nilai Akademik
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm mt-1">
            Portal Guru / Penginputan dan Rekapitulasi Nilai Santri Pesantren
          </p>
        </div>
      </div>

      {/* Filter Options (Dropdown) */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-500" />
          Filter Pembelajaran
        </h3>
        
        {loadingMaster ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
            Memuat data filter...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Filter Sekolah */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wide">
                Lembaga / Sekolah
              </label>
              <select
                value={selectedSekolah}
                onChange={(e) => {
                  setSelectedSekolah(e.target.value);
                  setSelectedKelas(''); // Reset kelas jika sekolah berubah
                }}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm"
              >
                <option value="">-- Pilih Lembaga --</option>
                {sekolahList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama_sekolah} ({s.kategori})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Kelas */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wide">
                Kelas
              </label>
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                disabled={!selectedSekolah}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs sm:text-sm"
              >
                <option value="">-- Pilih Kelas --</option>
                {kelasFiltered.map((k) => (
                  <option key={k.id} value={k.id}>
                    Tingkat {k.tingkat} &bull; {k.nama_kelas}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Mapel */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wide">
                Mata Pelajaran
              </label>
              <select
                value={selectedMapel}
                onChange={(e) => setSelectedMapel(e.target.value)}
                disabled={!selectedKelas}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs sm:text-sm"
              >
                <option value="">-- Pilih Mata Pelajaran --</option>
                {mapelFiltered.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nama_mapel}
                  </option>
                ))}
              </select>
            </div>

          </div>
        )}

        {/* Filter tambahan: Semester, Tahun Ajaran, Jenis Ujian */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wide">
              Semester
            </label>
            <select
              value={semester}
              disabled
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-slate-850 dark:text-zinc-100 opacity-70 cursor-not-allowed text-xs sm:text-sm"
            >
              <option value={1}>Semester 1 (Ganjil)</option>
              <option value={2}>Semester 2 (Genap)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wide">
              Tahun Ajaran
            </label>
            <input
              type="text"
              value={tahunAjaran}
              readOnly
              tabIndex={-1}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-slate-850 dark:text-zinc-100 opacity-70 cursor-not-allowed text-xs sm:text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wide">
              Jenis Ujian
            </label>
            <select
              value={jenisUjian}
              onChange={(e) => setJenisUjian(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm"
            >
              <option value="Harian">Harian</option>
              <option value="UTS">UTS</option>
              <option value="UAS">UAS</option>
              <option value="Try Out">Try Out</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!selectedSekolah || !selectedKelas || !selectedMapel ? (
        // State Filter Belum Lengkap
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl py-16 px-4 text-center shadow-sm max-w-xl mx-auto">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <School className="h-8 w-8" />
          </div>
          <h3 className="font-bold text-base text-slate-800 dark:text-white">Filter Belum Lengkap</h3>
          <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1.5 max-w-xs mx-auto">
            Silakan pilih lembaga, kelas, dan mata pelajaran terlebih dahulu pada dropdown di atas untuk menginput nilai santri.
          </p>
        </div>
      ) : loadingSantri ? (
        // Loader State
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl py-20 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
          <p className="text-slate-400 dark:text-zinc-500 text-sm">Mengambil data santri dan nilai akademik...</p>
        </div>
      ) : nilaiList.length === 0 ? (
        // Kelas Kosong
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl py-16 text-center shadow-sm">
          <div className="h-16 w-16 rounded-2xl bg-amber-50 dark:bg-amber-500/5 text-amber-655 dark:text-amber-400 border border-amber-100 dark:border-amber-500/10 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h3 className="font-bold text-base text-slate-800 dark:text-white">Tidak Ada Santri</h3>
          <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1.5 max-w-xs mx-auto">
            Tidak ditemukan santri yang terdaftar aktif di kelas ini. Pastikan Anda telah memasukkan santri ke dalam kelas ini di menu Lembaga.
          </p>
        </div>
      ) : (
        // Editable Table & Actions
        <div className="space-y-4">
          
          {/* Action Buttons bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
              <Info className="h-4 w-4 text-emerald-500" />
              <span>Input otomatis tersimpan ketika tombol <strong>Simpan Semua</strong> ditekan.</span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleEksporExcel}
                className="flex items-center justify-center gap-2 border border-slate-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold px-4 py-2.5 rounded-xl transition-all text-xs shadow-sm w-full sm:w-auto"
              >
                <Download className="h-4 w-4 text-emerald-600" />
                Ekspor Excel
              </button>
              <button
                onClick={handleSimpanSemua}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-600/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs w-full sm:w-auto"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Simpan Semua
              </button>
            </div>
          </div>

          {/* Editable Grid / List Table */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
            
            {/* Desktop View Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-550 text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-6 w-20">No</th>
                    <th className="py-4 px-6 w-32">NIS</th>
                    <th className="py-4 px-6">Nama Lengkap</th>
                    <th className="py-4 px-6 w-40">Nilai (0-100)</th>
                    <th className="py-4 px-6">Catatan Pembelajaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-sm text-slate-700 dark:text-zinc-300">
                  {nilaiList.map((item, index) => (
                    <tr key={item.id_santri} className="hover:bg-slate-50/40 dark:hover:bg-zinc-950/10 transition-all duration-200">
                      <td className="py-4 px-6 font-mono text-xs text-slate-400">{index + 1}</td>
                      <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-500">{item.nis}</td>
                      <td className="py-4 px-6 font-extrabold text-slate-900 dark:text-white">{item.nama_lengkap}</td>
                      <td className="py-4 px-6">
                        <input
                          type="number"
                          placeholder="0-100"
                          min="0"
                          max="100"
                          value={item.nilai}
                          onChange={(e) => handleNilaiChange(index, e.target.value)}
                          className="w-28 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-xl px-3 py-2 text-center text-slate-900 dark:text-white font-extrabold text-sm focus:outline-none transition-all focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </td>
                      <td className="py-4 px-6">
                        <input
                          type="text"
                          placeholder="Contoh: Sangat aktif berdiskusi & paham materi"
                          value={item.catatan}
                          onChange={(e) => handleCatatanChange(index, e.target.value)}
                          className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-xl px-4 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View List (Touch friendly cards for teachers in class) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-850">
              {nilaiList.map((item, index) => (
                <div key={item.id_santri} className="p-4 space-y-3.5 hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono">#{index + 1} &bull; NIS: {item.nis}</span>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">{item.nama_lengkap}</h4>
                    </div>
                    {/* Tablet/Phone touch-optimized input */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">Nilai:</span>
                      <input
                        type="number"
                        placeholder="Nilai"
                        min="0"
                        max="100"
                        value={item.nilai}
                        onChange={(e) => handleNilaiChange(index, e.target.value)}
                        className="w-20 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-2.5 py-2 text-center text-slate-900 dark:text-white font-extrabold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Catatan Pembelajaran</label>
                    <input
                      type="text"
                      placeholder="Masukkan catatan perkembangan ustadz..."
                      value={item.catatan}
                      onChange={(e) => handleCatatanChange(index, e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none text-xs focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
