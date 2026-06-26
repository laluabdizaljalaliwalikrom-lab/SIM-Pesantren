import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function getServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in read-only contexts (e.g. during static generation)
          }
        },
      },
    }
  );
}

export async function requireServerUser() {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { user: null, error: 'Sesi tidak valid. Silakan login ulang.' };
    return { user: { id: user.id, email: user.email }, error: null };
  } catch (e: any) {
    return { user: null, error: e?.message || 'Gagal memverifikasi sesi.' };
  }
}

/**
 * Check permission based on the custom role-permission matrix.
 * Super Admin (profile.id_role maps to 'Super Admin') always bypasses.
 * Non-admin roles are checked against the role_permissions table via id_role.
 */
export async function requirePermission(
  feature: string,
  action: 'view' | 'create' | 'edit' | 'delete'
) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Sesi tidak valid. Silakan login ulang.' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id_role, role')
      .eq('id', user.id)
      .single();

    if (!profile) return { error: 'Profil tidak ditemukan.' };

    if (profile.role === 'Super Admin') return { error: null };

    if (!profile.id_role) return { error: 'Role pengguna belum ditetapkan.' };

    const { data: permData } = await supabase
      .from('role_permissions')
      .select('can_view, can_create, can_edit, can_delete')
      .eq('id_role', profile.id_role)
      .eq('feature', feature)
      .maybeSingle();

    if (!permData) return { error: `Anda tidak memiliki akses ke fitur ${feature}.` };

    const columnMap: Record<string, keyof typeof permData> = {
      view: 'can_view',
      create: 'can_create',
      edit: 'can_edit',
      delete: 'can_delete',
    };

    const column = columnMap[action];
    if (!permData[column]) {
      return { error: `Anda tidak memiliki izin ${action} pada fitur ${feature}.` };
    }

    return { error: null };
  } catch (e: any) {
    return { error: e?.message || 'Terjadi kesalahan saat memeriksa izin.' };
  }
}

// DEPRECATED — use requirePermission() instead
// export async function requireServerAdmin() { ... }
