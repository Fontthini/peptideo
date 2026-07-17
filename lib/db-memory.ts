import { randomUUID } from 'crypto';
import { salvarJSON, carregarJSON } from './persist';

// Lazy-load Supabase sync to avoid circular deps / edge-runtime issues
function sb() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try { return require('./supabase-sync'); } catch { return null; }
}

export type BannerItem = {
  id: string;
  imagem: string;
  titulo: string;
  subtitulo: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
};

export type Cadastro = {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  whatsapp: string;
  endereco: string;
  crm: string | null;
  onde_conheceu: string | null;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'em_analise';
  token: string | null;
  created_at: string;
  updated_at?: string;
  vendedor_id?: string | null;
  solicitacao?: 'aprovar' | 'rejeitar' | null;
  obs?: string;
  motivo_rejeicao?: string;
};

export type ProdutoMemory = {
  id: string;
  nome: string;
  dose: string;
  preco: number;
  categoria: string;
  descricao: string;
  imagem: string;
  video?: string;
  galeria?: string[];
  created_at: string;
};

export type Config = {
  mercadopago_token: string;
  resend_api_key: string;
  whatsapp_numero: string;
  base_url: string;
  banner_titulo: string;
  banner_subtitulo: string;
  banner_imagem: string;
  logo?: string;
  corPrimaria?: string;
  corAcento?: string;
  roundRobinIdx?: number;
};

declare global {
  var __cadastros__: Cadastro[] | undefined;
  var __produtos__: ProdutoMemory[] | undefined;
  var __config__: Config | undefined;
  var __banners__: BannerItem[] | undefined;
  var __banners_blog__: BannerItem[] | undefined;
  var __artigos__: Artigo[] | undefined;
  var __equipe__: MembroEquipe[] | undefined;
  var __categorias__: string[] | undefined;
  var __categorias_blog__: string[] | undefined;
  var __pedidos__: Pedido[] | undefined;
}

export type Material = { nome: string; url: string };

export type Artigo = {
  id: string;
  titulo: string;
  conteudo: string;
  imagem?: string;
  video?: string;
  categoria?: string;
  materiais: Material[];
  publicado: boolean;
  created_at: string;
  updated_at: string;
};

export type MembroEquipe = {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  ativo: boolean;
  created_at: string;
  senha?: string;
  token_acesso?: string;
};

export type PedidoItem = { nome: string; preco: number; quantidade: number };

export type Pedido = {
  id: string;
  cadastro_id: string;
  cadastro_nome: string;
  cadastro_email: string;
  cadastro_whatsapp?: string;
  produto_nome: string;
  preco: number;
  itens?: PedidoItem[];
  vendedor_id?: string;
  status: 'em_aberto' | 'vendido' | 'cancelado';
  obs?: string;
  created_at: string;
  updated_at?: string;
};

// ---- Cadastros ----
function getStore(): Cadastro[] {
  if (global.__cadastros__ === undefined) {
    global.__cadastros__ = carregarJSON<Cadastro[]>('cadastros.json') ?? [];
  }
  return global.__cadastros__;
}

function salvarCadastros() {
  salvarJSON('cadastros.json', getStore());
}

export function mem_criar(data: Omit<Cadastro, 'id' | 'status' | 'token' | 'created_at'>): Cadastro {
  const store = getStore();
  const c: Cadastro = { ...data, id: randomUUID(), status: 'pendente', token: null, created_at: new Date().toISOString() };
  store.push(c);
  salvarCadastros();
  sb()?.sbSaveCadastro(c)?.catch(console.error);
  return c;
}

export function mem_listar(): Cadastro[] {
  return [...getStore()].reverse();
}

export function mem_buscarEmail(email: string): Cadastro | null {
  return getStore().find(c => c.email === email) ?? null;
}

export function mem_buscarId(id: string): Cadastro | null {
  return getStore().find(c => c.id === id) ?? null;
}

