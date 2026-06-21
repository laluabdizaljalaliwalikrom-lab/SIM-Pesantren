'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Wallet, DoorOpen, BookOpen, Moon, School,
  RefreshCw, Clock, Users, UserCheck,
} from 'lucide-react';

const REFRESH_INTERVAL_MS = 20000;

function formatRp(n: number): string {
  return `Rp${n.toLocaleString('id-ID')}`;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins}m lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j lalu`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    Terlambat: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    Alpha: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
    Izin: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
    Sakit: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300',
    Hadir: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    diajukan: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    disetujui: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    ditolak: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
    kembali: 'bg-slate-200 dark:bg-slate-500/20 text-slate-600 dark:text-slate-300',
  };
  return map[status] || 'bg-slate-200 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300';
}

function Skeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 animate-pulse space-y-1.5">
          <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-2.5 w-40 bg-slate-200/60 dark:bg-slate-800/60 rounded" />
        </div>
      ))}
    </>
  );
}

function ModuleCard({ icon: Icon, title, count, accent, loading, children, isEmpty }: {
  icon: React.ElementType; title: string; count: number; accent: string;
  loading: boolean; children: React.ReactNode; isEmpty?: boolean;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    violet: 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
  };
  return (
    <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/60 backdrop-blur-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${colorMap[accent] || colorMap.emerald} flex items-center justify-center`}>
            <Icon className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold">{title}</h2>
        </div>
        <span className={`text-[11px] font-semibold tabular-nums ${colorMap[accent] || colorMap.emerald}`}>
          {count}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-200 dark:divide-slate-800/40" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        {loading ? <Skeleton /> : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-600">
            <Icon className="h-6 w-6 mb-2 opacity-40" />
            <p className="text-xs">Belum ada data</p>
          </div>
        ) : children}
      </div>
    </div>
  );
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)),
  ]);
}

