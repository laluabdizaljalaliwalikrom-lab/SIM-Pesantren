'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Santri, PresensiTahfidz, KelancaranGrade } from '@/types/database';
import { 
  GraduationCap, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Calendar,
  Book,
  User,
  Plus
} from 'lucide-react';

export default function TahfidzTracker() {
  // Database States
  const [santriList, setSantriList] = useState<Pick<Santri, 'id' | 'nis' | 'nama_lengkap'>[]>([]);
  const [recentSetorans, setRecentSetorans] = useState<PresensiTahfidz[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    id_santri: '',
    tanggal_setoran: new Date().toISOString().split('T')[0],
    juz: 1,
    nama_surah: '',
    ayat_terakhir: 1,
    nilai_kelancaran: 'A' as KelancaranGrade,
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setMessage(null);

      // 1. Fetch active santri
      const { data: santriData, error: santriErr } = await supabase
        .from('santri')
        .select('id, nis, nama_lengkap')
        .eq('status', 'aktif')
        .order('nama_lengkap', { ascending: true });

      if (santriErr) throw santriErr;
      setSantriList(santriData || []);

      // 2. Fetch last 5 setoran
      const { data: tahfidzData, error: tahfidzErr } = await supabase
        .from('presensi_tahfidz')
        .select(`
          *,
          santri:id_santri (nama_lengkap, nis)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (tahfidzErr) throw tahfidzErr;
      setRecentSetorans(tahfidzData || []);

    } catch (err: any) {
      console.error('Error fetching tahfidz data:', err);
      setMessage({ type: 'error', text: err.message || 'Gagal memuat data dari database.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Form Inputs
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'juz' || name === 'ayat_terakhir' ? Number(value) : value,
    }));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_santri) {
      alert('Pilih santri terlebih dahulu.');
      return;
    }

    setSubmitLoading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        id_santri: formData.id_santri,
        tanggal_setoran: formData.tanggal_setoran,
        juz: formData.juz,
        nama_surah: formData.nama_surah,
        ayat_terakhir: formData.ayat_terakhir,
        nilai_kelancaran: formData.nilai_kelancaran,
        id_ustadz: user?.id || null,
      };

      const { error: insertErr } = await supabase
        .from('presensi_tahfidz')
        .insert([payload]);

      if (insertErr) throw insertErr;

      setMessage({ type: 'success', text: 'Setoran hafalan berhasil disimpan!' });
      
      setFormData((prev) => ({
        ...prev,
        nama_surah: '',
        ayat_terakhir: 1,
        nilai_kelancaran: 'A',
      }));

      await fetchData();

    } catch (err: any) {
      console.error('Error submitting setoran:', err);
      setMessage({ type: 'error', text: err.message || 'Gagal menyimpan setoran hafalan.' });
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen transition-colors duration-300">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Tahfidz Tracker
        </h1>
        <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">
          Halaman Input Setoran Hafalan Harian Santri (Khusus Pengasuh/Ustadz)
        </p>
      </div>

      {/* Notification Toast */}
      {message && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 text-sm transition-all duration-300 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          )}
          <div>
            <p className="font-bold">{message.type === 'success' ? 'Sukses' : 'Gagal'}</p>
            <p className="text-slate-500 dark:text-zinc-300 mt-0.5">{message.text}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Form Input Section */}
        <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            Input Setoran Baru
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Pilih Santri */}
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
                Pilih Santri
              </label>
              <select
                name="id_santri"
                required
                value={formData.id_santri}
                onChange={handleInputChange}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm"
              >
                <option value="">-- Pilih Santri --</option>
                {santriList.map((santri) => (
                  <option key={santri.id} value={santri.id}>
                    {santri.nama_lengkap} ({santri.nis})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tanggal Setoran */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
                  Tanggal Setoran
                </label>
                <input
                  type="date"
                  name="tanggal_setoran"
                  required
                  value={formData.tanggal_setoran}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                />
              </div>

              {/* Juz */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
                  Juz Ke- (1 - 30)
                </label>
                <input
                  type="number"
                  name="juz"
                  required
                  min={1}
                  max={30}
                  value={formData.juz}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nama Surah */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
                  Nama Surah
                </label>
                <input
                  type="text"
                  name="nama_surah"
                  required
                  placeholder="Contoh: Al-Baqarah"
                  value={formData.nama_surah}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                />
              </div>

              {/* Ayat Terakhir */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
                  Ayat Terakhir
                </label>
                <input
                  type="number"
                  name="ayat_terakhir"
                  required
                  min={1}
                  placeholder="Contoh: 141"
                  value={formData.ayat_terakhir}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* Nilai Kelancaran */}
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
                Kualitas Kelancaran
              </label>
              <select
                name="nilai_kelancaran"
                required
                value={formData.nilai_kelancaran}
                onChange={handleInputChange}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-800 dark:text-zinc-100 focus:outline-none transition-all text-sm"
              >
                <option value="A">A : Sangat Lancar</option>
                <option value="B">B : Lancar</option>
                <option value="C">C : Cukup</option>
                <option value="D">D : Kurang</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitLoading || loading}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 text-sm"
            >
              {submitLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan Setoran
            </button>
          </form>
        </div>

        {/* Timeline Panel */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6 flex flex-col">
          <h2 className="text-base font-bold text-slate-950 dark:text-white">5 Setoran Terakhir</h2>

          <div className="relative border-l border-slate-200 dark:border-zinc-800 pl-4 space-y-6 flex-1">
            {loading ? (
              <div className="text-xs text-slate-400 flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                Memuat riwayat...
              </div>
            ) : recentSetorans.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-zinc-650 py-4">Belum ada riwayat setoran hari ini.</p>
            ) : (
              recentSetorans.map((setoran) => (
                <div key={setoran.id} className="relative group">
                  <span className="absolute -left-[21px] top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-slate-50 dark:bg-zinc-950 border-2 border-emerald-500 group-hover:scale-125 transition-transform" />
                  
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 dark:text-zinc-600">
                      {new Date(setoran.tanggal_setoran).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {setoran.santri?.nama_lengkap}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-500">
                      Juz {setoran.juz} &bull; Surah {setoran.nama_surah} (Ayat {setoran.ayat_terakhir})
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          setoran.nilai_kelancaran === 'A'
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20'
                            : setoran.nilai_kelancaran === 'B'
                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20'
                            : setoran.nilai_kelancaran === 'C'
                            ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20'
                            : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20'
                        }`}
                      >
                        Grade {setoran.nilai_kelancaran}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
