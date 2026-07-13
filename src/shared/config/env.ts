/** Typed env access. Never put service_role keys here. */

/** Known bad typo seen in some Vercel env copies (DNS NXDOMAIN). */
const SUPABASE_URL_TYPO_HOST = 'lsvctdcynddfdncbvneq.supabase.co';
const SUPABASE_URL_CORRECT = 'https://lsvctdcydndfdncbvneq.supabase.co';

/**
 * Normalize project URL: trim, strip trailing slash, fix known typo host.
 * Does not invent a project — only repairs a documented mis-type.
 */
export function normalizeSupabaseUrl(raw: string): string {
  let url = (raw || '').trim().replace(/\/+$/, '');
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname === SUPABASE_URL_TYPO_HOST) {
      return SUPABASE_URL_CORRECT;
    }
    // Only allow https supabase.co hosts
    if (u.protocol !== 'https:') return '';
    if (!u.hostname.endsWith('.supabase.co')) return '';
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return '';
  }
}

export function getSupabaseConfig(): { url: string; anonKey: string } {
  const url = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL ?? '');
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey && !url.includes('your-project'));
}
