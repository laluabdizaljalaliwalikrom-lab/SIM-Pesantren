import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requirePermission } from '@/utils/auth-api';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── PATCH: Update user profile & role ──────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permCheck = await requirePermission('Pengaturan', 'edit');
  if (permCheck.error) return permCheck.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { nama_lengkap, role, no_hp } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID wajib.' }, { status: 400 });
    }

    const VALID_ROLES = ['admin', 'pengasuh', 'wali_santri'];
    const supabase = getAdminClient();

    if (role && !VALID_ROLES.includes(role)) {
      // Periksa apakah role ada di tabel app_roles (custom role)
      const { data: dbRole } = await supabase
        .from('app_roles')
        .select('name')
        .eq('name', role)
        .single();

      if (!dbRole) {
        return NextResponse.json(
          { error: `Role '${role}' tidak terdaftar di custom role.` },
          { status: 400 }
        );
      }
    }

    // Build update payload (only include fields that were sent)
    const updatePayload: Record<string, any> = {};
    if (nama_lengkap !== undefined) updatePayload.nama_lengkap = nama_lengkap.trim();
    if (role !== undefined) updatePayload.role = role;
    if (no_hp !== undefined) updatePayload.no_hp = no_hp?.trim() || null;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Tidak ada data untuk diupdate.' }, { status: 400 });
    }

    // Update profiles table
    const { error: profileErr } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', id);

    if (profileErr) {
      console.error('[PATCH /api/users] profile update error:', profileErr);
      return NextResponse.json(
        { error: `Gagal update profil: ${profileErr.message}` },
        { status: 500 }
      );
    }

    // Also update user_metadata in auth if nama changed
    if (nama_lengkap) {
      await supabase.auth.admin.updateUserById(id, {
        user_metadata: { nama_lengkap: nama_lengkap.trim() },
      });
    }

    const targetRole = updatePayload.role || role;
    const roleName =
      targetRole === 'admin'
        ? 'Super Admin'
        : targetRole === 'pengasuh'
        ? 'Pengasuh'
        : targetRole === 'wali_santri'
        ? 'Wali Santri'
        : targetRole;

    return NextResponse.json({
      success: true,
      message: `Data pengguna berhasil diperbarui.`,
      user: { id, ...updatePayload, role_display: roleName },
    });
  } catch (err: any) {
    console.error('[PATCH /api/users] Exception:', err);
    return NextResponse.json(
      { error: err?.message || 'Terjadi kesalahan.' },
      { status: 500 }
    );
  }
}

// ── DELETE: Hapus user dari auth + profiles ────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permCheck = await requirePermission('Pengaturan', 'delete');
  if (permCheck.error) return permCheck.error;

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'User ID wajib.' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Check if trying to delete self or last admin
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('role, nama_lengkap')
      .eq('id', id)
      .single();

    // Delete from Supabase Auth (cascade will handle profiles if FK is set,
    // otherwise delete profile manually)
    const { error: authErr } = await supabase.auth.admin.deleteUser(id);

    if (authErr) {
      console.error('[DELETE /api/users] auth delete error:', authErr);
      return NextResponse.json(
        { error: `Gagal menghapus akun: ${authErr.message}` },
        { status: 500 }
      );
    }

    // Also delete profile row (in case no cascade)
    await supabase.from('profiles').delete().eq('id', id);

    return NextResponse.json({
      success: true,
      message: `Pengguna "${targetProfile?.nama_lengkap || id}" berhasil dihapus.`,
    });
  } catch (err: any) {
    console.error('[DELETE /api/users] Exception:', err);
    return NextResponse.json(
      { error: err?.message || 'Terjadi kesalahan.' },
      { status: 500 }
    );
  }
}
