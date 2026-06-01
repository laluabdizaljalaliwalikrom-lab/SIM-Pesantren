'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase, requirePermission } from '@/utils/server-supabase';

export interface MoveSantriResult {
  success: boolean;
  message: string;
  remainingCapacity: number;
}

export async function moveSantriToKamar(
  santriIds: string[],
  targetKamarId: string
): Promise<MoveSantriResult> {
  const auth = await requirePermission('Asrama', 'edit');
  if (auth.error) return { success: false, message: auth.error, remainingCapacity: 0 };

  try {
    if (!santriIds || santriIds.length === 0) {
      return { success: false, message: 'Tidak ada santri yang dipilih.', remainingCapacity: 0 };
    }

    const supabase = await getServerSupabase();
    const { data, error } = await supabase.rpc('move_santri_to_kamar', {
      santri_ids: santriIds,
      target_kamar_id: targetKamarId
    });

    if (error) throw error;

    const result = data && data[0] ? data[0] : null;

    if (!result) {
      throw new Error('Gagal menerima response dari fungsi database.');
    }

    if (!result.success) {
      return {
        success: false,
        message: result.message || 'Kapasitas tidak mencukupi.',
        remainingCapacity: result.remaining_capacity || 0
      };
    }

    revalidatePath('/asrama');
    revalidatePath('/admin/santri');

    return {
      success: true,
      message: result.message || 'Santri berhasil dipindahkan.',
      remainingCapacity: result.remaining_capacity || 0
    };

  } catch (err: any) {
    console.error('Error in moveSantriToKamar server action:', err);
    return {
      success: false,
      message: err.message || 'Terjadi kesalahan sistem saat memindahkan santri.',
      remainingCapacity: 0
    };
  }
}
