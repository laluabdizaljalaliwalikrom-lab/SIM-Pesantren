'use server';

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';

interface GenerateMonthlyBillingParams {
  idMasterBiaya: string;
  bulan: number;
  tahun: number;
  onlyMukim?: boolean;
}

/**
 * Generate tagihan bulanan untuk semua santri aktif
 * Menggunakan transaksi database PostgreSQL terjamin lewat RPC function
 */
export async function generateMonthlyBilling({
  idMasterBiaya,
  bulan,
  tahun,
  onlyMukim = false
}: GenerateMonthlyBillingParams) {
  try {
    // 1. Validasi parameter masukan
    if (!idMasterBiaya) {
      return { success: false, message: 'ID Master Biaya tidak boleh kosong.', insertedCount: 0 };
    }
    if (bulan < 1 || bulan > 12) {
      return { success: false, message: 'Bulan harus bernilai antara 1 sampai 12.', insertedCount: 0 };
    }
    if (tahun < 1900) {
      return { success: false, message: 'Tahun tidak valid.', insertedCount: 0 };
    }

    // 2. Eksekusi RPC generate_monthly_billing di database (transaksi aman di Postgres)
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

    // RPC mengembalikan array berisi satu objek or record set
    // Kembalian berupa table success, message, inserted_count
    const result = Array.isArray(data) ? data[0] : data;

    if (result && result.success === false) {
      return {
        success: false,
        message: result.message || 'Gagal men-generate tagihan.',
        insertedCount: 0
      };
    }

    // 3. Revalidate path keuangan
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