export function mem_buscarToken(token: string): Cadastro | null {
  return getStore().find(c => c.token === token && c.status === 'aprovado') ?? null;
}

export function mem_aprovar(id: string, token: string): Cadastro | null {
  const c = getStore().find(c => c.id === id);
  if (!c) return null;
  c.status = 'aprovado'; c.token = token;
  c.updated_at = new Date().toISOString(); c.solicitacao = null;
  salvarCadastros(); sb()?.sbSaveCadastro(c)?.catch(console.error);
  return c;
}

export function mem_rejeitar(id: string): Cadastro | null {
  const c = getStore().find(c => c.id === id);
  if (!c) return null;
  c.status = 'rejeitado'; c.updated_at = new Date().toISOString(); c.solicitacao = null;
  salvarCadastros(); sb()?.sbSaveCadastro(c)?.catch(console.error);
  return c;
}

export function mem_atribuirVendedor(cadastroId: string, vendedorId: string): Cadastro | null {
  const c = getStore().find(c => c.id === cadastroId);
  if (!c) return null;
  c.vendedor_id = vendedorId; c.updated_at = new Date().toISOString();
  salvarCadastros(); sb()?.sbSaveCadastro(c)?.catch(console.error);
  return c;
}

export function mem_solicitarAcao(cadastroId: string, solicitacao: 'aprovar' | 'rejeitar', motivo?: string): Cadastro | null {
  const c = getStore().find(c => c.id === cadastroId);
  if (!c) return null;
  c.solicitacao = solicitacao; c.status = 'em_analise';
  c.updated_at = new Date().toISOString();
  if (motivo) c.motivo_rejeicao = motivo;
  salvarCadastros(); sb()?.sbSaveCadastro(c)?.catch(console.error);
  return c;
}

export function mem_adicionarObs(cadastroId: string, obs: string): Cadastro | null {
  const c = getStore().find(c => c.id === cadastroId);
  if (!c) return null;
  c.obs = obs; c.updated_at = new Date().toISOString();
  salvarCadastros(); sb()?.sbSaveCadastro(c)?.catch(console.error);
  return c;
}

export function mem_proximoVendedor(): string | null {
  const vendedores = getEquipeStore().filter(m => m.cargo === 'vendedor' && m.ativo);
  if (!vendedores.length) return null;
  const cfg = mem_getConfig();
  const idx = (cfg.roundRobinIdx ?? 0) % vendedores.length;
  const vendedor = vendedores[idx];
  mem_setConfig({ roundRobinIdx: (idx + 1) % vendedores.length });
  return vendedor.id;
}

export function mem_deletarCadastro(id: string): boolean {
  const store = getStore();
  const idx = store.findIndex(c => c.id === id);
  if (idx === -1) return false;
  store.splice(idx, 1);
  salvarCadastros(); sb()?.sbDeleteCadastro(id)?.catch(console.error);
  return true;
}

// ---- Produtos ----
function getProdutosStore(): ProdutoMemory[] {
  if (global.__produtos__ === undefined) {
    global.__produtos__ = carregarJSON<ProdutoMemory[]>('produtos.json') ?? [];
  }
  return global.__produtos__;
}

export function mem_listarProdutos(): ProdutoMemory[] {
  return [...getProdutosStore()];
}

export function mem_criarProduto(data: Omit<ProdutoMemory, 'id' | 'created_at'>): ProdutoMemory {
  const store = getProdutosStore();
  const p: ProdutoMemory = { ...data, id: randomUUID(), created_at: new Date().toISOString() };
  store.push(p);
  return p;
}

export function mem_deletarProduto(id: string): boolean {
  const store = getProdutosStore();
  const idx = store.findIndex(p => p.id === id);
  if (idx === -1) return false;
  store.splice(idx, 1);
  return true;
}

