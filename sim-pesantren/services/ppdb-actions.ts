'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase, getServiceRoleClient, requirePermission } from '@/utils/server-supabase';
import {
  CalonSantri,
  GelombangPendaftaran,
  BiayaPpdb,
  HasilSeleksi,
  PengumumanPpdb,
} from '@/types/database';

// =========================================================================
// Helpers
// =========================================================================

async function requireCalonSantri() {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { error: 'Sesi tidak valid. Silakan login ulang.', calonSantri: null };

    const { data: cs } = await supabase
      .from('calon_santri')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (!cs) return { error: 'Data calon santri tidak ditemukan.', calonSantri: null };
    return { error: null, calonSantri: cs as CalonSantri };
  } catch (e: any) {
    return { error: e?.message || 'Gagal memverifikasi sesi.', calonSantri: null };
  }
}

// =========================================================================
// GELOMBANG PENDAFTARAN
// =========================================================================

export async function getGelombangAktif() {
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('gelombang_pendaftaran')
      .select('*, tahun_ajaran:id_tahun_ajaran(*)')
      .eq('aktif', true)
      .order('tanggal_mulai', { ascending: true });

    if (error) throw error;
    return { data: data as GelombangPendaftaran[], error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal mengambil data gelombang.' };
  }
}

export async function getAllGelombang() {
  const auth = await requirePermission('PPDB', 'view');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('gelombang_pendaftaran')
      .select('*, tahun_ajaran:id_tahun_ajaran(*)')
      .order('tanggal_mulai', { ascending: false });

    if (error) throw error;
    return { data: data as GelombangPendaftaran[], error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal mengambil data gelombang.' };
  }
}

