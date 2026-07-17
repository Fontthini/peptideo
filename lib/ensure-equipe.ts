export async function ensureEquipe() {
  const g = global as Record<string, unknown>;
  if (!g.__equipe__ || (g.__equipe__ as unknown[]).length === 0) {
    try {
      const { loadAllFromSupabase } = await import('./supabase-sync');
      await loadAllFromSupabase();
    } catch {}
  }
}

// Sempre recarrega do Supabase — usar em rotas que exibem dados dinâmicos
export async function reloadFromSupabase() {
  try {
    const { loadAllFromSupabase } = await import('./supabase-sync');
    await loadAllFromSupabase();
  } catch {}
}
