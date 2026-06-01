import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requirePermission } from '@/utils/auth-api';

export async function GET() {
  try {
    const auth = await requirePermission('Pengaturan', 'view');
    if (auth.error) return auth.error;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabaseKey = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Konfigurasi Supabase tidak lengkap.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 1. Ambil semua profiles (bypass RLS jika pakai service_role) ──
    const { data: profiles, error: profilesErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('nama_lengkap', { ascending: true });

    if (profilesErr) {
      console.error('[GET /api/users] profiles error:', profilesErr);
      throw profilesErr;
    }

    // ── 2. Coba ambil daftar auth.users (hanya bisa jika pakai service_role) ──
    let authUsersMap: Record<string, { email: string; last_sign_in_at: string | null; created_at: string }> = {};

    if (serviceRoleKey) {
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
      if (!authErr && authData?.users) {
        authData.users.forEach((u) => {
          authUsersMap[u.id] = {
            email: u.email || '',
            last_sign_in_at: u.last_sign_in_at || null,
            created_at: u.created_at,
          };
        });
      }
    }

    // ── 3. Gabungkan data profiles dengan email dari auth ──
    const mergedUsers = (profiles || []).map((p: any) => {
      const authUser = authUsersMap[p.id];
      return {
        id: p.id,
        nama_lengkap: p.nama_lengkap || 'Pengguna Baru',
        email: authUser?.email || p.no_hp || '—',
        role: p.role === 'admin' ? 'Super Admin' 
            : p.role === 'pengasuh' ? 'Pengasuh' 
            : p.role === 'wali_santri' ? 'Wali Santri'
            : p.role,
        role_raw: p.role,
        status: authUser?.last_sign_in_at ? 'Aktif' : 'Belum Login',
        no_hp: p.no_hp || '—',
        created_at: p.created_at,
      };
    });

    // ── 4. Tambahkan auth users yang belum punya profile ──
    if (serviceRoleKey) {
      const profileIds = new Set((profiles || []).map((p: any) => p.id));
      Object.entries(authUsersMap).forEach(([uid, authUser]) => {
        if (!profileIds.has(uid)) {
          mergedUsers.push({
            id: uid,
            nama_lengkap: authUser.email?.split('@')[0] || 'User',
            email: authUser.email,
            role: 'Wali Santri',
            role_raw: 'wali_santri',
            status: authUser.last_sign_in_at ? 'Aktif' : 'Belum Login',
            no_hp: '—',
            created_at: authUser.created_at,
          });
        }
      });
    }

    return NextResponse.json({ users: mergedUsers });
  } catch (error: any) {
    console.error('[GET /api/users] Exception:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memuat daftar pengguna.' },
      { status: 500 }
    );
  }
}
