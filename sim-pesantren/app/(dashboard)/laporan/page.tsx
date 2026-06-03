'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart4,
  PieChart as PieIcon,
  TrendingUp,
  DollarSign,
  Loader2,
  Download,
  Calendar,
  Filter,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function LaporanKeuanganPage() {
  const [loading, setLoading] = useState(true);
  const [tagihanList, setTagihanList] = useState<any[]>([]);
  const [pembayaranList, setPembayaranList] = useState<any[]>([]);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterDay, setFilterDay] = useState('all');

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const getBulanName = (monthNumber: number) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    return months[monthNumber - 1] || '';
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data: tagihan } = await supabase
          .from('tagihan')
          .select('*, master_biaya:id_master_biaya(*)');

        const { data: pembayaran } = await supabase
          .from('pembayaran')
          .select(`
            *,
            santri:id_santri (id, nama_lengkap, nis),
            tagihan:id_tagihan (id, bulan, tahun, master_biaya:id_master_biaya (nama_biaya)),
            admin:id_admin (id, nama_lengkap)
          `)
          .order('created_at', { ascending: false });

        setTagihanList(tagihan || []);
        setPembayaranList(pembayaran || []);
      } catch (err: any) {
        console.error('Error fetching laporan data:', err);
        toast.error('Gagal memuat data laporan.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filter data
  const filteredPembayaran = useMemo(() => {
    return pembayaranList.filter(p => {
      const date = new Date(p.created_at);
      const yearMatch = date.getFullYear().toString() === filterYear;
      const monthMatch = filterMonth === 'all' || (date.getMonth() + 1).toString() === filterMonth;
      const dayMatch = filterDay === 'all' || date.getDate().toString() === filterDay;
      return yearMatch && monthMatch && dayMatch;
    });
  }, [pembayaranList, filterYear, filterMonth, filterDay]);

  // Stats
  const stats = useMemo(() => {
    const totalPendapatan = filteredPembayaran.reduce((sum, p) => sum + (Number(p.jumlah) || 0), 0);
    const totalTagihan = tagihanList.reduce((sum, t) => {
      if (t.status === 'Belum Lunas') return sum + (Number(t.nominal) || 0);
      return sum;
    }, 0);
    const totalLunas = tagihanList.reduce((sum, t) => {
      if (t.status === 'Lunas') return sum + (Number(t.nominal) || 0);
      return sum;
    }, 0);

    return { totalPendapatan, totalTagihan, totalLunas };
  }, [filteredPembayaran, tagihanList]);

  // Monthly trend data (12 months)
  const trendData = useMemo(() => {
    const monthly: Record<string, number> = {};
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getMonth() + 1}-${d.getFullYear()}`;
      monthly[key] = 0;
    }
    pembayaranList.forEach(p => {
      const date = new Date(p.created_at);
      const key = `${date.getMonth() + 1}-${date.getFullYear()}`;
      if (monthly[key] !== undefined) {
        monthly[key] += Number(p.jumlah) || 0;
      }
    });
    return Object.entries(monthly).map(([key, value]) => {
      const [m, y] = key.split('-').map(Number);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return { label: `${months[m - 1]} ${y.toString().slice(-2)}`, value };
    });
  }, [pembayaranList]);

  // Category pie data
  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    let total = 0;
    filteredPembayaran.forEach(p => {
      const catName = p.tagihan?.master_biaya?.nama_biaya || 'Lainnya';
      const nominal = Number(p.jumlah) || 0;
      cats[catName] = (cats[catName] || 0) + nominal;
      total += nominal;
    });
    const colors = ['bg-emerald-500', 'bg-teal-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500'];
    return Object.entries(cats).map(([name, value], idx) => ({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
      color: colors[idx % colors.length],
    }));
  }, [filteredPembayaran]);

  // Export
  const exportLaporan = () => {
    if (filteredPembayaran.length === 0) {
      toast.error('Tidak ada data untuk diexport.');
      return;
    }
    const data = filteredPembayaran.map((p: any) => ({
      'No. Kuitansi': p.nomor_kuitansi || '-',
      'Tanggal': new Date(p.created_at).toLocaleString('id-ID'),
      'Santri': p.santri?.nama_lengkap || '-',
      'NIS': p.santri?.nis || '-',
      'Biaya': p.tagihan?.master_biaya?.nama_biaya || '-',
      'Periode': p.tagihan ? `${getBulanName(p.tagihan.bulan)} ${p.tagihan.tahun}` : '-',
      'Jumlah': Number(p.jumlah) || 0,
      'Petugas': p.admin?.nama_lengkap || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Keuangan');
    const colWidths = Object.keys(data[0]).map(key => ({
      wch: Math.max(key.length, ...data.map(row => String(row[key as keyof typeof row]).length)) + 2,
    }));
    ws['!cols'] = colWidths;
    const dayStr = filterDay !== 'all' ? `-${filterDay}` : '';
    XLSX.writeFile(wb, `laporan-keuangan-${filterYear}-${filterMonth !== 'all' ? filterMonth : 'semua'}${dayStr}.xlsx`);
    toast.success('Laporan berhasil diexport.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const maxTrendValue = Math.max(...trendData.map(d => d.value), 1);
  const chartHeight = 180;

  return (
    <>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart4 className="h-6 w-6 text-emerald-600" /> Laporan Keuangan
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">
            Rekap pendapatan, piutang, dan tren keuangan pesantren.
          </p>
        </div>
        <button
          onClick={exportLaporan}
          disabled={filteredPembayaran.length === 0}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-600/10 transition-all active:scale-95"
        >
          <Download className="h-4 w-4" />
          Export Laporan
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm mb-8">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <select
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-emerald-500"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filterMonth}
            onChange={e => { setFilterMonth(e.target.value); setFilterDay('all'); }}
            className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Semua Bulan</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{getBulanName(m)}</option>
            ))}
          </select>
        </div>
        {filterMonth !== 'all' && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filterDay}
              onChange={e => setFilterDay(e.target.value)}
              className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Semua Hari</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Total Pendapatan</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {formatRupiah(stats.totalPendapatan)}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            {filterMonth === 'all' ? `Tahun ${filterYear}` : `${getBulanName(Number(filterMonth))} ${filterYear}`}
            {filterDay !== 'all' && `, ${filterDay}`}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Total Piutang</p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {formatRupiah(stats.totalTagihan)}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Tagihan Belum Lunas</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Tingkat Pelunasan</p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
            {stats.totalLunas + stats.totalTagihan > 0
              ? `${((stats.totalLunas / (stats.totalLunas + stats.totalTagihan)) * 100).toFixed(1)}%`
              : '0%'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Dari total tagihan</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-850 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Tren Pendapatan (12 Bulan)
            </h3>
          </div>
          <div className="relative pt-2">
            {trendData.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <div className="flex items-end gap-2 h-[180px] min-w-[500px]">
                  {trendData.map((d, idx) => {
                    const height = maxTrendValue > 0 ? (d.value / maxTrendValue) * chartHeight : 0;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
                        <div className="relative w-full flex justify-center">
                          <div
                            className="w-full max-w-[32px] bg-emerald-500/80 dark:bg-emerald-600/80 rounded-t-md hover:bg-emerald-600 transition-all cursor-pointer relative group"
                            style={{ height: Math.max(height, 4) }}
                          >
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {formatRupiah(d.value)}
                            </div>
                          </div>
                        </div>
                        <span className="text-[8px] text-slate-400 mt-1 font-mono">{d.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-slate-400 text-xs">Belum ada data.</div>
            )}
          </div>
        </div>

        {/* Category Pie */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-850 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <PieIcon className="h-4 w-4 text-emerald-600" />
              Per Kategori
            </h3>
          </div>
          <div className="space-y-4 pt-2">
            {categoryData.length > 0 ? (
              categoryData.map((c, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${c.color}`} />
                      {c.name}
                    </span>
                    <span className="text-slate-800 dark:text-zinc-300 font-bold">{formatRupiah(c.value)} ({c.percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-zinc-800/80 h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.percentage}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-400 text-xs">Belum ada data.</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-150 dark:border-zinc-850">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Transaksi Terbaru</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {filterMonth === 'all' ? `Seluruh transaksi tahun ${filterYear}` : `Transaksi ${getBulanName(Number(filterMonth))} ${filterYear}`}
          </p>
        </div>
        <div className="overflow-x-auto">
          {filteredPembayaran.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center text-slate-400 py-16">
              <DollarSign className="h-10 w-10 text-slate-300 dark:text-zinc-700 mb-3" />
              <h4 className="font-bold text-xs text-slate-600">Belum Ada Transaksi</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Tidak ada data pembayaran pada periode ini.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-5">Tanggal</th>
                  <th className="py-3 px-5">No. Kuitansi</th>
                  <th className="py-3 px-5">Santri</th>
                  <th className="py-3 px-5">Biaya</th>
                  <th className="py-3 px-5 text-right">Jumlah</th>
                  <th className="py-3 px-5">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-xs">
                {filteredPembayaran.slice(0, 100).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-850/20 transition-colors">
                    <td className="py-3 px-5 font-mono text-slate-500">
                      {new Date(p.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                    </td>
                    <td className="py-3 px-5 font-mono text-slate-500 text-[9px]">
                      {p.nomor_kuitansi || '-'}
                    </td>
                    <td className="py-3 px-5 font-bold text-slate-900 dark:text-white">
                      {p.santri?.nama_lengkap || '-'}
                    </td>
                    <td className="py-3 px-5 text-slate-700 dark:text-zinc-300">
                      {p.tagihan?.master_biaya?.nama_biaya || '-'}
                    </td>
                    <td className="py-3 px-5 text-right font-mono font-bold text-emerald-600">
                      {formatRupiah(Number(p.jumlah) || 0)}
                    </td>
                    <td className="py-3 px-5 text-slate-500">
                      {p.admin?.nama_lengkap || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </>
  );
}
