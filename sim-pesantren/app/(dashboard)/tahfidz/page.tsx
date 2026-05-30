'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Santri, PresensiTahfidz } from '@/types/database';
import { 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
} from 'lucide-react';
import FormSetoranTahfidz from '@/components/FormSetoranTahfidz';

export default function TahfidzTracker() {
  // Database States
  const [santriList, setSantriList] = useState<Pick<Santri, 'id' | 'nis' | 'nama_lengkap'>[]>([]);
  const [recentSetorans, setRecentSetorans] = useState<PresensiTahfidz[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Form Input Section */}
        <div className="md:col-span-2">
          <FormSetoranTahfidz santriList={santriList} onSuccess={fetchData} />
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
