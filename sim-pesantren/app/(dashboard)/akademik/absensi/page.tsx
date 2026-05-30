'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Sekolah, Kelas, MataPelajaran, Pegawai, JadwalPelajaran, Santri } from '@/types/database';
import { saveAbsensiKBM } from '@/services/absensi-actions';
import { 
  CalendarCheck, 
  Clock, 
  MapPin, 
  User, 
  Users, 
  Check, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ChevronLeft, 
  Save, 
  Sparkles,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

const HARI_MAP = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const STATUS_LIST = ['Hadir', 'Sakit', 'Izin', 'Alpha'] as const;
type StatusType = typeof STATUS_LIST[number];

interface StudentAttendanceState {
  id_santri: string;
  nis: string;
  nama_lengkap: string;
  status: StatusType;
  keterangan: string;
}

export default function AbsensiKBMPage() {
  // State Master & Filters
  const [loadingMaster, setLoadingMaster] = useState<boolean>(true);
  const [guruList, setGuruList] = useState<Pegawai[]>([]);
  const [currentUserGuru, setCurrentUserGuru] = useState<Pegawai | null>(null);
  
  // Active Filter
  const [selectedHari, setSelectedHari] = useState<string>('');
  const [selectedGuruId, setSelectedGuruId] = useState<string>('Semua');

  // Schedules State
  const [schedules, setSchedules] = useState<JadwalPelajaran[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState<boolean>(false);

  // Active Attendance Mode State
  const [activeJadwal, setActiveJadwal] = useState<JadwalPelajaran | null>(null);
  const [students, setStudents] = useState<StudentAttendanceState[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Set today's day name on startup
  useEffect(() => {
    const todayIndex = new Date().getDay();
    setSelectedHari(HARI_MAP[todayIndex]);
  }, []);

  // Fetch Master Teachers and match with current logged-in user email
  const fetchMasterData = useCallback(async () => {
    try {
      setLoadingMaster(true);

      // Fetch teachers/pegawai
      const { data: pegawaiData } = await supabase
        .from('pegawai')
        .select('*')
        .eq('status', 'Aktif')
        .order('nama_lengkap', { ascending: true });

      const listGuru = pegawaiData || [];
      setGuruList(listGuru);

      // Fetch authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const matchingGuru = listGuru.find(g => g.email?.toLowerCase() === user.email?.toLowerCase());
        if (matchingGuru) {
          setCurrentUserGuru(matchingGuru);
          setSelectedGuruId(matchingGuru.id); // Auto select current teacher
        }
      }

    } catch (err) {
      console.error('Error fetching master data for absensi:', err);
    } finally {
      setLoadingMaster(false);
    }
  }, []);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  // Fetch schedules according to day and teacher filters
  const fetchSchedules = useCallback(async () => {
    if (!selectedHari) return;
    
    try {
      setLoadingSchedules(true);
      let query = supabase
        .from('jadwal_pelajaran')
        .select(`
          *,
          kelas (*, sekolah:id_sekolah (*)),
          mapel:mata_pelajaran (*),
          guru:pegawai (*)
        `)
        .eq('hari', selectedHari);

      if (selectedGuruId !== 'Semua') {
        query = query.eq('id_guru', selectedGuruId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSchedules(data || []);
    } catch (err: any) {
      console.error('Error loading KBM schedules:', err.message || err);
      toast.error('Gagal mengambil jadwal pelajaran: ' + (err.message || ''));
    } finally {
      setLoadingSchedules(false);
    }
  }, [selectedHari, selectedGuruId]);

  useEffect(() => {
    fetchSchedules();
  }, [selectedHari, selectedGuruId, fetchSchedules]);

  // Handle Absensi mode start
  const handleMulaiAbsen = async (jadwal: JadwalPelajaran) => {
    setActiveJadwal(jadwal);
    
    try {
      setLoadingStudents(true);
      
      // Determine which class column to filter on depending on school category
      const sekolahKategori = jadwal.kelas?.sekolah?.kategori || 'Formal';
      const queryField = sekolahKategori === 'Formal' ? 'id_kelas_formal' : 'id_kelas_non_formal';

      // 1. Fetch active students in class
      const { data: santriData, error: santriErr } = await supabase
        .from('santri')
        .select('id, nis, nama_lengkap')
        .eq(queryField, jadwal.id_kelas)
        .eq('status', 'aktif')
        .order('nama_lengkap', { ascending: true });

      if (santriErr) throw santriErr;
      const listSantri = santriData || [];

      // 2. Fetch existing attendance for this class schedule today
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: absensiData, error: absensiErr } = await supabase
        .from('absensi')
        .select('id_santri, status, keterangan')
        .eq('id_jadwal', jadwal.id)
        .eq('tanggal', todayStr);

      if (absensiErr) throw absensiErr;
      const existMap = new Map<string, { status: StatusType; keterangan: string }>();
      (absensiData || []).forEach(a => {
        existMap.set(a.id_santri, { status: a.status as StatusType, keterangan: a.keterangan || '' });
      });

      // 3. Map students to local state (default to 'Hadir' if no record exists)
      const mappedStudents: StudentAttendanceState[] = listSantri.map(s => {
        const exist = existMap.get(s.id);
        return {
          id_santri: s.id,
          nis: s.nis,
          nama_lengkap: s.nama_lengkap,
          status: exist ? exist.status : 'Hadir',
          keterangan: exist ? exist.keterangan : ''
        };
      });

      setStudents(mappedStudents);

    } catch (err: any) {
      console.error('Error starting KBM attendance:', err);
      toast.error('Gagal mengambil daftar santri.');
    } finally {
      setLoadingStudents(false);
    }
  };

  // Quick Action: Hadir Semua
  const handleHadirSemua = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: 'Hadir' })));
    toast.success('Semua santri diatur ke status Hadir.');
  };

  // Change individual student status
  const handleStatusChange = (index: number, newStatus: StatusType) => {
    setStudents(prev => {
      const updated = [...prev];
      updated[index].status = newStatus;
      return updated;
    });
  };

  // Change individual student notes/keterangan
  const handleKeteranganChange = (index: number, val: string) => {
    setStudents(prev => {
      const updated = [...prev];
      updated[index].keterangan = val;
      return updated;
    });
  };

  // Batch Save Attendance
  const handleSimpanAbsensi = async () => {
    if (!activeJadwal || students.length === 0) return;

    setIsSaving(true);
    const todayStr = new Date().toISOString().split('T')[0];

    const payloads = students.map(s => ({
      id_jadwal: activeJadwal.id,
      id_santri: s.id_santri,
      tanggal: todayStr,
      status: s.status,
      keterangan: s.keterangan.trim() || null
    }));

    try {
      // Call Server Action
      const res = await saveAbsensiKBM(payloads);
      
      if (!res.success) {
        throw new Error(res.error || 'Terjadi kesalahan saat menyimpan.');
      }

      toast.success('Absensi KBM berhasil disimpan hari ini!');
      setActiveJadwal(null); // Exit attendance mode
      await fetchSchedules(); // Refresh lists
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menyimpan absensi: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen transition-colors duration-300">
      
      {/* Header */}
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 mb-3">
            <Sparkles className="h-3 w-3" />
            Kehadiran Kelas Harian
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Absensi KBM Santri
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm mt-1">
            Portal Guru / Pencatatan dan Pemantauan Kehadiran Santri pada KBM Harian
          </p>
        </div>
      </div>

      {/* Conditional Mode Rendering: 1. Schedules List OR 2. Active Attendance Mode */}
      {!activeJadwal ? (
        // -------------------------------------------------------------
        // MODE 1: LIST JADWAL HARI INI
        // -------------------------------------------------------------
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Filters Bar */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {loadingMaster ? (
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                Memuat data guru...
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                
                {/* Filter Hari */}
                <div className="flex-1 space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">Hari KBM</label>
                  <select
                    value={selectedHari}
                    onChange={(e) => setSelectedHari(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm"
                  >
                    {HARI_MAP.map((hari) => (
                      <option key={hari} value={hari}>
                        {hari} {hari === HARI_MAP[new Date().getDay()] ? '(Hari Ini)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter Guru */}
                <div className="flex-1 space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">Ustadz / Pengajar</label>
                  <select
                    value={selectedGuruId}
                    onChange={(e) => setSelectedGuruId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-850 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm"
                  >
                    <option value="Semua">-- Semua Pengajar --</option>
                    {guruList.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama_lengkap} ({g.jabatan})
                      </option>
                    ))}
                  </select>
                </div>

              </div>
            )}
            
            {/* Today date box */}
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 px-4 py-3 rounded-2xl flex-shrink-0 self-start sm:self-center">
              <Calendar className="h-5 w-5 text-emerald-600" />
              <div className="text-left font-mono">
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">Tanggal Hari Ini</p>
                <p className="text-xs text-slate-700 dark:text-zinc-200 font-extrabold">
                  {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

          </div>

          {/* Schedules List Display */}
          {loadingSchedules ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl py-20 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-slate-400 text-sm">Mengambil jadwal pelajaran aktif...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl py-16 text-center shadow-sm">
              <div className="h-16 w-16 rounded-2xl bg-slate-50 dark:bg-zinc-950 text-slate-400 border border-slate-200 dark:border-zinc-800/80 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-base text-slate-800 dark:text-white">Tidak Ada Jadwal Pelajaran</h3>
              <p className="text-slate-400 dark:text-zinc-550 text-xs mt-1.5 max-w-xs mx-auto">
                Tidak ditemukan KBM terjadwal untuk hari dan guru terpilih. Silakan sesuaikan filter di atas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {schedules.map((jadwal) => (
                <div 
                  key={jadwal.id} 
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm hover:border-emerald-500/20 transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Header info */}
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                        {jadwal.kelas?.nama_kelas}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono font-bold">
                        <Clock className="h-3.5 w-3.5 text-emerald-500" />
                        <span>{jadwal.jam_mulai.slice(0, 5)} - {jadwal.jam_selesai.slice(0, 5)}</span>
                      </div>
                    </div>

                    {/* Subject info */}
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {jadwal.mapel?.nama_mapel}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Pengajar: {jadwal.guru?.nama_lengkap || '-'}</span>
                      </p>
                      {jadwal.ruangan && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Ruangan: {jadwal.ruangan}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Start Attendance Trigger */}
                  <div className="border-t border-slate-100 dark:border-zinc-850 pt-4 mt-6">
                    <button
                      onClick={() => handleMulaiAbsen(jadwal)}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-all text-xs sm:text-sm shadow-sm"
                    >
                      <Users className="h-4 w-4" />
                      Mulai Absen Kelas
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      ) : (
        // -------------------------------------------------------------
        // MODE 2: INPUT ABSENSI SANTRI
        // -------------------------------------------------------------
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Back Trigger & Info Bar */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveJadwal(null)}
                className="p-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-550 rounded-xl transition-colors"
                title="Kembali ke Jadwal"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                  Absensi: {activeJadwal.mapel?.nama_mapel} ({activeJadwal.kelas?.nama_kelas})
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                  Pengajar: {activeJadwal.guru?.nama_lengkap} &bull; Jam: {activeJadwal.jam_mulai.slice(0, 5)}-{activeJadwal.jam_selesai.slice(0, 5)}
                </p>
              </div>
            </div>

            {/* Quick action bar */}
            <div className="flex items-center gap-2.5 self-end sm:self-center">
              <button
                onClick={handleHadirSemua}
                className="flex items-center justify-center gap-1 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold px-3.5 py-2.5 rounded-xl transition-all text-xs"
              >
                <Check className="h-4 w-4 text-emerald-600" />
                Hadir Semua
              </button>
              <button
                onClick={handleSimpanAbsensi}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/10 transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Simpan Absensi
              </button>
            </div>
          </div>

          {/* Student list grid input */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
            {loadingStudents ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-slate-400 text-sm">Mengambil daftar santri kelas...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="py-16 text-center">
                <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                <h4 className="font-bold text-slate-800 dark:text-white">Tidak ada santri terdaftar</h4>
                <p className="text-slate-400 text-xs mt-1">Belum ada santri aktif yang di-plot ke dalam kelas ini.</p>
              </div>
            ) : (
              // Table/Cards Grid
              <div>
                
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-550 text-xs font-bold uppercase tracking-wider">
                        <th className="py-4 px-6 w-20">No</th>
                        <th className="py-4 px-6 w-32">NIS</th>
                        <th className="py-4 px-6 w-60">Nama Lengkap</th>
                        <th className="py-4 px-6 w-80">Status Kehadiran</th>
                        <th className="py-4 px-6">Keterangan / Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-sm text-slate-700 dark:text-zinc-300">
                      {students.map((item, index) => (
                        <tr key={item.id_santri} className="hover:bg-slate-50/35 dark:hover:bg-zinc-950/10">
                          <td className="py-4 px-6 font-mono text-xs text-slate-400">{index + 1}</td>
                          <td className="py-4 px-6 font-mono text-xs text-slate-400">{item.nis}</td>
                          <td className="py-4 px-6 font-extrabold text-slate-900 dark:text-white">{item.nama_lengkap}</td>
                          
                          {/* Attendance Status Button Group */}
                          <td className="py-4 px-6">
                            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-zinc-950 p-1 border border-slate-200 dark:border-zinc-850">
                              {STATUS_LIST.map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleStatusChange(index, st)}
                                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                                    item.status === st
                                      ? st === 'Hadir'
                                        ? 'bg-emerald-600 text-white shadow'
                                        : st === 'Sakit'
                                        ? 'bg-blue-600 text-white shadow'
                                        : st === 'Izin'
                                        ? 'bg-amber-600 text-white shadow'
                                        : 'bg-rose-600 text-white shadow'
                                      : 'text-slate-550 dark:text-zinc-400 hover:text-slate-700'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>

                          {/* Notes/Catatan input */}
                          <td className="py-4 px-6">
                            <input
                              type="text"
                              placeholder="Keterangan (misal: Demam, Izin bepergian)"
                              value={item.keterangan}
                              onChange={(e) => handleKeteranganChange(index, e.target.value)}
                              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 focus:border-emerald-500 rounded-xl px-4 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-xs sm:text-sm focus:ring-1 focus:ring-emerald-500/20"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile/Tablet Touch-Friendly Cards Layout */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-850">
                  {students.map((item, index) => (
                    <div key={item.id_santri} className="p-4 space-y-3">
                      
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono">#{index + 1} &bull; NIS: {item.nis}</span>
                          <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">{item.nama_lengkap}</h4>
                        </div>
                      </div>

                      {/* Attendance Buttons mobile group */}
                      <div className="grid grid-cols-4 gap-2 bg-slate-100 dark:bg-zinc-950 p-1 rounded-xl border border-slate-200 dark:border-zinc-800/80">
                        {STATUS_LIST.map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleStatusChange(index, st)}
                            className={`py-2 rounded-lg text-[10px] sm:text-xs font-bold text-center transition-all ${
                              item.status === st
                                ? st === 'Hadir'
                                  ? 'bg-emerald-600 text-white shadow'
                                  : st === 'Sakit'
                                  ? 'bg-blue-600 text-white shadow'
                                  : st === 'Izin'
                                  ? 'bg-amber-600 text-white shadow'
                                  : 'bg-rose-600 text-white shadow'
                                : 'text-slate-500 dark:text-zinc-400'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>

                      {/* Notes input mobile */}
                      <div className="space-y-1">
                        <input
                          type="text"
                          placeholder="Masukkan catatan keterangan (jika ada)..."
                          value={item.keterangan}
                          onChange={(e) => handleKeteranganChange(index, e.target.value)}
                          className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none text-xs focus:ring-1 focus:ring-emerald-500/20"
                        />
                      </div>

                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
