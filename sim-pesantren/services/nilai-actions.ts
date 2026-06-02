'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase, requirePermission } from '@/utils/server-supabase';
import { Nilai } from '@/types/database';

export type NilaiPayload = Omit<Nilai, 'id' | 'created_at' | 'santri' | 'kelas'>;

export async function upsertNilai(payload: NilaiPayload) {
  const auth = await requirePermission('Akademik', 'edit');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();

    const { data: existing } = await supabase
      .from('nilai')
      .select('id')
      .eq('id_santri', payload.id_santri)
      .eq('id_mapel', payload.id_mapel)
      .eq('id_kelas', payload.id_kelas)
      .eq('semester', payload.semester)
      .eq('tahun_ajaran', payload.tahun_ajaran)
      .eq('jenis_ujian', payload.jenis_ujian)
      .maybeSingle();

    let result;
    if (existing) {
      result = await supabase
        .from('nilai')
        .update(payload)
        .eq('id', existing.id)
        .select();
    } else {
      result = await supabase
        .from('nilai')
        .insert([payload])
        .select();
    }

    if (result.error) throw result.error;

    revalidatePath('/akademik/nilai');
    return { data: result.data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal menyimpan nilai.' };
  }
}

export async function deleteNilai(id: string) {
  const auth = await requirePermission('Akademik', 'delete');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase
      .from('nilai')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/akademik/nilai');
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Gagal menghapus nilai.' };
  }
}