export default function ExecutiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [permits, setPermits] = useState<any[]>([]);
  const [tahfidz, setTahfidz] = useState<any[]>([]);
  const [sholat, setSholat] = useState<any[]>([]);
  const [kbm, setKbm] = useState<any[]>([]);
  const [santriTotal, setSantriTotal] = useState(0);
  const [clock, setClock] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mountedRef.current) setLoading(false);
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  async function fetchData() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const TIMEOUT = 10000;

      const [payRes, permRes, tahfRes, solRes, kbmRes] = await Promise.all([
        withTimeout(supabase.from('pembayaran_group').select('id, total_bayar, id_santri, created_at').order('created_at', { ascending: false }).limit(15), TIMEOUT).catch(() => ({ data: [], error: { message: 'timeout' } })),
        withTimeout(supabase.from('perizinan').select('id, keperluan, status, tanggal_keluar, rencana_kembali, created_at, id_santri').in('status', ['diajukan', 'disetujui']).order('created_at', { ascending: false }).limit(20), TIMEOUT).catch(() => ({ data: [], error: { message: 'timeout' } })),
        withTimeout(supabase.from('presensi_tahfidz').select('id, juz, nama_surah, tipe_setoran, nilai_kelancaran, created_at, id_santri').eq('tanggal_setoran', today).order('created_at', { ascending: false }).limit(20), TIMEOUT).catch(() => ({ data: [], error: { message: 'timeout' } })),
        withTimeout(supabase.from('absensi_sholat').select('id, waktu_sholat, status, keterangan, created_at, id_santri').eq('tanggal', today).neq('status', 'Hadir').order('created_at', { ascending: false }).limit(20), TIMEOUT).catch(() => ({ data: [], error: { message: 'timeout' } })),
        withTimeout(supabase.from('absensi').select('id, id_jadwal, status, keterangan, created_at, id_santri').eq('tanggal', today).neq('status', 'Hadir').order('created_at', { ascending: false }).limit(20), TIMEOUT).catch(() => ({ data: [], error: { message: 'timeout' } })),
      ]);

      if (!mountedRef.current) return;

      const payData = payRes.data || [];
      const permData = permRes.data || [];
      const tahfData = tahfRes.data || [];
      const solData = solRes.data || [];
      const kbmData = kbmRes.data || [];

      // Batch fetch santri names
      const allSantriIds = [...new Set([
        ...payData.map((p: any) => p.id_santri).filter(Boolean),
        ...permData.map((p: any) => p.id_santri).filter(Boolean),
        ...tahfData.map((t: any) => t.id_santri).filter(Boolean),
        ...solData.map((s: any) => s.id_santri).filter(Boolean),
        ...kbmData.map((a: any) => a.id_santri).filter(Boolean),
      ])] as string[];

      const allJadwalIds = [...new Set(kbmData.map((a: any) => a.id_jadwal).filter(Boolean))] as string[];

      let santriMap: Record<string, string> = {};
      let jadwalMap: Record<string, string> = {};
      let biayaMap: Record<string, string[]> = {};

      const [santriRes, jadwalRes] = await Promise.all([
        allSantriIds.length > 0
          ? withTimeout(supabase.from('santri').select('id, nama_lengkap').in('id', allSantriIds), 5000)
          : { data: [], error: null },
        allJadwalIds.length > 0
          ? withTimeout(supabase.from('jadwal_pelajaran').select('id, id_mapel').in('id', allJadwalIds), 5000)
          : { data: [], error: null },
      ]);

      if (santriRes.error) throw new Error(`Query santri names: ${santriRes.error.message}`);
      if (jadwalRes.error) throw new Error(`Query jadwal: ${jadwalRes.error.message} `);

      ((santriRes as any)?.data || []).forEach((s: any) => { santriMap[s.id] = s.nama_lengkap; });

      const jData = (jadwalRes as any)?.data || [];
      if (jData.length > 0) {
        const mapelIds = [...new Set(jData.map((j: any) => j.id_mapel).filter(Boolean))] as string[];
        const mapelRes = await withTimeout(supabase.from('mapel').select('id, nama_mapel').in('id', mapelIds), 5000);
        if (mapelRes.error) throw new Error(`Query mapel: ${mapelRes.error.message}`);
        const mMap: Record<string, string> = {};
        (mapelRes.data || []).forEach((m: any) => { mMap[m.id] = m.nama_mapel; });
        jData.forEach((j: any) => {
          if (j.id_mapel && mMap[j.id_mapel]) jadwalMap[j.id] = mMap[j.id_mapel];
        });
      }

      // Fetch biaya info for payments
      const payIds = payData.map((p: any) => p.id);
      if (payIds.length > 0) {
        const pLinesRes = await withTimeout(supabase.from('pembayaran').select('id_group, id_tagihan').in('id_group', payIds), 5000);
        if (!pLinesRes.error) {
          const tIds = [...new Set((pLinesRes.data || []).map((pl: any) => pl.id_tagihan).filter(Boolean))] as string[];
          if (tIds.length > 0) {
            const tagRes = await withTimeout(supabase.from('tagihan').select('id, id_master_biaya').in('id', tIds), 5000);
            if (!tagRes.error) {
              const mbIds = [...new Set((tagRes.data || []).map((t: any) => t.id_master_biaya).filter(Boolean))] as string[];
              if (mbIds.length > 0) {
                const mbRes = await withTimeout(supabase.from('master_biaya').select('id, nama_biaya').in('id', mbIds), 5000);
                if (!mbRes.error) {
                  const mbMap: Record<string, string> = {};
                  (mbRes.data || []).forEach((mb: any) => { mbMap[mb.id] = mb.nama_biaya; });
                  const tMap: Record<string, string> = {};
                  (tagRes.data || []).forEach((t: any) => { if (t.id_master_biaya && mbMap[t.id_master_biaya]) tMap[t.id] = mbMap[t.id_master_biaya]; });
                  (pLinesRes.data || []).forEach((pl: any) => {
                    if (pl.id_group && pl.id_tagihan && tMap[pl.id_tagihan]) {
                      if (!biayaMap[pl.id_group]) biayaMap[pl.id_group] = [];
                      biayaMap[pl.id_group].push(tMap[pl.id_tagihan]);
                    }
                  });
                }
              }
            }
          }
        }
      }

      if (!mountedRef.current) return;

      const enrichSantri = (items: any[]) =>
        items.map((item: any) => ({ ...item, _santri: santriMap[item.id_santri] || 'Santri' }));

      const enrichedPayments = payData.map((p: any) => {
        const names = biayaMap[p.id] || [];
        const unique = [...new Set(names)];
        return {
          ...p,
          _santri: santriMap[p.id_santri] || 'Santri',
          _biaya: unique.length > 0
            ? (unique.length === 1 ? unique[0] : `${unique[0]} +${unique.length - 1} lainnya`)
            : 'Pembayaran',
        };
      });

      const enrichedKbm = kbmData.map((a: any) => ({
        ...a,
        _santri: santriMap[a.id_santri] || 'Santri',
        _mapel: a.id_jadwal ? (jadwalMap[a.id_jadwal] || '') : '',
      }));

      if (!mountedRef.current) return;

      setPayments(enrichedPayments);
      setPermits(enrichSantri(permData));
      setTahfidz(enrichSantri(tahfData));
      setSholat(enrichSantri(solData));
      setKbm(enrichedKbm);
      setSantriTotal(allSantriIds.length);
      setLoading(false);
      setError(null);
    } catch (err: any) {
      console.error('Dashboard error:', err);
      if (mountedRef.current) {
        setError(err?.message || 'Terjadi kesalahan');
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function tick() {
      setClock(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-4 md:p-6 space-y-4 font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center">
            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight">Monitoring Operasional</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-widest uppercase">SIM Pesantren</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            {!loading && new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50">
            <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-lg font-semibold tabular-nums tracking-wider">{clock}</span>
          </div>
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <UserCheck className="h-3 w-3" /> {santriTotal || '-'} Santri
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Keuangan */}
        <ModuleCard icon={Wallet} title="Keuangan" count={payments.length} accent="emerald" loading={loading} isEmpty={!loading && payments.length === 0}>
          {payments.map((pay: any) => (
            <div key={pay.id} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{pay._santri}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{pay._biaya}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatRp(Number(pay.total_bayar))}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">{timeAgo(pay.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </ModuleCard>

        {/* Perizinan */}
        <ModuleCard icon={DoorOpen} title="Perizinan" count={permits.length} accent="blue" loading={loading} isEmpty={!loading && permits.length === 0}>
          {permits.map((p: any) => (
            <div key={p.id} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{p._santri}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{p.keperluan}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusBadge(p.status)}`}>
                    {p.status === 'diajukan' ? 'MENUNGGU' : p.status === 'disetujui' ? 'DISETUJUI' : p.status}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-600">{timeAgo(p.created_at)}</span>
                </div>
              </div>
              {(p.tanggal_keluar || p.rencana_kembali) && (
                <div className="flex gap-3 mt-1.5 text-[10px] text-slate-400 dark:text-slate-600">
                  {p.tanggal_keluar && <span>Keluar: {new Date(p.tanggal_keluar).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                  {p.rencana_kembali && <span>Kembali: {new Date(p.rencana_kembali).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                </div>
              )}
            </div>
          ))}
        </ModuleCard>

        {/* Tahfidz */}
        <ModuleCard icon={BookOpen} title="Tahfidz Hari Ini" count={tahfidz.length} accent="violet" loading={loading} isEmpty={!loading && tahfidz.length === 0}>
          {tahfidz.map((t: any) => (
            <div key={t.id} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{t._santri}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">Juz {t.juz} &middot; {t.nama_surah}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    t.nilai_kelancaran === 'A' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                    t.nilai_kelancaran === 'B' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' :
                    t.nilai_kelancaran === 'C' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                    'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                  }`}>{t.nilai_kelancaran}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{t.tipe_setoran}</span>
                </div>
              </div>
            </div>
          ))}
        </ModuleCard>

        {/* Absensi Sholat */}
        <ModuleCard icon={Moon} title="Absensi Sholat" count={sholat.length} accent="amber" loading={loading} isEmpty={!loading && sholat.length === 0}>
          {sholat.map((s: any) => (
            <div key={s.id} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{s._santri}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="font-medium text-amber-600 dark:text-amber-400">{s.waktu_sholat}</span>
                    {s.keterangan ? <span className="text-slate-500 dark:text-slate-400"> &middot; {s.keterangan}</span> : null}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusBadge(s.status)}`}>{s.status}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-600">{timeAgo(s.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </ModuleCard>
      </div>

      {/* KBM */}
      <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/60 backdrop-blur-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <School className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-sm font-bold">Absensi KBM Hari Ini</h2>
            <span className="text-[11px] text-slate-400 dark:text-slate-600 ml-1">— Santri tidak hadir</span>
          </div>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold tabular-nums">{kbm.length}</span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex gap-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 w-44 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
              ))}
            </div>
          ) : kbm.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-600">
              <School className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Semua santri hadir hari ini ✅</p>
            </div>
          ) : (
            <div className="flex gap-3 p-4 overflow-x-auto">
              {kbm.map((a: any) => (
                <div key={a.id} className="shrink-0 w-52 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 p-3 space-y-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">{a._santri}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusBadge(a.status)}`}>{a.status}</span>
                  </div>
                  {a._mapel && <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{a._mapel}</p>}
                  {a.keterangan && <p className="text-[10px] text-slate-500 dark:text-slate-400 italic leading-tight">&ldquo;{a.keterangan}&rdquo;</p>}
                  <p className="text-[10px] text-slate-400 dark:text-slate-600">{timeAgo(a.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-700 pb-2">
        <span>Auto-refresh setiap {REFRESH_INTERVAL_MS / 1000} detik</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          LIVE
        </span>
      </div>
    </div>
  );
}
