import { describe, expect, it, vi, beforeEach } from 'vitest';

const getSupabase = vi.fn();

vi.mock('../supabase/client', () => ({
  getSupabase: () => getSupabase(),
}));

import { fetchAdminRole } from './admin';

function mockQuery(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  getSupabase.mockReturnValue({ from });
  return { from, select, eq, maybeSingle };
}

describe('fetchAdminRole', () => {
  beforeEach(() => {
    getSupabase.mockReset();
  });

  it('returns null when userId is empty', async () => {
    expect(await fetchAdminRole('')).toBeNull();
    expect(getSupabase).not.toHaveBeenCalled();
  });

  it('returns null when Supabase is offline', async () => {
    getSupabase.mockReturnValue(null);
    expect(await fetchAdminRole('user-1')).toBeNull();
  });

  it('returns owner for matching row', async () => {
    const q = mockQuery({ data: { role: 'owner' }, error: null });
    expect(await fetchAdminRole('user-1')).toBe('owner');
    expect(q.from).toHaveBeenCalledWith('admin_users');
    expect(q.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('normalizes Admin role casing', async () => {
    mockQuery({ data: { role: 'Admin' }, error: null });
    expect(await fetchAdminRole('user-1')).toBe('admin');
  });

  it('returns null when no row', async () => {
    mockQuery({ data: null, error: null });
    expect(await fetchAdminRole('user-1')).toBeNull();
  });

  it('returns null on query error (fail closed)', async () => {
    mockQuery({ data: null, error: { message: 'boom' } });
    expect(await fetchAdminRole('user-1')).toBeNull();
  });

  it('returns null for unknown roles', async () => {
    mockQuery({ data: { role: 'superuser' }, error: null });
    expect(await fetchAdminRole('user-1')).toBeNull();
  });

  it('returns null when client throws', async () => {
    getSupabase.mockReturnValue({
      from: () => {
        throw new Error('network');
      },
    });
    expect(await fetchAdminRole('user-1')).toBeNull();
  });
});
