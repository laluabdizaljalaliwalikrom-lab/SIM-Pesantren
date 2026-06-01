"use server";

import { getServerSupabase, requirePermission } from '@/utils/server-supabase';

interface SholatAttendancePayload {
  id_santri: string;
  tanggal: string;
  waktu_sholat: 'Subuh' | 'Dzuhur' | 'Ashar' | 'Maghrib' | 'Isya';
  status: 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpha';
  keterangan?: string | null;
  id_musyrif?: string | null;
}

export async function saveAbsensiSholat(payloads: SholatAttendancePayload[]) {
  const auth = await requirePermission('Asrama', 'create');
  if (auth.error) return { success: false, error: auth.error };

  try {
    if (payloads.length === 0) {
      return { success: true, message: 'Tidak ada data untuk disimpan.' };
    }

    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('absensi_sholat')
      .upsert(payloads, { onConflict: 'id_santri,tanggal,waktu_sholat' });

    if (error) {
      console.error('Error in saveAbsensiSholat:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Exception in saveAbsensiSholat:', err);
    return { success: false, error: err.message || 'Terjadi kesalahan sistem internal.' };
  }
}
