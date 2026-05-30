'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Sekolah, Kelas, MataPelajaran, Pegawai, JadwalPelajaran } from '@/types/database';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  X, 
  Loader2, 
  Clock, 
  User, 
  MapPin,
  BookOpen,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'] as const;
type HariType = typeof HARI_LIST[number];

export default function JadwalPelajaranPage() {
  // Master Lists
  const [sekolahList, setSekolahList] = useState<Sekolah[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [mapelList, setMapelList] = useState<MataPelajaran[]>([]);
  const [guruList, setGuruList] = useState<Pegawai[]>([]);

  // Active Filters
  const [selectedSekolah, setSelectedSekolah] = useState<string>('');
  const [selectedKelas, setSelectedKelas] = useState<string>('');

  // Main Schedules state
  const [jadwalList, setJadwalList] = useState<JadwalPelajaran[]>([]);
  const [loadingMaster, setLoadingMaster] = useState<boolean>(true);
  const [loadingJadwal, setLoadingJadwal] = useState<boolean>(false);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    id_mapel: '',
    id_guru: '',
    hari: 'Senin' as HariType,
    jam_mulai: '',
    jam_selesai: '',
    ruangan: '',
  });

  // Fetch filter master lists
  const fetchMasterData = useCallback(async () => {
    try {
      setLoadingMaster(true);
      
      // 1. Fetch Sekolah
      const { data: sekolahData } = await supabase
        .from('sekolah')
        .select('*')
        .order('nama_sekolah', { ascending: true });
      setSekolahList(sekolahData || []);

      // 2. Fetch Kelas
      const { data: kelasData } = await supabase
        .from('kelas')
        .select('*')
        .order('tingkat', { ascending: true })
        .order('nama_kelas', { ascending: true });
      setKelasList(kelasData || []);

      // 3. Fetch Mapel
      const { data: mapelData } = await supabase
        .from('mata_pelajaran')
        .select('*')
        .order('nama_mapel', { ascending: true });
      setMapelList(mapelData || []);

      // 4. Fetch Guru (Pegawai where status = Aktif and jabatan in Ustadz, Ustadzah, Guru...)
      const { data: guruData } = await supabase
        .from('pegawai')
        .select('*')
        .eq('status', 'Aktif')
        .order('nama_lengkap', { ascending: true });
      setGuruList(guruData || []);

    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengambil data master pendukung.');
    } finally {
      setLoadingMaster(false);
    }
  }, []);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  // Fetch Jadwal Pelajaran
  const fetchJadwal = useCallback(async () => {
    if (!selectedKelas) return;

    try {
      setLoadingJadwal(true);
      const { data, error } = await supabase
        .from('jadwal_pelajaran')
        .select(`
          *,
          mapel:mata_pelajaran (*),
          guru:pegawai (*)
        `)
        .eq('id_kelas', selectedKelas);

      if (error) throw error;
      setJadwalList(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuat jadwal pelajaran: ' + err.message);
    } finally {
      setLoadingJadwal(false);
    }
  }, [selectedKelas]);

  useEffect(() => {
    fetchJadwal();
  }, [selectedKelas, fetchJadwal]);

  // Filter kelas based on selected school
  const kelasFiltered = kelasList.filter(k => k.id_sekolah === selectedSekolah);

  // Group schedules by day for UI display
  const jadwalByDay = useMemo(() => {
    const map = new Map<HariType, JadwalPelajaran[]>();
    HARI_LIST.forEach(hari => map.set(hari, []));
    
    jadwalList.forEach(j => {
      const list = map.get(j.hari as HariType) || [];
      list.push(j);
      map.set(j.hari as HariType, list);
    });

    // Sort schedules on each day by jam_mulai
    HARI_LIST.forEach(hari => {
      const list = map.get(hari) || [];
      list.sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai));
      map.set(hari, list);
    });

    return map;
  }, [jadwalList]);

  const handleOpenAddModal = () => {
    setFormData({
      id_mapel: '',
      id_guru: '',
      hari: 'Senin',
      jam_mulai: '',
      jam_selesai: '',
      ruangan: '',
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_mapel || !formData.jam_mulai || !formData.jam_selesai) {
      toast.error('Mata pelajaran, jam mulai, dan jam selesai wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      id_kelas: selectedKelas,
      id_mapel: formData.id_mapel,
      id_guru: formData.id_guru || null,
      hari: formData.hari,
      jam_mulai: formData.jam_mulai,
      jam_selesai: formData.jam_selesai,
      ruangan: formData.ruangan.trim() || null,
    };

    try {
      const { error } = await supabase
        .from('jadwal_pelajaran')
        .insert([payload]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('Jadwal bentrok! Sudah ada pelajaran di kelas dan jam mulai yang sama.');
        }
        throw error;
      }

      toast.success('Jadwal pelajaran berhasil ditambahkan!');
      setIsModalOpen(false);
      await fetchJadwal();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal menyimpan jadwal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteJadwal = async (id: string, mapelName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus jadwal "${mapelName}"?`)) return;

    try {
      const { error } = await supabase
        .from('jadwal_pelajaran')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Jadwal berhasil dihapus.');
      await fetchJadwal();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menghapus jadwal: ' + err.message);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen transition-colors duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Jadwal Pelajaran
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm mt-1">
            Akademik / Pengaturan Jadwal Pelajaran Mingguan Formal & Diniyah per Kelas
          </p>
        </div>
        {selectedKelas && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 text-sm w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Tambah Jadwal
          </button>
        )}
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-emerald-500" />
          Filter Kelas Pembelajaran
        </h3>
        
        {loadingMaster ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
            Memuat data filter...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Filter Sekolah */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wide">
                Lembaga / Sekolah
              </label>
              <select
                value={selectedSekolah}
                onChange={(e) => {
                  setSelectedSekolah(e.target.value);
                  setSelectedKelas(''); // Reset kelas
                  setJadwalList([]);
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
          </div>
        )}
      </div>

      {/* Main Weekly Schedule Display */}
      {!selectedKelas ? (
        // State Filter Belum Lengkap
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl py-16 px-4 text-center shadow-sm max-w-xl mx-auto">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8" />
          </div>
          <h3 className="font-bold text-base text-slate-800 dark:text-white">Pilih Kelas Terlebih Dahulu</h3>
          <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1.5 max-w-xs mx-auto">
            Silakan pilih lembaga dan kelas pada filter di atas untuk menampilkan dan mengatur jadwal pelajaran mingguan.
          </p>
        </div>
      ) : loadingJadwal ? (
        // Loader State
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl py-20 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-650" />
          <p className="text-slate-400 text-sm">Mengambil jadwal pelajaran mingguan...</p>
        </div>
      ) : (
        // Weekly Grid Columns (Responsive Cards Layout)
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-6">
          {HARI_LIST.map((hari) => {
            const listJadwal = jadwalByDay.get(hari) || [];
            return (
              <div key={hari} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col shadow-sm">
                
                {/* Day title header */}
                <div className="pb-3 border-b border-slate-100 dark:border-zinc-850 flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-sm text-emerald-700 dark:text-emerald-400 tracking-wide">{hari}</h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-zinc-950 px-2 py-0.5 rounded-full">
                    {listJadwal.length} Jadwal
                  </span>
                </div>

                {/* Day Schedules Cards list */}
                <div className="flex-1 space-y-4">
                  {listJadwal.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-100 dark:border-zinc-850 rounded-xl flex items-center justify-center text-center p-2">
                      <p className="text-[10px] text-slate-350 italic">Tidak ada KBM</p>
                    </div>
                  ) : (
                    listJadwal.map((jadwal) => (
                      <div 
                        key={jadwal.id} 
                        className="group relative border border-slate-150 dark:border-zinc-850 hover:border-emerald-500/30 bg-slate-50/50 dark:bg-zinc-950/20 p-3 rounded-xl transition-all hover:-translate-y-0.5 shadow-sm"
                      >
                        {/* Delete trigger */}
                        <button
                          onClick={() => handleDeleteJadwal(jadwal.id, jadwal.mapel?.nama_mapel || '')}
                          className="absolute top-2 right-2 p-1 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Hapus KBM"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>

                        <div className="space-y-2 text-left">
                          {/* Subject name */}
                          <h4 className="font-extrabold text-xs text-slate-900 dark:text-white line-clamp-1 pr-4">
                            {jadwal.mapel?.nama_mapel}
                          </h4>

                          {/* Time */}
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                            <Clock className="h-3 w-3 text-emerald-500" />
                            <span>{jadwal.jam_mulai.slice(0, 5)} - {jadwal.jam_selesai.slice(0, 5)}</span>
                          </div>

                          {/* Teacher */}
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-zinc-400">
                            <User className="h-3 w-3 text-emerald-500" />
                            <span className="truncate">{jadwal.guru ? jadwal.guru.nama_lengkap : 'Guru / Ustadz'}</span>
                          </div>

                          {/* Room */}
                          {jadwal.ruangan && (
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                              <MapPin className="h-3 w-3 text-emerald-500" />
                              <span className="truncate">{jadwal.ruangan}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Add Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            <div className="border-b border-slate-150 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tambah Jadwal KBM Baru
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Pilih Mapel */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
                  Mata Pelajaran *
                </label>
                <select
                  name="id_mapel"
                  required
                  value={formData.id_mapel}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                >
                  <option value="">-- Pilih Pelajaran --</option>
                  {mapelList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.kode_mapel} - {m.nama_mapel} ({m.kategori})
                    </option>
                  ))}
                </select>
              </div>

              {/* Pilih Guru */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
                  Guru / Ustadz Pengajar
                </label>
                <select
                  name="id_guru"
                  value={formData.id_guru}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                >
                  <option value="">-- Pilih Ustadz (Optional) --</option>
                  {guruList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.gelar_depan ? `${g.gelar_depan} ` : ''}{g.nama_lengkap}{g.gelar_belakang ? `, ${g.gelar_belakang}` : ''} ({g.jabatan})
                    </option>
                  ))}
                </select>
              </div>

              {/* Hari */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
                  Hari KBM *
                </label>
                <select
                  name="hari"
                  required
                  value={formData.hari}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                >
                  {HARI_LIST.map((hari) => (
                    <option key={hari} value={hari}>
                      {hari}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jam Mulai & Selesai */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
                    Jam Mulai *
                  </label>
                  <input
                    type="time"
                    name="jam_mulai"
                    required
                    value={formData.jam_mulai}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
                    Jam Selesai *
                  </label>
                  <input
                    type="time"
                    name="jam_selesai"
                    required
                    value={formData.jam_selesai}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm font-mono"
                  />
                </div>
              </div>

              {/* Ruangan */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-555 uppercase mb-1.5">
                  Ruang Kelas / Lokasi
                </label>
                <input
                  type="text"
                  name="ruangan"
                  placeholder="Contoh: Gedung A-01 / Mushola"
                  value={formData.ruangan}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                />
              </div>

              <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-850 hover:bg-slate-100 dark:hover:bg-zinc-850 text-slate-600 dark:text-slate-400 rounded-xl font-semibold text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/10"
                >
                  {isSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
