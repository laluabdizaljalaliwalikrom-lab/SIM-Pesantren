'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { scanAbsensiUnified, type UnifiedScanResult, type UnifiedScanType } from '@/services/absensi-unified-actions';
import FastQrScanner from '@/components/fast-qr-scanner';
import {
  QrCode,
  Camera,
  CameraOff,
  Loader2,
  CheckCircle,
  MapPin,
  ArrowLeft,
  User,
  Clock,
  RefreshCw,
  Search,
  Briefcase,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function UnifiedScanPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'auto' | 'pegawai' | 'santri'>('auto');
  const [manualInput, setManualInput] = useState('');

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string>(() => {
    if (typeof navigator !== 'undefined' && !navigator.geolocation) {
      return 'Geolocation tidak didukung browser ini';
    }
    return '';
  });
  const [lastResult, setLastResult] = useState<UnifiedScanResult | null>(null);

  const locationRef = useRef<{ lat: number; lng: number } | null>(null);
  const loadingRef = useRef(false);
  const cooldownRef = useRef(false);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        locationRef.current = coords;
        setLocation(coords);
        setLocationError('');
      },
      (err) => {
        setLocationError(`Gagal mendapatkan lokasi: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  const processScan = useCallback(
    async (code: string) => {
      if (loadingRef.current || cooldownRef.current) return;

      const trimmed = code.trim();
      if (!trimmed) {
        toast.error('Kode QR atau nomor identitas kosong');
        return;
      }

      loadingRef.current = true;
      cooldownRef.current = true;
      setLoading(true);

      try {
        const result = await scanAbsensiUnified(trimmed, locationRef.current || undefined, mode);

        if (result.success) {
          setLastResult(result);
          toast.success(result.message || 'Presensi berhasil dicatat');
          setManualInput('');
        } else {
          toast.error(result.error || 'Gagal memproses absensi');
        }
      } catch {
        toast.error('Terjadi kesalahan saat memproses scan');
      } finally {
        loadingRef.current = false;
        setLoading(false);
        setTimeout(() => {
          cooldownRef.current = false;
        }, 2200);
      }
    },
    [mode]
  );

  const handleScan = useCallback(
    (decodedText: string) => {
      processScan(decodedText);
    },
    [processScan]
  );

  const handleError = useCallback((err: string) => {
    toast.error(err);
    setIsScanning(false);
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      processScan(manualInput.trim());
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 p-2 sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/absen-pegawai"
            className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            title="Kembali"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <QrCode className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-600 dark:text-emerald-400" />
              Scan QR Presensi Terpadu
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
              Satu scanner cerdas untuk presensi Pegawai & Santri
            </p>
          </div>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800/80 rounded-2xl border border-slate-200 dark:border-zinc-700/60 text-xs font-bold">
        <button
          type="button"
          onClick={() => setMode('auto')}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
            mode === 'auto'
              ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Semua (Auto)</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('pegawai')}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
            mode === 'pegawai'
              ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Briefcase className="h-3.5 w-3.5" />
          <span>Pegawai</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('santri')}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
            mode === 'santri'
              ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <GraduationCap className="h-3.5 w-3.5" />
          <span>Santri</span>
        </button>
      </div>

      {/* Scanner Box */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {isScanning ? (
          <div className="relative aspect-square sm:aspect-4/3 w-full bg-black">
            <FastQrScanner
              active={isScanning}
              onScan={handleScan}
              onError={handleError}
              className="w-full h-full"
            />
            {loading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white z-30 space-y-2">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
                <p className="font-semibold text-sm">Mencatat Presensi...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center mb-3 text-emerald-600 dark:text-emerald-400">
              <Camera className="h-8 w-8" />
            </div>
            <p className="text-slate-800 dark:text-zinc-200 font-bold text-base mb-1">Kamera Standby</p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs mb-3 leading-relaxed">
              Kamera akan mendeteksi otomatis kartu santri atau pegawai
            </p>
          </div>
        )}

        {/* Action Toggle Button */}
        <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 border-t border-slate-100 dark:border-zinc-800">
          {!isScanning ? (
            <button
              onClick={() => setIsScanning(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Camera className="h-5 w-5" />
              Aktifkan Kamera Pemindai
            </button>
          ) : (
            <button
              onClick={() => setIsScanning(false)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-colors shadow-md shadow-rose-600/20 cursor-pointer"
            >
              <CameraOff className="h-5 w-5" />
              Matikan Kamera
            </button>
          )}
        </div>
      </div>

      {/* Manual Input Fallback */}
      <form onSubmit={handleManualSubmit} className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 flex gap-2 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Input manual NIS Santri / NIP Pegawai..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !manualInput.trim()}
          className="px-4 py-2 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
        >
          Kirim
        </button>
      </form>

      {/* Location Status Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 px-3.5 py-2.5 shadow-xs">
        <div className="flex items-center gap-2 text-xs">
          <MapPin className={`h-3.5 w-3.5 ${location ? 'text-emerald-500' : 'text-amber-500'}`} />
          <span className="text-slate-600 dark:text-zinc-400 font-medium">
            {location
              ? `Lokasi GPS: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
              : locationError || 'Mendapatkan lokasi GPS...'}
          </span>
          {!location && !locationError && (
            <Loader2 className="h-3 w-3 animate-spin text-slate-400 ml-auto" />
          )}
        </div>
      </div>

      {/* Success Result Banner */}
      {lastResult && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4 shadow-sm transition-all animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  {lastResult.subInfo || (lastResult.type === 'pegawai' ? 'Pegawai' : 'Santri')}
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">
                  {lastResult.time} WITA
                </span>
              </div>
              <p className="font-extrabold text-slate-900 dark:text-white text-base truncate mt-0.5">
                {lastResult.nama}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full font-bold bg-emerald-200 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300">
                  Absen {lastResult.action === 'masuk' ? 'Masuk' : 'Keluar'}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full font-bold ${
                    lastResult.status === 'Terlambat'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/30 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                  }`}
                >
                  Status: {lastResult.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
