/**
 * Supabase sync layer.
 * Loads all data from Supabase into global memory on startup,
 * and provides async functions to write back.
 */
import { supabase } from './supabase-client';
import type { Cadastro, ProdutoMemory, Config, BannerItem, Artigo, MembroEquipe, Pedido, Indicacao, AdminLog } from './db-memory';

// ── Config ──────────────────────────────────────────────────────────────────

function rowToConfig(row: Record<string, unknown>): Config {
  return {
    mercadopago_token: (row.mercadopago_token as string) || '',
    resend_api_key: (row.resend_api_key as string) || '',
    whatsapp_numero: (row.whatsapp_numero as string) || '5511999999999',
    base_url: (row.base_url as string) || 'http://localhost:3000',
    banner_titulo: (row.banner_titulo as string) || '',
    banner_subtitulo: (row.banner_subtitulo as string) || '',
    banner_imagem: (row.banner_imagem as string) || '',
    logo: (row.logo as string) || '',
    corPrimaria: (row.cor_primaria as string) || '#111827',
    corAcento: (row.cor_acento as string) || '#16a34a',
    roundRobinIdx: (row.round_robin_idx as number) || 0,
    emails_enviados_hoje: (row.emails_enviados_hoje as number) || 0,
    emails_dia_referencia: (row.emails_dia_referencia as string) || '',
    emails_enviados_mes: (row.emails_enviados_mes as number) || 0,
    emails_mes_referencia: (row.emails_mes_referencia as string) || '',
    limite_emails_dia: (row.limite_emails_dia as number) || 100,
    limite_emails_mes: (row.limite_emails_mes as number) || 3000,
    cliques_cards: (row.cliques_cards as Record<string, number>) || {},
  };
}

function configToRow(cfg: Config) {
  return {
    id: 1,
    mercadopago_token: cfg.mercadopago_token || '',
    resend_api_key: cfg.resend_api_key || '',
    whatsapp_numero: cfg.whatsapp_numero || '5511999999999',
    base_url: cfg.base_url || '',
    banner_titulo: cfg.banner_titulo || '',
    banner_subtitulo: cfg.banner_subtitulo || '',
    banner_imagem: cfg.banner_imagem || '',
    logo: cfg.logo || '',
    cor_primaria: cfg.corPrimaria || '#111827',
    cor_acento: cfg.corAcento || '#16a34a',
    round_robin_idx: cfg.roundRobinIdx || 0,
    emails_enviados_hoje: cfg.emails_enviados_hoje || 0,
    emails_dia_referencia: cfg.emails_dia_referencia || '',
    emails_enviados_mes: cfg.emails_enviados_mes || 0,
    emails_mes_referencia: cfg.emails_mes_referencia || '',
    limite_emails_dia: cfg.limite_emails_dia || 100,
    limite_emails_mes: cfg.limite_emails_mes || 3000,
    cliques_cards: cfg.cliques_cards || {},
  };
}

export async function sbSaveConfig(cfg: Config) {
  await supabase.from('config').upsert(configToRow(cfg));
}

// ── Cadastros ───────────────────────────────────────────────────────────────

export async function sbSaveCadastro(c: Cadastro) {
  const { error } = await supabase.from('cadastros').upsert({
    id: c.id, nome: c.nome, sobrenome: c.sobrenome || '',
    email: c.email, whatsapp: c.whatsapp, endereco: c.endereco || '',
    crm: c.crm || '', onde_conheceu: c.onde_conheceu || '',
    status: c.status, token: c.token,
    vendedor_id: c.vendedor_id || '', solicitacao: c.solicitacao || '',
    motivo_rejeicao: c.motivo_rejeicao || '', obs: c.obs || '',
    created_at: c.created_at,
    last_seen_loja: c.last_seen_loja || null, last_seen_blog: c.last_seen_blog || null,
  });
  if (error) throw new Error(`sbSaveCadastro: ${error.message} (${error.code})`);
}

export async function sbDeleteCadastro(id: string) {
  const { error } = await supabase.from('cadastros').delete().eq('id', id);
  if (error) throw new Error(`sbDeleteCadastro: ${error.message} (${error.code})`);
}

// ── Produtos ────────────────────────────────────────────────────────────────

export async function sbSaveProduto(p: ProdutoMemory) {
  const { error } = await supabase.from('produtos').upsert({
    id: p.id, nome: p.nome, dose: p.dose || '', preco: p.preco,
    categoria: p.categoria || '', categoria2: p.categoria2 || null, descricao: p.descricao || '',
    imagem: p.imagem || '', video: p.video || '',
    galeria: p.galeria || [], created_at: p.created_at,
    views: p.views || 0, cart_adds: p.cart_adds || 0,
  });
  if (error) throw new Error(`sbSaveProduto: ${error.message} (${error.code})`);
}

