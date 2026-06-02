'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase, requirePermission } from '@/utils/server-supabase';

export async function deletePembayaran(id: string) {
  const auth = await requirePermission('Keuangan', 'delete');
  if (auth.error) return { error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase.from('pembayaran').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/pembayaran');
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Gagal menghapus pembayaran.' };
  }
}

export async function createPembayaranGroup(payload: {
  id_santri: string;
  total_tagihan: number;
  total_bayar: number;
  uang_diterima: number;
  kembalian: number;
}) {
  const auth = await requirePermission('Keuangan', 'create');
  if (auth.error) return { data: null, error: auth.error };

  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('pembayaran_group')
      .insert([{ ...payload, id_admin: user?.id }])
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/pembayaran');
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Gagal membuat pembayaran.' };
  }
}
