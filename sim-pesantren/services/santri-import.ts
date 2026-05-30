'use server';

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';

interface ExcelSantriRow {
  nis: string | number;
  nama_lengkap: string;
  tanggal_lahir?: string | Date;
  id_kamar?: string | null;
  id_wali?: string | null;
  status?: 'aktif' | 'alumni' | 'mutasi';
}

interface ImportResult {
  success: boolean;
  count: number;
  error: string | null;
}

/**
 * Server Action untuk mengimpor massal data santri ke Supabase.
 * Menggunakan pendekatan Bulk Upsert berbasis kolom unik 'nis' untuk mencegah error duplikasi.
 */
export async function importSantri(rows: ExcelSantriRow[]): Promise<ImportResult> {
  try {
    if (!rows || rows.length === 0) {
      return { success: true, count: 0, error: null };
    }

    // 1. Pembersihan dan Normalisasi Data
    const formattedData = rows.map((row) => {
      // Pastikan NIS berupa string dan di-trim
      const rawNis = String(row.nis || '').trim();
      const rawNama = String(row.nama_lengkap || '').trim();

      // Normalisasi format Tanggal Lahir (YYYY-MM-DD)
      let formattedTanggalLahir = '2000-01-01'; // Default fallback jika kosong
      if (row.tanggal_lahir) {
        if (row.tanggal_lahir instanceof Date) {
          formattedTanggalLahir = row.tanggal_lahir.toISOString().split('T')[0];
        } else {
          // Asumsi string dari Excel (misal: "2010-12-31" atau "12/31/2010")
          const dateObj = new Date(row.tanggal_lahir);
          if (!isNaN(dateObj.getTime())) {
            formattedTanggalLahir = dateObj.toISOString().split('T')[0];
          }
        }
      }

      return {
        nis: rawNis,
        nama_lengkap: rawNama,
        tanggal_lahir: formattedTanggalLahir,
        id_kamar: row.id_kamar || null,
        id_wali: row.id_wali || null,
        status: row.status || 'aktif',
      };
    });

    // Validasi data minimal sebelum insert
    const validData = formattedData.filter((item) => item.nis !== '' && item.nama_lengkap !== '');

    if (validData.length === 0) {
      return { success: false, count: 0, error: 'Tidak ada baris data valid untuk diimpor (NIS dan Nama wajib diisi).' };
    }

    // 2. Lakukan Bulk Upsert ke Supabase
    // Menggunakan opsi { onConflict: 'nis' } agar jika NIS sudah ada, data lama akan ditimpa (di-update) dengan data baru secara aman tanpa melempar error duplikat.
    const { data, error } = await supabase
      .from('santri')
      .upsert(validData, { onConflict: 'nis' })
      .select('id');

    if (error) throw error;

    // 3. Bersihkan Cache Halaman Terkait
    revalidatePath('/admin/santri');
    revalidatePath('/admin');

    return {
      success: true,
      count: data ? data.length : 0,
      error: null,
    };
  } catch (error: any) {
    console.error('Error in importSantri server action:', error);
    return {
      success: false,
      count: 0,
      error: error.message || 'Gagal melakukan impor massal data santri.',
    };
  }
}

interface ExcelCompareRow {
  nis?: string | number;
  nama_lengkap?: string;
  nisn?: string | number | null;
  nik?: string | number | null;
  [key: string]: any;
}

interface CheckedSantriRow extends ExcelCompareRow {
  status_import: 'new' | 'exists';
  existing_data?: any;
}

/**
 * Memeriksa data duplikat (NISN/NIK) secara efisien dengan Batch Query (IN)
 * sebelum melakukan impor untuk menghindari error atau menimpa data tanpa sengaja.
 */
