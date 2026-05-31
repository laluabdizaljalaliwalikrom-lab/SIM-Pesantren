"use server";

import { getServerSupabase, requireServerUser } from '@/utils/server-supabase';

interface AbsensiPayload {
  id_jadwal: string;
  id_santri: string;
  tanggal: string;
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpha';
  keterangan?: string | null;
}

export async function saveAbsensiKBM(payloads: AbsensiPayload[]) {
  const auth = await requireServerUser();
  if (auth.error) return { success: false, error: auth.error };

  try {
    if (payloads.length === 0) {
      return { success: true, message: 'Tidak ada data untuk disimpan.' };
    }

    const supabase = await getServerSupabase();
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
