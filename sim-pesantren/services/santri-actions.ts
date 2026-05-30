'use server';

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { Santri } from '@/types/database';

export type SantriPayload = Omit<Santri, 'id' | 'created_at' | 'kamar' | 'wali'>;

/**
 * Mengambil semua data santri beserta nama kamar (join dengan tabel kamar)
 */
export async function getSantri() {
  try {
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

/**
 * Menambah santri baru
 */
export async function createSantri(payload: SantriPayload) {
  try {
    const { data, error } = await supabase
      .from('santri')
      .insert([payload])
      .select();

    if (error) throw error;

    // Bersihkan cache agar data di halaman dashboard ter-update
    revalidatePath('/admin/santri');
    revalidatePath('/admin'); // Revalidate dashboard home juga karena menampilkan stat jumlah santri

    return { data, error: null };
  } catch (error: any) {
    console.error('Error in createSantri server action:', error);
    return { data: null, error: error.message || 'Gagal menambahkan santri baru.' };
  }
}

/**
 * Mengubah data santri berdasarkan ID
 */
export async function updateSantri(id: string, payload: Partial<SantriPayload>) {
  try {
    const { data, error } = await supabase
      .from('santri')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) throw error;

    // Bersihkan cache halaman admin santri
    revalidatePath('/admin/santri');
    
    return { data, error: null };
  } catch (error: any) {
    console.error('Error in updateSantri server action:', error);
    return { data: null, error: error.message || 'Gagal memperbarui data santri.' };
  }
}

/**
 * Menghapus data santri berdasarkan ID
 */
export async function deleteSantri(id: string) {
  try {
    const { data, error } = await supabase
      .from('santri')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Bersihkan cache halaman agar ter-update instan
    revalidatePath('/admin/santri');
    revalidatePath('/admin');

    return { data, error: null };
  } catch (error: any) {
    console.error('Error in deleteSantri server action:', error);
    return { data: null, error: error.message || 'Gagal menghapus data santri.' };
  }
}
