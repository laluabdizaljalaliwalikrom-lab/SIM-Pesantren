'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Santri, Kamar, Profile, SantriStatus } from '@/types/database';

export default function SantriDashboard() {
  // Database States
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [kamarList, setKamarList] = useState<Kamar[]>([]);
  const [waliList, setWaliList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [kamarFilter, setKamarFilter] = useState<string>('all');

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null); // For edit mode

  const [formData, setFormData] = useState({
    nis: '',
    nama_lengkap: '',
    tanggal_lahir: '',
    id_kamar: '',
    id_wali: '',
    status: 'aktif' as SantriStatus,
  });

  // Fetch all initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch Kamar (for select options & stats)
      const { data: kamarData, error: kamarErr } = await supabase
        .from('kamar')
        .select('*')
        .order('nama_kamar', { ascending: true });

      if (kamarErr) throw kamarErr;
      setKamarList(kamarData || []);

      // Fetch Wali (Profiles with role = 'wali_santri')
      const { data: waliData, error: waliErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'wali_santri')
        .order('nama_lengkap', { ascending: true });

      if (waliErr) throw waliErr;
      setWaliList(waliData || []);

      // Fetch Santri with Joined Kamar and Wali Profiles
      const { data: santriData, error: santriErr } = await supabase
        .from('santri')
        .select(`
          *,
          kamar:id_kamar (*),
          wali:id_wali (*)
        `)
        .order('nama_lengkap', { ascending: true });

      if (santriErr) throw santriErr;
      setSantriList(santriData || []);

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Gagal memuat data dari database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open modal for Adding Santri
  const handleOpenAddModal = () => {
    setSelectedSantri(null);
    setFormData({
      nis: '',
      nama_lengkap: '',
      tanggal_lahir: '',
      id_kamar: '',
      id_wali: '',
      status: 'aktif',
    });
    setIsModalOpen(true);
  };

  // Open modal for Editing Santri
  const handleOpenEditModal = (santri: Santri) => {
    setSelectedSantri(santri);
    setFormData({
      nis: santri.nis,
      nama_lengkap: santri.nama_lengkap,
      tanggal_lahir: santri.tanggal_lahir,
      id_kamar: santri.id_kamar || '',
      id_wali: santri.id_wali || '',
      status: santri.status,
    });
    setIsModalOpen(true);
  };

  // Handle Form Input Changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit Handler (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      nis: formData.nis,
      nama_lengkap: formData.nama_lengkap,
      tanggal_lahir: formData.tanggal_lahir,
      id_kamar: formData.id_kamar || null,
      id_wali: formData.id_wali || null,
      status: formData.status,
    };

    try {
      if (selectedSantri) {
        // UPDATE
        const { error: updateErr } = await supabase
          .from('santri')
          .update(payload)
          .eq('id', selectedSantri.id);

        if (updateErr) throw updateErr;
      } else {
        // CREATE
        const { error: insertErr } = await supabase
          .from('santri')
          .insert([payload]);

        if (insertErr) throw insertErr;
      }

      setIsModalOpen(false);
      await fetchData(); // Refresh data
    } catch (err: any) {
      console.error('Error saving santri:', err);
      setError(err.message || 'Gagal menyimpan data santri.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler
  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data santri ini?')) return;

    try {
      setLoading(true);
      const { error: deleteErr } = await supabase
        .from('santri')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;
      await fetchData();
    } catch (err: any) {
      console.error('Error deleting santri:', err);
      alert(err.message || 'Gagal menghapus santri.');
    } finally {
      setLoading(false);
    }
  };

  // Statistics Calculation
  const totalSantriAktif = santriList.filter((s) => s.status === 'aktif').length;
  const totalKamar = kamarList.length;
  const santriBelumDapatKamar = santriList.filter((s) => !s.id_kamar).length;

  // Filtered List
  const filteredSantri = santriList.filter((santri) => {
    const matchesSearch =
      santri.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
      santri.nis.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || santri.status === statusFilter;
    const matchesKamar = kamarFilter === 'all' || santri.id_kamar === kamarFilter;
    return matchesSearch && matchesStatus && matchesKamar;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 selection:bg-teal-500 selection:text-white font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              SIM Pesantren
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Dashboard Admin &bull; Pengelolaan Master Data Santri
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium px-5 py-2.5 rounded-lg shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tambah Santri
          </button>
        </div>

        {/* Stats Cards Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="relative overflow-hidden bg-slate-800/50 border border-slate-700/50 backdrop-blur-md rounded-xl p-6 shadow-xl flex items-center gap-5 group hover:border-teal-500/50 transition-all duration-300">
            <div className="p-3 bg-teal-500/10 text-teal-400 rounded-lg group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.097-4.013a9 9 0 012.01-6.032m9.79 0a9 9 0 00-2.01-6.032m-9.785 0A8.984 8.984 0 0112 3.75c1.29 0 2.514.27 3.628.756m-7.256 0a9 9 0 010 12.728m0-12.728a9 9 0 0112.728 0" />
              </svg>
            </div>
            <div>
              <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Santri Aktif</p>
              <h3 className="text-3xl font-black text-white mt-1">
                {loading ? <span className="animate-pulse">...</span> : totalSantriAktif}
              </h3>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-bl-full pointer-events-none"></div>
          </div>

          {/* Card 2 */}
          <div className="relative overflow-hidden bg-slate-800/50 border border-slate-700/50 backdrop-blur-md rounded-xl p-6 shadow-xl flex items-center gap-5 group hover:border-cyan-500/50 transition-all duration-300">
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-lg group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M21 21h-3V6.75a2.25 2.25 0 00-2.25-2.25h-3.75A2.25 2.25 0 009.75 6.75V21H3v-18a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 5.25V21z" />
              </svg>
            </div>
            <div>
              <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Total Kamar</p>
              <h3 className="text-3xl font-black text-white mt-1">
                {loading ? <span className="animate-pulse">...</span> : totalKamar}
              </h3>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full pointer-events-none"></div>
          </div>

          {/* Card 3 */}
          <div className="relative overflow-hidden bg-slate-800/50 border border-slate-700/50 backdrop-blur-md rounded-xl p-6 shadow-xl flex items-center gap-5 group hover:border-amber-500/50 transition-all duration-300">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Tanpa Kamar</p>
              <h3 className="text-3xl font-black text-white mt-1">
                {loading ? <span className="animate-pulse">...</span> : santriBelumDapatKamar}
              </h3>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none"></div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 md:p-6 shadow-lg flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Cari berdasarkan nama atau NIS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg pl-10 pr-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none transition-all duration-200"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-lg px-4 py-2 text-slate-100 focus:outline-none transition-all duration-200"
            >
              <option value="all">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="alumni">Alumni</option>
              <option value="mutasi">Mutasi</option>
            </select>

            {/* Kamar Filter */}
            <select
              value={kamarFilter}
              onChange={(e) => setKamarFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-lg px-4 py-2 text-slate-100 focus:outline-none transition-all duration-200"
            >
              <option value="all">Semua Kamar</option>
              <option value="unassigned">Belum Ada Kamar</option>
              {kamarList.map((kamar) => (
                <option key={kamar.id} value={kamar.id}>
                  {kamar.nama_kamar} ({kamar.gedung})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden shadow-lg">
          {error && (
            <div className="bg-rose-500/10 border-b border-rose-500/20 text-rose-400 p-4 text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/70 border-b border-slate-700 text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6">NIS</th>
                  <th className="py-4 px-6">Nama Lengkap</th>
                  <th className="py-4 px-6">Kamar</th>
                  <th className="py-4 px-6">Wali</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                        Memuat data santri...
                      </div>
                    </td>
                  </tr>
                ) : filteredSantri.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">
                      Tidak ada data santri ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredSantri.map((santri) => (
                    <tr key={santri.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 font-mono text-slate-300">{santri.nis}</td>
                      <td className="py-4 px-6 font-medium text-white">{santri.nama_lengkap}</td>
                      <td className="py-4 px-6">
                        {santri.kamar ? (
                          <span className="text-slate-200">
                            {santri.kamar.nama_kamar}{' '}
                            <span className="text-xs text-slate-400">({santri.kamar.gedung})</span>
                          </span>
                        ) : (
                          <span className="text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded text-xs">
                            Belum di-plot
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-300">
                        {santri.wali?.nama_lengkap || '-'}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
                            santri.status === 'aktif'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : santri.status === 'alumni'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {santri.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(santri)}
                            className="p-1.5 hover:bg-slate-700/50 hover:text-cyan-400 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(santri.id)}
                            className="p-1.5 hover:bg-slate-700/50 hover:text-rose-400 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Modal Box */}
            <div className="relative bg-slate-800 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden transform transition-all">
              <div className="border-b border-slate-700 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {selectedSantri ? 'Edit Data Santri' : 'Tambah Santri Baru'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* NIS */}
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">
                    Nomor Induk Santri (NIS)
                  </label>
                  <input
                    type="text"
                    name="nis"
                    required
                    disabled={!!selectedSantri}
                    value={formData.nis}
                    onChange={handleInputChange}
                    placeholder="Contoh: 2026001"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-lg px-3 py-2 text-slate-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  />
                </div>

                {/* Nama Lengkap */}
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    name="nama_lengkap"
                    required
                    value={formData.nama_lengkap}
                    onChange={handleInputChange}
                    placeholder="Masukkan nama lengkap santri"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-lg px-3 py-2 text-slate-100 focus:outline-none transition-all"
                  />
                </div>

                {/* Tanggal Lahir */}
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    name="tanggal_lahir"
                    required
                    value={formData.tanggal_lahir}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-lg px-3 py-2 text-slate-100 focus:outline-none transition-all"
                  />
                </div>

                {/* Kamar Select */}
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">
                    Kamar / Asrama
                  </label>
                  <select
                    name="id_kamar"
                    value={formData.id_kamar}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-lg px-3 py-2 text-slate-100 focus:outline-none transition-all"
                  >
                    <option value="">-- Belum Di-plot --</option>
                    {kamarList.map((kamar) => (
                      <option key={kamar.id} value={kamar.id}>
                        {kamar.nama_kamar} ({kamar.gedung}) - Sisa Kapasitas:{' '}
                        {kamar.kapasitas}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Wali Select */}
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">
                    Wali Santri
                  </label>
                  <select
                    name="id_wali"
                    value={formData.id_wali}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-lg px-3 py-2 text-slate-100 focus:outline-none transition-all"
                  >
                    <option value="">-- Belum Memiliki Wali --</option>
                    {waliList.map((wali) => (
                      <option key={wali.id} value={wali.id}>
                        {wali.nama_lengkap}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Select */}
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">
                    Status Keaktifan
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-lg px-3 py-2 text-slate-100 focus:outline-none transition-all"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="alumni">Alumni</option>
                    <option value="mutasi">Mutasi</option>
                  </select>
                </div>

                {/* Form Actions */}
                <div className="border-t border-slate-700 pt-4 mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-700 hover:bg-slate-700/50 text-slate-300 rounded-lg font-medium text-sm transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-lg font-medium text-sm shadow-md hover:shadow-cyan-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                  >
                    {isSubmitting && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {selectedSantri ? 'Simpan Perubahan' : 'Tambah Santri'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
