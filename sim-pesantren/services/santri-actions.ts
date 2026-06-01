'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase, requirePermission } from '@/utils/server-supabase';
import { Santri } from '@/types/database';

export type SantriPayload = Omit<Santri, 'id' | 'created_at' | 'kamar' | 'wali'>;

export async function getSantri() {
  const auth = await requirePermission('Santri', 'view');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('santri')
      .select(`
        *,
        kamar:id_kamar (*)
      `)
      .order('nama_lengkap', { ascending: true });

    if (error) throw error;
    return { data: data as Santri[], error: null };
  } catch (error: any) {
    console.error('Error in getSantri server action:', error);
    return { data: null, error: error.message || 'Gagal mengambil data santri.' };
  }
}

export async function createSantri(payload: SantriPayload) {
  const auth = await requirePermission('Santri', 'create');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('santri')
      .insert([payload])
      .select();

    if (error) throw error;

    revalidatePath('/santri');
    revalidatePath('/admin');

    return { data, error: null };
  } catch (error: any) {
    console.error('Error in createSantri server action:', error);
    return { data: null, error: error.message || 'Gagal menambahkan santri baru.' };
  }
}

export async function updateSantri(id: string, payload: Partial<SantriPayload>) {
  const auth = await requirePermission('Santri', 'edit');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('santri')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) throw error;

    revalidatePath('/santri');
    
    return { data, error: null };
  } catch (error: any) {
    console.error('Error in updateSantri server action:', error);
    return { data: null, error: error.message || 'Gagal memperbarui data santri.' };
  }
}

export async function deleteSantri(id: string) {
  const auth = await requirePermission('Santri', 'delete');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('santri')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/santri');
    revalidatePath('/admin');

    return { data, error: null };
  } catch (error: any) {
    console.error('Error in deleteSantri server action:', error);
    return { data: null, error: error.message || 'Gagal menghapus data santri.' };
  }
}
