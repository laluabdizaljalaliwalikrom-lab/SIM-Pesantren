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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permCheck = await requirePermission('Pengaturan', 'edit');
  if (permCheck.error) return permCheck.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { nama_lengkap, id_role, no_hp } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID wajib.' }, { status: 400 });
    }

    const supabase = getAdminClient();

    let resolvedRoleName: string | undefined;

    if (id_role !== undefined) {
      if (id_role === null) {
        return NextResponse.json(
          { error: 'Role tidak boleh dikosongkan.' },
          { status: 400 }
        );
      }
      const { data: roleRow } = await supabase
        .from('app_roles')
        .select('name')
        .eq('id', id_role)
        .single();

      if (!roleRow) {
        return NextResponse.json(
          { error: 'ID Role tidak ditemukan di app_roles.' },
          { status: 400 }
        );
      }
      resolvedRoleName = roleRow.name;
    }

    const updatePayload: Record<string, any> = {};
    if (nama_lengkap !== undefined) updatePayload.nama_lengkap = nama_lengkap.trim();
    if (id_role !== undefined) {
      updatePayload.id_role = id_role;
      if (resolvedRoleName) updatePayload.role = resolvedRoleName;
    }
    if (no_hp !== undefined) updatePayload.no_hp = no_hp?.trim() || null;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Tidak ada data untuk diupdate.' }, { status: 400 });
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', id);

    if (profileErr) {
      return NextResponse.json(
        { error: `Gagal update profil: ${profileErr.message}` },
        { status: 500 }
      );
    }

    if (nama_lengkap) {
      await supabase.auth.admin.updateUserById(id, {
        user_metadata: { nama_lengkap: nama_lengkap.trim() },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Data pengguna berhasil diperbarui.',
      user: { id, ...updatePayload },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Terjadi kesalahan.' },
      { status: 500 }
    );
  }
}

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

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('role, nama_lengkap')
      .eq('id', id)
      .single();

    const { error: authErr } = await supabase.auth.admin.deleteUser(id);
    if (authErr) {
      return NextResponse.json(
        { error: `Gagal menghapus akun: ${authErr.message}` },
        { status: 500 }
      );
    }

    await supabase.from('profiles').delete().eq('id', id);

    return NextResponse.json({
      success: true,
      message: `Pengguna "${targetProfile?.nama_lengkap || id}" berhasil dihapus.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Terjadi kesalahan.' },
      { status: 500 }
    );
  }
}
