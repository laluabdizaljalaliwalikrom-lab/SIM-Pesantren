'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { scanAbsensiPegawai } from '@/services/absensi-pegawai-actions';
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
  Zap,
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
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  
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
        }, 2500);
      }
    },
    []
  );

  const handleError = useCallback((err: string) => {
    toast.error(err);
    setIsScanning(false);
  }, []);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
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
            Fast Response & Low-Quality Camera Enhanced Scanner
          </p>
        </div>
      </div>

      {/* Scanner Box */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {isScanning ? (
          <div className="relative">
            <FastQrScanner
              active={isScanning}
              onScan={handleScan}
              onError={handleError}
              className="w-full"
            />
            {loading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white z-30">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-400 mb-2" />
                <p className="font-semibold text-sm">Mencatat Kehadiran...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400 shadow-inner">
              <Camera className="h-10 w-10" />
            </div>
            <p className="text-slate-800 dark:text-zinc-200 font-bold text-lg mb-1">Scanner Siap Digunakan</p>
            <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-xs mb-6 leading-relaxed">
              Dilengkapi akselerasi hardware & pemprosesan kontras otomatis untuk kamera beresolusi rendah
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full mb-2">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              Response Rate ~30-60 FPS (Sub-10ms)
            </div>
          </div>
        )}
      </div>

      {/* Location Status Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-4 shadow-xs">
        <div className="flex items-center gap-2.5 text-sm">
          <MapPin className={`h-4 w-4 ${location ? 'text-emerald-500' : 'text-amber-500'}`} />
          <span className="text-slate-600 dark:text-zinc-400 font-medium">
            {location
              ? `Lokasi GPS: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
              : locationError || 'Mendapatkan lokasi GPS...'}
          </span>
          {!location && !locationError && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 ml-auto" />
          )}
        </div>
      </div>

      {/* Success Result Banner */}
      {lastResult && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4 shadow-sm transition-all animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-md">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-emerald-900 dark:text-emerald-200 text-base">
                {lastResult.action === 'masuk' ? 'Absen Masuk' : 'Absen Keluar'} Berhasil!
              </p>
              <div className="mt-2 space-y-1 text-sm text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2 font-medium">
                  <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{lastResult.nama}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Waktu: {lastResult.time}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      lastResult.status === 'Terlambat'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/30 dark:text-amber-300'
                        : 'bg-emerald-200 text-emerald-800 dark:bg-emerald-500/30 dark:text-emerald-300'
                    }`}
                  >
                    Status: {lastResult.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!isScanning ? (
          <button
            onClick={() => setIsScanning(true)}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl font-bold text-base transition-all shadow-lg shadow-emerald-600/25 cursor-pointer"
          >
            <Camera className="h-5 w-5" />
            Mulai Scan QR
          </button>
        ) : (
          <>
            <button
              onClick={() => setIsScanning(false)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-base transition-colors shadow-lg shadow-rose-600/20 cursor-pointer"
            >
              <CameraOff className="h-5 w-5" />
              Stop Scanner
            </button>
            <button
              onClick={() => {
                setIsScanning(false);
                setTimeout(() => setIsScanning(true), 250);
              }}
              className="flex items-center justify-center gap-2 px-5 py-4 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-2xl font-medium transition-colors cursor-pointer"
              title="Restart Kamera"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

