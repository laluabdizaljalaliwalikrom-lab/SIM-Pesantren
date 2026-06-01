'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase, requirePermission } from '@/utils/server-supabase';

export interface PermissionRow {
  feature: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface UpdateRolePermissionsResult {
  success: boolean;
  message: string;
  updatedCount?: number;
}

export async function updateRolePermissions(
  roleId: string,
  permissions: PermissionRow[]
): Promise<UpdateRolePermissionsResult> {
  if (!roleId || roleId.trim() === '') {
    return { success: false, message: 'Role ID tidak boleh kosong.' };
  }
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return { success: false, message: 'Data permissions tidak boleh kosong.' };
  }

  const VALID_FEATURES = [
    'Lembaga',
    'Santri',
    'Tahfidz',
    'Kepegawaian',
    'Keuangan',
    'Akademik',
    'Asrama',
    'Perizinan',
    'Pengaturan',
  ];
  for (const p of permissions) {
    if (!VALID_FEATURES.includes(p.feature)) {
      return {
        success: false,
        message: `Nama fitur tidak valid: "${p.feature}". Harus salah satu dari: ${VALID_FEATURES.join(', ')}.`,
      };
    }
  }

  const permCheck = await requirePermission('Pengaturan', 'edit');
  if (permCheck.error) {
    return { success: false, message: permCheck.error };
  }

  try {
    const supabase = await getServerSupabase();

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'update_role_permissions',
      {
        p_role_id:     roleId,
        p_permissions: permissions,
      }
    );

    if (rpcError) {
      console.error('[updateRolePermissions] RPC error:', rpcError);
      return {
        success: false,
        message: `Operasi database gagal: ${rpcError.message}`,
      };
    }

    const result = rpcResult as {
      success: boolean;
      message: string;
      updated_count?: number;
    };

    if (!result?.success) {
      return {
        success: false,
        message: result?.message ?? 'Gagal memperbarui hak akses.',
      };
    }

    revalidatePath('/settings/users');
    revalidatePath('/settings');

    return {
      success: true,
      message: result.message,
      updatedCount: result.updated_count ?? permissions.length,
    };
  } catch (err: any) {
    console.error('[updateRolePermissions] Exception:', err);
    return {
      success: false,
      message: err?.message ?? 'Terjadi kesalahan sistem yang tidak terduga.',
    };
  }
}
