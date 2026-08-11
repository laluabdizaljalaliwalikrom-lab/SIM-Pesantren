'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase, requirePermission } from '@/utils/server-supabase';
import type { PegawaiInsertPayload } from '@/utils/dapodik-pegawai-transformer';

// Kolom yang diizinkan pada tabel pegawai (whitelist pengaman saat insert/upsert)
const PEGAWAI_IMPORT_COLUMNS = [
  'id',
  'nip',
  'nik',
  'nuptk',
  'nama_lengkap',
  'gelar_depan',
  'gelar_belakang',
  'jabatan',
  'jenis_kelamin',
  'tempat_lahir',
  'tanggal_lahir',
  'alamat',
  'no_hp',
  'email',
  'foto_url',
  'pendidikan_terakhir',
  'spesialisasi',
  'tanggal_bergabung',
  'status',
  'qr_code_url',
  'id_sekolah',
];

function sanitizeRows(rows: any[]): any[] {
  return rows.map((r) => {
    const clean: any = {};
    for (const key of Object.keys(r)) {
      if (PEGAWAI_IMPORT_COLUMNS.includes(key)) {
        clean[key] = r[key];
      }
    }
    return clean;
  });
}

interface CheckedPegawaiRow extends PegawaiInsertPayload {
  status_import: 'new' | 'exists';
  existing_data?: any;
}

export async function checkExistingPegawai(rows: PegawaiInsertPayload[]): Promise<{ data: CheckedPegawaiRow[]; error: string | null }> {
  const auth = await requirePermission('Kepegawaian', 'view');
  if (auth.error) return { data: [], error: auth.error };

  try {
    if (!rows || rows.length === 0) {
      return { data: [], error: null };
    }

    const nikList = rows.map((r) => String(r.nik || '').trim()).filter((v) => v !== '');
    const nipList = rows.map((r) => String(r.nip || '').trim()).filter((v) => v !== '');
    const nuptkList = rows.map((r) => String(r.nuptk || '').trim()).filter((v) => v !== '');

    const orFilters: string[] = [];
    if (nikList.length > 0) {
      orFilters.push(`nik.in.(${nikList.map((n) => `"${n}"`).join(',')})`);
    }
    if (nipList.length > 0) {
      orFilters.push(`nip.in.(${nipList.map((n) => `"${n}"`).join(',')})`);
    }
    if (nuptkList.length > 0) {
      orFilters.push(`nuptk.in.(${nuptkList.map((n) => `"${n}"`).join(',')})`);
    }

    const dbByNik = new Map<string, any>();
    const dbByNip = new Map<string, any>();
    const dbByNuptk = new Map<string, any>();

    if (orFilters.length > 0) {
      const supabase = await getServerSupabase();
      const { data: dbPegawai, error } = await supabase
        .from('pegawai')
        .select('*')
        .or(orFilters.join(','));

      if (error) throw error;

      dbPegawai?.forEach((p: any) => {
        if (p.nik) dbByNik.set(String(p.nik).trim(), p);
        if (p.nip) dbByNip.set(String(p.nip).trim(), p);
        if (p.nuptk) dbByNuptk.set(String(p.nuptk).trim(), p);
      });
    }

    const seenInFile = new Set<string>();

    const resultRows: CheckedPegawaiRow[] = rows.map((row) => {
      const nik = String(row.nik || '').trim();
      const nip = String(row.nip || '').trim();
      const nuptk = String(row.nuptk || '').trim();
      const matchKey = nik || nip || nuptk;

      // Duplikat dalam file yang sama
      if (matchKey && seenInFile.has(matchKey)) {
        return { ...row, status_import: 'exists' as const, existing_data: null, duplicate_in_file: true as any };
      }
      if (matchKey) seenInFile.add(matchKey);

      // Duplikat terhadap database
      const existingData =
        (nik && dbByNik.get(nik)) ||
        (nip && dbByNip.get(nip)) ||
        (nuptk && dbByNuptk.get(nuptk)) ||
        null;

      return {
        ...row,
        status_import: existingData ? ('exists' as const) : ('new' as const),
        existing_data: existingData,
      };
    });

    return { data: resultRows, error: null };
  } catch (err: any) {
    console.error('Error in checkExistingPegawai server action:', err);
    return { data: [], error: err.message || 'Gagal memeriksa kecocokan data pegawai.' };
  }
}

export async function executeImportPegawai(
  newRows: any[],
  updateRows: any[]
): Promise<{ success: boolean; insertedCount: number; updatedCount: number; error: string | null }> {
  const auth = await requirePermission('Kepegawaian', 'create');
  if (auth.error) return { success: false, insertedCount: 0, updatedCount: 0, error: auth.error };

  try {
    const supabase = await getServerSupabase();

    // Hilangkan id kosong pada baris baru (kolom id hanya dipakai untuk update)
    const cleanNewRows = sanitizeRows(newRows).map((r: any) => {
      const copy = { ...r };
      if (copy.id === null || copy.id === undefined) delete copy.id;
      return copy;
    });

    const cleanUpdateRows = sanitizeRows(updateRows);

    // Dedup dalam file (hindari pelanggaran UNIQUE nik/nip/nuptk)
    const seen = new Set<string>();
    const uniqueNewRows = cleanNewRows.filter((r: any) => {
      const key = String(r.nik || r.nip || r.nuptk || '').trim();
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const [insertResult, updateResult] = await Promise.all([
      uniqueNewRows.length > 0
        ? supabase.from('pegawai').insert(uniqueNewRows).select('id')
        : Promise.resolve({ data: [], error: null }),
      cleanUpdateRows.length > 0
        ? supabase.from('pegawai').upsert(cleanUpdateRows, { onConflict: 'id' }).select('id')
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (insertResult.error) throw insertResult.error;
    if (updateResult.error) throw updateResult.error;

    revalidatePath('/pegawai');

    return {
      success: true,
      insertedCount: insertResult.data ? insertResult.data.length : 0,
      updatedCount: updateResult.data ? updateResult.data.length : 0,
      error: null,
    };
  } catch (err: any) {
    console.error('Error in executeImportPegawai server action:', err);
    return {
      success: false,
      insertedCount: 0,
      updatedCount: 0,
      error: err.message || 'Gagal mengeksekusi impor data pegawai.',
    };
  }
}
