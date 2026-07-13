import { describe, expect, it } from 'vitest';
import { normalizeSupabaseUrl } from './env';

describe('normalizeSupabaseUrl', () => {
  it('trims and strips trailing slash', () => {
    expect(normalizeSupabaseUrl(' https://lsvctdcydndfdncbvneq.supabase.co/ ')).toBe(
      'https://lsvctdcydndfdncbvneq.supabase.co',
    );
  });

  it('fixes known typo host', () => {
    expect(normalizeSupabaseUrl('https://lsvctdcynddfdncbvneq.supabase.co')).toBe(
      'https://lsvctdcydndfdncbvneq.supabase.co',
    );
  });

  it('rejects non-https or non-supabase hosts', () => {
    expect(normalizeSupabaseUrl('http://lsvctdcydndfdncbvneq.supabase.co')).toBe('');
    expect(normalizeSupabaseUrl('https://evil.example.com')).toBe('');
    expect(normalizeSupabaseUrl('not-a-url')).toBe('');
  });
});
