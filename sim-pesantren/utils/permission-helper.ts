import { supabase } from '@/lib/supabase';
import { RolePermission } from '@/types/database';

interface CacheEntry {
  permissions: RolePermission[];
  timestamp: number;
}

const permissionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

/**
 * Fetch permissions for a specific role and cache the results.
 * Accepts role UUID (id_role) or role name.
 */
export async function getRolePermissions(roleIdOrName: string): Promise<RolePermission[]> {
  const now = Date.now();
  const cached = permissionCache.get(roleIdOrName);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.permissions;
  }

  try {
    let query = supabase.from('role_permissions').select('*');
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roleIdOrName);

    if (isUuid) {
      query = query.eq('id_role', roleIdOrName);
    } else {
      const { data: roleData } = await supabase
        .from('app_roles')
        .select('id')
        .eq('name', roleIdOrName)
        .single();

      if (!roleData) return [];
      query = query.eq('id_role', roleData.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    const permissions = data || [];
    permissionCache.set(roleIdOrName, { permissions, timestamp: now });
    return permissions;
  } catch (err) {
    console.error('Error fetching role permissions:', err);
    return [];
  }
}

/**
 * Check if a role has permission for a specific feature and action.
 * @param roleIdOrName Role UUID (id_role) or role name (e.g. 'Super Admin')
 * @param feature Feature/module name
 */
export async function hasPermission(
  roleIdOrName: string,
  feature: string,
  action: 'view' | 'create' | 'edit' | 'delete'
): Promise<boolean> {
  if (roleIdOrName === 'Super Admin') return true;

  const permissions = await getRolePermissions(roleIdOrName);
  if (permissions.length === 0) return false;

  const featurePerm = permissions.find(
    p => p.feature.toLowerCase() === feature.toLowerCase()
  );

  if (!featurePerm) return false;

  switch (action) {
    case 'view':   return !!featurePerm.can_view;
    case 'create': return !!featurePerm.can_create;
    case 'edit':   return !!featurePerm.can_edit;
    case 'delete': return !!featurePerm.can_delete;
    default:       return false;
  }
}

export function clearPermissionCache() {
  permissionCache.clear();
}
