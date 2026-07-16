export async function register() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_RUNTIME === 'nodejs') {
    const { loadAllFromSupabase } = await import('./lib/supabase-sync');
    await loadAllFromSupabase();
  }
}
