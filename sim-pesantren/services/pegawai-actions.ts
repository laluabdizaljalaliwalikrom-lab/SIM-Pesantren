'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase, requirePermission } from '@/utils/server-supabase';
import { Pegawai } from '@/types/database';

export type PegawaiPayload = Omit<Pegawai, 'id' | 'created_at'>;

export async function getPegawai() {
  const auth = await requirePermission('Kepegawaian', 'view');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('pegawai')
      .select('*')
      .order('nama_lengkap', { ascending: true });

    if (error) throw error;
    return { data: data as Pegawai[], error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal mengambil data pegawai.' };
  }
}

export async function createPegawai(payload: PegawaiPayload) {
  const auth = await requirePermission('Kepegawaian', 'create');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('pegawai')
      .insert([payload])
      .select();

    if (error) throw error;

    revalidatePath('/pegawai');
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal menambahkan pegawai.' };
  }
}

export async function updatePegawai(id: string, payload: Partial<PegawaiPayload>) {
  const auth = await requirePermission('Kepegawaian', 'edit');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('pegawai')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) throw error;

    revalidatePath('/pegawai');
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal memperbarui data pegawai.' };
  }
}

export async function deletePegawai(id: string) {
  const auth = await requirePermission('Kepegawaian', 'delete');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase
      .from('pegawai')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/pegawai');
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Gagal menghapus pegawai.' };
  }
}
