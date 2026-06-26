import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface AuthResult {
  error: NextResponse | null;
  user: { id: string; email?: string } | null;
}

async function createSupabase() {
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

export async function getServerUser(): Promise<AuthResult> {
  const supabase = await createSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized. Silakan login.' }, { status: 401 }), user: null };
  }
  return { error: null, user: { id: user.id, email: user.email } };
}

export async function requirePermission(
  feature: string,
  action: 'view' | 'create' | 'edit' | 'delete'
): Promise<AuthResult> {
  const supabase = await createSupabase();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized. Silakan login.' }, { status: 401 }), user: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id_role, role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return { error: NextResponse.json({ error: 'Profil tidak ditemukan.' }, { status: 403 }), user: null };
  }

  // Super Admin bypass
  if (profile.role === 'Super Admin') {
    return { error: null, user: { id: user.id, email: user.email } };
  }

  if (!profile.id_role) {
    return { error: NextResponse.json({ error: 'Role pengguna belum ditetapkan.' }, { status: 403 }), user: null };
  }

  const { data: permData } = await supabase
    .from('role_permissions')
    .select('can_view, can_create, can_edit, can_delete')
    .eq('id_role', profile.id_role)
    .eq('feature', feature)
    .maybeSingle();

  if (!permData) {
    return { error: NextResponse.json({ error: `Anda tidak memiliki akses ke fitur ${feature}.` }, { status: 403 }), user: null };
  }

  const columnMap: Record<string, keyof typeof permData> = {
    view: 'can_view',
    create: 'can_create',
    edit: 'can_edit',
    delete: 'can_delete',
  };

  const column = columnMap[action];
  if (!permData[column]) {
    return { error: NextResponse.json({ error: `Anda tidak memiliki izin ${action} pada fitur ${feature}.` }, { status: 403 }), user: null };
  }

  return { error: null, user: { id: user.id, email: user.email } };
}

export async function requireAdmin(): Promise<AuthResult> {
  const supabase = await createSupabase();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized. Silakan login.' }, { status: 401 }), user: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'Super Admin') {
    return { error: NextResponse.json({ error: 'Akses ditolak. Hanya admin.' }, { status: 403 }), user: null };
  }

  return { error: null, user: { id: user.id, email: user.email } };
}
