import { getSupabase } from '../supabase/client';
import type { AdminRole } from './types';

const KNOWN_ROLES = new Set<AdminRole>(['owner', 'admin']);

function normalizeRole(raw: unknown): AdminRole | null {
  if (typeof raw !== 'string') return null;
  const role = raw.trim().toLowerCase() as AdminRole;
  return KNOWN_ROLES.has(role) ? role : null;
}

/**
 * Look up admin role for the signed-in auth user_id only.
 * Never uses nickname/email. Fail closed on any error / offline.
 */
export async function fetchAdminRole(userId: string): Promise<AdminRole | null> {
  if (!userId) return null;
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('admin_users')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return normalizeRole(data.role);
  } catch {
    return null;
  }
}
