'use client';

import React, { useState, useRef, useCallback } from 'react';
import { scanAbsensiSantri } from '@/services/absensi-santri-actions';
import FastQrScanner from '@/components/fast-qr-scanner';
import {
  QrCode,
  Camera,
  CameraOff,
  Loader2,
  CheckCircle,
  ArrowLeft,
  User,
  Clock,
  RefreshCw,
  Zap,
  GraduationCap,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface ScanResult {
  nama: string;
  action: 'masuk' | 'keluar';
  status: string;
  time: string;
}

export default function ScanAbsenSantriPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [manualNis, setManualNis] = useState('');

  const loadingRef = useRef(false);
  const cooldownRef = useRef(false);

  const processScan = useCallback(async (inputCode: string) => {
    if (loadingRef.current || cooldownRef.current) return;

    let santriId = inputCode.trim();
    try {
      const url = new URL(inputCode);
      santriId = url.searchParams.get('id') || inputCode;
    } catch {
      santriId = inputCode.trim();
    }

    if (!santriId) {
      toast.error('Kode QR / NIS tidak valid');
      return;
    }

    loadingRef.current = true;
    cooldownRef.current = true;
    setLoading(true);

    try {
      const result = await scanAbsensiSantri(santriId);

      if (result.success) {
        const now = new Date();
        setLastResult({
          nama: result.nama_santri || 'Santri',
          action: result.action as 'masuk' | 'keluar',
          status: result.action === 'masuk' ? (result.message?.includes('Terlambat') ? 'Terlambat' : 'Hadir') : 'Keluar',
          time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
        toast.success(result.message);
        setManualNis('');
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Terjadi kesalahan saat memproses scan absensi santri');
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setTimeout(() => {
        cooldownRef.current = false;
      }, 2500);
    }
  }, []);

  const handleScan = useCallback(
    (decodedText: string) => {
      processScan(decodedText);
    },
    [processScan]
  );

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualNis.trim()) {
      processScan(manualNis.trim());
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/absen-santri"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Riwayat
        </Link>
        <span className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
          Sistem Absensi Santri via QR
        </span>
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-indigo-950 p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 backdrop-blur-md rounded-2xl border border-emerald-500/30">
            <QrCode className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-emerald-400" /> Scan QR Absensi Santri
            </h1>
            <p className="text-emerald-100/80 text-sm mt-0.5">
              Arahkan kamera ke Kartu QR Santri atau masukkan NIS santri untuk absen masuk/keluar.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Main Scanner Section */}
        <div className="md:col-span-7 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Kamera Pemindai
            </h2>
            <button
              onClick={() => setIsScanning(!isScanning)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isScanning
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20'
              }`}
            >
              {isScanning ? (
                <>
                  <CameraOff className="w-4 h-4" /> Matikan Kamera
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" /> Aktifkan Kamera
                </>
              )}
            </button>
          </div>

          <div className="relative aspect-square w-full rounded-2xl bg-slate-950 overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-800 dark:border-zinc-800">
            {isScanning ? (
              <FastQrScanner active={isScanning} onScan={handleScan} className="w-full h-full" />
            ) : (
              <div className="text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mx-auto text-emerald-400">
                  <QrCode className="w-8 h-8" />
                </div>
                <p className="text-sm font-medium text-slate-400">Kamera tidak aktif</p>
                <button
                  onClick={() => setIsScanning(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-all"
                >
                  Buka Kamera
                </button>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-3 z-30">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
                <p className="text-sm font-semibold">Memproses presensi santri...</p>
              </div>
            )}
          </div>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-emerald-500" /> Input Manual ID / NIS Santri
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualNis}
                onChange={(e) => setManualNis(e.target.value)}
                placeholder="Ketik UUID atau NIS Santri..."
                className="flex-1 px-4 py-2.5 text-sm bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <button
                type="submit"
                disabled={loading || !manualNis.trim()}
                className="px-5 py-2.5 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Absen
              </button>
            </div>
          </form>
        </div>

        {/* Scan Status & Last Result */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" /> Hasil Scan Terakhir
            </h2>

            {lastResult ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-base">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{lastResult.nama}</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Absen {lastResult.action === 'masuk' ? 'Masuk' : 'Keluar'} ({lastResult.status})
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-emerald-200 dark:border-emerald-800/50 text-slate-600 dark:text-zinc-400">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" /> {lastResult.time} WITA
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">BERHASIL</span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 dark:text-zinc-500 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl space-y-2">
                <RefreshCw className="w-8 h-8 mx-auto text-slate-300 dark:text-zinc-700" />
                <p className="text-sm font-medium">Belum ada scan yang diproses</p>
              </div>
            )}
          </div>

          <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 border border-slate-800">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4" /> Petunjuk Absensi
            </h3>
            <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
              <li>Setiap QR Code santri berisi identifier unik santri.</li>
              <li>Scan pertama dalam 1 hari dicatat sebagai <strong>Absen Masuk</strong>.</li>
              <li>Scan kedua setelah batas jam pulang dicatat sebagai <strong>Absen Keluar</strong>.</li>
              <li>Pengisian presensi otomatis terekam dan memperbarui laporan rekapitulasi bulanan.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