export async function createGelombang(payload: {
  nama: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  kuota: number;
  id_tahun_ajaran?: string;
}) {
  const auth = await requirePermission('PPDB', 'create');
  if (auth.error) return { error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('gelombang_pendaftaran')
      .insert([{ ...payload, aktif: true }])
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/ppdb/gelombang');
    return { data: data as GelombangPendaftaran, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal membuat gelombang.' };
  }
}

export async function updateGelombang(id: string, payload: Partial<{
  nama: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  kuota: number;
  id_tahun_ajaran: string;
  aktif: boolean;
}>) {
  const auth = await requirePermission('PPDB', 'edit');
  if (auth.error) return { error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('gelombang_pendaftaran')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/ppdb/gelombang');
    return { data: data as GelombangPendaftaran, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal memperbarui gelombang.' };
  }
}

export async function deleteGelombang(id: string) {
  const auth = await requirePermission('PPDB', 'delete');
  if (auth.error) return { error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase
      .from('gelombang_pendaftaran')
      .delete()
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/ppdb/gelombang');
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Gagal menghapus gelombang.' };
  }
}

// =========================================================================
// BIAYA PPDB
// =========================================================================

export async function getBiayaByGelombang(idGelombang: string) {
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('biaya_ppdb')
      .select('*')
      .eq('id_gelombang', idGelombang)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data: data as BiayaPpdb[], error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal mengambil data biaya.' };
  }
}

export async function upsertBiayaPpdb(items: Array<{
  id?: string;
  id_gelombang: string;
  nama_biaya: string;
  nominal_reguler: number;
  nominal_prestasi: number;
  nominal_afirmasi: number;
  wajib: boolean;
  keterangan?: string;
}>) {
  const auth = await requirePermission('PPDB', 'edit');
  if (auth.error) return { error: auth.error };

  try {
    const supabase = await getServerSupabase();

    const { error: deleteError } = await supabase
      .from('biaya_ppdb')
      .delete()
      .eq('id_gelombang', items[0]?.id_gelombang);

    if (deleteError) throw deleteError;

    const cleanItems = items.map(({ id, ...rest }) => rest);
    const { error: insertError } = await supabase
      .from('biaya_ppdb')
      .insert(cleanItems);

    if (insertError) throw insertError;

    revalidatePath(`/ppdb/biaya`);
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Gagal menyimpan biaya PPDB.' };
  }
}

// =========================================================================
// CALON SANTRI — PUBLIK (daftar)
// =========================================================================

export async function daftarCalonSantri(payload: {
  authUserId: string;
  nama_lengkap: string;
  email: string;
  no_hp: string;
}) {
  try {
    const s = getServiceRoleClient();

    // Cari gelombang aktif secara otomatis
    let idGelombang: string | null = null;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: gel } = await s
        .from('gelombang_pendaftaran')
        .select('id')
        .eq('aktif', true)
        .gte('tanggal_selesai', today)
        .order('tanggal_mulai', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (gel) {
        idGelombang = gel.id;
      }
    } catch (e) {
      console.error('Error fetching active gelombang:', e);
    }

    const { data: cs, error: csError } = await s
      .from('calon_santri')
      .insert([{
        auth_user_id: payload.authUserId,
        nama_lengkap: payload.nama_lengkap,
        email: payload.email,
        no_hp: payload.no_hp,
        id_gelombang: idGelombang,
      }])
      .select()
      .single();

    if (csError) throw csError;
    return { data: cs as CalonSantri, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal mendaftar. Silakan coba lagi.' };
  }
}

// =========================================================================
// CALON SANTRI — UPDATE DATA SENDIRI
// =========================================================================

export async function updateProfilCalonSantri(payload: Partial<{
  nama_lengkap: string;
  no_hp: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: 'L' | 'P';
  nik: string;
  nisn: string;
  alamat: string;
  asal_sekolah: string;
  nama_ayah: string;
  nama_ibu: string;
  pekerjaan_ayah: string;
  pekerjaan_ibu: string;
  penghasilan_ayah: string;
  penghasilan_ibu: string;
  no_hp_ortu: string;
  jalur_pendaftaran: 'reguler' | 'prestasi' | 'afirmasi';
  jenis_afirmasi: 'yatim' | 'piatu' | 'yatim_piatu' | 'dhuafa' | null;
  jenis_prestasi: string | null;
  id_gelombang: string;
  foto_url: string;
  scan_akte: string;
  scan_kk: string;
  scan_kip: string;
  surat_keterangan: string;
}>) {
  const { error: authError, calonSantri } = await requireCalonSantri();
  if (authError) return { error: authError };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('calon_santri')
      .update(payload)
      .eq('id', calonSantri!.id)
      .select()
      .single();

    if (error) throw error;
    return { data: data as CalonSantri, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal memperbarui profil.' };
  }
}

export async function getMyProfil() {
  const { error: authError, calonSantri } = await requireCalonSantri();
  if (authError) return { data: null, error: authError };
  return { data: calonSantri, error: null };
}

// =========================================================================
// CALON SANTRI — ADMIN
// =========================================================================

export async function getAllCalonSantri(filters?: {
  status?: string;
  id_gelombang?: string;
  page?: number;
  pageSize?: number;
}) {
  const auth = await requirePermission('PPDB', 'view');
  if (auth.error) return { data: null, count: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    let query = supabase
      .from('calon_santri')
      .select('*, gelombang:id_gelombang(*)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.id_gelombang) query = query.eq('id_gelombang', filters.id_gelombang);

    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data as CalonSantri[], count: count ?? 0, error: null };
  } catch (error: any) {
    return { data: null, count: null, error: error.message || 'Gagal mengambil data pendaftar.' };
  }
}

export async function updateStatusCalonSantri(id: string, status: string, catatan?: string) {
  const auth = await requirePermission('PPDB', 'edit');
  if (auth.error) return { error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const updateData: any = { status };
    if (catatan !== undefined) updateData.catatan_admin = catatan;

    const { data, error } = await supabase
      .from('calon_santri')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/ppdb/pendaftar');
    return { data: JSON.parse(JSON.stringify(data)) as CalonSantri, error: null };
  } catch (error: any) {
    return { error: error.message || 'Gagal memperbarui status.' };
  }
}

// =========================================================================
// HASIL SELEKSI
// =========================================================================

export async function getHasilSeleksi(idCalonSantri: string) {
  const auth = await requirePermission('PPDB', 'view');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('hasil_seleksi')
      .select('*, penguji:id_penguji(*)')
      .eq('id_calon_santri', idCalonSantri)
      .maybeSingle();

    if (error) throw error;
    return { data: data as HasilSeleksi | null, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal mengambil hasil seleksi.' };
  }
}

export async function upsertHasilSeleksi(payload: {
  id_calon_santri: string;
  nilai_tes_tulis?: number;
  nilai_baca_quran?: number;
  nilai_wawancara?: number;
  nilai_akhir?: number;
  lulus?: boolean;
  tanggal_tes?: string;
  jam_tes?: string;
  ruang_tes?: string;
  id_penguji?: string;
  catatan?: string;
}) {
  const auth = await requirePermission('PPDB', 'edit');
  if (auth.error) return { error: auth.error };

  try {
    const supabase = await getServerSupabase();

    const { data: existing } = await supabase
      .from('hasil_seleksi')
      .select('id')
      .eq('id_calon_santri', payload.id_calon_santri)
      .maybeSingle();

    let result;
    if (existing) {
      result = await supabase
        .from('hasil_seleksi')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('hasil_seleksi')
        .insert([payload])
        .select()
        .single();
    }

    if (result.error) throw result.error;
    revalidatePath('/ppdb/seleksi');
    return { data: result.data as HasilSeleksi, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal menyimpan hasil seleksi.' };
  }
}

// =========================================================================
// KONVERSI CALON SANTRI → SANTRI
// =========================================================================

export async function konversiKeSantri(idCalonSantri: string) {
  const auth = await requirePermission('PPDB', 'create');
  if (auth.error) return { error: auth.error };

  try {
    const supabase = await getServerSupabase();

    const { data: cs } = await supabase
      .from('calon_santri')
      .select('*')
      .eq('id', idCalonSantri)
      .single();

    if (!cs) return { error: 'Data calon santri tidak ditemukan.' };
    if (cs.status !== 'LUNAS') return { error: 'Status pembayaran belum lunas.' };

    const getNextNis = async (): Promise<string> => {
      const year = new Date().getFullYear().toString().slice(-2);
      const { count } = await supabase
        .from('santri')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${new Date().getFullYear()}-01-01`);
      return `${year}${String((count || 0) + 1).padStart(4, '0')}`;
    };

    const santriPayload = {
      nis: await getNextNis(),
      nama_lengkap: cs.nama_lengkap,
      jenis_kelamin: cs.jenis_kelamin,
      tempat_lahir: cs.tempat_lahir,
      tanggal_lahir: cs.tanggal_lahir || new Date().toISOString().split('T')[0],
      nik: cs.nik,
      nisn: cs.nisn,
      alamat: cs.alamat,
      hp: cs.no_hp,
      email: cs.email,
      nama_ayah: cs.nama_ayah,
      nama_ibu: cs.nama_ibu,
      sekolah_asal: cs.asal_sekolah,
      foto_url: cs.foto_url,
      status: 'aktif' as const,
    };

    const { data: santri, error: santriError } = await supabase
      .from('santri')
      .insert([santriPayload])
      .select()
      .single();

    if (santriError) throw santriError;

    const { error: updateError } = await supabase
      .from('calon_santri')
      .update({
        status: 'SUDAH_DAFTAR_ULANG',
        id_santri: santri.id,
      })
      .eq('id', idCalonSantri);

    if (updateError) throw updateError;

    revalidatePath('/ppdb/pendaftar');
    revalidatePath('/ppdb/daftar-ulang');
    revalidatePath('/santri');
    return { data: santri, error: null };
  } catch (error: any) {
    return { error: error.message || 'Gagal mengkonversi ke santri.' };
  }
}

// =========================================================================
// PENGUMUMAN PPDB
// =========================================================================

export async function getPengumumanByGelombang(idGelombang: string) {
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('pengumuman_ppdb')
      .select('*')
      .eq('id_gelombang', idGelombang)
      .order('tanggal_terbit', { ascending: false });

    if (error) throw error;
    return { data: data as PengumumanPpdb[], error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal mengambil pengumuman.' };
  }
}

export async function createPengumuman(payload: {
  id_gelombang: string;
  judul: string;
  konten?: string;
  file_url?: string;
  tanggal_terbit?: string;
}) {
  const auth = await requirePermission('PPDB', 'create');
  if (auth.error) return { error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('pengumuman_ppdb')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/ppdb/pengumuman');
    return { data: data as PengumumanPpdb, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal membuat pengumuman.' };
  }
}

export async function deletePengumuman(id: string) {
  const auth = await requirePermission('PPDB', 'delete');
  if (auth.error) return { error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase
      .from('pengumuman_ppdb')
      .delete()
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/ppdb/pengumuman');
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Gagal menghapus pengumuman.' };
  }
}
