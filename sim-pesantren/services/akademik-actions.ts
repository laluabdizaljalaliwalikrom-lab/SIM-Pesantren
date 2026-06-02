'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase, requirePermission } from '@/utils/server-supabase';
import { Sekolah, Kelas, JadwalPelajaran } from '@/types/database';

// Sekolah
export async function createSekolah(payload: Omit<Sekolah, 'id' | 'created_at'>) {
  const auth = await requirePermission('Akademik', 'create');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase.from('sekolah').insert([payload]).select();
    if (error) throw error;

    revalidatePath('/lembaga');
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal menambahkan sekolah.' };
  }
}

export async function updateSekolah(id: string, payload: Partial<Omit<Sekolah, 'id' | 'created_at'>>) {
  const auth = await requirePermission('Akademik', 'edit');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase.from('sekolah').update(payload).eq('id', id).select();
    if (error) throw error;

    revalidatePath('/lembaga');
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal memperbarui sekolah.' };
  }
}

export async function deleteSekolah(id: string) {
  const auth = await requirePermission('Akademik', 'delete');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase.from('sekolah').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/lembaga');
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Gagal menghapus sekolah.' };
  }
}

// Kelas
export async function createKelas(payload: Omit<Kelas, 'id' | 'created_at' | 'sekolah'>) {
  const auth = await requirePermission('Akademik', 'create');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase.from('kelas').insert([payload]).select();
    if (error) throw error;

    revalidatePath('/lembaga');
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal menambahkan kelas.' };
  }
}

export async function updateKelas(id: string, payload: Partial<Omit<Kelas, 'id' | 'created_at' | 'sekolah'>>) {
  const auth = await requirePermission('Akademik', 'edit');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase.from('kelas').update(payload).eq('id', id).select();
    if (error) throw error;

    revalidatePath('/lembaga');
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal memperbarui kelas.' };
  }
}

export async function deleteKelas(id: string) {
  const auth = await requirePermission('Akademik', 'delete');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase.from('kelas').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/lembaga');
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Gagal menghapus kelas.' };
  }
}

// Jadwal Pelajaran
export async function createJadwal(payload: Omit<JadwalPelajaran, 'id' | 'created_at' | 'kelas' | 'mapel' | 'guru'>) {
  const auth = await requirePermission('Akademik', 'create');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase.from('jadwal_pelajaran').insert([payload]).select();
    if (error) throw error;

    revalidatePath('/akademik/jadwal');
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal menambahkan jadwal.' };
  }
}

export async function deleteJadwal(id: string) {
  const auth = await requirePermission('Akademik', 'delete');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase.from('jadwal_pelajaran').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/akademik/jadwal');
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Gagal menghapus jadwal.' };
  }
}

// Tahun Ajaran
export async function createTahunAjaran(payload: { nama_tahun: string; tanggal_mulai: string; tanggal_akhir: string }) {
  const auth = await requirePermission('Akademik', 'create');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase.from('tahun_ajaran').insert([payload]).select();
    if (error) throw error;

    revalidatePath('/lembaga');
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal menambahkan tahun ajaran.' };
  }
}

export async function setActiveTahunAjaran(id: string) {
  const auth = await requirePermission('Akademik', 'edit');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { error: resetErr } = await supabase.from('tahun_ajaran').update({ status_aktif: false }).neq('id', id);
    if (resetErr) throw resetErr;

    const { data, error } = await supabase.from('tahun_ajaran').update({ status_aktif: true }).eq('id', id).select();
    if (error) throw error;

    revalidatePath('/lembaga');
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal mengaktifkan tahun ajaran.' };
  }
}
