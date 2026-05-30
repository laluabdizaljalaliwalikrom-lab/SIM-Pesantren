"use server";

import { supabase } from '@/lib/supabase';

interface AbsensiPayload {
  id_jadwal: string;
  id_santri: string;
  tanggal: string;
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpha';
  keterangan?: string | null;
}

/**
 * Server Action untuk menyimpan absensi KBM secara massal (batch upsert)
 * ke tabel 'absensi' Supabase.
 */
export async function saveAbsensiKBM(payloads: AbsensiPayload[]) {
  try {
    if (payloads.length === 0) {
      return { success: true, message: 'Tidak ada data untuk disimpan.' };
    }

    const { data, error } = await supabase
      .from('absensi')
      .upsert(payloads, { onConflict: 'id_jadwal,id_santri,tanggal' });

    if (error) {
      console.error('Error in saveAbsensiKBM:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Exception in saveAbsensiKBM:', err);
    return { success: false, error: err.message || 'Terjadi kesalahan sistem internal.' };
  }
}
