import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/utils/server-supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const s = getServiceRoleClient();

    const [sekolahRes, kelasRes, santriRes, pegawaiRes] = await Promise.all([
      s.from('sekolah').select('*', { count: 'exact', head: true }),
      s.from('kelas').select('*', { count: 'exact', head: true }),
      s.from('santri').select('*', { count: 'exact', head: true }),
      s.from('pegawai').select('*', { count: 'exact', head: true }),
    ]);

    return NextResponse.json({
      sekolah: sekolahRes.count ?? 0,
      kelas: kelasRes.count ?? 0,
      santri: santriRes.count ?? 0,
      pegawai: pegawaiRes.count ?? 0,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