export function mem_seedProdutos(items: Array<{ id: number | string; nome: string; dose: string; preco: number; categoria: string; descricao: string; imagem: string }>): void {
  const store = getProdutosStore();
  if (store.length > 0) return;

  // JSON vazio ou inexistente — semear do array estático
  const novos = items.map(p => ({
    id: String(p.id), nome: p.nome, dose: p.dose || '',
    preco: p.preco, categoria: p.categoria, descricao: p.descricao,
    imagem: p.imagem || '', created_at: new Date().toISOString(),
  }));
  global.__produtos__ = novos;
  salvarJSON('produtos.json', novos);
  // Persistir no Supabase para sobreviver a cold starts
  const s = sb();
  if (s) novos.forEach(p => s.sbSaveProduto(p)?.catch(console.error));
}

export function mem_editarProduto(id: string, data: Partial<Omit<ProdutoMemory, 'id' | 'created_at'>>): ProdutoMemory | null {
  const store = getProdutosStore();
  const p = store.find(p => p.id === id);
  if (!p) return null;
  Object.assign(p, data);
  salvarJSON('produtos.json', store);
  sb()?.sbSaveProduto(p)?.catch(console.error);
  return p;
}

export function mem_criarProdutoComPersistencia(data: Omit<ProdutoMemory, 'id' | 'created_at'>): ProdutoMemory {
  const p = mem_criarProduto(data);
  salvarJSON('produtos.json', getProdutosStore());
  sb()?.sbSaveProduto(p)?.catch(console.error);
  return p;
}

export function mem_deletarProdutoComPersistencia(id: string): boolean {
  const ok = mem_deletarProduto(id);
  if (ok) { salvarJSON('produtos.json', getProdutosStore()); sb()?.sbDeleteProduto(id)?.catch(console.error); }
  return ok;
}

export function mem_duplicarProduto(id: string): ProdutoMemory | null {
  const store = getProdutosStore();
  const original = store.find(p => p.id === id);
  if (!original) return null;
  const copia: ProdutoMemory = { ...original, id: randomUUID(), nome: original.nome + ' (cópia)', created_at: new Date().toISOString() };
  store.push(copia);
  salvarJSON('produtos.json', store);
  sb()?.sbSaveProduto(copia)?.catch(console.error);
  return copia;
}

// ---- Configuração ----
export function mem_getConfig(): Config {
  if (global.__config__ === undefined) {
    const saved = carregarJSON<Config>('config.json');
    global.__config__ = saved ?? {
      mercadopago_token: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
      resend_api_key: process.env.RESEND_API_KEY || '',
      whatsapp_numero: '5511999999999',
      base_url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      banner_titulo: '',
      banner_subtitulo: '',
      banner_imagem: '',
    };
  }
  return global.__config__;
}

export function mem_setConfig(cfg: Partial<Config>): Config {
  const current = mem_getConfig();
  Object.assign(current, cfg);
  salvarJSON('config.json', current);
  sb()?.sbSaveConfig(current)?.catch(console.error);
  return current;
}

// ---- Banners ----
function getBannersStore(): BannerItem[] {
  if (global.__banners__ === undefined) {
    const saved = carregarJSON<BannerItem[]>('banners.json');
    global.__banners__ = saved ?? [
      { id: 'b1', imagem: '/banners/banner1.svg', titulo: 'Otimização Bioativa', subtitulo: 'Peptídeos Terapêuticos para Prescrição Médica', ativo: true, ordem: 1, created_at: new Date().toISOString() },
      { id: 'b2', imagem: '/banners/banner2.svg', titulo: 'Peptídeos Certificados', subtitulo: 'Pureza ≥98% · Cadeia de Frio · Laudo Analítico', ativo: true, ordem: 2, created_at: new Date().toISOString() },
      { id: 'b3', imagem: '/banners/banner3.svg', titulo: 'Acesso Exclusivo', subtitulo: 'Para Médicos e Profissionais de Saúde', ativo: true, ordem: 3, created_at: new Date().toISOString() },
    ];
    if (!saved) {
      salvarJSON('banners.json', global.__banners__);
      const s = sb();
      if (s) s.sbSaveBanners(global.__banners__!, 'banners')?.catch(console.error);
    }
  }
  return global.__banners__;
}

