/** Typed env access. Never put service_role keys here. */
export function getSupabaseConfig(): { url: string; anonKey: string } {
  const url = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey && !url.includes('your-project'));
}
