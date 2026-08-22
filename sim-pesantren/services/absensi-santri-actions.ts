'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase, requirePermission } from '@/utils/server-supabase';
import type { StatusAbsensiSantri } from '@/types/database';

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

export async function scanAbsensiSantri(
  inputCode: string,
  lokasi?: { lat: number; lng: number }
) {
  const auth = await requirePermission('Santri', 'create');
  if (auth.error) return { success: false, error: auth.error };

  try {
    const supabase = await getServerSupabase();

    // 1. Bersihkan input jika berupa URL (ambil parameter ?id= atau nilai mentah)
    let cleanCode = inputCode.trim();
    try {
      if (cleanCode.startsWith('http://') || cleanCode.startsWith('https://')) {
        const parsedUrl = new URL(cleanCode);
        cleanCode = parsedUrl.searchParams.get('id') || cleanCode;
      }
    } catch {
      // ignore URL parsing error
    }

    if (!cleanCode) {
      return { success: false, error: 'Kode QR / NIS tidak valid' };
    }

    // 2. Cari santri di database berdasarkan UUID (id), NIS, atau NISN
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCode);
    let santriQuery = supabase.from('santri').select('id, nama_lengkap, nis, nisn, status');

    if (isUuid) {
      santriQuery = santriQuery.eq('id', cleanCode);
    } else {
      santriQuery = santriQuery.or(`nis.eq.${cleanCode},nisn.eq.${cleanCode}`);
    }

    const { data: santri, error: santriErr } = await santriQuery.maybeSingle();

    if (santriErr || !santri) {
      return {
        success: false,
        error: `Data santri tidak ditemukan untuk kode "${cleanCode}".`,
      };
    }

    const id_santri = santri.id;

    // 3. Ambil konfigurasi jam batas masuk dan pulang khusus santri
    const { data: profile } = await supabase
      .from('pesantren_profile')
      .select('jam_batas_masuk, jam_batas_pulang, jam_batas_masuk_santri, jam_batas_pulang_santri')
      .maybeSingle();

    const { now, today, minutesSinceMidnight } = getWibTimeDetails();

    const batasMasuk = profile?.jam_batas_masuk_santri || profile?.jam_batas_masuk || '07:00';
    const batasMasukMinutes = parseTimeToMinutes(batasMasuk);

    const status: StatusAbsensiSantri = minutesSinceMidnight > batasMasukMinutes ? 'Terlambat' : 'Hadir';

    // 4. Periksa apakah sudah ada data absensi santri hari ini
    const { data: existing } = await supabase
      .from('absensi_santri')
      .select('id, jam_masuk, jam_keluar')
      .eq('id_santri', id_santri)
      .eq('tanggal', today)
      .maybeSingle();

    // Skenario 1: Sudah absen masuk, proses absen keluar
    if (existing && !existing.jam_keluar) {
      const batasPulang = profile?.jam_batas_pulang_santri || profile?.jam_batas_pulang || '14:00';
      const batasPulangMinutes = parseTimeToMinutes(batasPulang);

      if (minutesSinceMidnight < batasPulangMinutes) {
        return {
          success: false,
          error: `Belum waktunya absen pulang santri. Absen pulang dibuka mulai pukul ${batasPulang.slice(0, 5)}.`,
        };
      }

      const { error: updateErr } = await supabase
        .from('absensi_santri')
        .update({ jam_keluar: now.toISOString() })
        .eq('id', existing.id);

      if (updateErr) return { success: false, error: updateErr.message };

      revalidatePath('/absen-santri');
      revalidatePath('/absen-santri/atur');
      revalidatePath('/absen-santri/rekap');
      return {
        success: true,
        action: 'keluar',
        nama_santri: santri.nama_lengkap,
        message: `Absen keluar berhasil (${santri.nama_lengkap})`,
      };
    }

    // Skenario 2: Sudah absen masuk & keluar hari ini
    if (existing && existing.jam_keluar) {
      return {
        success: false,
        error: `Santri ${santri.nama_lengkap} sudah menyelesaikan presensi masuk & keluar hari ini.`,
      };
    }

    // Skenario 3: Belum pernah absen hari ini, proses absen masuk
    const insertPayload = {
      id_santri,
      tanggal: today,
      jam_masuk: now.toISOString(),
      status,
      lokasi_lat: lokasi?.lat || null,
      lokasi_lng: lokasi?.lng || null,
    };

    const { data, error } = await supabase
      .from('absensi_santri')
      .insert(insertPayload)
      .select('id, tanggal, jam_masuk, status')
      .single();

    if (error) {
      if (error.code === '23505') {
        return {
          success: false,
          error: `Santri ${santri.nama_lengkap} sudah tercatat presensi hari ini.`,
        };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/absen-santri');
    revalidatePath('/absen-santri/atur');
    revalidatePath('/absen-santri/rekap');
    return {
      success: true,
      action: 'masuk',
      data,
      nama_santri: santri.nama_lengkap,
      message: `Absen masuk berhasil (${santri.nama_lengkap} - ${status})`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return { success: false, error: errorMsg };
  }
}

export async function getAbsensiSantriHariIni(tanggal?: string, id_kelas_formal?: string) {
  const auth = await requirePermission('Santri', 'view');
  if (auth.error) return { success: false, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const targetDate = tanggal || getWibTimeDetails().today;

    let query = supabase
      .from('absensi_santri')
      .select('*, santri(id, nis, nama_lengkap, foto_url, rombel_saat_ini, id_kelas_formal, kelas_formal:id_kelas_formal(nama_kelas))')
      .eq('tanggal', targetDate)
      .order('jam_masuk', { ascending: true });

    if (id_kelas_formal) {
      query = query.eq('santri.id_kelas_formal', id_kelas_formal);
    }

    const { data, error } = await query;

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return { success: false, error: errorMsg };
  }
}

export async function setAbsensiSantriManual(
  id_santri: string,
  tanggal: string,
  status: StatusAbsensiSantri,
  keterangan?: string,
  jam_masuk?: string | null,
  jam_keluar?: string | null
) {
  const auth = await requirePermission('Santri', 'create');
  if (auth.error) return { success: false, error: auth.error };

  try {
    const supabase = await getServerSupabase();

    const { data: existing } = await supabase
      .from('absensi_santri')
      .select('id')
      .eq('id_santri', id_santri)
      .eq('tanggal', tanggal)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('absensi_santri')
        .update({ status, keterangan, jam_masuk, jam_keluar })
        .eq('id', existing.id);

      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase
        .from('absensi_santri')
        .insert({ id_santri, tanggal, status, keterangan, jam_masuk, jam_keluar });

      if (error) return { success: false, error: error.message };
    }

    revalidatePath('/absen-santri');
    revalidatePath('/absen-santri/atur');
    revalidatePath('/absen-santri/rekap');
    return { success: true, message: `Absensi ${status} berhasil disimpan` };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return { success: false, error: errorMsg };
  }
}

export async function getRekapBulananSantri(bulan: number, tahun: number, id_kelas_formal?: string) {
  const auth = await requirePermission('Santri', 'view');
  if (auth.error) return { success: false, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`;
    const endMonth = bulan === 12 ? 1 : bulan + 1;
    const endYear = bulan === 12 ? tahun + 1 : tahun;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const query = supabase
      .from('absensi_santri')
      .select('*, santri(id, nis, nama_lengkap, foto_url, rombel_saat_ini, id_kelas_formal, kelas_formal:id_kelas_formal(nama_kelas))')
      .gte('tanggal', startDate)
      .lt('tanggal', endDate)
      .order('tanggal', { ascending: true });

    const { data, error } = await query;

    if (error) return { success: false, error: error.message };

    let filteredData = data || [];
    if (id_kelas_formal) {
      filteredData = filteredData.filter(
        (item: { santri?: { id_kelas_formal?: string | null } | null }) =>
          item.santri?.id_kelas_formal === id_kelas_formal
      );
    }

    return { success: true, data: filteredData };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return { success: false, error: errorMsg };
  }
}

export async function getSantriListForAbsensi(id_kelas_formal?: string) {
  const auth = await requirePermission('Santri', 'view');
  if (auth.error) return { success: false, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    let query = supabase
      .from('santri')
      .select('id, nis, nisn, nama_lengkap, jenis_kelamin, foto_url, qr_code_url, status, id_kelas_formal, rombel_saat_ini, kelas_formal:id_kelas_formal(id, nama_kelas, sekolah:id_sekolah(id, nama_sekolah)), kamar(nama_kamar, gedung)')
      .eq('status', 'aktif')
      .order('nama_lengkap', { ascending: true });

    if (id_kelas_formal) {
      query = query.eq('id_kelas_formal', id_kelas_formal);
    }

    const { data, error } = await query;

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return { success: false, error: errorMsg };
  }
}

export async function saveSantriQrCode(id_santri: string, qrDataUrl: string) {
  const auth = await requirePermission('Santri', 'edit');
  if (auth.error) return { success: false, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase
      .from('santri')
      .update({ qr_code_url: qrDataUrl })
      .eq('id', id_santri);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return { success: false, error: errorMsg };
  }
}

export async function deleteAbsensiSantri(id: string) {
  const auth = await requirePermission('Santri', 'delete');
  if (auth.error) return { success: false, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase.from('absensi_santri').delete().eq('id', id);
    if (error) return { success: false, error: error.message };

    revalidatePath('/absen-santri');
    revalidatePath('/absen-santri/atur');
    revalidatePath('/absen-santri/rekap');
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return { success: false, error: errorMsg };
  }
}