export function mem_listarBanners(): BannerItem[] {
  return [...getBannersStore()].filter(b => b.ativo).sort((a, b) => a.ordem - b.ordem);
}

export function mem_listarTodosBanners(): BannerItem[] {
  return [...getBannersStore()].sort((a, b) => a.ordem - b.ordem);
}

export function mem_adicionarBanner(data: { imagem: string; titulo: string; subtitulo: string }): BannerItem {
  const store = getBannersStore();
  const banner: BannerItem = {
    id: randomUUID(),
    imagem: data.imagem,
    titulo: data.titulo || '',
    subtitulo: data.subtitulo || '',
    ativo: true,
    ordem: store.length + 1,
    created_at: new Date().toISOString(),
  };
  store.push(banner);
  salvarJSON('banners.json', store);
  return banner;
}

export function mem_deletarBanner(id: string): boolean {
  const store = getBannersStore();
  const idx = store.findIndex(b => b.id === id);
  if (idx === -1) return false;
  store.splice(idx, 1);
  salvarJSON('banners.json', store);
  return true;
}

export function mem_toggleBanner(id: string): BannerItem | null {
  const store = getBannersStore();
  const b = store.find(b => b.id === id);
  if (!b) return null;
  b.ativo = !b.ativo;
  salvarJSON('banners.json', store);
  return b;
}

// ---- Categorias Customizadas ----
function getCategoriasStore(): string[] {
  if (global.__categorias__ === undefined) {
    global.__categorias__ = carregarJSON<string[]>('categorias.json') ?? [];
  }
  return global.__categorias__;
}
export function mem_listarCategorias(): string[] { return [...getCategoriasStore()]; }
export function mem_adicionarCategoria(nome: string): boolean {
  const store = getCategoriasStore();
  if (store.includes(nome)) return false;
  store.push(nome);
  salvarJSON('categorias.json', store);
  sb()?.sbSaveCategorias([nome])?.catch(console.error);
  return true;
}
export function mem_deletarCategoria(nome: string): boolean {
  const store = getCategoriasStore();
  const idx = store.indexOf(nome);
  if (idx === -1) return false;
  store.splice(idx, 1);
  salvarJSON('categorias.json', store);
  sb()?.sbDeleteCategoria(nome)?.catch(console.error);
  return true;
}

// ---- Banners Blog ----
function getBannersBlogStore(): BannerItem[] {
  if (global.__banners_blog__ === undefined) {
    const saved = carregarJSON<BannerItem[]>('banners-blog.json');
    global.__banners_blog__ = saved ?? [
      { id: 'bb1', imagem: '/banners/blog1.svg', titulo: 'Conteúdo Científico', subtitulo: 'Artigos, vídeos e materiais exclusivos para profissionais de saúde.', ativo: true, ordem: 1, created_at: new Date().toISOString() },
      { id: 'bb2', imagem: '/banners/blog2.svg', titulo: 'Protocolos Clínicos', subtitulo: 'Guias práticos, doses e estratégias atualizadas.', ativo: true, ordem: 2, created_at: new Date().toISOString() },
      { id: 'bb3', imagem: '/banners/blog3.svg', titulo: 'Atualizações Recentes', subtitulo: 'Os últimos estudos em peptidoterapia.', ativo: true, ordem: 3, created_at: new Date().toISOString() },
    ];
    if (!saved) salvarJSON('banners-blog.json', global.__banners_blog__);
  }
  return global.__banners_blog__;
}
export function mem_listarBannersBlog(): BannerItem[] {
  return [...getBannersBlogStore()].filter(b => b.ativo).sort((a, b) => a.ordem - b.ordem);
}
export function mem_listarTodosBannersBlog(): BannerItem[] {
  return [...getBannersBlogStore()].sort((a, b) => a.ordem - b.ordem);
}
export function mem_adicionarBannerBlog(data: { imagem: string; titulo: string; subtitulo: string }): BannerItem {
  const store = getBannersBlogStore();
  const banner: BannerItem = { id: randomUUID(), imagem: data.imagem, titulo: data.titulo || '', subtitulo: data.subtitulo || '', ativo: true, ordem: store.length + 1, created_at: new Date().toISOString() };
  store.push(banner);
  salvarJSON('banners-blog.json', store);
  return banner;
}
export function mem_deletarBannerBlog(id: string): boolean {
  const store = getBannersBlogStore();
  const idx = store.findIndex(b => b.id === id);
  if (idx === -1) return false;
  store.splice(idx, 1);
  salvarJSON('banners-blog.json', store);
  return true;
}
export function mem_toggleBannerBlog(id: string): BannerItem | null {
  const store = getBannersBlogStore();
  const b = store.find(b => b.id === id);
  if (!b) return null;
  b.ativo = !b.ativo;
  salvarJSON('banners-blog.json', store);
  return b;
}