export async function sbSaveProdutos(produtos: ProdutoMemory[]) {
  if (!produtos.length) return;
  await supabase.from('produtos').upsert(produtos.map(p => ({
    id: p.id, nome: p.nome, dose: p.dose || '', preco: p.preco,
    categoria: p.categoria || '', categoria2: p.categoria2 || null, descricao: p.descricao || '',
    imagem: p.imagem || '', video: p.video || '',
    galeria: p.galeria || [], created_at: p.created_at,
    views: p.views || 0, cart_adds: p.cart_adds || 0,
  })));
}

export async function sbDeleteProduto(id: string) {
  await supabase.from('produtos').delete().eq('id', id);
}

// ── Banners ─────────────────────────────────────────────────────────────────

export async function sbSaveBanners(banners: BannerItem[], table: 'banners' | 'banners_blog') {
  await supabase.from(table).upsert(banners.map(b => ({
    id: b.id, titulo: b.titulo || '', subtitulo: b.subtitulo || '',
    imagem: b.imagem, link: '', ativo: b.ativo, ordem: b.ordem,
    created_at: b.created_at,
  })));
}

export async function sbDeleteBanner(id: string, table: 'banners' | 'banners_blog') {
  await supabase.from(table).delete().eq('id', id);
}

// ── Artigos ─────────────────────────────────────────────────────────────────

export async function sbSaveArtigo(a: Artigo) {
  const { error } = await supabase.from('artigos').upsert({
    id: a.id, titulo: a.titulo, conteudo: a.conteudo || '',
    imagem: a.imagem || '', video: a.video || '',
    categoria: a.categoria || '', materiais: a.materiais || [],
    publicado: a.publicado, created_at: a.created_at, updated_at: a.updated_at,
  });
  if (error) throw new Error(`sbSaveArtigo: ${error.message} (${error.code})`);
}

export async function sbDeleteArtigo(id: string) {
  const { error } = await supabase.from('artigos').delete().eq('id', id);
  if (error) throw new Error(`sbDeleteArtigo: ${error.message} (${error.code})`);
}

// ── Equipe ───────────────────────────────────────────────────────────────────

export async function sbSaveMembro(m: MembroEquipe) {
  const { error } = await supabase.from('equipe').upsert({
    id: m.id, nome: m.nome, email: m.email, cargo: m.cargo,
    token: m.token_acesso || m.id,
    senha: m.senha || null,
    ativo: m.ativo, created_at: m.created_at,
    last_seen: m.last_seen || null,
  });
  if (error) throw new Error(`sbSaveMembro: ${error.message} (${error.code})`);
}

export async function sbDeleteMembro(id: string) {
  await supabase.from('equipe').delete().eq('id', id);
}

// ── Log de atividade admin ────────────────────────────────────────────────

export async function sbSaveLog(log: AdminLog) {
  const { error } = await supabase.from('admin_logs').insert({
    id: log.id, ator: log.ator, acao: log.acao, detalhe: log.detalhe || null, created_at: log.created_at,
  });
  if (error) throw new Error(`sbSaveLog: ${error.message} (${error.code})`);
}

export async function sbListarLogs(): Promise<AdminLog[]> {
  const { data, error } = await supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw new Error(`sbListarLogs: ${error.message} (${error.code})`);
  return (data || []) as AdminLog[];
}

// ── Pedidos ─────────────────────────────────────────────────────────────────

export async function sbSavePedido(p: Pedido) {
  const { error } = await supabase.from('pedidos').upsert({
    id: p.id, cadastro_id: p.cadastro_id,
    vendedor_id: p.vendedor_id || '',
    itens: p.itens || [{ nome: p.produto_nome, preco: p.preco, quantidade: 1 }],
    preco: p.preco, status: p.status, obs: p.obs || '',
    created_at: p.created_at,
  });
  if (error) throw new Error(`sbSavePedido: ${error.message} (${error.code})`);
}

export async function sbDeletePedido(id: string) {
  const { error } = await supabase.from('pedidos').delete().eq('id', id);
  if (error) throw new Error(`sbDeletePedido: ${error.message} (${error.code})`);
}

// ── Indicações ──────────────────────────────────────────────────────────────

export async function sbSaveIndicacao(i: Indicacao) {
  const { error } = await supabase.from('indicacoes').upsert({
    id: i.id, medico_id: i.medico_id, medico_nome: i.medico_nome,
    nome: i.nome, sobrenome: i.sobrenome || '', whatsapp: i.whatsapp,
    email: i.email || '', endereco: i.endereco || '',
    status: i.status, obs: i.obs || '', created_at: i.created_at,
    tipo: i.tipo || 'paciente', crm: i.crm || '',
  });
  if (error) throw new Error(`sbSaveIndicacao: ${error.message} (${error.code})`);
}

