'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase, requirePermission } from '@/utils/server-supabase';
import { Perizinan } from '@/types/database';

export type PerizinanPayload = Omit<Perizinan, 'id' | 'created_at' | 'santri' | 'creator' | 'approver'>;

export async function getPerizinan() {
  const auth = await requirePermission('Perizinan', 'view');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('perizinan')
      .select('*, santri:id_santri (*), creator:created_by (*), approver:approved_by (*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data as Perizinan[], error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal mengambil data perizinan.' };
  }
}

export async function createPerizinan(payload: PerizinanPayload) {
  const auth = await requirePermission('Perizinan', 'create');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('perizinan')
      .insert([payload])
      .select();

    if (error) throw error;

    revalidatePath('/asrama/perizinan');
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal menambahkan perizinan.' };
  }
}

export async function updatePerizinan(id: string, payload: Partial<PerizinanPayload>) {
  const auth = await requirePermission('Perizinan', 'edit');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('perizinan')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) throw error;

    revalidatePath('/asrama/perizinan');
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal memperbarui perizinan.' };
  }
}

export async function deletePerizinan(id: string) {
  const auth = await requirePermission('Perizinan', 'delete');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase
      .from('perizinan')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/asrama/perizinan');
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Gagal menghapus perizinan.' };
  }
}
