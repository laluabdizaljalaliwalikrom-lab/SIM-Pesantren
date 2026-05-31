'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase, requireServerAdmin } from '@/utils/server-supabase';

interface GenerateMonthlyBillingParams {
  idMasterBiaya: string;
  bulan: number;
  tahun: number;
  onlyMukim?: boolean;
}

export async function generateMonthlyBilling({
  idMasterBiaya,
  bulan,
  tahun,
  onlyMukim = false
}: GenerateMonthlyBillingParams) {
  const auth = await requireServerAdmin();
  if (auth.error) return { success: false, message: auth.error, insertedCount: 0 };

  try {
    if (!idMasterBiaya) {
      return { success: false, message: 'ID Master Biaya tidak boleh kosong.', insertedCount: 0 };
    }
    if (bulan < 1 || bulan > 12) {
      return { success: false, message: 'Bulan harus bernilai antara 1 sampai 12.', insertedCount: 0 };
    }
    if (tahun < 1900) {
      return { success: false, message: 'Tahun tidak valid.', insertedCount: 0 };
    }

    const supabase = await getServerSupabase();
    const { data, error } = await supabase.rpc('generate_monthly_billing', {
      p_id_master_biaya: idMasterBiaya,
      p_bulan: bulan,
      p_tahun: tahun,
      p_only_mukim: onlyMukim
    });

    if (error) {
      console.error('Error executing generate_monthly_billing RPC:', error);
      throw error;
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (result && result.success === false) {
      return {
        success: false,
        message: result.message || 'Gagal men-generate tagihan.',
        insertedCount: 0
      };
    }

    revalidatePath('/keuangan');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: result?.message || 'Tagihan bulanan berhasil dibuat.',
      insertedCount: result?.inserted_count || 0
    };
  } catch (error: any) {
    console.error('Exception in generateMonthlyBilling Server Action:', error);
    return {
      success: false,
      message: error.message || 'Terjadi kesalahan sistem saat membuat tagihan.',
      insertedCount: 0
    };
  }
}
