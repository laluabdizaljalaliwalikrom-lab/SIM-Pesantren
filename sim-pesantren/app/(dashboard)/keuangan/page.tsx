'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { MasterBiaya, Tagihan } from '@/types/database';
import { generateBilling } from '@/services/billing-actions';
import {
  DollarSign,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Settings,
  Layers,
  Sparkles,
  X,
  TrendingUp,
  PieChart as PieIcon,
  BarChart4,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';

type ActiveTabType = 'ringkasan' | 'template' | 'generate';

export default function KeuanganDashboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTabType>('ringkasan');
  const [masterBiayaList, setMasterBiayaList] = useState<MasterBiaya[]>([]);
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [loading, setLoading] = useState(true);

  // Lists for dynamic targeting
  const [sekolahList, setSekolahList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [santriList, setSantriList] = useState<any[]>([]);

  // CRUD Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBiaya, setSelectedBiaya] = useState<MasterBiaya | null>(null);
  const [formData, setFormData] = useState({
    nama_biaya: '',
    nominal: '',
    frekuensi: 'bulanan' as 'bulanan' | 'persemester' | 'insidentil'
  });
  const [submittingCRUD, setSubmittingCRUD] = useState(false);

  // Generate Tagihan State
  const [genIdMasterBiaya, setGenIdMasterBiaya] = useState('');
  const [targetType, setTargetType] = useState<'semua' | 'sekolah' | 'kelas' | 'asrama' | 'santri'>('semua');
  const [targetId, setTargetId] = useState('');
  const [generating, setGenerating] = useState(false);

  // Fetch all necessary data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Master Biaya
      const { data: masterData, error: masterErr } = await supabase
        .from('master_biaya')
        .select('*')
        .order('nama_biaya', { ascending: true });

      if (masterErr) throw masterErr;
      setMasterBiayaList(masterData || []);

      if (masterData && masterData.length > 0 && !genIdMasterBiaya) {
        setGenIdMasterBiaya(masterData[0].id);
      }

      // 2. Fetch Tagihan
      const { data: tagihanData, error: tagihanErr } = await supabase
        .from('tagihan')
        .select(`
          *,
          master_biaya:id_master_biaya (*)
        `);

      if (tagihanErr) throw tagihanErr;
      setTagihanList(tagihanData || []);

      // 3. Fetch Sekolah
      const { data: sekolahData } = await supabase
        .from('sekolah')
        .select('*')
        .order('nama_sekolah', { ascending: true });
      setSekolahList(sekolahData || []);

      // 4. Fetch Kelas
      const { data: kelasData } = await supabase
        .from('kelas')
        .select('*, sekolah:id_sekolah(*)')
        .order('nama_kelas', { ascending: true });
      setKelasList(kelasData || []);

      // 5. Fetch Active Santri
      const { data: santriData } = await supabase
        .from('santri')
        .select('id, nama_lengkap, nis')
        .eq('status', 'aktif')
        .order('nama_lengkap', { ascending: true });
      setSantriList(santriData || []);

    } catch (err: any) {
      console.error('Error fetching financial data:', err);
      toast.error('Gagal memuat data keuangan.');
    } finally {
      setLoading(false);
    }
  }, [genIdMasterBiaya]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Aggregate Calculations
  const stats = useMemo(() => {
    let totalPiutang = 0;
    let totalPendapatanBulanIni = 0;
    
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    tagihanList.forEach(t => {
      const nominal = Number(t.nominal) || 0;
      if (t.status === 'Belum Lunas') {
        totalPiutang += nominal;
      } else if (t.status === 'Lunas') {
        // Filter pendapatan based on billing period matching current month
        if (t.bulan === currentMonth && t.tahun === currentYear) {
          totalPendapatanBulanIni += nominal;
        }
      }
    });

    return { totalPiutang, totalPendapatanBulanIni };
  }, [tagihanList]);

  // 12-Month Trend Data Calculations (SVG Area Chart)
  const trendChartData = useMemo(() => {
    const monthlyTotals: Record<string, number> = {};
    const today = new Date();

    // Initialize last 12 months with 0
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getMonth() + 1}-${d.getFullYear()}`;
      monthlyTotals[key] = 0;
    }

    // Accumulate lunas tagihans
    tagihanList.forEach(t => {
      if (t.status === 'Lunas') {
        const key = `${t.bulan}-${t.tahun}`;
        if (monthlyTotals[key] !== undefined) {
          monthlyTotals[key] += Number(t.nominal) || 0;
        }
      }
    });

    // Convert to sorted array
    const sortedData = Object.entries(monthlyTotals).map(([key, value]) => {
      const [m, y] = key.split('-').map(Number);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return {
        label: `${months[m - 1]} ${y.toString().slice(-2)}`,
        value
      };
    });

    // Compute SVG points
    const maxVal = Math.max(...sortedData.map(d => d.value), 100000);
    const width = 500;
    const height = 150;
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = sortedData.map((d, index) => {
      const x = padding + (index * chartWidth) / (sortedData.length - 1);
      const y = padding + chartHeight - (d.value / maxVal) * chartHeight;
      return { x, y, label: d.label, val: d.value };
    });

    let pathD = '';
    let areaD = '';
    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
      areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
    }

    return { points, pathD, areaD, maxVal, data: sortedData };
  }, [tagihanList]);

  // Pie Chart: Categories aggregation
  const categoryChartData = useMemo(() => {
    const categories: Record<string, number> = {};
    let totalLunas = 0;

    tagihanList.forEach(t => {
      if (t.status === 'Lunas') {
        const catName = t.master_biaya?.nama_biaya || 'Lainnya';
        const nominal = Number(t.nominal) || 0;
        categories[catName] = (categories[catName] || 0) + nominal;
        totalLunas += nominal;
      }
    });

    const colors = [
      'bg-emerald-500 text-emerald-500',
      'bg-teal-500 text-teal-500',
      'bg-blue-500 text-blue-500',
      'bg-violet-500 text-violet-500',
      'bg-amber-500 text-amber-500'
    ];

    const data = Object.entries(categories).map(([name, value], idx) => {
      const percentage = totalLunas > 0 ? (value / totalLunas) * 100 : 0;
      return {
        name,
        value,
        percentage,
        color: colors[idx % colors.length]
      };
    });

    return { data, totalLunas };
  }, [tagihanList]);

  // CRUD Handlers
  const handleOpenAdd = () => {
    setSelectedBiaya(null);
    setFormData({ nama_biaya: '', nominal: '', frekuensi: 'bulanan' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (biaya: MasterBiaya) => {
    setSelectedBiaya(biaya);
    setFormData({
      nama_biaya: biaya.nama_biaya,
      nominal: biaya.nominal.toString(),
      frekuensi: biaya.frekuensi || 'bulanan'
    });
    setIsModalOpen(true);
  };

  const handleSaveBiaya = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_biaya.trim() || !formData.nominal) {
      toast.error('Semua kolom wajib diisi.');
      return;
    }
    const nominalNum = Number(formData.nominal);
    if (isNaN(nominalNum) || nominalNum < 0) {
      toast.error('Nominal biaya tidak valid.');
      return;
    }

    setSubmittingCRUD(true);
    try {
      const payload = {
        nama_biaya: formData.nama_biaya.trim(),
        nominal: nominalNum,
        frekuensi: formData.frekuensi
      };

      if (selectedBiaya) {
        const { error } = await supabase
          .from('master_biaya')
          .update(payload)
          .eq('id', selectedBiaya.id);

        if (error) throw error;
        toast.success(`Template biaya "${payload.nama_biaya}" berhasil diperbarui!`);
      } else {
        const { error } = await supabase
          .from('master_biaya')
          .insert([payload]);

        if (error) throw error;
        toast.success(`Template biaya "${payload.nama_biaya}" berhasil ditambahkan!`);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Error saving master biaya:', err);
      toast.error('Gagal menyimpan data master biaya.');
    } finally {
      setSubmittingCRUD(false);
    }
  };

  const handleDeleteBiaya = async (id: string, name: string) => {
    if (!confirm(`Hapus template biaya "${name}"? Tindakan ini akan gagal jika ada tagihan aktif yang menggunakannya.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('master_biaya')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success(`Template biaya "${name}" berhasil dihapus.`);
      fetchData();
    } catch (err: any) {
      console.error('Error deleting master biaya:', err);
      toast.error('Gagal menghapus template: data ini kemungkinan sedang digunakan oleh tagihan santri.');
    }
  };

  // Generate Billing Handler
  const handleGenerateBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genIdMasterBiaya) {
      toast.error('Silakan pilih jenis template biaya terlebih dahulu.');
      return;
    }
    if (targetType !== 'semua' && targetType !== 'asrama' && !targetId) {
      toast.error('Silakan tentukan sasaran tagihan secara spesifik.');
      return;
    }

    setGenerating(true);
    try {
      const res = await generateBilling({
        idMasterBiaya: genIdMasterBiaya,
        targetType,
        targetId: (targetType === 'semua' || targetType === 'asrama') ? undefined : targetId
      });

      if (res.success) {
        toast.success(
          `Sukses! ${res.message}`
        );
        fetchData(); // Reload stats and charts
      } else {
        toast.error(res.message || 'Gagal men-generate tagihan.');
      }
    } catch (err: any) {
      console.error('Error generating billing:', err);
      toast.error('Terjadi kesalahan sistem saat membuat tagihan.');
    } finally {
      setGenerating(false);
    }
  };

  const getBulanName = (monthNumber: number) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[monthNumber - 1] || '';
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-emerald-600" /> Manajemen & Pengaturan Keuangan
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">
            Pantau arus pendapatan, piutang, kelola master biaya, dan generate tagihan kolektif.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800 gap-2">
        {[
          { id: 'ringkasan', label: 'Ringkasan Keuangan', icon: Activity },
          { id: 'template', label: 'Template Master Biaya', icon: Layers },
          { id: 'generate', label: 'Generate Tagihan Baru', icon: Sparkles }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTabType)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-slate-400 text-xs">Memproses dashboard keuangan...</p>
        </div>
      ) : (
        <div className="animate-fadeIn">
          
          {/* TAB 1: Ringkasan Keuangan (Dashboard Summary) */}
          {activeTab === 'ringkasan' && (
            <div className="space-y-6">
              
              {/* Stats Card Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Total Piutang */}
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs uppercase font-bold text-slate-450 dark:text-zinc-500 tracking-wider">Total Piutang (Belum Tertagih)</p>
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-450">{formatRupiah(stats.totalPiutang)}</p>
                    <p className="text-[10px] text-slate-400">Akumulasi total tagihan berstatus 'Belum Lunas'</p>
                  </div>
                  <div className="h-14 w-14 bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-6 w-6 transform rotate-180" />
                  </div>
                </div>

                {/* Total Pendapatan Bulan Ini */}
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs uppercase font-bold text-slate-450 dark:text-zinc-500 tracking-wider">Pendapatan Bulan Ini</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-450">{formatRupiah(stats.totalPendapatanBulanIni)}</p>
                    <p className="text-[10px] text-slate-400">Total pembayaran lunas untuk periode {getBulanName(new Date().getMonth() + 1)}</p>
                  </div>
                  <div className="h-14 w-14 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 text-emerald-600 dark:text-emerald-450 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <ArrowUpRight className="h-6 w-6" />
                  </div>
                </div>

              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 12-Month Trend Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-850 pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <BarChart4 className="h-4.5 w-4.5 text-emerald-600" />
                      Tren Uang Masuk (12 Bulan Terakhir)
                    </h3>
                  </div>

                  <div className="relative pt-4">
                    {/* SVG Graphic Path chart */}
                    {trendChartData.points.length > 0 ? (
                      <div className="w-full overflow-hidden">
                        <svg viewBox="0 0 500 150" className="w-full h-44 overflow-visible">
                          <defs>
                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          <line x1="20" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-zinc-850" />
                          <line x1="20" y1="65" x2="480" y2="65" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-zinc-850" />
                          <line x1="20" y1="110" x2="480" y2="110" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-zinc-850" />
                          <line x1="20" y1="130" x2="480" y2="130" stroke="#cbd5e1" strokeWidth="1" className="dark:stroke-zinc-800" />

                          {/* Gradient Fill area */}
                          <path d={trendChartData.areaD} fill="url(#chartGrad)" />

                          {/* Stroke Path line */}
                          <path d={trendChartData.pathD} fill="none" stroke="#10b981" strokeWidth="2.5" />

                          {/* Points overlay */}
                          {trendChartData.points.map((p, idx) => (
                            <g key={idx} className="group/dot cursor-pointer">
                              <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
                              <circle cx={p.x} cy={p.y} r="8" fill="#10b981" fillOpacity="0" className="hover:fill-opacity-10 transition-all" />
                              
                              {/* Label text */}
                              <text x={p.x} y="146" textAnchor="middle" className="text-[7px] font-mono fill-slate-400 dark:fill-zinc-500 font-bold uppercase">{p.label}</text>
                              
                              {/* Hover tooltip values */}
                              <title>{`${p.label}: ${formatRupiah(p.val)}`}</title>
                            </g>
                          ))}
                        </svg>
                      </div>
                    ) : (
                      <div className="h-44 flex items-center justify-center text-slate-400 text-xs">Belum ada data pemasukan terproses.</div>
                    )}
                  </div>
                </div>

                {/* Pie Chart / Radial breakdown of Income by Category */}
                <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-850 pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <PieIcon className="h-4.5 w-4.5 text-emerald-600" />
                      Pendapatan Berdasarkan Kategori
                    </h3>
                  </div>

                  <div className="space-y-4 pt-2">
                    {categoryChartData.data.length > 0 ? (
                      categoryChartData.data.map((c, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${c.color.split(' ')[0]}`} />
                              {c.name}
                            </span>
                            <span className="text-slate-800 dark:text-zinc-300 font-bold">{formatRupiah(c.value)} ({c.percentage.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-zinc-800/80 h-2 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${c.color.split(' ')[0]}`} style={{ width: `${c.percentage}%` }} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-40 flex items-center justify-center text-slate-400 text-xs text-center">
                        Belum ada pendapatan terdata lunas.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: Master Biaya CRUD */}
          {activeTab === 'template' && (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
              <div className="p-5 border-b border-slate-150 dark:border-zinc-850 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Template Master Biaya</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Daftar item biaya rutin pesantren.</p>
                </div>
                <button
                  onClick={handleOpenAdd}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-md shadow-emerald-600/10 transition-all active:scale-95 duration-200"
                >
                  <Plus className="h-4 w-4" /> Tambah Template
                </button>
              </div>

              <div className="overflow-x-auto">
                {masterBiayaList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-10 text-center text-slate-400 py-20">
                    <Layers className="h-10 w-10 text-slate-350 dark:text-zinc-700 mb-3" />
                    <h4 className="font-bold text-xs text-slate-600">Template Kosong</h4>
                    <p className="text-[10px] text-slate-450 mt-0.5">Silakan klik Tambah Template untuk membuat master biaya pertama.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="py-3.5 px-5">Nama Biaya</th>
                        <th className="py-3.5 px-5 text-center">Frekuensi</th>
                        <th className="py-3.5 px-5 text-right">Nominal Template</th>
                        <th className="py-3.5 px-5 text-right w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-xs">
                      {masterBiayaList.map((biaya) => (
                        <tr key={biaya.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-850/20 transition-colors">
                          <td className="py-4 px-5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-emerald-600" />
                            {biaya.nama_biaya}
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              biaya.frekuensi === 'bulanan'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                : biaya.frekuensi === 'persemester'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                            }`}>
                              {biaya.frekuensi === 'bulanan' ? 'Bulanan' : biaya.frekuensi === 'persemester' ? 'Per Semester' : 'Insidentil'}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right font-mono font-bold text-slate-800 dark:text-zinc-300">
                            {formatRupiah(Number(biaya.nominal))}
                          </td>
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              <button
                                onClick={() => handleOpenEdit(biaya)}
                                className="p-1 text-slate-450 hover:text-blue-600 transition-colors"
                                title="Edit"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBiaya(biaya.id, biaya.nama_biaya)}
                                className="p-1 text-slate-450 hover:text-rose-600 transition-colors"
                                title="Hapus"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Generate Dynamic Billing */}
          {activeTab === 'generate' && (
            <div className="max-w-xl mx-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm space-y-5">
              <div className="border-b border-slate-100 dark:border-zinc-850 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="h-4.5 w-4.5 text-emerald-600" />
                  Generate Tagihan Baru Dinamis
                </h3>
                <p className="text-xs text-slate-400 mt-1">Buat tagihan santri secara massal dengan filter target dan frekuensi otomatis.</p>
              </div>

              <form onSubmit={handleGenerateBilling} className="space-y-5">
                
                {/* Select Cost Template */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Pilih Jenis Biaya</label>
                  <select
                    required
                    value={genIdMasterBiaya}
                    onChange={e => {
                      setGenIdMasterBiaya(e.target.value);
                    }}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-zinc-100 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="" disabled>-- Pilih Template Biaya --</option>
                    {masterBiayaList.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.nama_biaya} ({formatRupiah(Number(b.nominal))}) - {b.frekuensi === 'bulanan' ? 'Bulanan' : b.frekuensi === 'persemester' ? 'Per Semester' : 'Insidentil'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Type Filter */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Target Sasaran Tagihan</label>
                  <select
                    required
                    value={targetType}
                    onChange={e => {
                      setTargetType(e.target.value as any);
                      setTargetId('');
                    }}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-850 dark:text-zinc-100 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="semua">Semua Santri Aktif</option>
                    <option value="asrama">Santri Tinggal di Asrama (Mukim)</option>
                    <option value="sekolah">Sekolah / Lembaga Tertentu</option>
                    <option value="kelas">Kelas Tertentu</option>
                    <option value="santri">Khusus Seorang Santri</option>
                  </select>
                </div>

                {/* Sub-Filters based on Target Type */}
                {targetType === 'sekolah' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Pilih Sekolah *</label>
                    <select
                      required
                      value={targetId}
                      onChange={e => setTargetId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-850 dark:text-zinc-100 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="" disabled>-- Pilih Lembaga Sekolah --</option>
                      {sekolahList.map(s => (
                        <option key={s.id} value={s.id}>{s.nama_sekolah} ({s.kategori})</option>
                      ))}
                    </select>
                  </div>
                )}

                {targetType === 'kelas' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Pilih Kelas *</label>
                    <select
                      required
                      value={targetId}
                      onChange={e => setTargetId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-850 dark:text-zinc-100 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="" disabled>-- Pilih Rombel Kelas --</option>
                      {kelasList.map(k => (
                        <option key={k.id} value={k.id}>
                          {k.nama_kelas} - {k.sekolah?.nama_sekolah || 'Tanpa Sekolah'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {targetType === 'santri' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Pilih Santri *</label>
                    <select
                      required
                      value={targetId}
                      onChange={e => setTargetId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-850 dark:text-zinc-100 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="" disabled>-- Pilih Santri Aktif --</option>
                      {santriList.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.nama_lengkap} ({s.nis || 'Tanpa NIS'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Preview/Info Box on Selected Billing Rule */}
                {genIdMasterBiaya && (
                  <div className="bg-emerald-50 dark:bg-emerald-500/[0.03] border border-emerald-500/10 p-4 rounded-xl space-y-2">
                    <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-450">Preview Penagihan:</p>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                      {(() => {
                        const selectedBiayaObj = masterBiayaList.find(b => b.id === genIdMasterBiaya);
                        if (!selectedBiayaObj) return '';
                        
                        if (selectedBiayaObj.frekuensi === 'bulanan') {
                          return `Biaya "${selectedBiayaObj.nama_biaya}" bersifat Bulanan. Sistem akan mendeteksi tahun ajaran aktif dan secara otomatis membuat 12 tagihan (satu untuk setiap bulan) bagi target yang dipilih.`;
                        } else if (selectedBiayaObj.frekuensi === 'persemester') {
                          return `Biaya "${selectedBiayaObj.nama_biaya}" bersifat Per Semester. Sistem akan secara otomatis membuat 2 tagihan (Semester Ganjil dan Semester Genap) pada tahun ajaran aktif bagi target yang dipilih.`;
                        } else {
                          return `Biaya "${selectedBiayaObj.nama_biaya}" bersifat Insidentil. Sistem akan membuat tepat 1 tagihan untuk tahun ajaran aktif bagi target yang dipilih.`;
                        }
                      })()}
                    </p>
                  </div>
                )}

                {/* Warning notice */}
                <div className="bg-amber-500/[0.05] border border-amber-500/10 p-3.5 rounded-xl flex items-start gap-2.5 text-[10px] text-amber-600">
                  <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <p className="font-bold">Keamanan Sistem Billing</p>
                    <p className="text-slate-450 dark:text-zinc-400 mt-0.5">Operasi dijalankan secara aman. Santri yang sudah terdata tagihan di biaya dan periode yang sama tidak akan terpengaruh untuk mencegah tagihan ganda.</p>
                  </div>
                </div>

                {/* Action Trigger Button */}
                <button
                  type="submit"
                  disabled={generating || !genIdMasterBiaya}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/15 transition-all flex items-center justify-center gap-1.5 active:scale-95 duration-200"
                >
                  {generating ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <CheckCircle2 className="h-4.5 w-4.5" />}
                  Generate Tagihan Baru
                </button>
              </form>
            </div>
          )}

        </div>
      )}

      {/* CRUD Modal (Add/Edit master_biaya) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            
            {/* Modal Header */}
            <div className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between bg-slate-50/60 dark:bg-zinc-950/40">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {selectedBiaya ? 'Edit Template Biaya' : 'Tambah Template Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors p-1 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveBiaya}>
              <div className="p-6 space-y-4">
                
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Nama Biaya *</label>
                  <input
                    type="text"
                    required
                    placeholder="Cth: Uang Makan, SPP Bulanan"
                    value={formData.nama_biaya}
                    onChange={e => setFormData(prev => ({ ...prev, nama_biaya: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-850 dark:text-zinc-100 focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Nominal Template (Rp) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="Cth: 150000"
                    value={formData.nominal}
                    onChange={e => setFormData(prev => ({ ...prev, nominal: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-850 dark:text-zinc-100 focus:outline-none transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Frekuensi Penagihan *</label>
                  <select
                    required
                    value={formData.frekuensi}
                    onChange={e => setFormData(prev => ({ ...prev, frekuensi: e.target.value as any }))}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-850 dark:text-zinc-100 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="bulanan">Bulanan</option>
                    <option value="persemester">Per Semester</option>
                    <option value="insidentil">Insidentil</option>
                  </select>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex justify-end gap-2 bg-slate-50/50 dark:bg-zinc-900/50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 text-xs font-bold rounded-lg text-slate-655 dark:text-zinc-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingCRUD}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-lg text-xs flex items-center gap-1.5"
                >
                  {submittingCRUD && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
                  {selectedBiaya ? 'Simpan Perubahan' : 'Tambahkan'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
