import { supabase } from '@/lib/supabase';
import { RolePermission } from '@/types/database';

// Memory cache to avoid hitting Supabase on every single check (especially in middleware or client routes)
// Key: role_name_or_id, Value: Array of permissions with timestamp
interface CacheEntry {
  permissions: RolePermission[];
  timestamp: number;
}

const permissionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute TTL cache

/**
 * Fetch permissions for a specific role and cache the results
 * Works in both Server and Client contexts
 */
export async function getRolePermissions(roleIdOrName: string): Promise<RolePermission[]> {
  const now = Date.now();
  const cached = permissionCache.get(roleIdOrName);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.permissions;
  }

  try {
    let query = supabase.from('role_permissions').select('*');

    // Check if the input is a UUID or a Name string
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roleIdOrName);

    if (isUuid) {
      query = query.eq('id_role', roleIdOrName);
    } else {
      // Resolve by joining with app_roles name
      const { data: roleData, error: roleErr } = await supabase
        .from('app_roles')
        .select('id')
        .eq('name', roleIdOrName)
        .single();

      if (roleErr || !roleData) {
        // Fallback for default Enum roles
        let nameMatch = 'Wali Santri';
        if (roleIdOrName === 'admin') nameMatch = 'Super Admin';
        else if (roleIdOrName === 'pengasuh') nameMatch = 'Pengasuh';
        else if (roleIdOrName === 'wali_santri') nameMatch = 'Wali Santri';

        const { data: fallbackRole } = await supabase
          .from('app_roles')
          .select('id')
          .eq('name', nameMatch)
          .single();

        if (fallbackRole) {
          query = query.eq('id_role', fallbackRole.id);
        } else {
          return [];
        }
      } else {
        query = query.eq('id_role', roleData.id);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    const permissions = data || [];
    permissionCache.set(roleIdOrName, {
      permissions,
      timestamp: now
    });

    return permissions;
  } catch (err) {
    console.error('Error fetching role permissions:', err);
    return [];
  }
}

/**
 * Check if a role has permission for a specific feature and action
 * @param roleIdOrName User's role ID (UUID) or Role Name (e.g. 'Super Admin', 'admin', 'Pengasuh')
 * @param feature Name of the feature/module (e.g. 'Santri', 'Keuangan', 'Akademik')
 * @param action Access action type ('view' | 'create' | 'edit' | 'delete')
 */
export async function hasPermission(
  roleIdOrName: string,
  feature: 'Santri' | 'Keuangan' | 'Akademik' | string,
  action: 'view' | 'create' | 'edit' | 'delete'
): Promise<boolean> {
  // 1. Super Admin bypass (always has full access)
  if (roleIdOrName === 'Super Admin' || roleIdOrName === 'admin') {
    return true;
  }

  // 2. Fetch permissions from cache or database
  const permissions = await getRolePermissions(roleIdOrName);
  if (permissions.length === 0) return false;

  // 3. Find matching feature permission record
  const featurePerm = permissions.find(
    p => p.feature.toLowerCase() === feature.toLowerCase()
  );

  if (!featurePerm) return false;

  // 4. Return matching action boolean
  switch (action) {
    case 'view':
      return !!featurePerm.can_view;
    case 'create':
      return !!featurePerm.can_create;
    case 'edit':
      return !!featurePerm.can_edit;
    case 'delete':
      return !!featurePerm.can_delete;
    default:
      return false;
  }
}

/**
 * Clear the permissions cache (useful when permissions matrix is updated)
 */
export function clearPermissionCache() {
  permissionCache.clear();
}
