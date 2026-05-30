'use server';

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';

export interface MoveSantriResult {
  success: boolean;
  message: string;
  remainingCapacity: number;
}

/**
 * Server Action to move multiple students to a room atomically
 */
export async function moveSantriToKamar(
  santriIds: string[],
  targetKamarId: string
): Promise<MoveSantriResult> {
  try {
    if (!santriIds || santriIds.length === 0) {
      return { success: false, message: 'Tidak ada santri yang dipilih.', remainingCapacity: 0 };
    }

    // Call Supabase PL/pgSQL function via RPC to ensure transaction safety (atomic)
    const { data, error } = await supabase.rpc('move_santri_to_kamar', {
      santri_ids: santriIds,
      target_kamar_id: targetKamarId
    });

    if (error) throw error;

    // Handle return table output from function
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

    // Revalidate related layout paths
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