// ---- Categorias Blog ----
function getCategoriasBlogStore(): string[] {
  if (global.__categorias_blog__ === undefined) {
    global.__categorias_blog__ = carregarJSON<string[]>('categorias-blog.json') ?? [];
  }
  return global.__categorias_blog__;
}
export function mem_listarCategoriasBlog(): string[] { return [...getCategoriasBlogStore()]; }
export function mem_adicionarCategoriaBlog(nome: string): boolean {
  const store = getCategoriasBlogStore();
  if (store.includes(nome)) return false;
  store.push(nome);
  salvarJSON('categorias-blog.json', store);
  sb()?.sbSaveCategoriasBlog([nome])?.catch(console.error);
  return true;
}
export function mem_deletarCategoriaBlog(nome: string): boolean {
  const store = getCategoriasBlogStore();
  const idx = store.indexOf(nome);
  if (idx === -1) return false;
  store.splice(idx, 1);
  salvarJSON('categorias-blog.json', store);
  sb()?.sbDeleteCategoriaBlog(nome)?.catch(console.error);
  return true;
}

// ---- Artigos ----
function getArtigosStore(): Artigo[] {
  if (global.__artigos__ === undefined) {
    global.__artigos__ = carregarJSON<Artigo[]>('artigos.json') ?? [];
  }
  return global.__artigos__;
}
function salvarArtigos() { salvarJSON('artigos.json', getArtigosStore()); }

