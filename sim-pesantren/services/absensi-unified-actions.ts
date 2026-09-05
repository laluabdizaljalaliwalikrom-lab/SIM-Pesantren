'use server';

import { scanAbsensiPegawai } from './absensi-pegawai-actions';
import { scanAbsensiSantri } from './absensi-santri-actions';
import { getServerSupabase } from '@/utils/server-supabase';

export type UnifiedScanType = 'pegawai' | 'santri';

export interface UnifiedScanResult {
  success: boolean;
  type?: UnifiedScanType;
  nama?: string;
  subInfo?: string;
  action?: 'masuk' | 'keluar';
  status?: string;
  time?: string;
  message?: string;
  error?: string;
}

/**
 * Smart Scanner Service:
 * Automatically identifies whether the scanned code belongs to a Pegawai or a Santri.
 */
export async function scanAbsensiUnified(
  inputCode: string,
  lokasi?: { lat: number; lng: number },
  preferredType: 'auto' | 'pegawai' | 'santri' = 'auto'
): Promise<UnifiedScanResult> {
  const code = inputCode.trim();
  if (!code) {
    return { success: false, error: 'Kode QR tidak valid atau kosong' };
  }

  // 1. Direct clue from URL
  const isPegawaiUrl = code.includes('/absen-pegawai/') || code.includes('pegawai');
  const isSantriUrl = code.includes('/absen-santri/') || code.includes('santri');

  let cleanId = code;
  try {
    if (code.startsWith('http://') || code.startsWith('https://')) {
      const parsedUrl = new URL(code);
      cleanId = parsedUrl.searchParams.get('id') || code;
    }
  } catch {}

  // 2. Forced mode check
  if (preferredType === 'pegawai' || (preferredType === 'auto' && isPegawaiUrl)) {
    return runPegawaiScan(cleanId, lokasi);
  }

  if (preferredType === 'santri' || (preferredType === 'auto' && isSantriUrl)) {
    return runSantriScan(cleanId, lokasi);
  }

  // 3. Auto-detect by checking database existence
  try {
    const supabase = await getServerSupabase();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

    // Check pegawai table first if UUID or looks like NIP
    let isPegawaiFound = false;
    if (isUuid) {
      const { data: peg } = await supabase.from('pegawai').select('id, nama_lengkap, jabatan').eq('id', cleanId).maybeSingle();
      if (peg) isPegawaiFound = true;
    } else {
      const { data: peg } = await supabase.from('pegawai').select('id, nama_lengkap, jabatan').eq('nip', cleanId).maybeSingle();
      if (peg) isPegawaiFound = true;
    }

    if (isPegawaiFound) {
      return runPegawaiScan(cleanId, lokasi);
    }

    // Otherwise treat as Santri (either by UUID, NIS, or NISN)
    return runSantriScan(cleanId, lokasi);
  } catch {
    // Fallback: try pegawai first, then santri
    const resPeg = await runPegawaiScan(cleanId, lokasi);
    if (resPeg.success) return resPeg;
    return runSantriScan(cleanId, lokasi);
  }
}

async function runPegawaiScan(code: string, lokasi?: { lat: number; lng: number }): Promise<UnifiedScanResult> {
  const res = await scanAbsensiPegawai(code, lokasi);
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (res.success) {
    return {
      success: true,
      type: 'pegawai',
      nama: res.nama_pegawai || 'Pegawai',
      subInfo: 'Pegawai / Ustadz',
      action: res.action as 'masuk' | 'keluar',
      status: res.action === 'masuk' ? (res.message?.includes('Terlambat') ? 'Terlambat' : 'Hadir') : 'Keluar',
      time: timeStr,
      message: res.message || 'Presensi pegawai berhasil',
    };
  }

  return {
    success: false,
    type: 'pegawai',
    error: res.error || 'Gagal memproses absensi pegawai',
  };
}

async function runSantriScan(code: string, lokasi?: { lat: number; lng: number }): Promise<UnifiedScanResult> {
  const res = await scanAbsensiSantri(code, lokasi);
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (res.success) {
    return {
      success: true,
      type: 'santri',
      nama: res.nama_santri || 'Santri',
      subInfo: 'Santri Pesantren',
      action: res.action as 'masuk' | 'keluar',
      status: res.action === 'masuk' ? (res.message?.includes('Terlambat') ? 'Terlambat' : 'Hadir') : 'Keluar',
      time: timeStr,
      message: res.message || 'Presensi santri berhasil',
    };
  }

  return {
    success: false,
    type: 'santri',
    error: res.error || 'Gagal memproses absensi santri',
  };
}
