'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { AuditLog } from '@/types/database';
import EmptyState from '@/components/empty-state';
import {
  FileSearch,
  Search,
  Download,
  Shield,
  Eye,
  RefreshCw,
  X,
  Database,
  Activity,
  Trash2,
  Edit,
  PlusCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('Semua');
  const [selectedAction, setSelectedAction] = useState('Semua');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Modal Detail State
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Fetch Data Callback
  const fetchLogs = useCallback(async () => {
    try {
      const query = supabase
        .from('audit_logs')
        .select(`
          id,
          created_at,
          user_id,
          user_name,
          user_role,
          action,
          module,
          record_id,
          description,
          old_data,
          new_data,
          ip_address,
          user_agent
        `)
        .order('created_at', { ascending: false })
        .limit(300);

      const { data, error } = await query;
      if (error) {
        if (error.code === '42P01') {
          console.warn('Tabel audit_logs belum dibuat di Supabase.');
          setLogs([]);
          return;
        }
        throw error;
      }

      setLogs(data || []);
    } catch (err: unknown) {
      console.error('Error fetching audit logs:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error';
      toast.error('Gagal memuat log audit: ' + errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadInitialLogs() {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select(`
            id,
            created_at,
            user_id,
            user_name,
            user_role,
            action,
            module,
            record_id,
            description,
            old_data,
            new_data,
            ip_address,
            user_agent
          `)
          .order('created_at', { ascending: false })
          .limit(300);

        if (ignore) return;

        if (error) {
          if (error.code === '42P01') {
            setLogs([]);
            return;
          }
          throw error;
        }

        setLogs(data || []);
      } catch (err: unknown) {
        if (ignore) return;
        console.error('Error loading initial logs:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadInitialLogs();

    return () => {
      ignore = true;
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchLogs();
  };

  // Unique Modules & Actions for Filter Dropdowns
  const modulesList = ['Semua', 'Santri', 'Pegawai', 'Keuangan', 'Pembayaran', 'Asrama', 'Tahfidz', 'Akademik', 'PPDB', 'Settings', 'Auth'];
  const actionsList = ['Semua', 'CREATE', 'UPDATE', 'DELETE', 'PAYMENT', 'IMPORT', 'EXPORT', 'LOGIN'];

  // Filter Logic
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Search Query
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesUser = log.user_name?.toLowerCase().includes(q);
        const matchesRole = log.user_role?.toLowerCase().includes(q);
        const matchesDesc = log.description?.toLowerCase().includes(q);
        const matchesRec = log.record_id?.toLowerCase().includes(q);
        if (!matchesUser && !matchesRole && !matchesDesc && !matchesRec) return false;
      }

      // 2. Module Filter
      if (selectedModule !== 'Semua' && log.module !== selectedModule) {
        return false;
      }

      // 3. Action Filter
      if (selectedAction !== 'Semua' && log.action !== selectedAction) {
        return false;
      }

      // 4. Date Range Filter
      if (dateStart) {
        const logDate = new Date(log.created_at).toISOString().split('T')[0];
        if (logDate < dateStart) return false;
      }
      if (dateEnd) {
        const logDate = new Date(log.created_at).toISOString().split('T')[0];
        if (logDate > dateEnd) return false;
      }

      return true;
    });
  }, [logs, searchTerm, selectedModule, selectedAction, dateStart, dateEnd]);

  // Statistics calculation
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayCount = logs.filter((l) => l.created_at.startsWith(today)).length;
    const creates = logs.filter((l) => l.action === 'CREATE').length;
    const updates = logs.filter((l) => l.action === 'UPDATE').length;
    const deletes = logs.filter((l) => l.action === 'DELETE').length;

    return {
      total: logs.length,
      today: todayCount,
      mutations: creates + updates,
      deletes,
    };
  }, [logs]);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      toast.info('Tidak ada data log yang dapat diekspor.');
      return;
    }

    const dataToExport = filteredLogs.map((l, index) => ({
      No: index + 1,
      Waktu: new Date(l.created_at).toLocaleString('id-ID'),
      Pengguna: l.user_name || '—',
      Peran: l.user_role || '—',
      Aksi: l.action,
      Modul: l.module,
      Deskripsi: l.description,
      'Record ID': l.record_id || '—',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Trail');
    XLSX.writeFile(wb, `Audit_Trail_SIM_Pesantren_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Log audit berhasil diekspor ke Excel!');
  };

  // Helper formatting badge
  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
      case 'UPDATE':
        return 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
      case 'DELETE':
        return 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20';
      case 'PAYMENT':
        return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
      case 'IMPORT':
      case 'EXPORT':
        return 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20';
      default:
        return 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header (Sesuai Standar GEMINI.md) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileSearch className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            Audit Trail & Log Aktivitas
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Rekam jejak seluruh mutasi data, transaksi, dan aktivitas sistem untuk akuntabilitas & keamanan.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all shadow-sm active:scale-95"
            title="Muat Ulang"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 dark:text-zinc-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all duration-200 active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* ── Stat Cards (Sesuai Standar GEMINI.md) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20 shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Aktivitas Hari Ini</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{stats.today} Log</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-500/20 shrink-0">
            <Edit className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Perubahan Data</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{stats.mutations}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-500/20 shrink-0">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Penghapusan</p>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">{stats.deletes}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-500/20 shrink-0">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Total Rekaman</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{stats.total}</p>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls (Sesuai Standar GEMINI.md) ── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar presisi: left-3.5, pl-10 pr-4 py-2.5 */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari user, deskripsi, atau ID entitas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Module Select */}
          <div className="w-full md:w-44">
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {modulesList.map((m) => (
                <option key={m} value={m}>
                  Modul: {m}
                </option>
              ))}
            </select>
          </div>

          {/* Action Select */}
          <div className="w-full md:w-40">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {actionsList.map((a) => (
                <option key={a} value={a}>
                  Aksi: {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filter row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 dark:text-zinc-500 font-medium">Rentang Waktu:</span>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-slate-400 dark:text-zinc-500">—</span>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-emerald-500"
            />
            {(dateStart || dateEnd || selectedModule !== 'Semua' || selectedAction !== 'Semua' || searchTerm) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedModule('Semua');
                  setSelectedAction('Semua');
                  setDateStart('');
                  setDateEnd('');
                }}
                className="text-rose-600 dark:text-rose-400 hover:underline text-xs font-semibold ml-2"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400 dark:text-zinc-500">
            Menampilkan <strong className="text-slate-700 dark:text-zinc-200">{filteredLogs.length}</strong> log
          </div>
        </div>
      </div>

      {/* ── Main Table Card ── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-slate-400 dark:text-zinc-500 text-xs">Memuat rekam jejak audit...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 px-4">
            {logs.length === 0 ? (
              <EmptyState
                icon={FileSearch}
                title="Belum Ada Log Aktivitas"
                description="Riwayat audit trail akan otomatis muncul di sini setiap kali ada aktivitas transaksi atau perubahan data."
                action={{
                  label: 'Muat Ulang Data',
                  onClick: handleRefresh,
                }}
              />
            ) : (
              <EmptyState
                icon={FileSearch}
                title="Tidak Ada Data yang Cocok"
                description="Tidak ditemukan log aktivitas yang sesuai dengan kata kunci pencarian atau filter yang dipilih."
                action={{
                  label: 'Reset Filter',
                  onClick: () => {
                    setSearchTerm('');
                    setSelectedModule('Semua');
                    setSelectedAction('Semua');
                    setDateStart('');
                    setDateEnd('');
                  },
                }}
              />
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-950/60 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 w-40">Waktu (WITA)</th>
                  <th className="py-3.5 px-4 w-44">Pengguna</th>
                  <th className="py-3.5 px-3 w-28 text-center">Aksi</th>
                  <th className="py-3.5 px-3 w-28">Modul</th>
                  <th className="py-3.5 px-4">Deskripsi Aktivitas</th>
                  <th className="py-3.5 px-3 w-20 text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredLogs.map((log) => {
                  const logDate = new Date(log.created_at);
                  const formattedTime = logDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const formattedDate = logDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-850/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-zinc-400">
                        <div className="font-semibold text-slate-700 dark:text-zinc-200">{formattedTime}</div>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500">{formattedDate}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                          {log.user_name || 'Sistem'}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                          <Shield className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          <span>{log.user_role || 'Staff'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[9.5px] font-bold border ${getActionBadge(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-700 dark:text-zinc-300">
                        {log.module}
                      </td>

                      <td className="py-3 px-4 text-slate-700 dark:text-zinc-300 leading-relaxed">
                        <p>{log.description}</p>
                        {log.record_id && (
                          <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                            ID: {log.record_id}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          title="Lihat Data Snapshot"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Detail Diff / Snapshot Data ── */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <FileSearch className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Detail Rekam Jejak Audit</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200/70 dark:border-zinc-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Waktu</span>
                  <p className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5">
                    {new Date(selectedLog.created_at).toLocaleString('id-ID')}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Pelaku</span>
                  <p className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5">
                    {selectedLog.user_name} ({selectedLog.user_role})
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Aksi</span>
                  <p className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5">
                    {selectedLog.action} ({selectedLog.module})
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Entitas ID</span>
                  <p className="font-mono text-slate-800 dark:text-zinc-200 mt-0.5 truncate">
                    {selectedLog.record_id || '—'}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Deskripsi:</span>
                <p className="font-medium text-slate-800 dark:text-zinc-200 mt-1 bg-slate-50 dark:bg-zinc-950 p-3 rounded-xl border border-slate-200/70 dark:border-zinc-800">
                  {selectedLog.description}
                </p>
              </div>

              {/* Data Diff (Old Data vs New Data) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                    <Trash2 className="h-3 w-3" /> Data Sebelum (Old Data):
                  </span>
                  <pre className="p-3 bg-slate-900 text-slate-200 dark:bg-zinc-950 rounded-xl overflow-x-auto text-[11px] font-mono max-h-56 border border-slate-800 leading-relaxed">
                    {selectedLog.old_data
                      ? JSON.stringify(selectedLog.old_data, null, 2)
                      : '// Tidak ada data lama (Aksi Create / Login)'}
                  </pre>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                    <PlusCircle className="h-3 w-3" /> Data Sesudah (New Data):
                  </span>
                  <pre className="p-3 bg-slate-900 text-slate-200 dark:bg-zinc-950 rounded-xl overflow-x-auto text-[11px] font-mono max-h-56 border border-slate-800 leading-relaxed">
                    {selectedLog.new_data
                      ? JSON.stringify(selectedLog.new_data, null, 2)
                      : '// Tidak ada data baru (Aksi Delete / Logout)'}
                  </pre>
                </div>
              </div>

              {selectedLog.user_agent && (
                <div className="pt-2 text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                  User Agent: {selectedLog.user_agent}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-xl font-bold text-xs transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