export function mem_listarArtigos(apenasPublicados = false): Artigo[] {
  const store = getArtigosStore();
  return (apenasPublicados ? store.filter(a => a.publicado) : [...store])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
export function mem_criarArtigo(data: Omit<Artigo, 'id' | 'created_at' | 'updated_at'>): Artigo {
  const store = getArtigosStore();
  const a: Artigo = { ...data, id: randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  store.push(a); salvarArtigos(); sb()?.sbSaveArtigo(a)?.catch(console.error);
  return a;
}
export function mem_editarArtigo(id: string, data: Partial<Omit<Artigo, 'id' | 'created_at'>>): Artigo | null {
  const a = getArtigosStore().find(a => a.id === id);
  if (!a) return null;
  Object.assign(a, data, { updated_at: new Date().toISOString() });
  salvarArtigos(); sb()?.sbSaveArtigo(a)?.catch(console.error);
  return a;
}
export function mem_deletarArtigo(id: string): boolean {
  const store = getArtigosStore();
  const idx = store.findIndex(a => a.id === id);
  if (idx === -1) return false;
  store.splice(idx, 1); salvarArtigos(); sb()?.sbDeleteArtigo(id)?.catch(console.error);
  return true;
}

// ---- Equipe ----
function getEquipeStore(): MembroEquipe[] {
  if (global.__equipe__ === undefined) {
    global.__equipe__ = carregarJSON<MembroEquipe[]>('equipe.json') ?? [];
  }
  return global.__equipe__;
}
function salvarEquipe() { salvarJSON('equipe.json', getEquipeStore()); }

export function mem_listarEquipe(): MembroEquipe[] {
  return [...getEquipeStore()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}
export function mem_criarMembro(data: Omit<MembroEquipe, 'id' | 'created_at'>): MembroEquipe {
  const store = getEquipeStore();
  const m: MembroEquipe = { ...data, id: randomUUID(), created_at: new Date().toISOString(), token_acesso: data.token_acesso || randomUUID() };
  store.push(m); salvarEquipe(); sb()?.sbSaveMembro(m)?.catch(console.error);
  return m;
}
export function mem_editarMembro(id: string, data: Partial<Omit<MembroEquipe, 'id' | 'created_at'>>): MembroEquipe | null {
  const m = getEquipeStore().find(m => m.id === id);
  if (!m) return null;
  Object.assign(m, data); salvarEquipe(); sb()?.sbSaveMembro(m)?.catch(console.error);
  return m;
}
export function mem_deletarMembro(id: string): boolean {
  const store = getEquipeStore();
  const idx = store.findIndex(m => m.id === id);
  if (idx === -1) return false;
  store.splice(idx, 1); salvarEquipe(); sb()?.sbDeleteMembro(id)?.catch(console.error);
  return true;
}

export function mem_buscarMembroPorToken(token: string): MembroEquipe | null {
  return getEquipeStore().find(m => m.token_acesso === token && m.ativo) ?? null;
}

export function mem_buscarMembroPorEmail(email: string): MembroEquipe | null {
  return getEquipeStore().find(m => m.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function mem_gerarTokenMembro(id: string): string | null {
  const m = getEquipeStore().find(m => m.id === id);
  if (!m) return null;
  const token = randomUUID();
  m.token_acesso = token;
  salvarEquipe(); sb()?.sbSaveMembro(m)?.catch(console.error);
  return token;
}

// ---- Pedidos ----
function getPedidosStore(): Pedido[] {
  if (global.__pedidos__ === undefined) {
    global.__pedidos__ = carregarJSON<Pedido[]>('pedidos.json') ?? [];
  }
  return global.__pedidos__;
}
function salvarPedidos() { salvarJSON('pedidos.json', getPedidosStore()); }

export function mem_listarPedidos(): Pedido[] {
  return [...getPedidosStore()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function mem_criarPedido(data: Omit<Pedido, 'id' | 'created_at'>): Pedido {
  const store = getPedidosStore();
  const p: Pedido = { ...data, id: randomUUID(), created_at: new Date().toISOString() };
  store.push(p); salvarPedidos(); sb()?.sbSavePedido(p)?.catch(console.error);
  return p;
}

export function mem_atualizarPedido(id: string, data: Partial<Pick<Pedido, 'status' | 'obs' | 'vendedor_id'>>): Pedido | null {
  const p = getPedidosStore().find(p => p.id === id);
  if (!p) return null;
  Object.assign(p, data, { updated_at: new Date().toISOString() });
  salvarPedidos(); sb()?.sbSavePedido(p)?.catch(console.error);
  return p;
}

export function mem_listarPedidosPorVendedor(vendedorId: string): Pedido[] {
  return getPedidosStore()
    .filter(p => p.vendedor_id === vendedorId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function mem_totalPedidos(): { total: number; valor: number; vendidos: number; valorVendido: number } {
  const store = getPedidosStore();
  const vendidos = store.filter(p => p.status === 'vendido');
  return {
    total: store.length,
    valor: store.reduce((s, p) => s + p.preco, 0),
    vendidos: vendidos.length,
    valorVendido: vendidos.reduce((s, p) => s + p.preco, 0),
  };
}
