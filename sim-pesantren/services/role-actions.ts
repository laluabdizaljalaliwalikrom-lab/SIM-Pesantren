'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

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

// --------------------------------------------------------------------------
// Helper: create a server-side Supabase client that reads the session cookie
// --------------------------------------------------------------------------

async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored when called from read-only Server Components
          }
        },
      },
    }
  );
}

// --------------------------------------------------------------------------
// Server Action: updateRolePermissions
//
// Strategy: DELETE-then-INSERT wrapped in a single PostgreSQL transaction
// via the `update_role_permissions` RPC function. If the INSERT step fails
// for any reason, PostgreSQL automatically rolls back the DELETE so no data
// is ever lost. The RPC also enforces a server-side guard against modifying
// the Super Admin role.
//
// Params:
//   roleId      — UUID of the app_role to update
//   permissions — full CRUD permission array for every module
// --------------------------------------------------------------------------

export async function updateRolePermissions(
  roleId: string,
  permissions: PermissionRow[]
): Promise<UpdateRolePermissionsResult> {
  // ---- Input validation ----
  if (!roleId || roleId.trim() === '') {
    return { success: false, message: 'Role ID tidak boleh kosong.' };
  }
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return { success: false, message: 'Data permissions tidak boleh kosong.' };
  }

  // Validate each permission row
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

  try {
    const supabase = await getServerSupabase();

    // ---- Auth check: hanya admin yang boleh mengubah permissions ----
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: 'Sesi tidak valid. Silakan login ulang.',
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return {
        success: false,
        message: 'Akses ditolak. Hanya admin yang dapat mengubah hak akses.',
      };
    }

    // ---- Call the transactional RPC ----
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'update_role_permissions',
      {
        p_role_id:     roleId,
        p_permissions: permissions, // Supabase JS driver serialises to JSONB
      }
    );

    if (rpcError) {
      console.error('[updateRolePermissions] RPC error:', rpcError);
      return {
        success: false,
        message: `Operasi database gagal: ${rpcError.message}`,
      };
    }

    // The RPC returns a JSONB object
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

    // ---- Revalidate cache so pages reflect the change immediately ----
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