export async function checkExistingSantri(rows: ExcelCompareRow[]): Promise<{ data: CheckedSantriRow[]; error: string | null }> {
  try {
    if (!rows || rows.length === 0) {
      return { data: [], error: null };
    }

    // 1. Ekstrak daftar NISN dan NIK yang tidak kosong dari Excel
    const nisnList = rows.map((r) => String(r.nisn || '').trim()).filter((val) => val !== '');
    const nikList = rows.map((r) => String(r.nik || '').trim()).filter((val) => val !== '');

    // Jika seluruh baris tidak memiliki NISN / NIK untuk dicocokkan, anggap semua data baru
    if (nisnList.length === 0 && nikList.length === 0) {
      const results: CheckedSantriRow[] = rows.map((r) => ({
        ...r,
        status_import: 'new',
      }));
      return { data: results, error: null };
    }

    // 2. Buat kueri pencarian massal (Batch OR IN) di PostgreSQL
    const orFilters: string[] = [];
    if (nisnList.length > 0) {
      const formattedNisns = nisnList.map((n) => `"${n}"`).join(',');
      orFilters.push(`nisn.in.(${formattedNisns})`);
    }
    if (nikList.length > 0) {
      const formattedNiks = nikList.map((n) => `"${n}"`).join(',');
      orFilters.push(`nik.in.(${formattedNiks})`);
    }

    let query = supabase.from('santri').select('*');
    if (orFilters.length > 0) {
      query = query.or(orFilters.join(','));
    }

    const { data: dbSantri, error } = await query;
    if (error) throw error;

    // 3. Masukkan hasil kueri ke Map untuk pencarian O(1) yang cepat
    const dbMapByNisn = new Map<string, any>();
    const dbMapByNik = new Map<string, any>();

    dbSantri?.forEach((s: any) => {
      if (s.nisn) dbMapByNisn.set(String(s.nisn).trim(), s);
      if (s.nik) dbMapByNik.set(String(s.nik).trim(), s);
    });

    // 4. Bandingkan data Excel dengan peta data dari Database
    const resultRows: CheckedSantriRow[] = rows.map((row) => {
      const rowNisn = String(row.nisn || '').trim();
      const rowNik = String(row.nik || '').trim();

      const existingByNisn = rowNisn ? dbMapByNisn.get(rowNisn) : null;
      const existingByNik = rowNik ? dbMapByNik.get(rowNik) : null;
      const existingData = existingByNisn || existingByNik;

      if (existingData) {
        return {
          ...row,
          status_import: 'exists' as const,
          existing_data: existingData,
        };
      }

      return {
        ...row,
        status_import: 'new' as const,
      };
    });

    return { data: resultRows, error: null };
  } catch (err: any) {
    console.error('Error in checkExistingSantri server action:', err);
    return { data: [], error: err.message || 'Gagal memeriksa kecocokan data santri.' };
  }
}

interface ExecuteImportResult {
  success: boolean;
  insertedCount: number;
  updatedCount: number;
  error: string | null;
}

/**
 * Mengeksekusi impor data secara massal dengan memisahkan Data Baru (.insert)
 * dan Data Update (.upsert) secara paralel (batch) menggunakan Promise.all.
 */
export async function executeImport(
  newRows: any[],
  updateRows: any[]
): Promise<ExecuteImportResult> {
  try {
    // Jalankan query secara paralel agar proses transfer data ke Supabase berjalan sangat cepat
    const [insertResult, updateResult] = await Promise.all([
      newRows.length > 0
        ? supabase.from('santri').insert(newRows).select('id')
        : Promise.resolve({ data: [], error: null }),
      updateRows.length > 0
        ? supabase.from('santri').upsert(updateRows, { onConflict: 'nis' }).select('id')
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (insertResult.error) throw insertResult.error;
    if (updateResult.error) throw updateResult.error;

    // Bersihkan cache Next.js agar tabel santri langsung ter-update
    revalidatePath('/admin/santri');
    revalidatePath('/admin');

    return {
      success: true,
      insertedCount: insertResult.data ? insertResult.data.length : 0,
      updatedCount: updateResult.data ? updateResult.data.length : 0,
      error: null,
    };
  } catch (err: any) {
    console.error('Error in executeImport server action:', err);
    return {
      success: false,
      insertedCount: 0,
      updatedCount: 0,
      error: err.message || 'Gagal mengeksekusi impor data santri.',
    };
  }
}


