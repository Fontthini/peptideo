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

// Garante que cadastros já foi carregado ao menos uma vez nesta instância —
// usar em rotas que só editam UM campo de um registro já existente (mover
// no funil, tag, transferir consultor). Nao precisa de dado fresquíssimo
// porque a escrita altera só o campo próprio, nunca sobrescreve o resto do
// registro — então uma instância quente não paga o custo de recarregar a
// cada clique.
export async function ensureCadastros() {
  const g = global as Record<string, unknown>;
  if (!g.__cadastros__ || (g.__cadastros__ as unknown[]).length === 0) {
    try { const { reloadCadastros } = await import('./supabase-sync'); await reloadCadastros(); } catch {}
  }
}

// Mesma lógica para indicações: usar nas rotas que só editam um registro
// já existente (mudar status, lançar comissão) — o valor final vem inteiro
// do corpo da requisição, só precisa achar o registro no cache local.
export async function ensureIndicacoes() {
  const g = global as Record<string, unknown>;
  if (!g.__indicacoes__ || (g.__indicacoes__ as unknown[]).length === 0) {
    try { const { reloadIndicacoes } = await import('./supabase-sync'); await reloadIndicacoes(); } catch {}
  }
}

export async function ensurePedidos() {
  const g = global as Record<string, unknown>;
  if (!g.__pedidos__ || (g.__pedidos__ as unknown[]).length === 0) {
    try { const { reloadPedidos } = await import('./supabase-sync'); await reloadPedidos(); } catch {}
  }
}

// Reloads pontuais — usar nas rotas que só leem/escrevem uma tabela (a
// maioria do CRM), pra não pagar o custo de recarregar as outras 10 tabelas
// a cada clique. Ver comentário em lib/supabase-sync.ts.
export async function reloadCadastros() {
  try { const { reloadCadastros } = await import('./supabase-sync'); await reloadCadastros(); } catch {}
}
export async function reloadIndicacoes() {
  try { const { reloadIndicacoes } = await import('./supabase-sync'); await reloadIndicacoes(); } catch {}
}
export async function reloadPedidos() {
  try { const { reloadPedidos } = await import('./supabase-sync'); await reloadPedidos(); } catch {}
}
export async function reloadEquipe() {
  try { const { reloadEquipe } = await import('./supabase-sync'); await reloadEquipe(); } catch {}
}
export async function reloadProdutos() {
  try { const { reloadProdutos } = await import('./supabase-sync'); await reloadProdutos(); } catch {}
}
