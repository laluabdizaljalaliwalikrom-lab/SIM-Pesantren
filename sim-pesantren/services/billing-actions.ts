'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase, requireServerAdmin } from '@/utils/server-supabase';

interface GenerateBillingParams {
  idMasterBiaya: string;
  targetType: 'semua' | 'sekolah' | 'kelas' | 'asrama' | 'santri';
  targetId?: string;
}

export async function generateBilling({
  idMasterBiaya,
  targetType,
  targetId
}: GenerateBillingParams) {
  const auth = await requireServerAdmin();
  if (auth.error) return { success: false, message: auth.error, insertedCount: 0 };

  try {
    if (!idMasterBiaya) {
      return { success: false, message: 'ID Master Biaya tidak boleh kosong.', insertedCount: 0 };
    }

    const supabase = await getServerSupabase();

    // 1. Ambil detail master_biaya
    const { data: biaya, error: biayaErr } = await supabase
      .from('master_biaya')
      .select('nama_biaya, nominal, frekuensi')
      .eq('id', idMasterBiaya)
      .single();

    if (biayaErr || !biaya) {
      return { success: false, message: 'Master biaya tidak ditemukan.', insertedCount: 0 };
    }

    // 2. Ambil tahun ajaran aktif
    const { data: tahunAjaran, error: taErr } = await supabase
      .from('tahun_ajaran')
      .select('id, nama_tahun, tanggal_mulai, tanggal_akhir')
      .eq('status_aktif', true)
      .maybeSingle();

    if (taErr || !tahunAjaran) {
      return { success: false, message: 'Tahun ajaran aktif tidak ditemukan. Silakan aktifkan tahun ajaran terlebih dahulu.', insertedCount: 0 };
    }

    // 3. Tentukan rentang periode (bulan & tahun) berdasarkan frekuensi
    const startDate = new Date(tahunAjaran.tanggal_mulai);
    const endDate = new Date(tahunAjaran.tanggal_akhir);
    
    interface Period {
      bulan: number;
      tahun: number;
    }
    const periods: Period[] = [];

    if (biaya.frekuensi === 'bulanan') {
      // Loop tiap bulan dari tanggal_mulai ke tanggal_akhir
      let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      
      while (current <= last) {
        periods.push({
          bulan: current.getMonth() + 1,
          tahun: current.getFullYear()
        });
        current.setMonth(current.getMonth() + 1);
      }
    } else if (biaya.frekuensi === 'persemester') {
      // Semester 1 (Ganjil): Bulan awal tahun ajaran
      periods.push({
        bulan: startDate.getMonth() + 1,
        tahun: startDate.getFullYear()
      });
      // Semester 2 (Genap): Bulan awal tahun ajaran + 6 bulan
      const sem2Date = new Date(startDate.getFullYear(), startDate.getMonth() + 6, 1);
      periods.push({
        bulan: sem2Date.getMonth() + 1,
        tahun: sem2Date.getFullYear()
      });
    } else {
      // Insidentil: Hanya 1 kali tagihan di awal tahun ajaran
      periods.push({
        bulan: startDate.getMonth() + 1,
        tahun: startDate.getFullYear()
      });
    }

    if (periods.length === 0) {
      return { success: false, message: 'Rentang periode tagihan tidak valid.', insertedCount: 0 };
    }

    // 4. Query target santri berdasarkan filter targetType
    let targetSantriIds: string[] = [];

    if (targetType === 'semua') {
      const { data: santri, error: err } = await supabase
        .from('santri')
        .select('id')
        .eq('status', 'aktif');
      if (err) throw err;
      targetSantriIds = (santri || []).map(s => s.id);
    } else if (targetType === 'asrama') {
      const { data: santri, error: err } = await supabase
        .from('santri')
        .select('id')
        .eq('status', 'aktif')
        .not('id_kamar', 'is', null);
      if (err) throw err;
      targetSantriIds = (santri || []).map(s => s.id);
    } else if (targetType === 'kelas') {
      if (!targetId) return { success: false, message: 'ID Kelas tidak ditentukan.', insertedCount: 0 };
      const { data: santri, error: err } = await supabase
        .from('santri')
        .select('id')
        .eq('status', 'aktif')
        .or(`id_kelas_formal.eq.${targetId},id_kelas_non_formal.eq.${targetId}`);
      if (err) throw err;
      targetSantriIds = (santri || []).map(s => s.id);
    } else if (targetType === 'sekolah') {
      if (!targetId) return { success: false, message: 'ID Sekolah tidak ditentukan.', insertedCount: 0 };
      
      // Ambil semua kelas di sekolah ini
      const { data: kelas, error: kelasErr } = await supabase
        .from('kelas')
        .select('id')
        .eq('id_sekolah', targetId);
      if (kelasErr) throw kelasErr;

      const classIds = (kelas || []).map(k => k.id);
      if (classIds.length === 0) {
        return { success: false, message: 'Tidak ada kelas yang terdaftar di sekolah ini.', insertedCount: 0 };
      }

      const { data: santri, error: err } = await supabase
        .from('santri')
        .select('id')
        .eq('status', 'aktif')
        .or(`id_kelas_formal.in.(${classIds.join(',')}),id_kelas_non_formal.in.(${classIds.join(',')})`);
      if (err) throw err;
      targetSantriIds = (santri || []).map(s => s.id);
    } else if (targetType === 'santri') {
      if (!targetId) return { success: false, message: 'ID Santri tidak ditentukan.', insertedCount: 0 };
      const { data: santri, error: err } = await supabase
        .from('santri')
        .select('id')
        .eq('status', 'aktif')
        .eq('id', targetId)
        .maybeSingle();
      if (err) throw err;
      if (santri) targetSantriIds = [santri.id];
    }

    if (targetSantriIds.length === 0) {
      return { success: false, message: 'Tidak ada santri aktif yang cocok dengan filter sasaran.', insertedCount: 0 };
    }

    // 5. Generate tagihan secara bulk & cegah duplikasi
    let insertedCount = 0;
    
    // Ambil tagihan yang sudah ada untuk master biaya ini
    const { data: existingBills, error: billFetchErr } = await supabase
      .from('tagihan')
      .select('id_santri, bulan, tahun')
      .eq('id_master_biaya', idMasterBiaya);
    
    if (billFetchErr) throw billFetchErr;

    // Buat set untuk mempermudah pencarian duplikasi
    const existingSet = new Set(
      (existingBills || []).map(b => `${b.id_santri}-${b.bulan}-${b.tahun}`)
    );

    // Kumpulkan payload tagihan baru
    const insertPayload = [];

    for (const santriId of targetSantriIds) {
      for (const p of periods) {
        const key = `${santriId}-${p.bulan}-${p.tahun}`;
        if (!existingSet.has(key)) {
          insertPayload.push({
            id_santri: santriId,
            id_master_biaya: idMasterBiaya,
            bulan: p.bulan,
            tahun: p.tahun,
            nominal: biaya.nominal,
            status: 'Belum Lunas'
          });
        }
      }
    }

    // Insert ke database jika ada tagihan baru
    if (insertPayload.length > 0) {
      // Supabase supports bulk insert
      const { error: insertErr } = await supabase
        .from('tagihan')
        .insert(insertPayload);

      if (insertErr) throw insertErr;
      insertedCount = insertPayload.length;
    }

    revalidatePath('/keuangan');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: `Berhasil men-generate ${insertedCount} tagihan baru.`,
      insertedCount
    };
  } catch (error: any) {
    console.error('Exception in generateBilling Server Action:', error);
    return {
      success: false,
      message: error.message || 'Terjadi kesalahan sistem saat membuat tagihan.',
      insertedCount: 0
    };
  }
}
