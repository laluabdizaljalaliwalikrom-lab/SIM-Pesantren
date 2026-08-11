'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { scanAbsensiPegawai } from '@/services/absensi-pegawai-actions';
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
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface ScanResult {
  nama: string;
  action: 'masuk' | 'keluar';
  status: string;
  time: string;
}

export default function ScanAbsenPage() {
  const [scannerState, setScannerState] = useState<'idle' | 'starting' | 'active'>('idle');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);
  const loadingRef = useRef(false);
  const cooldownRef = useRef(false);

  const startLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation tidak didukung browser ini');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locationRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError('');
      },
      (err) => {
        setLocationError(`Gagal mendapatkan lokasi: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  useEffect(() => {
    startLocation();
  }, [startLocation]);

  const handleScan = useCallback(
    async (decodedText: string) => {
      if (loadingRef.current || cooldownRef.current) return;

      let pegawaiId = decodedText;
      try {
        const url = new URL(decodedText);
        pegawaiId = url.searchParams.get('id') || decodedText;
      } catch {
        pegawaiId = decodedText;
      }

      loadingRef.current = true;
      cooldownRef.current = true;
      setLoading(true);

      try {
        const result = await scanAbsensiPegawai(pegawaiId, locationRef.current || undefined);

        if (result.success) {
          const now = new Date();
          setLastResult({
            nama: result.nama_pegawai || 'Pegawai',
            action: result.action as 'masuk' | 'keluar',
            status: result.action === 'masuk' ? (result.message?.includes('Terlambat') ? 'Terlambat' : 'Hadir') : 'Keluar',
            time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          });
          toast.success(result.message);
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error('Terjadi kesalahan saat memproses scan');
      } finally {
        loadingRef.current = false;
        setLoading(false);
        setTimeout(() => {
          cooldownRef.current = false;
        }, 3000);
      }
    },
    []
  );

  const startScanner = useCallback(async () => {
    if (!containerRef.current) return;

    setScannerState('starting');

    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
        scannerRef.current = null;
      }

      await new Promise((r) => setTimeout(r, 100));

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          aspectRatio: 1.0,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const size = Math.min(
              Math.floor(viewfinderWidth * 0.7),
              Math.floor(viewfinderHeight * 0.7),
              280
            );
            return { width: size, height: size };
          },
        },
        (decodedText) => {
          handleScan(decodedText);
        },
        () => {}
      );

      setScannerState('active');
    } catch (err: any) {
      setScannerState('idle');
      toast.error('Gagal memulai kamera: ' + (err.message || 'Pastikan izin kamera diberikan'));
    }
  }, [handleScan]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch {}
    }
    setScannerState('idle');
  }, []);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.stop(); } catch {}
      }
    };
  }, []);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/absen-pegawai"
          className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <QrCode className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Scan QR Absensi
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm">
            Arahkan kamera ke kartu QR pegawai
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <div
          id="qr-reader"
          ref={containerRef}
          className={`relative ${scannerState !== 'idle' ? 'block' : 'hidden'}`}
          style={{ minHeight: 300 }}
        />

        {scannerState === 'idle' && (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <Camera className="h-10 w-10 text-slate-400 dark:text-zinc-500" />
            </div>
            <p className="text-slate-600 dark:text-zinc-300 font-medium mb-1">Kamera belum aktif</p>
            <p className="text-sm text-slate-400 dark:text-zinc-500 mb-6 text-center">
              Tekan tombol di bawah untuk memulai scan
            </p>
          </div>
        )}

        {scannerState !== 'idle' && (
          <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
            <div className="flex items-center gap-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
              <div className={`w-2 h-2 rounded-full ${scannerState === 'active' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
              {scannerState === 'active' ? 'LIVE' : 'Memulai...'}
            </div>
            {loading && (
              <div className="flex items-center gap-2 bg-emerald-600/90 text-white text-xs px-3 py-1.5 rounded-full">
                <Loader2 className="h-3 w-3 animate-spin" />
                Memproses...
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-4">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className={`h-4 w-4 ${location ? 'text-emerald-500' : 'text-slate-400'}`} />
          <span className="text-slate-600 dark:text-zinc-400">
            {location
              ? `Lokasi: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
              : locationError || 'Mendapatkan lokasi...'}
          </span>
          {!location && !locationError && (
            <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
          )}
        </div>
      </div>

      {lastResult && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                {lastResult.action === 'masuk' ? 'Absen Masuk' : 'Absen Keluar'} Berhasil
              </p>
              <div className="mt-2 space-y-1 text-sm text-emerald-700 dark:text-emerald-400">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  <span>{lastResult.nama}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{lastResult.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${lastResult.status === 'Terlambat' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                    {lastResult.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {scannerState === 'idle' ? (
          <button
            onClick={startScanner}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-500/25"
          >
            <Camera className="h-5 w-5" />
            Mulai Scan
          </button>
        ) : (
          <>
            <button
              onClick={stopScanner}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
            >
              <CameraOff className="h-5 w-5" />
              Stop
            </button>
            <button
              onClick={() => { stopScanner(); setTimeout(startScanner, 300); }}
              disabled={scannerState === 'starting'}
              className="flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-300 rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${scannerState === 'starting' ? 'animate-spin' : ''}`} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
