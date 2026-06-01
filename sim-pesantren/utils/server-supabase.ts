import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
}

export async function requireServerUser() {
  const supabase = await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { user: null, error: 'Sesi tidak valid. Silakan login ulang.' };
  return { user: { id: user.id, email: user.email }, error: null };
}

/**
 * Check permission based on the custom role-permission matrix.
 * Super Admin (profile.role === 'admin') always bypasses.
 * Non-admin roles are checked against the role_permissions table.
 */
export async function requirePermission(
  feature: string,
  action: 'view' | 'create' | 'edit' | 'delete'
) {
  const supabase = await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Sesi tidak valid. Silakan login ulang.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) return { error: 'Profil tidak ditemukan.' };

  // Super Admin bypass — has full access to everything
  if (profile.role === 'admin') return { error: null };

  // Map profiles.role enum to app_roles.name
  const roleNameMap: Record<string, string> = {
    pengasuh: 'Pengasuh',
    wali_santri: 'Wali Santri',
  };
  const roleName = roleNameMap[profile.role] || profile.role;

  // Look up the role in app_roles
  const { data: roleData } = await supabase
    .from('app_roles')
    .select('id')
    .eq('name', roleName)
    .single();

  if (!roleData) return { error: `Role ${roleName} tidak ditemukan dalam sistem.` };

  // Check permission for the specific feature and action
  const { data: permData } = await supabase
    .from('role_permissions')
    .select('can_view, can_create, can_edit, can_delete')
    .eq('id_role', roleData.id)
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
}

export async function requireServerAdmin() {
  const supabase = await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Sesi tidak valid. Silakan login ulang.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') return { error: 'Akses ditolak. Hanya admin.' };

  return { error: null };
}