export async function sbDeleteIndicacao(id: string) {
  const { error } = await supabase.from('indicacoes').delete().eq('id', id);
  if (error) throw new Error(`sbDeleteIndicacao: ${error.message} (${error.code})`);
}

// ── Categorias ───────────────────────────────────────────────────────────────

export async function sbSaveCategorias(nomes: string[]) {
  if (!nomes.length) return;
  await supabase.from('categorias').upsert(nomes.map(nome => ({ nome })));
}

export async function sbDeleteCategoria(nome: string) {
  await supabase.from('categorias').delete().eq('nome', nome);
}

export async function sbSaveCategoriasBlog(nomes: string[]) {
  if (!nomes.length) return;
  await supabase.from('categorias_blog').upsert(nomes.map(nome => ({ nome })));
}

export async function sbDeleteCategoriaBlog(nome: string) {
  await supabase.from('categorias_blog').delete().eq('nome', nome);
}

// ── Load all from Supabase ───────────────────────────────────────────────────

export async function loadAllFromSupabase() {
  try {
    const [
      { data: cadastros, error: cadErr },
      { data: produtos },
      { data: configRow },
      { data: banners },
      { data: bannersBlog },
      { data: artigos },
      { data: equipe },
      { data: categorias },
      { data: categoriasBlog },
      { data: pedidos },
      { data: indicacoes },
    ] = await Promise.all([
      supabase.from('cadastros').select('*').order('created_at', { ascending: false }),
      supabase.from('produtos').select('*').order('created_at', { ascending: true }),
      supabase.from('config').select('*').eq('id', 1).maybeSingle(),
      supabase.from('banners').select('*').order('ordem', { ascending: true }),
      supabase.from('banners_blog').select('*').order('ordem', { ascending: true }),
      supabase.from('artigos').select('*').order('created_at', { ascending: false }),
      supabase.from('equipe').select('*').order('created_at', { ascending: true }),
      supabase.from('categorias').select('nome'),
      supabase.from('categorias_blog').select('nome'),
      supabase.from('pedidos').select('*').order('created_at', { ascending: false }),
      supabase.from('indicacoes').select('*').order('created_at', { ascending: false }),
    ]);

    if (cadastros) global.__cadastros__ = cadastros as Cadastro[];
    if (produtos) global.__produtos__ = produtos as ProdutoMemory[];
    if (configRow) global.__config__ = rowToConfig(configRow as Record<string, unknown>);
    if (banners && banners.length > 0) global.__banners__ = banners.map(b => ({ ...b, created_at: b.created_at || new Date().toISOString() })) as BannerItem[];
    if (bannersBlog && bannersBlog.length > 0) global.__banners_blog__ = bannersBlog.map(b => ({ ...b, created_at: b.created_at || new Date().toISOString() })) as BannerItem[];
    if (artigos) global.__artigos__ = artigos as Artigo[];
    if (equipe && equipe.length > 0) global.__equipe__ = equipe.map((m: Record<string, unknown>) => ({
      ...m, token_acesso: m.token as string, senha: m.senha as string | undefined,
    })) as MembroEquipe[];
    if (categorias) global.__categorias__ = categorias.map((c: { nome: string }) => c.nome);
    if (categoriasBlog) global.__categorias_blog__ = categoriasBlog.map((c: { nome: string }) => c.nome);
    if (pedidos) global.__pedidos__ = pedidos.map((p: Record<string, unknown>) => {
      const cad = (cadastros as Cadastro[] | null)?.find(c => c.id === p.cadastro_id);
      return {
        ...p,
        cadastro_nome: cad ? `${cad.nome} ${cad.sobrenome || ''}`.trim() : (p.cadastro_nome as string || ''),
        cadastro_email: cad ? cad.email : (p.cadastro_email as string || ''),
        cadastro_whatsapp: cad ? cad.whatsapp : (p.cadastro_whatsapp as string || ''),
        produto_nome: Array.isArray(p.itens) && p.itens.length ? (p.itens[0] as { nome: string }).nome : '',
      };
    }) as Pedido[];
    if (indicacoes) global.__indicacoes__ = indicacoes as Indicacao[];

    if (cadErr) console.error('[SUPABASE] Erro na leitura (cadastros):', cadErr.message);
    else console.log('[SUPABASE] Dados carregados com sucesso');
  } catch (err) {
    console.error('[SUPABASE] Erro ao carregar dados:', err);
  }
}
