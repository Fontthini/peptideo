/**
 * Supabase sync layer.
 * Loads all data from Supabase into global memory on startup,
 * and provides async functions to write back.
 */
import { supabase } from './supabase-client';
import type { Cadastro, ProdutoMemory, Config, BannerItem, Artigo, MembroEquipe, Pedido } from './db-memory';

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
  };
}

export async function sbSaveConfig(cfg: Config) {
  await supabase.from('config').upsert(configToRow(cfg));
}

// ── Cadastros ───────────────────────────────────────────────────────────────

export async function sbSaveCadastro(c: Cadastro) {
  await supabase.from('cadastros').upsert({
    id: c.id, nome: c.nome, sobrenome: c.sobrenome || '',
    email: c.email, whatsapp: c.whatsapp, endereco: c.endereco || '',
    crm: c.crm || '', onde_conheceu: c.onde_conheceu || '',
    status: c.status, token: c.token,
    vendedor_id: c.vendedor_id || '', solicitacao: c.solicitacao || '',
    motivo_rejeicao: c.motivo_rejeicao || '', obs: c.obs || '',
    created_at: c.created_at,
  });
}

export async function sbDeleteCadastro(id: string) {
  await supabase.from('cadastros').delete().eq('id', id);
}

// ── Produtos ────────────────────────────────────────────────────────────────

export async function sbSaveProduto(p: ProdutoMemory) {
  await supabase.from('produtos').upsert({
    id: p.id, nome: p.nome, dose: p.dose || '', preco: p.preco,
    categoria: p.categoria || '', descricao: p.descricao || '',
    imagem: p.imagem || '', video: p.video || '',
    galeria: p.galeria || [], created_at: p.created_at,
  });
}

export async function sbSaveProdutos(produtos: ProdutoMemory[]) {
  if (!produtos.length) return;
  await supabase.from('produtos').upsert(produtos.map(p => ({
    id: p.id, nome: p.nome, dose: p.dose || '', preco: p.preco,
    categoria: p.categoria || '', descricao: p.descricao || '',
    imagem: p.imagem || '', video: p.video || '',
    galeria: p.galeria || [], created_at: p.created_at,
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
  await supabase.from('artigos').upsert({
    id: a.id, titulo: a.titulo, conteudo: a.conteudo || '',
    imagem: a.imagem || '', video: a.video || '',
    categoria: a.categoria || '', materiais: a.materiais || [],
    publicado: a.publicado, created_at: a.created_at, updated_at: a.updated_at,
  });
}

export async function sbDeleteArtigo(id: string) {
  await supabase.from('artigos').delete().eq('id', id);
}

// ── Equipe ───────────────────────────────────────────────────────────────────

export async function sbSaveMembro(m: MembroEquipe) {
  await supabase.from('equipe').upsert({
    id: m.id, nome: m.nome, email: m.email, cargo: m.cargo,
    token: m.token_acesso || m.id,
    ativo: m.ativo, created_at: m.created_at,
  });
}

export async function sbDeleteMembro(id: string) {
  await supabase.from('equipe').delete().eq('id', id);
}

// ── Pedidos ─────────────────────────────────────────────────────────────────

export async function sbSavePedido(p: Pedido) {
  await supabase.from('pedidos').upsert({
    id: p.id, cadastro_id: p.cadastro_id,
    vendedor_id: p.vendedor_id || '',
    itens: p.itens || [{ nome: p.produto_nome, preco: p.preco, quantidade: 1 }],
    preco: p.preco, status: p.status, obs: p.obs || '',
    created_at: p.created_at,
  });
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
      { data: cadastros },
      { data: produtos },
      { data: configRow },
      { data: banners },
      { data: bannersBlog },
      { data: artigos },
      { data: equipe },
      { data: categorias },
      { data: categoriasBlog },
      { data: pedidos },
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
    ]);

    if (cadastros) global.__cadastros__ = cadastros as Cadastro[];
    if (produtos) global.__produtos__ = produtos as ProdutoMemory[];
    if (configRow) global.__config__ = rowToConfig(configRow as Record<string, unknown>);
    if (banners && banners.length > 0) global.__banners__ = banners.map(b => ({ ...b, created_at: b.created_at || new Date().toISOString() })) as BannerItem[];
    if (bannersBlog && bannersBlog.length > 0) global.__banners_blog__ = bannersBlog.map(b => ({ ...b, created_at: b.created_at || new Date().toISOString() })) as BannerItem[];
    if (artigos) global.__artigos__ = artigos as Artigo[];
    if (equipe) global.__equipe__ = equipe.map((m: Record<string, unknown>) => ({
      ...m, token_acesso: m.token as string,
    })) as MembroEquipe[];
    if (categorias) global.__categorias__ = categorias.map((c: { nome: string }) => c.nome);
    if (categoriasBlog) global.__categorias_blog__ = categoriasBlog.map((c: { nome: string }) => c.nome);
    if (pedidos) global.__pedidos__ = pedidos.map((p: Record<string, unknown>) => ({
      ...p,
      cadastro_nome: '',
      cadastro_email: '',
      produto_nome: Array.isArray(p.itens) && p.itens.length ? (p.itens[0] as { nome: string }).nome : '',
    })) as Pedido[];

    console.log('[SUPABASE] Dados carregados com sucesso');
  } catch (err) {
    console.error('[SUPABASE] Erro ao carregar dados:', err);
  }
}
