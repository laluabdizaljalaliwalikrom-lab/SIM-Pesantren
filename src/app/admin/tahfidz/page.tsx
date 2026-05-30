'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Santri, PresensiTahfidz, KelancaranGrade } from '@/types/database';

export default function TahfidzTracker() {
  // Database States
  const [santriList, setSantriList] = useState<Santri[]>([]);
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

      // 1. Fetch active santri for selection dropdown
      const { data: santriData, error: santriErr } = await supabase
        .from('santri')
        .select('id, nis, nama_lengkap')
        .eq('status', 'aktif')
        .order('nama_lengkap', { ascending: true });

      if (santriErr) throw santriErr;
      setSantriList(santriData || []);

      // 2. Fetch last 5 setoran tahfidz with joined santri data
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
      // Dapatkan user ID yang sedang aktif untuk dicatat sebagai ustadz/pengasuh
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
      
      // Reset form (kecuali tanggal, ustadz, dan santri barangkali ingin ganti)
      setFormData((prev) => ({
        ...prev,
        nama_surah: '',
        ayat_terakhir: 1,
        nilai_kelancaran: 'A',
      }));

      // Refresh recent list
      await fetchData();

    } catch (err: any) {
      console.error('Error submitting setoran:', err);
      setMessage({ type: 'error', text: err.message || 'Gagal menyimpan setoran hafalan.' });
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 bg-clip-text text-transparent">
            Tahfidz Tracker
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Halaman Input Setoran Hafalan Harian Santri (Khusus Pengasuh/Ustadz)
          </p>
        </div>

        {/* Notification Toast */}
        {message && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 text-sm transition-all duration-300 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {message.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.303c.866 1.5-.217 3.374-1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            )}
            <div>
              <p className="font-semibold">{message.type === 'success' ? 'Sukses' : 'Gagal'}</p>
              <p className="text-slate-300 mt-0.5">{message.text}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Form Input Section */}
          <div className="md:col-span-2 bg-slate-800/40 border border-slate-700/60 backdrop-blur-md rounded-2xl p-6 shadow-xl space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
              Input Setoran Baru
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Pilih Santri */}
              <div>
                <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">
                  Pilih Santri
                </label>
                <select
                  name="id_santri"
                  required
                  value={formData.id_santri}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-100 focus:outline-none transition-all"
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
                  <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">
                    Tanggal Setoran
                  </label>
                  <input
                    type="date"
                    name="tanggal_setoran"
                    required
                    value={formData.tanggal_setoran}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-100 focus:outline-none transition-all"
                  />
                </div>

                {/* Juz */}
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">
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
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-100 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Surah */}
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">
                    Nama Surah
                  </label>
                  <input
                    type="text"
                    name="nama_surah"
                    required
                    placeholder="Contoh: Al-Baqarah"
                    value={formData.nama_surah}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-100 focus:outline-none transition-all"
                  />
                </div>

                {/* Ayat Terakhir */}
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">
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
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-100 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Nilai Kelancaran */}
              <div>
                <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">
                  Kualitas Kelancaran
                </label>
                <select
                  name="nilai_kelancaran"
                  required
                  value={formData.nilai_kelancaran}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-100 focus:outline-none transition-all"
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
                className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium py-2.5 rounded-lg shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
              >
                {submitLoading && (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                Simpan Setoran
              </button>
            </form>
          </div>

          {/* Timeline / History Panel */}
          <div className="bg-slate-800/40 border border-slate-700/60 backdrop-blur-md rounded-2xl p-6 shadow-xl space-y-6">
            <h2 className="text-lg font-bold text-white">5 Setoran Terakhir</h2>

            <div className="relative border-l border-slate-700 pl-4 space-y-6">
              {loading ? (
                <div className="text-sm text-slate-400 flex items-center gap-2 py-4">
                  <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  Memuat riwayat...
                </div>
              ) : recentSetorans.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">Belum ada riwayat setoran hari ini.</p>
              ) : (
                recentSetorans.map((setoran) => (
                  <div key={setoran.id} className="relative group">
                    {/* Timeline Node */}
                    <span className="absolute -left-[21px] top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-slate-900 border-2 border-emerald-400 group-hover:scale-125 transition-transform" />
                    
                    {/* Record Info */}
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400">
                        {new Date(setoran.tanggal_setoran).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <h4 className="text-sm font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
                        {setoran.santri?.nama_lengkap}
                      </h4>
                      <p className="text-xs text-slate-300">
                        Juz {setoran.juz} &bull; Surah {setoran.nama_surah} (Ayat {setoran.ayat_terakhir})
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            setoran.nilai_kelancaran === 'A'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : setoran.nilai_kelancaran === 'B'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : setoran.nilai_kelancaran === 'C'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
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
    </div>
  );
}
