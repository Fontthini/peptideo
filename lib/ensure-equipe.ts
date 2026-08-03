export async function ensureEquipe() {
  const g = global as Record<string, unknown>;
  if (!g.__equipe__ || (g.__equipe__ as unknown[]).length === 0) {
    try {
      const { loadAllFromSupabase } = await import('./supabase-sync');
      await loadAllFromSupabase();
    } catch {}
  }
}

// Usar em rotas de alto trafego (ex: registro de clique) que escrevem em
// config (cliques_cards, emails_*, etc.) — sem isso, uma instancia fria cujo
// cache de config ainda nao foi carregado do Supabase parte de um objeto
// padrao incompleto e, ao persistir, apaga os totais reais que so existiam
// no banco (ja aconteceu com cliques_cards). So recarrega se __config__
// ainda nao foi carregado nesta instancia — instancia quente nao paga esse custo.
export async function ensureConfig() {
  const g = global as Record<string, unknown>;
  if (!g.__config__) {
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
