'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase, requirePermission } from '@/utils/server-supabase';
import type { StatusAbsensiPegawai } from '@/types/database';

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Helper to get local date & time details in Asia/Makassar (WITA, UTC+8) for Lombok Timur / NTB
 */
function getWibTimeDetails(timeZone: string = 'Asia/Makassar') {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') {
      map[p.type] = p.value;
    }
  }

  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(map.minute, 10);

  const today = `${map.year}-${map.month}-${map.day}`;
  const minutesSinceMidnight = hour * 60 + minute;

  return { now, today, hour, minute, minutesSinceMidnight };
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export async function scanAbsensiPegawai(
  id_pegawai: string,
  lokasi?: { lat: number; lng: number }
) {
  const auth = await requirePermission('Kepegawaian', 'create');
  if (auth.error) return { success: false, error: auth.error };

  try {
    const supabase = await getServerSupabase();

    const { data: profile } = await supabase
      .from('pesantren_profile')
      .select('jam_batas_masuk, jam_batas_pulang, latitude, longitude, radius_meter')
      .maybeSingle();

    if (profile?.latitude && profile?.longitude && lokasi) {
      const dist = haversineDistance(
        profile.latitude,
        profile.longitude,
        lokasi.lat,
        lokasi.lng
      );
      const radius = profile.radius_meter || 500;
      if (dist > radius) {
        return {
          success: false,
          error: `Anda berada di luar area pesantren (${Math.round(dist)}m dari pusat, max ${radius}m)`,
        };
      }
    }

    const { now, today, minutesSinceMidnight } = getWibTimeDetails();

    const batasMasuk = profile?.jam_batas_masuk || '07:30';
    const batasMasukMinutes = parseTimeToMinutes(batasMasuk);

    const status: StatusAbsensiPegawai = minutesSinceMidnight > batasMasukMinutes ? 'Terlambat' : 'Hadir';

    const { data: existing } = await supabase
      .from('absensi_pegawai')
      .select('id, jam_keluar')
      .eq('id_pegawai', id_pegawai)
      .eq('tanggal', today)
      .maybeSingle();

    if (existing && !existing.jam_keluar) {
      const batasPulang = profile?.jam_batas_pulang || '12:00';
      const batasPulangMinutes = parseTimeToMinutes(batasPulang);

      if (minutesSinceMidnight < batasPulangMinutes) {
        return {
          success: false,
          error: `Belum waktunya absen pulang. Absen pulang dibuka mulai pukul ${batasPulang.slice(0, 5)}.`,
        };
      }

      const { error } = await supabase
        .from('absensi_pegawai')
        .update({ jam_keluar: now.toISOString() })
        .eq('id', existing.id);

      if (error) return { success: false, error: error.message };

      revalidatePath('/absen-pegawai');
      revalidatePath('/absen-pegawai/atur');
      revalidatePath('/absen-pegawai/rekap');
      return { success: true, action: 'keluar', message: 'Absen keluar berhasil' };
    }

    if (existing && existing.jam_keluar) {
      return { success: false, error: 'Anda sudah melakukan absen masuk dan keluar hari ini.' };
    }

    const { data: pegawai } = await supabase
      .from('pegawai')
      .select('nama_lengkap')
      .eq('id', id_pegawai)
      .single();

    const { data, error } = await supabase
      .from('absensi_pegawai')
      .insert({
        id_pegawai,
        tanggal: today,
        jam_masuk: now.toISOString(),
        status,
        lokasi_lat: lokasi?.lat || null,
        lokasi_lng: lokasi?.lng || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Absensi untuk hari ini sudah tercatat.' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/absen-pegawai');
    return {
      success: true,
      action: 'masuk',
      data,
      nama_pegawai: pegawai?.nama_lengkap,
      message: `Absen masuk berhasil (${status})`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem.' };
  }
}

export async function getAbsensiHariIni(tanggal?: string) {
  const auth = await requirePermission('Kepegawaian', 'view');
  if (auth.error) return { success: false, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const targetDate = tanggal || getWibTimeDetails().today;

    const { data, error } = await supabase
      .from('absensi_pegawai')
      .select('*, pegawai(nama_lengkap, jabatan, foto_url, nip)')
      .eq('tanggal', targetDate)
      .order('jam_masuk', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem.' };
  }
}

export async function setAbsensiManual(
  id_pegawai: string,
  tanggal: string,
  status: StatusAbsensiPegawai,
  keterangan?: string,
  jam_masuk?: string | null,
  jam_keluar?: string | null
) {
  const auth = await requirePermission('Kepegawaian', 'create');
  if (auth.error) return { success: false, error: auth.error };

  try {
    const supabase = await getServerSupabase();

    const { data: existing } = await supabase
      .from('absensi_pegawai')
      .select('id')
      .eq('id_pegawai', id_pegawai)
      .eq('tanggal', tanggal)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('absensi_pegawai')
        .update({ status, keterangan, jam_masuk, jam_keluar })
        .eq('id', existing.id);

      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase
        .from('absensi_pegawai')
        .insert({ id_pegawai, tanggal, status, keterangan, jam_masuk, jam_keluar });

      if (error) return { success: false, error: error.message };
    }

    revalidatePath('/absen-pegawai');
    revalidatePath('/absen-pegawai/atur');
    revalidatePath('/absen-pegawai/rekap');
    return { success: true, message: `Absensi ${status} berhasil disimpan` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem.' };
  }
}

export async function getRekapBulanan(bulan: number, tahun: number) {
  const auth = await requirePermission('Kepegawaian', 'view');
  if (auth.error) return { success: false, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`;
    const endMonth = bulan === 12 ? 1 : bulan + 1;
    const endYear = bulan === 12 ? tahun + 1 : tahun;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const { data, error } = await supabase
      .from('absensi_pegawai')
      .select('*, pegawai(nama_lengkap, jabatan, foto_url, nip)')
      .gte('tanggal', startDate)
      .lt('tanggal', endDate)
      .order('tanggal', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem.' };
  }
}

export async function getPegawaiList() {
  const auth = await requirePermission('Kepegawaian', 'view');
  if (auth.error) return { success: false, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('pegawai')
      .select('id, nip, nama_lengkap, gelar_depan, gelar_belakang, jabatan, foto_url, qr_code_url, tanggal_bergabung, status, id_sekolah, created_at')
      .eq('status', 'Aktif')
      .order('nama_lengkap', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem.' };
  }
}

export async function generateAllQrCodes() {
  const auth = await requirePermission('Kepegawaian', 'edit');
  if (auth.error) return { success: false, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data: pegawaiList, error: fetchError } = await supabase
      .from('pegawai')
      .select('id, qr_code_url, created_at')
      .eq('status', 'Aktif');

    if (fetchError) return { success: false, error: fetchError.message };

    return { success: true, data: pegawaiList };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem.' };
  }
}

export async function saveQrCode(id_pegawai: string, qrDataUrl: string) {
  const auth = await requirePermission('Kepegawaian', 'edit');
  if (auth.error) return { success: false, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase
      .from('pegawai')
      .update({ qr_code_url: qrDataUrl })
      .eq('id', id_pegawai);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem.' };
  }
}

export async function deleteAbsensi(id: string) {
  const auth = await requirePermission('Kepegawaian', 'delete');
  if (auth.error) return { success: false, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase.from('absensi_pegawai').delete().eq('id', id);
    if (error) return { success: false, error: error.message };

    revalidatePath('/absen-pegawai');
    revalidatePath('/absen-pegawai/atur');
    revalidatePath('/absen-pegawai/rekap');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem.' };
  }
}

export async function getTanggalLibur() {
  const auth = await requirePermission('Kepegawaian', 'view');
  if (auth.error) return { success: false, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('tanggal_libur')
      .select('*')
      .order('tanggal', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem.' };
  }
}

export async function addTanggalLibur(tanggal: string, keterangan?: string) {
  const auth = await requirePermission('Kepegawaian', 'create');
  if (auth.error) return { success: false, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase
      .from('tanggal_libur')
      .insert({ tanggal, keterangan: keterangan || null });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Tanggal libur sudah terdaftar.' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/absen-pegawai');
    revalidatePath('/absen-pegawai/rekap');
    return { success: true, message: 'Tanggal libur berhasil ditambahkan' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem.' };
  }
}

export async function deleteTanggalLibur(id: string) {
  const auth = await requirePermission('Kepegawaian', 'delete');
  if (auth.error) return { success: false, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase.from('tanggal_libur').delete().eq('id', id);
    if (error) return { success: false, error: error.message };

    revalidatePath('/absen-pegawai');
    revalidatePath('/absen-pegawai/rekap');
    return { success: true, message: 'Tanggal libur berhasil dihapus' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem.' };
  }
}

export async function updateHariKerja(hariKerja: number[]) {
  const auth = await requirePermission('Kepegawaian', 'edit');
  if (auth.error) return { success: false, error: auth.error };

  const validDays = [0, 1, 2, 3, 4, 5, 6];
  const unique = Array.from(new Set(hariKerja)).filter((d) => validDays.includes(d));
  if (unique.length === 0) {
    return { success: false, error: 'Minimal satu hari kerja harus dipilih.' };
  }

  try {
    const supabase = await getServerSupabase();
    const { data: profile } = await supabase
      .from('pesantren_profile')
      .select('id')
      .maybeSingle();

    let error;
    if (profile) {
      const { error: updateErr } = await supabase
        .from('pesantren_profile')
        .update({ hari_kerja: unique, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
      error = updateErr;
    } else {
      const { error: insertErr } = await supabase
        .from('pesantren_profile')
        .insert({ hari_kerja: unique });
      error = insertErr;
    }

    if (error) return { success: false, error: error.message };

    revalidatePath('/absen-pegawai');
    revalidatePath('/absen-pegawai/rekap');
    return { success: true, message: 'Hari kerja berhasil diperbarui' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem.' };
  }
}
