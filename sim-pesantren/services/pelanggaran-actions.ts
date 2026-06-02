'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase, requirePermission } from '@/utils/server-supabase';
import { MasterPelanggaran, PelanggaranSantri } from '@/types/database';

export type MasterPelanggaranPayload = Omit<MasterPelanggaran, 'id' | 'created_at'>;
export type PelanggaranSantriPayload = Omit<PelanggaranSantri, 'id' | 'created_at' | 'santri' | 'pelanggaran' | 'pelapor'>;

// Master Pelanggaran
export async function getMasterPelanggaran() {
  const auth = await requirePermission('Asrama', 'view');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('master_pelanggaran')
      .select('*')
      .order('nama_pelanggaran');

    if (error) throw error;
    return { data: data as MasterPelanggaran[], error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal mengambil data master pelanggaran.' };
  }
}

export async function createPelanggaranSantri(payload: PelanggaranSantriPayload) {
  const auth = await requirePermission('Asrama', 'create');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('pelanggaran_santri')
      .insert([payload])
      .select();

    if (error) throw error;

    revalidatePath('/asrama/pelanggaran');
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal menambahkan pelanggaran.' };
  }
}

export async function deletePelanggaranSantri(id: string) {
  const auth = await requirePermission('Asrama', 'delete');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase
      .from('pelanggaran_santri')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/asrama/pelanggaran');
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Gagal menghapus pelanggaran.' };
  }
}
