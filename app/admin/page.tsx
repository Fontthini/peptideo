'use client';
import { useState, useEffect } from 'react';
import { CATEGORIAS } from '@/lib/produtos';

type Cadastro = {
  id: string; nome: string; sobrenome: string; email: string; whatsapp: string;
  endereco: string; crm: string | null; onde_conheceu: string | null;
  status: string; token: string | null; created_at: string;
  updated_at?: string; vendedor_id?: string | null; solicitacao?: string | null;
};
type Produto = {
  id: string; nome: string; dose: string; preco: number;
  categoria: string; descricao: string; imagem: string;
  video?: string; galeria?: string[];
  custom: boolean;
};
type Config = { mercadopago_token: string; resend_api_key: string; whatsapp_numero: string; base_url: string; banner_titulo: string; banner_subtitulo: string; banner_imagem: string; logo?: string; corPrimaria?: string; corAcento?: string; };
type BannerItem = { id: string; imagem: string; titulo: string; subtitulo: string; ativo: boolean; ordem: number; };
type Material = { nome: string; url: string };
type Artigo = { id: string; titulo: string; conteudo: string; imagem?: string; video?: string; categoria?: string; materiais: Material[]; publicado: boolean; created_at: string; updated_at: string; };
type Membro = { id: string; nome: string; email: string; cargo: string; ativo: boolean; created_at: string; senha?: string; token_acesso?: string; };
type Pedido = { id: string; cadastro_nome: string; cadastro_email: string; produto_nome: string; preco: number; status: string; created_at: string; };

const ADMIN_KEY_LOCAL = 'admin_key';

function getKey() {
  return typeof window !== 'undefined' ? localStorage.getItem(ADMIN_KEY_LOCAL) || '' : '';
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8,
  padding: '10px 13px', color: '#111827', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700,
  color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px',
};

export default function AdminPage() {
  const [senha, setSenha] = useState('');
  const [logado, setLogado] = useState(false);
  const [aba, setAba] = useState<'leads' | 'produtos' | 'banners' | 'blog' | 'equipe' | 'config' | 'dashboard'>('leads');
  const [msg, setMsg] = useState('');

  const [cadastros, setCadastros] = useState<Cadastro[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [filtro, setFiltro] = useState('todos');

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loadingProd, setLoadingProd] = useState(false);
  const [novoProd, setNovoProd] = useState({ nome: '', dose: '', preco: '', categoria: 'Emagrecimento', descricao: '', imagem: '', video: '' });
  const [editando, setEditando] = useState<Produto | null>(null);
  const [galeriaUrls, setGaleriaUrls] = useState<string[]>([]);
  const [mostrarGaleria, setMostrarGaleria] = useState(false);
  const [galeriaAlvo, setGaleriaAlvo] = useState<'imagem' | 'galeria'>('imagem');

  const [config, setConfig] = useState<Config>({ mercadopago_token: '', resend_api_key: '', whatsapp_numero: '', base_url: '', banner_titulo: '', banner_subtitulo: '', banner_imagem: '', logo: '', corPrimaria: '#111827', corAcento: '#16a34a' });
  const [uploadando, setUploadando] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [novoBanner, setNovoBanner] = useState({ imagem: '', titulo: '', subtitulo: '' });

  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [loadingArtigos, setLoadingArtigos] = useState(false);
  const [editandoArtigo, setEditandoArtigo] = useState<Artigo | null>(null);
  const [novoArtigo, setNovoArtigo] = useState({ titulo: '', conteudo: '', imagem: '', video: '', categoria: '', materiais: [] as Material[], publicado: false });
  const [novoMaterial, setNovoMaterial] = useState({ nome: '', url: '' });

  const [equipe, setEquipe] = useState<Membro[]>([]);
  const [loadingEquipe, setLoadingEquipe] = useState(false);
  const [editandoMembro, setEditandoMembro] = useState<Membro | null>(null);
  const [novoMembro, setNovoMembro] = useState({ nome: '', email: '', cargo: 'vendedor', ativo: true, senha: '' });

  const [categoriasCustom, setCategoriasCustom] = useState<string[]>([]);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [mostrarCats, setMostrarCats] = useState(false);

  const [categoriasBlog, setCategoriasBlog] = useState<string[]>([]);
  const [novaCategoriaBlog, setNovaCategoriaBlog] = useState('');
  const [mostrarCatsBlog, setMostrarCatsBlog] = useState(false);

  const [bannersBlog, setBannersBlog] = useState<BannerItem[]>([]);
  const [novoBannerBlog, setNovoBannerBlog] = useState({ imagem: '', titulo: '', subtitulo: '' });
  const [mostrarBannersBlog, setMostrarBannersBlog] = useState(false);

  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  useEffect(() => {
    const k = getKey();
    if (k) { setLogado(true); carregarCadastros(k); carregarConfig(); }
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/cadastros', { headers: { 'x-admin-key': senha } });
    if (res.ok) {
      localStorage.setItem(ADMIN_KEY_LOCAL, senha);
      setLogado(true);
      setCadastros(await res.json());
    } else {
      alert('Senha incorreta');
    }
  };

  const carregarCadastros = async (key = getKey()) => {
    setLoadingLeads(true);
    try {
      const r = await fetch('/api/admin/cadastros', { headers: { 'x-admin-key': key } });
      if (r.ok) setCadastros(await r.json());
    } finally { setLoadingLeads(false); }
  };

  const carregarProdutos = async () => {
    setLoadingProd(true);
    try {
      const r = await fetch('/api/admin/produtos', { headers: { 'x-admin-key': getKey() } });
      if (r.ok) setProdutos(await r.json());
    } finally { setLoadingProd(false); }
  };

  const carregarConfig = async () => {
    setLoadingConfig(true);
    try {
      const r = await fetch('/api/admin/config', { headers: { 'x-admin-key': getKey() } });
      if (r.ok) setConfig(await r.json());
    } finally { setLoadingConfig(false); }
  };

  const abrirGaleria = async (alvo: 'imagem' | 'galeria' = 'imagem') => {
    if (galeriaUrls.length === 0) {
      const r = await fetch('/api/admin/uploads', { headers: { 'x-admin-key': getKey() } });
      if (r.ok) setGaleriaUrls(await r.json());
    }
    setGaleriaAlvo(alvo);
    setMostrarGaleria(true);
  };

  const carregarBanners = async () => {
    setLoadingBanners(true);
    try {
      const r = await fetch('/api/admin/banners', { headers: { 'x-admin-key': getKey() } });
      if (r.ok) setBanners(await r.json());
    } finally { setLoadingBanners(false); }
  };

  const adicionarBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoBanner.imagem) return;
    const r = await fetch('/api/admin/banners', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify(novoBanner),
    });
    if (r.ok) { showMsg('OK: Banner adicionado!'); setNovoBanner({ imagem: '', titulo: '', subtitulo: '' }); carregarBanners(); }
  };

  const deletarBanner = async (id: string) => {
    if (!confirm('Remover este banner?')) return;
    const r = await fetch('/api/admin/banners', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id }),
    });
    if (r.ok) { showMsg('Banner removido.'); carregarBanners(); }
  };

  const toggleBanner = async (id: string) => {
    await fetch('/api/admin/banners', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id }),
    });
    carregarBanners();
  };

  const carregarPedidos = async () => {
    try {
      const r = await fetch('/api/admin/pedidos', { headers: { 'x-admin-key': getKey() } });
      if (r.ok) setPedidos(await r.json());
    } catch {}
  };

  const mudarAba = (a: typeof aba) => {
    setAba(a);
    if (a === 'produtos') { if (produtos.length === 0) carregarProdutos(); carregarCategorias(); }
    if (a === 'config') carregarConfig();
    if (a === 'banners') carregarBanners();
    if (a === 'blog') { carregarArtigos(); carregarCategoriasBlog(); carregarBannersBlog(); }
    if (a === 'equipe') carregarEquipe();
    if (a === 'dashboard') { carregarCadastros(); carregarEquipe(); carregarPedidos(); }
  };

  const aprovar = async (id: string) => {
    const r = await fetch('/api/admin/aprovar', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id }),
    });
    const d = await r.json();
    if (r.ok) {
      carregarCadastros();
      const emailStatus = d.emailEnviado ? '✅ Email enviado' : '⚠️ Email não enviado';
      const waStatus = d.waEnviado ? '✅ WhatsApp enviado' : '';
      if (d.waLink && !d.waEnviado) {
        // Z-API não configurado — mostra botão para abrir WhatsApp
        const abrir = confirm(`${d.nome} aprovado!\n${emailStatus}\n\nClicar OK abre o WhatsApp para enviar o convite.`);
        if (abrir) window.open(d.waLink, '_blank');
      } else {
        showMsg(`OK: ${d.nome} aprovado! ${emailStatus} ${waStatus}`);
      }
    } else {
      showMsg('R Erro: ' + d.error);
    }
  };

  const rejeitar = async (id: string) => {
    if (!confirm('Rejeitar este cadastro?')) return;
    const r = await fetch('/api/admin/rejeitar', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id }),
    });
    if (r.ok) { showMsg('Cadastro rejeitado.'); carregarCadastros(); }
  };

  const excluirCadastro = async (id: string, nome: string) => {
    if (!confirm(`Excluir permanentemente o cadastro de ${nome}? Esta ação não pode ser desfeita.`)) return;
    const r = await fetch('/api/admin/cadastros', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id }),
    });
    if (r.ok) { showMsg('Cadastro excluido.'); carregarCadastros(); }
    else showMsg('R Erro ao excluir');
  };

  const adicionarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch('/api/admin/produtos', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify(novoProd),
    });
    if (r.ok) {
      showMsg('OK: Produto adicionado!');
      setNovoProd({ nome: '', dose: '', preco: '', categoria: 'Emagrecimento', descricao: '', imagem: '', video: '' });
      carregarProdutos();
    }
  };

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    const r = await fetch('/api/admin/produtos', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify(editando),
    });
    if (r.ok) {
      showMsg('OK: Produto atualizado!');
      setEditando(null);
      carregarProdutos();
    } else {
      showMsg('R Erro ao salvar');
    }
  };

  const deletarProduto = async (id: string) => {
    if (!confirm('Remover este produto?')) return;
    const r = await fetch('/api/admin/produtos', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id }),
    });
    if (r.ok) { showMsg('Produto removido.'); carregarProdutos(); }
  };

  const duplicarProduto = async (id: string) => {
    const r = await fetch('/api/admin/produtos', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ duplicar: true, id }),
    });
    if (r.ok) { showMsg('OK: Produto duplicado!'); carregarProdutos(); }
    else showMsg('R Erro ao duplicar');
  };

  const salvarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch('/api/admin/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify(config),
    });
    if (r.ok) showMsg('OK: Configurações salvas!');
  };

  const uploadImagem = async (field: string, file: File, onUrl: (url: string) => void) => {
    setUploadando(field);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-key': getKey() }, body: fd });
      const d = await r.json();
      if (r.ok) { onUrl(d.url); showMsg('OK: Imagem carregada!'); }
      else showMsg('R ' + (d.error || 'Erro ao enviar'));
    } finally { setUploadando(null); }
  };

  const carregarBannersBlog = async () => {
    const r = await fetch('/api/admin/banners-blog', { headers: { 'x-admin-key': getKey() } });
    if (r.ok) setBannersBlog(await r.json());
  };
  const adicionarBannerBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoBannerBlog.imagem) return;
    const r = await fetch('/api/admin/banners-blog', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify(novoBannerBlog) });
    if (r.ok) { showMsg('OK: Banner adicionado!'); setNovoBannerBlog({ imagem: '', titulo: '', subtitulo: '' }); carregarBannersBlog(); }
  };
  const deletarBannerBlog = async (id: string) => {
    if (!confirm('Remover este banner?')) return;
    const r = await fetch('/api/admin/banners-blog', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ id }) });
    if (r.ok) { showMsg('Banner removido.'); carregarBannersBlog(); }
  };
  const toggleBannerBlog = async (id: string) => {
    await fetch('/api/admin/banners-blog', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ id }) });
    carregarBannersBlog();
  };

  const carregarCategoriasBlog = async () => {
    const r = await fetch('/api/admin/categorias-blog', { headers: { 'x-admin-key': getKey() } });
    if (r.ok) setCategoriasBlog(await r.json());
  };
  const adicionarCategoriaBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaCategoriaBlog.trim()) return;
    const r = await fetch('/api/admin/categorias-blog', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ nome: novaCategoriaBlog.trim() }) });
    if (r.ok) { showMsg('OK: Categoria adicionada!'); setNovaCategoriaBlog(''); carregarCategoriasBlog(); }
    else { const d = await r.json(); showMsg('R ' + d.error); }
  };
  const deletarCategoriaBlog = async (nome: string) => {
    const r = await fetch('/api/admin/categorias-blog', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ nome }) });
    if (r.ok) { showMsg('Categoria removida.'); carregarCategoriasBlog(); }
  };

  const carregarArtigos = async () => {
    setLoadingArtigos(true);
    try { const r = await fetch('/api/admin/artigos', { headers: { 'x-admin-key': getKey() } }); if (r.ok) setArtigos(await r.json()); } finally { setLoadingArtigos(false); }
  };
  const salvarArtigo = async (e: React.FormEvent) => {
    e.preventDefault();
    const base = editandoArtigo || novoArtigo;
    const r = await fetch('/api/admin/artigos', {
      method: editandoArtigo ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify(editandoArtigo ? editandoArtigo : novoArtigo),
    });
    if (r.ok) { showMsg(editandoArtigo ? 'OK: Artigo atualizado!' : 'OK: Artigo criado!'); setEditandoArtigo(null); setNovoArtigo({ titulo: '', conteudo: '', imagem: '', video: '', categoria: '', materiais: [], publicado: false }); carregarArtigos(); }
    else showMsg('R Erro ao salvar artigo');
  };
  const deletarArtigo = async (id: string) => {
    if (!confirm('Excluir este artigo?')) return;
    const r = await fetch('/api/admin/artigos', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ id }) });
    if (r.ok) { showMsg('Artigo excluído.'); carregarArtigos(); }
  };
  const togglePublicar = async (a: Artigo) => {
    await fetch('/api/admin/artigos', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ ...a, publicado: !a.publicado }) });
    carregarArtigos();
  };

  const carregarEquipe = async () => {
    setLoadingEquipe(true);
    try { const r = await fetch('/api/admin/equipe', { headers: { 'x-admin-key': getKey() } }); if (r.ok) setEquipe(await r.json()); } finally { setLoadingEquipe(false); }
  };
  const salvarMembro = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch('/api/admin/equipe', {
      method: editandoMembro ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify(editandoMembro ?? novoMembro),
    });
    if (r.ok) { showMsg(editandoMembro ? 'OK: Membro atualizado!' : 'OK: Membro adicionado!'); setEditandoMembro(null); setNovoMembro({ nome: '', email: '', cargo: 'vendedor', ativo: true, senha: '' }); carregarEquipe(); }
    else showMsg('R Erro ao salvar membro');
  };
  const deletarMembro = async (id: string, nome: string) => {
    if (!confirm(`Remover ${nome} da equipe?`)) return;
    const r = await fetch('/api/admin/equipe', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ id }) });
    if (r.ok) { showMsg('Membro removido.'); carregarEquipe(); }
  };

  const carregarCategorias = async () => {
    const r = await fetch('/api/admin/categorias', { headers: { 'x-admin-key': getKey() } });
    if (r.ok) { const d = await r.json(); setCategoriasCustom(d.custom); }
  };
  const adicionarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaCategoria.trim()) return;
    const r = await fetch('/api/admin/categorias', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ nome: novaCategoria.trim() }) });
    if (r.ok) { showMsg('OK: Categoria adicionada!'); setNovaCategoria(''); carregarCategorias(); }
    else { const d = await r.json(); showMsg('R ' + d.error); }
  };
  const deletarCategoria = async (nome: string) => {
    const r = await fetch('/api/admin/categorias', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ nome }) });
    if (r.ok) { showMsg('Categoria removida.'); carregarCategorias(); }
  };

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };
  const sair = () => { localStorage.removeItem(ADMIN_KEY_LOCAL); setLogado(false); setSenha(''); };

  /* ---- Login ---- */
  if (!logado) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={login} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 40, width: 360, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <img src={config.logo || 'https://peptideos.drfamily.com.br/wp-content/uploads/2026/06/cropped-pep.jpg'}
              alt="PeptideZ" style={{ height: 52, maxWidth: 200, objectFit: 'contain', marginBottom: 12 }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Admin CRM</h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '6px 0 0' }}>PeptideZ Health</p>
          </div>
          <label style={labelStyle}>Senha</label>
          <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Digite a senha admin" autoFocus style={inputStyle} />
          <button type="submit" style={{ marginTop: 20, width: '100%', background: '#111827', color: '#fff', fontWeight: 700, padding: 14, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 15, fontFamily: 'inherit' }}>
            Entrar
          </button>
        </form>
      </div>
    );
  }

  const filtrados = filtro === 'todos' ? cadastros : cadastros.filter(c => c.status === filtro);
  const counts = {
    todos: cadastros.length,
    pendente: cadastros.filter(c => c.status === 'pendente').length,
    aprovado: cadastros.filter(c => c.status === 'aprovado').length,
    rejeitado: cadastros.filter(c => c.status === 'rejeitado').length,
  };

  const navItem = (key: typeof aba, icon: string, label: string) => (
    <button
      key={key}
      onClick={() => mudarAba(key)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '11px 16px', border: 'none', borderRadius: 8,
        background: aba === key ? '#f0fdf4' : 'transparent',
        color: aba === key ? '#15803d' : '#374151',
        fontWeight: aba === key ? 700 : 500, fontSize: 14, fontFamily: 'inherit',
        cursor: 'pointer', textAlign: 'left', marginBottom: 2,
        borderLeft: `3px solid ${aba === key ? '#16a34a' : 'transparent'}`,
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span> {label}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={config.logo || 'https://peptideos.drfamily.com.br/wp-content/uploads/2026/06/cropped-pep.jpg'}
            alt="PeptideZ" style={{ height: 36, maxWidth: 140, objectFit: 'contain' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>Admin CRM</div>
            <div style={{ fontSize: 10, color: '#16a34a', letterSpacing: 1 }}>PEPTIDEZ HEALTH</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { carregarCadastros(); showMsg('Atualizado!'); }}
            style={{ background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
            Atualizar
          </button>
          <button onClick={sair}
            style={{ background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
            Sair
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside style={{ width: 220, background: '#fff', borderRight: '1px solid #e5e7eb', padding: '20px 12px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, marginBottom: 10, paddingLeft: 6, textTransform: 'uppercase' }}>Menu</div>
          {navItem('dashboard', '#', 'Dashboard')}
          {navItem('leads', '-', 'Leads')}
          {navItem('produtos', '+', 'Produtos')}
          {navItem('banners', '*', 'Banners')}
          {navItem('blog', '~', 'Blog')}
          {navItem('equipe', '@', 'Equipe')}
          {navItem('config', '=', 'Config')}

          <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5 }}>
              {counts.aprovado} aprovados<br />{counts.pendente} pendentes
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* Mensagem global */}
          {msg && (
            <div style={{ marginBottom: 20, background: msg.startsWith('OK:') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.startsWith('OK:') ? '#86efac' : '#fecaca'}`, color: msg.startsWith('OK:') ? '#15803d' : '#dc2626', padding: '12px 16px', borderRadius: 8, fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>
              {msg.startsWith('OK:') ? msg.slice(3).trim() : msg}
              <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}>-</button>
            </div>
          )}

          {/* ======== ABA LEADS ======== */}
          {aba === 'leads' && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 20, marginTop: 0 }}>Leads</h2>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                {[
                  { label: 'Total', val: counts.todos, cor: '#111827', bg: '#f9fafb' },
                  { label: 'Pendentes', val: counts.pendente, cor: '#d97706', bg: '#fffbeb' },
                  { label: 'Aprovados', val: counts.aprovado, cor: '#15803d', bg: '#f0fdf4' },
                  { label: 'Rejeitados', val: counts.rejeitado, cor: '#dc2626', bg: '#fef2f2' },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px' }}>
                    <div style={{ fontSize: 32, fontWeight: 900, color: s.cor }}>{s.val}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Filtros */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[['todos', 'Todos'], ['pendente', 'Pendentes'], ['aprovado', 'Aprovados'], ['rejeitado', 'Rejeitados']].map(([val, label]) => (
                  <button key={val} onClick={() => setFiltro(val)}
                    style={{ background: filtro === val ? '#111827' : '#fff', color: filtro === val ? '#fff' : '#374151', border: `1px solid ${filtro === val ? '#111827' : '#d1d5db'}`, padding: '7px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: filtro === val ? 700 : 400, fontFamily: 'inherit', fontSize: 13 }}>
                    {label} ({counts[val as keyof typeof counts]})
                  </button>
                ))}
              </div>

              {/* Tabela */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                {loadingLeads ? (
                  <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Carregando...</div>
                ) : filtrados.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Nenhum cadastro encontrado</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                          {['Nome','Sobrenome','E-mail','WhatsApp','CRM','Onde Conheceu','Endereço','Status','Data','Ações'].map(h => (
                            <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtrados.map((c, i) => (
                          <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ padding: '11px 14px', color: '#111827', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.nome}</td>
                            <td style={{ padding: '11px 14px', color: '#374151', whiteSpace: 'nowrap' }}>{c.sobrenome || '-'}</td>
                            <td style={{ padding: '11px 14px', color: '#6b7280' }}>{c.email}</td>
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                              <a href={`https://wa.me/55${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#16a34a', textDecoration: 'none' }}>{c.whatsapp}</a>
                            </td>
                            <td style={{ padding: '11px 14px', color: '#9ca3af' }}>{c.crm || '-'}</td>
                            <td style={{ padding: '11px 14px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{c.onde_conheceu || '-'}</td>
                            <td style={{ padding: '11px 14px', color: '#9ca3af', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.endereco}</td>
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                              <span style={{
                                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                background: c.status === 'aprovado' ? '#dcfce7' : c.status === 'pendente' ? '#fef9c3' : '#fee2e2',
                                color: c.status === 'aprovado' ? '#15803d' : c.status === 'pendente' ? '#a16207' : '#dc2626',
                              }}>{c.status}</span>
                            </td>
                            <td style={{ padding: '11px 14px', color: '#9ca3af', whiteSpace: 'nowrap', fontSize: 12 }}>
                              {new Date(c.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {c.status === 'pendente' && (
                                  <>
                                    <button onClick={() => aprovar(c.id)} style={{ background: '#111827', color: '#fff', border: 'none', padding: '5px 11px', borderRadius: 5, cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}>
                                      Aprovar
                                    </button>
                                    <button onClick={() => rejeitar(c.id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 11px', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                                      Rejeitar
                                    </button>
                                  </>
                                )}
                                {c.status === 'aprovado' && c.token && (
                                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/acesso/${c.token}`); showMsg('Link copiado!'); }}
                                    style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '5px 11px', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                                    Copiar Link
                                  </button>
                                )}
                                <button onClick={() => excluirCadastro(c.id, c.nome)}
                                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 13 }}
                                  title="Excluir cadastro">
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ======== ABA PRODUTOS ======== */}
          {aba === 'produtos' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 28, alignItems: 'start' }}>

              {/* Lista de produtos */}
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 20, marginTop: 0 }}>
                  Catalogo <span style={{ color: '#9ca3af', fontSize: 14, fontWeight: 400 }}>({produtos.length})</span>
                </h2>
                {loadingProd ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Carregando...</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                    {produtos.map(p => (
                      <div key={p.id} style={{ background: '#fff', border: `1px solid ${p.custom ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ background: '#f9fafb', height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {p.imagem && (p.imagem.startsWith('http') || p.imagem.startsWith('/')) ? (
                            <img src={p.imagem} alt={p.nome} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
                          ) : (
                            <img src="/produtos/frasco.svg" alt={p.nome} style={{ width: 70, height: 'auto' }} />
                          )}
                        </div>
                        <div style={{ padding: '11px 13px' }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#16a34a', letterSpacing: 1, marginBottom: 3, textTransform: 'uppercase' }}>{p.categoria}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{p.nome}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{p.dose}</div>
                          <div style={{ fontSize: 15, fontWeight: 900, color: '#111827', marginTop: 6 }}>
                            R$ {p.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
                            <button
                              onClick={() => setEditando({ ...p })}
                              style={{ flex: 1, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '5px 0', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}>
                              Editar
                            </button>
                            <button onClick={() => duplicarProduto(p.id)}
                              style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '5px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}
                              title="Duplicar produto">
                              Dup
                            </button>
                            {p.custom && (
                              <button onClick={() => deletarProduto(p.id)}
                                style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
                                -
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Painel direito: Categorias + Adicionar/Editar */}
              <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Categorias */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                  <button type="button" onClick={() => { setMostrarCats(p => !p); if (!mostrarCats) carregarCategorias(); }}
                    style={{ width: '100%', padding: '13px 18px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#374151' }}>
                    <span>Gerenciar Categorias</span>
                    <span style={{ color: '#9ca3af' }}>{mostrarCats ? '-' : '-'}</span>
                  </button>
                  {mostrarCats && (
                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f3f4f6' }}>
                      <div style={{ paddingTop: 12, marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, marginBottom: 6 }}>PADRAO (nao editavel)</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {CATEGORIAS.map(c => (
                            <span key={c} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#6b7280', padding: '3px 10px', borderRadius: 12, fontSize: 11 }}>{c}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, marginBottom: 6 }}>PERSONALIZADAS</div>
                        {categoriasCustom.length === 0 && <div style={{ fontSize: 12, color: '#d1d5db', fontStyle: 'italic' }}>Nenhuma ainda.</div>}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {categoriasCustom.map(c => (
                            <span key={c} style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', padding: '3px 10px', borderRadius: 12, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                              {c}
                                <button type="button" onClick={() => deletarCategoria(c)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>-</button>
                              </span>
                            ))}
                          </div>
                        </div>
                      <form onSubmit={adicionarCategoria} style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <input value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)} placeholder="Nova categoria..." style={{ ...inputStyle, flex: 1, padding: '8px 12px', fontSize: 12 }} />
                        <button type="submit" style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>+ Add</button>
                      </form>
                    </div>
                  )}
                </div>

                {editando ? (
                  <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: 12, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>Editar Produto</h3>
                      <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 20 }}>-</button>
                    </div>
                    <form onSubmit={salvarEdicao} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                      <div>
                        <label style={labelStyle}>Nome do produto *</label>
                        <input value={editando.nome} onChange={e => setEditando(p => p && ({ ...p, nome: e.target.value }))} required style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Categoria</label>
                        <select value={editando.categoria} onChange={e => setEditando(p => p && ({ ...p, categoria: e.target.value }))}
                          style={{ ...inputStyle, cursor: 'pointer' }}>
                          {[...CATEGORIAS, ...categoriasCustom].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={labelStyle}>Dose</label>
                          <input value={editando.dose} onChange={e => setEditando(p => p && ({ ...p, dose: e.target.value }))} placeholder="Ex: 5mg" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Preço (R$) *</label>
                          <input type="number" min="0" step="0.01" value={editando.preco} onChange={e => setEditando(p => p && ({ ...p, preco: parseFloat(e.target.value) || 0 }))} required style={inputStyle} />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Imagem do produto</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input value={editando.imagem} onChange={e => setEditando(p => p && ({ ...p, imagem: e.target.value }))} placeholder="URL da imagem ou escolha um arquivo" style={{ ...inputStyle, flex: 1 }} />
                          <label style={{ background: uploadando === 'edit' ? '#e5e7eb' : '#f9fafb', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {uploadando === 'edit' ? '...' : 'Enviar'}
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadImagem('edit', f, url => { setEditando(p => p && ({ ...p, imagem: url })); setGaleriaUrls([]); }); e.target.value = ''; }} />
                          </label>
                        </div>
                        {editando.imagem && (
                          <div style={{ marginTop: 8, background: '#f9fafb', borderRadius: 6, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <img src={editando.imagem} alt="preview" style={{ maxHeight: 66, maxWidth: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        )}
                        <button type="button" onClick={() => abrirGaleria('imagem')}
                          style={{ marginTop: 8, width: '100%', background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '8px 0', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                          x-️ Escolher da Galeria de Uploads ({galeriaUrls.length || '?'})
                        </button>
                        {mostrarGaleria && galeriaAlvo === 'imagem' && (
                          <div style={{ marginTop: 8, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, maxHeight: 200, overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>SEUS UPLOADS ({galeriaUrls.length})</span>
                              <button type="button" onClick={() => setMostrarGaleria(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16 }}>-</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                              {galeriaUrls.map(url => (
                                <div key={url} onClick={() => { setEditando(p => p && ({ ...p, imagem: url })); setMostrarGaleria(false); }}
                                  style={{ cursor: 'pointer', background: editando.imagem === url ? '#dcfce7' : '#fff', border: `2px solid ${editando.imagem === url ? '#16a34a' : '#e5e7eb'}`, borderRadius: 6, overflow: 'hidden', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Galeria de Fotos */}
                      <div>
                        <label style={labelStyle}>Galeria de Fotos <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(fotos extras)</span></label>
                        {(editando.galeria || []).length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                            {(editando.galeria || []).map((url, i) => (
                              <div key={i} style={{ position: 'relative', width: 52, height: 52, background: '#f9fafb', borderRadius: 6, overflow: 'hidden', border: '1px solid #e5e7eb', flexShrink: 0 }}>
                                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                <button type="button" onClick={() => setEditando(p => p && ({ ...p, galeria: (p.galeria || []).filter((_, j) => j !== i) }))}
                                  style={{ position: 'absolute', top: 1, right: 1, background: 'rgba(220,38,38,0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>-</button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" onClick={() => abrirGaleria('galeria')}
                            style={{ flex: 1, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '8px 0', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                            x-️ Adicionar da Galeria
                          </button>
                          <label style={{ background: uploadando === 'galeria' ? '#e5e7eb' : '#f9fafb', border: '1px solid #d1d5db', borderRadius: 7, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                            {uploadando === 'galeria' ? '...' : 'Enviar'}
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadImagem('galeria', f, url => { setEditando(p => p && ({ ...p, galeria: [...(p.galeria || []), url] })); setGaleriaUrls([]); }); e.target.value = ''; }} />
                          </label>
                        </div>
                        {mostrarGaleria && galeriaAlvo === 'galeria' && (
                          <div style={{ marginTop: 8, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>CLIQUE PARA ADICIONAR / REMOVER</span>
                              <button type="button" onClick={() => setMostrarGaleria(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16 }}>-</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                              {galeriaUrls.map(url => {
                                const sel = (editando.galeria || []).includes(url);
                                return (
                                  <div key={url}
                                    onClick={() => setEditando(p => p && ({ ...p, galeria: sel ? (p.galeria || []).filter(u => u !== url) : [...(p.galeria || []), url] }))}
                                    style={{ cursor: 'pointer', background: sel ? '#dcfce7' : '#fff', border: `2px solid ${sel ? '#16a34a' : '#e5e7eb'}`, borderRadius: 6, overflow: 'hidden', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    {sel && <div style={{ position: 'absolute', top: 1, right: 2, fontSize: 10, color: '#16a34a', fontWeight: 900 }}>S"</div>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Vídeo YouTube */}
                      <div>
                        <label style={labelStyle}>Vídeo YouTube <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(opcional)</span></label>
                        <input value={editando.video || ''} onChange={e => setEditando(p => p && ({ ...p, video: e.target.value }))} placeholder="https://youtube.com/watch?v=..." style={inputStyle} />
                        {editando.video && (() => {
                          const m = (editando.video || '').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
                          return m
                            ? <div style={{ marginTop: 6, borderRadius: 6, overflow: 'hidden', aspectRatio: '16/9' }}><iframe src={`https://www.youtube.com/embed/${m[1]}`} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen /></div>
                            : <p style={{ color: '#dc2626', fontSize: 11, margin: '4px 0 0' }}>URL inválida. Use youtube.com/watch?v=... ou youtu.be/...</p>;
                        })()}
                      </div>

                      <div>
                        <label style={labelStyle}>Descrição</label>
                        <textarea value={editando.descricao} onChange={e => setEditando(p => p && ({ ...p, descricao: e.target.value }))} placeholder="Descrição detalhada do produto..." rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button type="submit" style={{ flex: 1, background: '#111827', color: '#fff', fontWeight: 700, padding: '11px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                          Salvar Alterações
                        </button>
                        <button type="button" onClick={() => setEditando(null)} style={{ background: '#f9fafb', color: '#374151', fontWeight: 600, padding: '11px 16px', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 18, color: '#111827', margin: '0 0 18px' }}>Adicionar Produto</h3>
                    <form onSubmit={adicionarProduto} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                      <div>
                        <label style={labelStyle}>Nome do produto *</label>
                        <input value={novoProd.nome} onChange={e => setNovoProd(p => ({ ...p, nome: e.target.value }))} required placeholder="Ex: BPC-157" style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Categoria</label>
                        <select value={novoProd.categoria} onChange={e => setNovoProd(p => ({ ...p, categoria: e.target.value }))}
                          style={{ ...inputStyle, cursor: 'pointer' }}>
                          {[...CATEGORIAS, ...categoriasCustom].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={labelStyle}>Dose</label>
                          <input value={novoProd.dose} onChange={e => setNovoProd(p => ({ ...p, dose: e.target.value }))} placeholder="Ex: 5mg" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Preço (R$) *</label>
                          <input type="number" min="0" step="0.01" value={novoProd.preco} onChange={e => setNovoProd(p => ({ ...p, preco: e.target.value }))} required placeholder="799.90" style={inputStyle} />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Imagem do produto</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input value={novoProd.imagem} onChange={e => setNovoProd(p => ({ ...p, imagem: e.target.value }))} placeholder="URL da imagem ou escolha um arquivo" style={{ ...inputStyle, flex: 1 }} />
                          <label style={{ background: uploadando === 'novo' ? '#e5e7eb' : '#f9fafb', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {uploadando === 'novo' ? '...' : 'Enviar'}
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadImagem('novo', f, url => setNovoProd(p => ({ ...p, imagem: url }))); e.target.value = ''; }} />
                          </label>
                        </div>
                        {novoProd.imagem && (
                          <div style={{ marginTop: 8, background: '#f9fafb', borderRadius: 6, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <img src={novoProd.imagem} alt="preview" style={{ maxHeight: 66, maxWidth: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        )}
                      </div>
                      <div>
                        <label style={labelStyle}>Descrição</label>
                        <textarea value={novoProd.descricao} onChange={e => setNovoProd(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição detalhada do produto..." rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} />
                      </div>
                      <div>
                        <label style={labelStyle}>Vídeo YouTube <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(opcional)</span></label>
                        <input value={novoProd.video} onChange={e => setNovoProd(p => ({ ...p, video: e.target.value }))} placeholder="https://youtube.com/watch?v=..." style={inputStyle} />
                      </div>
                      <button type="submit" style={{ background: '#111827', color: '#fff', fontWeight: 700, padding: '12px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                        Salvar Produto
                      </button>
                    </form>
                  </div>
                )}
              </div>{/* fim painel direito */}
            </div>
          )}

          {/* ======== ABA BANNERS ======== */}
          {aba === 'banners' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28, alignItems: 'start' }}>

              {/* Lista de banners */}
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 20, marginTop: 0 }}>
                  x-️ Banners do Carrossel <span style={{ color: '#9ca3af', fontSize: 14, fontWeight: 400 }}>({banners.filter(b => b.ativo).length} ativos)</span>
                </h2>
                {loadingBanners ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Carregando...</div>
                ) : banners.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', background: '#f9fafb', borderRadius: 12, border: '1px dashed #d1d5db' }}>
                    Nenhum banner. Adicione um ao lado.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {banners.map(b => (
                      <div key={b.id} style={{ background: '#fff', border: `1px solid ${b.ativo ? '#e5e7eb' : '#f3f4f6'}`, borderRadius: 12, overflow: 'hidden', opacity: b.ativo ? 1 : 0.5, display: 'flex', gap: 0 }}>
                        <div style={{ width: 200, flexShrink: 0, background: '#f9fafb', overflow: 'hidden', maxHeight: 80 }}>
                          <img src={b.imagem} alt={b.titulo} style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }}
                            onError={e => { (e.target as HTMLImageElement).src = '/produtos/frasco.svg'; }} />
                        </div>
                        <div style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{b.titulo || '(sem título)'}</div>
                            {b.subtitulo && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{b.subtitulo}</div>}
                            <div style={{ marginTop: 6 }}>
                              <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: b.ativo ? '#dcfce7' : '#f3f4f6', color: b.ativo ? '#15803d' : '#9ca3af' }}>
                                {b.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <button onClick={() => toggleBanner(b.id)}
                              style={{ background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 600 }}>
                              {b.ativo ? '⏸ Pausar' : '- Ativar'}
                            </button>
                            <button onClick={() => deletarBanner(b.id)}
                              style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                              -
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Painel: Adicionar Banner */}
              <div style={{ position: 'sticky', top: 24, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 18px', color: '#111827' }}>Novo Banner</h3>
                <form onSubmit={adicionarBanner} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Imagem *</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={novoBanner.imagem} onChange={e => setNovoBanner(b => ({ ...b, imagem: e.target.value }))}
                        placeholder="URL ou escolha um arquivo" style={{ ...inputStyle, flex: 1 }} />
                      <label style={{ background: uploadando === 'nb' ? '#e5e7eb' : '#f9fafb', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {uploadando === 'nb' ? '...' : 'Enviar'}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadImagem('nb', f, url => setNovoBanner(b => ({ ...b, imagem: url }))); e.target.value = ''; }} />
                      </label>
                    </div>
                    {novoBanner.imagem && (
                      <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', height: 80, background: '#f9fafb' }}>
                        <img src={novoBanner.imagem} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Título (opcional)</label>
                    <input value={novoBanner.titulo} onChange={e => setNovoBanner(b => ({ ...b, titulo: e.target.value }))} placeholder="Ex: Otimização Bioativa" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Subtítulo (opcional)</label>
                    <input value={novoBanner.subtitulo} onChange={e => setNovoBanner(b => ({ ...b, subtitulo: e.target.value }))} placeholder="Ex: Peptídeos para Prescrição Médica" style={inputStyle} />
                  </div>
                  <button type="submit" style={{ background: '#111827', color: '#fff', fontWeight: 700, padding: '12px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                    Adicionar ao Carrossel
                  </button>
                </form>
                <p style={{ color: '#9ca3af', fontSize: 11, marginTop: 12, lineHeight: 1.6 }}>
                  Banners ativos aparecem no carrossel da loja em ordem de cadastro. Use o botão ⏸ para pausar sem excluir.
                </p>
              </div>
            </div>
          )}

          {/* ======== ABA BLOG ======== */}
          {aba === 'blog' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ---- Banners do Blog ---- */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <button type="button" onClick={() => { setMostrarBannersBlog(p => !p); if (!mostrarBannersBlog) carregarBannersBlog(); }}
                style={{ width: '100%', padding: '15px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#111827' }}>
                <span>x-️ Banners do Blog <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 12 }}>({bannersBlog.filter(b => b.ativo).length} ativos)</span></span>
                <span style={{ color: '#9ca3af' }}>{mostrarBannersBlog ? '-' : '-'}</span>
              </button>
              {mostrarBannersBlog && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f3f4f6' }}>
                  {/* Lista de banners */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16 }}>
                    {bannersBlog.map(b => (
                      <div key={b.id} style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', opacity: b.ativo ? 1 : 0.5 }}>
                        <div style={{ width: 80, height: 44, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                          <img src={b.imagem} alt={b.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.titulo || '(sem título)'}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.imagem}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => toggleBannerBlog(b.id)} style={{ background: b.ativo ? '#f0fdf4' : '#f3f4f6', color: b.ativo ? '#15803d' : '#9ca3af', border: `1px solid ${b.ativo ? '#86efac' : '#e5e7eb'}`, padding: '5px 11px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
                            {b.ativo ? 'Ativo' : 'Inativo'}
                          </button>
                          <button onClick={() => deletarBannerBlog(b.id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 9px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>-</button>
                        </div>
                      </div>
                    ))}
                    {bannersBlog.length === 0 && <div style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic', paddingTop: 4 }}>Nenhum banner cadastrado.</div>}
                  </div>
                  {/* Formulário novo banner */}
                  <form onSubmit={adicionarBannerBlog} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                      <input value={novoBannerBlog.imagem} onChange={e => setNovoBannerBlog(b => ({ ...b, imagem: e.target.value }))} placeholder="URL da imagem *" required style={{ ...inputStyle, flex: 1, fontSize: 13 }} />
                      <label style={{ background: uploadando === 'banner-blog' ? '#e5e7eb' : '#f9fafb', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                        {uploadando === 'banner-blog' ? '...' : 'Enviar'}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadImagem('banner-blog', f, url => setNovoBannerBlog(b => ({ ...b, imagem: url }))); e.target.value = ''; }} />
                      </label>
                    </div>
                    <input value={novoBannerBlog.titulo} onChange={e => setNovoBannerBlog(b => ({ ...b, titulo: e.target.value }))} placeholder="Título (opcional)" style={{ ...inputStyle, fontSize: 13 }} />
                    <input value={novoBannerBlog.subtitulo} onChange={e => setNovoBannerBlog(b => ({ ...b, subtitulo: e.target.value }))} placeholder="Subtítulo (opcional)" style={{ ...inputStyle, fontSize: 13 }} />
                    <button type="submit" style={{ gridColumn: '1 / -1', background: '#111827', color: '#fff', fontWeight: 700, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                      + Adicionar Banner
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* ---- Artigos + Formulário ---- */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 28, alignItems: 'start' }}>
              {/* Lista de artigos */}
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 20, marginTop: 0 }}>
                  Blog & Materiais <span style={{ color: '#9ca3af', fontSize: 14, fontWeight: 400 }}>({artigos.filter(a => a.publicado).length}/{artigos.length} publicados)</span>
                </h2>
                {loadingArtigos ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Carregando...</div>
                ) : artigos.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af', background: '#f9fafb', borderRadius: 12, border: '1px dashed #d1d5db' }}>
                    Nenhum artigo. Crie um ao lado.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {artigos.map(a => (
                      <div key={a.id} style={{ background: '#fff', border: `1px solid ${a.publicado ? '#e5e7eb' : '#f3f4f6'}`, borderRadius: 12, overflow: 'hidden', display: 'flex', gap: 0, opacity: a.publicado ? 1 : 0.7 }}>
                        {a.imagem ? (
                          <div style={{ width: 100, flexShrink: 0, background: '#f9fafb', overflow: 'hidden' }}>
                            <img src={a.imagem} alt={a.titulo} style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        ) : (
                          <div style={{ width: 80, flexShrink: 0, background: 'linear-gradient(135deg, #0f172a, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>x"</div>
                        )}
                        <div style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 4 }}>{a.titulo}</div>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: a.publicado ? '#dcfce7' : '#f3f4f6', color: a.publicado ? '#15803d' : '#9ca3af' }}>
                                {a.publicado ? 'Publicado' : 'Rascunho'}
                              </span>
                              {a.video && <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: '#fef2f2', color: '#dc2626' }}>- Vídeo</span>}
                              {a.materiais.length > 0 && <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8' }}>{a.materiais.length} mat.</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button onClick={() => togglePublicar(a)}
                              style={{ background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', padding: '5px 11px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}>
                              {a.publicado ? '⏸' : '-'}
                            </button>
                            <button onClick={() => setEditandoArtigo({ ...a })}
                              style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '5px 11px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}>
                              Editar
                            </button>
                            <button onClick={() => deletarArtigo(a.id)}
                              style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                              -
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Painel: Formulário Artigo */}
              <div style={{ position: 'sticky', top: 24, background: '#fff', border: `1px solid ${editandoArtigo ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: 12, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>{editandoArtigo ? 'Editar Artigo' : 'Novo Artigo'}</h3>
                  {editandoArtigo && <button onClick={() => setEditandoArtigo(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 20 }}>-</button>}
                </div>
                <form onSubmit={salvarArtigo} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Título */}
                  <div>
                    <label style={labelStyle}>Título *</label>
                    <input value={editandoArtigo ? editandoArtigo.titulo : novoArtigo.titulo}
                      onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, titulo: e.target.value })) : setNovoArtigo(a => ({ ...a, titulo: e.target.value }))}
                      required placeholder="Título do artigo" style={inputStyle} />
                  </div>
                  {/* Gerenciar categorias do blog */}
                  <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                    <button type="button" onClick={() => { setMostrarCatsBlog(p => !p); if (!mostrarCatsBlog) carregarCategoriasBlog(); }}
                      style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: '#374151' }}>
                      <span>Gerenciar Categorias do Blog</span>
                      <span style={{ color: '#9ca3af' }}>{mostrarCatsBlog ? '-' : '-'}</span>
                    </button>
                    {mostrarCatsBlog && (
                      <div style={{ padding: '0 14px 14px', borderTop: '1px solid #f3f4f6' }}>
                        {categoriasBlog.length === 0 && <div style={{ fontSize: 12, color: '#d1d5db', fontStyle: 'italic', paddingTop: 10 }}>Nenhuma categoria criada ainda.</div>}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingTop: 10 }}>
                          {categoriasBlog.map(c => (
                            <span key={c} style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', padding: '3px 10px', borderRadius: 12, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                              {c}
                              <button type="button" onClick={() => deletarCategoriaBlog(c)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>-</button>
                            </span>
                          ))}
                        </div>
                        <form onSubmit={adicionarCategoriaBlog} style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          <input value={novaCategoriaBlog} onChange={e => setNovaCategoriaBlog(e.target.value)} placeholder="Nova categoria..." style={{ ...inputStyle, flex: 1, padding: '7px 10px', fontSize: 12 }} />
                          <button type="submit" style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>+ Add</button>
                        </form>
                      </div>
                    )}
                  </div>
                  {/* Categoria */}
                  <div>
                    <label style={labelStyle}>Categoria</label>
                    <select value={editandoArtigo ? (editandoArtigo.categoria || '') : novoArtigo.categoria}
                      onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, categoria: e.target.value })) : setNovoArtigo(a => ({ ...a, categoria: e.target.value }))}
                      style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="">" Sem categoria "</option>
                      {categoriasBlog.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {/* Imagem capa */}
                  <div>
                    <label style={labelStyle}>Imagem de Capa</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={editandoArtigo ? (editandoArtigo.imagem || '') : novoArtigo.imagem}
                        onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, imagem: e.target.value })) : setNovoArtigo(a => ({ ...a, imagem: e.target.value }))}
                        placeholder="URL da imagem" style={{ ...inputStyle, flex: 1 }} />
                      <label style={{ background: uploadando === 'artigo' ? '#e5e7eb' : '#f9fafb', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                        {uploadando === 'artigo' ? '...' : 'Enviar'}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadImagem('artigo', f, url => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, imagem: url })) : setNovoArtigo(a => ({ ...a, imagem: url }))); e.target.value = ''; }} />
                      </label>
                    </div>
                  </div>
                  {/* Conteúdo */}
                  <div>
                    <label style={labelStyle}>Conteúdo / Texto</label>
                    <textarea value={editandoArtigo ? editandoArtigo.conteudo : novoArtigo.conteudo}
                      onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, conteudo: e.target.value })) : setNovoArtigo(a => ({ ...a, conteudo: e.target.value }))}
                      placeholder="Escreva o artigo aqui..." rows={7} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
                  </div>
                  {/* Vídeo */}
                  <div>
                    <label style={labelStyle}>Vídeo YouTube <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(opcional)</span></label>
                    <input value={editandoArtigo ? (editandoArtigo.video || '') : novoArtigo.video}
                      onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, video: e.target.value })) : setNovoArtigo(a => ({ ...a, video: e.target.value }))}
                      placeholder="https://youtube.com/watch?v=..." style={inputStyle} />
                  </div>
                  {/* Materiais */}
                  <div>
                    <label style={labelStyle}>Materiais para Download <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(PDFs, links)</span></label>
                    {(editandoArtigo ? editandoArtigo.materiais : novoArtigo.materiais).map((m, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <span style={{ flex: 1, fontSize: 12, color: '#374151', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nome}</span>
                        <button type="button" onClick={() => {
                          if (editandoArtigo) setEditandoArtigo(a => a && ({ ...a, materiais: a.materiais.filter((_, j) => j !== i) }));
                          else setNovoArtigo(a => ({ ...a, materiais: a.materiais.filter((_, j) => j !== i) }));
                        }} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>-</button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <input value={novoMaterial.nome} onChange={e => setNovoMaterial(m => ({ ...m, nome: e.target.value }))} placeholder="Nome do arquivo" style={{ ...inputStyle, flex: '1 1 120px', padding: '8px 10px', fontSize: 12 }} />
                      <input value={novoMaterial.url} onChange={e => setNovoMaterial(m => ({ ...m, url: e.target.value }))} placeholder="URL ou cole link" style={{ ...inputStyle, flex: '2 1 140px', padding: '8px 10px', fontSize: 12 }} />
                      <label style={{ background: uploadando === 'material' ? '#e5e7eb' : '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '8px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {uploadando === 'material' ? '...' : 'Enviar'}
                        <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,image/*" style={{ display: 'none' }} onChange={async e => {
                          const f = e.target.files?.[0]; if (!f) return;
                          const nome = novoMaterial.nome || f.name.replace(/\.[^.]+$/, '');
                          setNovoMaterial(m => ({ ...m, nome }));
                          await uploadImagem('material', f, url => setNovoMaterial(m => ({ ...m, url })));
                          e.target.value = '';
                        }} />
                      </label>
                      <button type="button" onClick={() => {
                        if (!novoMaterial.nome || !novoMaterial.url) return;
                        if (editandoArtigo) setEditandoArtigo(a => a && ({ ...a, materiais: [...a.materiais, novoMaterial] }));
                        else setNovoArtigo(a => ({ ...a, materiais: [...a.materiais, novoMaterial] }));
                        setNovoMaterial({ nome: '', url: '' });
                      }} style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', flexShrink: 0 }}>+ Add</button>
                    </div>
                  </div>
                  {/* Publicado */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                    <input type="checkbox"
                      checked={editandoArtigo ? editandoArtigo.publicado : novoArtigo.publicado}
                      onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, publicado: e.target.checked })) : setNovoArtigo(a => ({ ...a, publicado: e.target.checked }))}
                      style={{ width: 18, height: 18, cursor: 'pointer' }} />
                    Publicar (visível para membros)
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" style={{ flex: 1, background: '#111827', color: '#fff', fontWeight: 700, padding: '11px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                      {editandoArtigo ? 'Salvar Alterações' : 'Criar Artigo'}
                    </button>
                    {editandoArtigo && (
                      <button type="button" onClick={() => setEditandoArtigo(null)} style={{ background: '#f9fafb', color: '#374151', fontWeight: 600, padding: '11px 14px', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
            </div>
          )}

          {/* ======== ABA DASHBOARD ======== */}
          {aba === 'dashboard' && (() => {
            const total = cadastros.length;
            const aprovados = cadastros.filter(c => c.status === 'aprovado').length;
            const rejeitados = cadastros.filter(c => c.status === 'rejeitado').length;
            const pendentes = cadastros.filter(c => c.status === 'pendente').length;
            const emAnalise = cadastros.filter(c => c.status === 'em_analise').length;

            const totalPedidos = pedidos.length;
            const valorTotalPedidos = pedidos.reduce((s, p) => s + p.preco, 0);
            const pedidosVendidos = pedidos.filter(p => p.status === 'vendido').length;
            const valorVendido = pedidos.filter(p => p.status === 'vendido').reduce((s, p) => s + p.preco, 0);

            const comData = cadastros.filter((c: Cadastro & { updated_at?: string }) => c.status === 'aprovado' && (c as any).updated_at);
            const tempoMedio = comData.length > 0
              ? (comData.reduce((acc: number, c: Cadastro & { updated_at?: string }) => {
                  const h = (new Date((c as any).updated_at).getTime() - new Date(c.created_at).getTime()) / 1000 / 60 / 60;
                  return acc + h;
                }, 0) / comData.length)
              : null;
            const tempoLabel = tempoMedio === null ? '"' : tempoMedio < 24 ? `${tempoMedio.toFixed(0)}h` : `${(tempoMedio / 24).toFixed(1)}d`;

            const origens: Record<string, number> = {};
            cadastros.forEach((c: Cadastro) => { const o = c.onde_conheceu || 'Não informado'; origens[o] = (origens[o] || 0) + 1; });
            const origensSort = Object.entries(origens).sort((a, b) => b[1] - a[1]).slice(0, 6);
            const maxOrigem = origensSort[0]?.[1] || 1;

            const ultimos30 = (() => {
              const dias: Record<string, number> = {};
              const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
              for (let i = 29; i >= 0; i--) {
                const d = new Date(hoje); d.setDate(d.getDate() - i);
                dias[d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })] = 0;
              }
              cadastros.forEach((c: Cadastro) => {
                const d = new Date(c.created_at);
                const k = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                if (k in dias) dias[k]++;
              });
              return Object.entries(dias);
            })();
            const maxDia = Math.max(...ultimos30.map(([, v]) => v), 1);

            const vendedores = equipe.filter(m => m.cargo === 'vendedor' && m.ativo);
            const perfVend = vendedores.map(v => ({
              ...v,
              ativos: (cadastros as any[]).filter(c => c.vendedor_id === v.id).length,
              aprovados: (cadastros as any[]).filter(c => c.vendedor_id === v.id && c.status === 'aprovado').length,
              analise: (cadastros as any[]).filter(c => c.vendedor_id === v.id && c.status === 'em_analise').length,
            }));

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>x"` Dashboard Geral</h2>

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
                  {[
                    { label: 'Total Leads', value: total, color: '#111827' },
                    { label: 'Aprovados', value: aprovados, color: '#16a34a' },
                    { label: 'Pendentes', value: pendentes, color: '#f59e0b' },
                    { label: 'Em Análise', value: emAnalise, color: '#3b82f6' },
                    { label: 'Tempo Médio', value: tempoLabel, color: '#7c3aed', sub: 'de aprovação' },
                  ].map(k => (
                    <div key={k.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', borderTop: `4px solid ${k.color}` }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 3 }}>{k.label}</div>
                      {(k as any).sub && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{(k as any).sub}</div>}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {/* Gráfico 30 dias */}
                  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Leads — últimos 30 dias</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 100 }}>
                      {ultimos30.map(([dia, qtd]) => (
                        <div key={dia} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <div title={`${dia}: ${qtd}`} style={{ width: '100%', background: qtd > 0 ? '#16a34a' : '#f3f4f6', borderRadius: '2px 2px 0 0', height: `${Math.max((qtd / maxDia) * 88, qtd > 0 ? 4 : 0)}px`, minHeight: 2 }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#9ca3af' }}>
                      <span>{ultimos30[0]?.[0]}</span>
                      <span>{ultimos30[ultimos30.length - 1]?.[0]}</span>
                    </div>
                  </div>

                  {/* Origem */}
                  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Origem dos Leads</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {origensSort.map(([orig, qtd]) => (
                        <div key={orig}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                            <span style={{ color: '#374151', fontWeight: 600 }}>{orig}</span>
                            <span style={{ color: '#6b7280' }}>{qtd}</span>
                          </div>
                          <div style={{ background: '#f3f4f6', borderRadius: 4, height: 6 }}>
                            <div style={{ background: '#16a34a', borderRadius: 4, height: '100%', width: `${(qtd / maxOrigem) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                      {origensSort.length === 0 && <div style={{ color: '#d1d5db', fontSize: 13 }}>Sem dados ainda.</div>}
                    </div>
                  </div>
                </div>

                {/* Performance Vendedores */}
                {perfVend.length > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111827' }}>
                      Performance Vendedores
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                          {['Vendedor', 'Leads Ativos', 'Em Análise', 'Convertidos', 'Taxa Conversão'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {perfVend.map(v => (
                          <tr key={v.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '11px 14px', fontWeight: 700, color: '#111827' }}>{v.nome}</td>
                            <td style={{ padding: '11px 14px', color: '#374151' }}>{v.ativos}</td>
                            <td style={{ padding: '11px 14px' }}>
                              {v.analise > 0
                                ? <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{v.analise} solicitações</span>
                                : <span style={{ color: '#d1d5db' }}>"</span>}
                            </td>
                            <td style={{ padding: '11px 14px', color: '#15803d', fontWeight: 700 }}>{v.aprovados}</td>
                            <td style={{ padding: '11px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ background: '#f3f4f6', borderRadius: 4, height: 6, width: 60 }}>
                                  <div style={{ background: '#16a34a', borderRadius: 4, height: '100%', width: `${v.ativos > 0 ? (v.aprovados / v.ativos) * 100 : 0}%` }} />
                                </div>
                                <span style={{ fontSize: 12, color: '#374151' }}>{v.ativos > 0 ? `${Math.round((v.aprovados / v.ativos) * 100)}%` : '"'}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* KPIs Pedidos */}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Pedidos</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                    {[
                      { label: 'Total Pedidos', value: totalPedidos, color: '#111827' },
                      { label: 'Valor Total', value: `R$ ${valorTotalPedidos.toFixed(2)}`, color: '#6b7280' },
                      { label: 'Vendidos', value: pedidosVendidos, color: '#16a34a' },
                      { label: 'Valor Vendido', value: `R$ ${valorVendido.toFixed(2)}`, color: '#16a34a' },
                    ].map(k => (
                      <div key={k.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', borderTop: `4px solid ${k.color}` }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 3 }}>{k.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pedidos recentes */}
                {pedidos.length > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111827' }}>
                      Pedidos Recentes
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                          {['Cliente', 'Produto', 'Valor', 'Status', 'Data'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pedidos.slice(0, 10).map((p: Pedido) => {
                          const pc: Record<string, { bg: string; text: string }> = {
                            em_aberto: { bg: '#fef9c3', text: '#a16207' },
                            vendido: { bg: '#dcfce7', text: '#15803d' },
                            cancelado: { bg: '#fef2f2', text: '#dc2626' },
                          };
                          const cc = pc[p.status] || { bg: '#f3f4f6', text: '#374151' };
                          return (
                            <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '10px 14px' }}>
                                <div style={{ fontWeight: 600, color: '#111827' }}>{p.cadastro_nome}</div>
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.cadastro_email}</div>
                              </td>
                              <td style={{ padding: '10px 14px', color: '#374151' }}>{p.produto_nome}</td>
                              <td style={{ padding: '10px 14px', fontWeight: 700, color: '#16a34a' }}>R$ {p.preco.toFixed(2)}</td>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: cc.bg, color: cc.text }}>
                                  {p.status === 'em_aberto' ? 'Em Aberto' : p.status === 'vendido' ? 'Vendido' : 'Cancelado'}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Leads recentes */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Ultimos Leads</span>
                    <button onClick={() => mudarAba('leads')} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>Ver todos</button>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        {['Paciente', 'CRM', 'Status', 'Origem', 'Data'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cadastros.slice(0, 8).map((c: Cadastro) => {
                        const sc: Record<string, { bg: string; text: string }> = {
                          pendente: { bg: '#fef9c3', text: '#a16207' }, aprovado: { bg: '#dcfce7', text: '#15803d' },
                          rejeitado: { bg: '#fef2f2', text: '#dc2626' }, em_analise: { bg: '#eff6ff', text: '#1d4ed8' },
                        };
                        const cc = sc[c.status] || { bg: '#f3f4f6', text: '#374151' };
                        return (
                          <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>{c.nome} {c.sobrenome}</td>
                            <td style={{ padding: '10px 14px', color: '#6b7280' }}>{c.crm || '"'}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: cc.bg, color: cc.text }}>{c.status}</span>
                            </td>
                            <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{c.onde_conheceu || '"'}</td>
                            <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 12 }}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                          </tr>
                        );
                      })}
                      {cadastros.length === 0 && <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Nenhum lead ainda.</td></tr>}
                    </tbody>
                  </table>
                </div>

                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: '#92400e' }}>
                  Portal da equipe disponível em <strong>/equipe/login</strong> para vendedores, gerentes e designers.
                </div>
              </div>
            );
          })()}

          {/* ======== ABA EQUIPE ======== */}
          {aba === 'equipe' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28, alignItems: 'start' }}>
              {/* Lista */}
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 20, marginTop: 0 }}>
                  Equipe <span style={{ color: '#9ca3af', fontSize: 14, fontWeight: 400 }}>({equipe.filter(m => m.ativo).length} ativos)</span>
                </h2>
                {loadingEquipe ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Carregando...</div>
                ) : equipe.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af', background: '#f9fafb', borderRadius: 12, border: '1px dashed #d1d5db' }}>
                    Nenhum membro. Adicione ao lado.
                  </div>
                ) : (
                  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                          {['Nome', 'Cargo', 'E-mail', 'Status', 'Ações'].map(h => (
                            <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {equipe.map((m, i) => (
                          <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ padding: '11px 14px', fontWeight: 700, color: '#111827' }}>{m.nome}</td>
                            <td style={{ padding: '11px 14px' }}>
                              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: m.cargo === 'superadmin' ? '#fef9c3' : m.cargo === 'gerente' ? '#eff6ff' : m.cargo === 'designer' ? '#fdf4ff' : m.cargo === 'vendedor' ? '#f0fdf4' : '#f9fafb', color: m.cargo === 'superadmin' ? '#a16207' : m.cargo === 'gerente' ? '#1d4ed8' : m.cargo === 'designer' ? '#7c3aed' : m.cargo === 'vendedor' ? '#15803d' : '#374151' }}>
                                {m.cargo}
                              </span>
                            </td>
                            <td style={{ padding: '11px 14px', color: '#6b7280' }}>{m.email || '"'}</td>
                            <td style={{ padding: '11px 14px' }}>
                              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: m.ativo ? '#dcfce7' : '#f3f4f6', color: m.ativo ? '#15803d' : '#9ca3af' }}>
                                {m.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td style={{ padding: '11px 14px' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => setEditandoMembro({ ...m })}
                                  style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '5px 11px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}>Editar</button>
                                <button onClick={() => deletarMembro(m.id, m.nome)}
                                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>-</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{ marginTop: 20, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: '#92400e' }}>
                  As atribuições e permissões de cada cargo serão configuradas em breve. Por agora, cadastre os membros e defina os cargos.
                </div>
              </div>

              {/* Painel: Form Membro */}
              <div style={{ position: 'sticky', top: 24, background: '#fff', border: `1px solid ${editandoMembro ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: 12, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>{editandoMembro ? 'Editar Membro' : 'Novo Membro'}</h3>
                  {editandoMembro && <button onClick={() => setEditandoMembro(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 20 }}>-</button>}
                </div>
                <form onSubmit={salvarMembro} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Nome *</label>
                    <input value={editandoMembro ? editandoMembro.nome : novoMembro.nome}
                      onChange={e => editandoMembro ? setEditandoMembro(m => m && ({ ...m, nome: e.target.value })) : setNovoMembro(m => ({ ...m, nome: e.target.value }))}
                      required placeholder="Nome completo" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>E-mail</label>
                    <input type="email" value={editandoMembro ? editandoMembro.email : novoMembro.email}
                      onChange={e => editandoMembro ? setEditandoMembro(m => m && ({ ...m, email: e.target.value })) : setNovoMembro(m => ({ ...m, email: e.target.value }))}
                      placeholder="email@exemplo.com" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Cargo *</label>
                    <select value={editandoMembro ? editandoMembro.cargo : novoMembro.cargo}
                      onChange={e => editandoMembro ? setEditandoMembro(m => m && ({ ...m, cargo: e.target.value })) : setNovoMembro(m => ({ ...m, cargo: e.target.value }))}
                      style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="superadmin">Superadmin</option>
                      <option value="gerente">Gerente</option>
                      <option value="designer">Designer</option>
                      <option value="vendedor">Vendedor</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Senha do Portal *</label>
                    <input type="password"
                      value={editandoMembro ? (editandoMembro.senha || '') : novoMembro.senha}
                      onChange={e => editandoMembro ? setEditandoMembro(m => m && ({ ...m, senha: e.target.value })) : setNovoMembro(m => ({ ...m, senha: e.target.value }))}
                      placeholder={editandoMembro ? '(deixe em branco para manter)' : 'mínimo 6 caracteres'}
                      style={inputStyle} />
                    <p style={{ color: '#9ca3af', fontSize: 11, margin: '4px 0 0' }}>
                      Usada no acesso em <strong>/equipe/login</strong>
                    </p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                    <input type="checkbox"
                      checked={editandoMembro ? editandoMembro.ativo : novoMembro.ativo}
                      onChange={e => editandoMembro ? setEditandoMembro(m => m && ({ ...m, ativo: e.target.checked })) : setNovoMembro(m => ({ ...m, ativo: e.target.checked }))}
                      style={{ width: 18, height: 18, cursor: 'pointer' }} />
                    Membro ativo
                  </label>
                  {editandoMembro?.token_acesso && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
                      <div style={{ color: '#15803d', fontWeight: 700, marginBottom: 4 }}>Link do Portal</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <code style={{ fontSize: 10, color: '#374151', wordBreak: 'break-all', flex: 1 }}>/equipe/{editandoMembro.token_acesso}</code>
                        <button type="button" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/equipe/${editandoMembro!.token_acesso}`); showMsg('OK: Link copiado!'); }}
                          style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          Copiar
                        </button>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" style={{ flex: 1, background: '#111827', color: '#fff', fontWeight: 700, padding: '11px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                      {editandoMembro ? 'Salvar' : 'Adicionar'}
                    </button>
                    {editandoMembro && (
                      <button type="button" onClick={() => setEditandoMembro(null)} style={{ background: '#f9fafb', color: '#374151', fontWeight: 600, padding: '11px 14px', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ======== ABA CONFIGURA!"ES ======== */}
          {aba === 'config' && (
            <div style={{ maxWidth: 700 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 24, marginTop: 0 }}>a" Configurações da Plataforma</h2>
              <form onSubmit={salvarConfig} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Identidade Visual */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 28 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>Identidade Visual</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div>
                      <label style={labelStyle}>Logotipo (URL ou upload)</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input value={config.logo || ''} onChange={e => setConfig(c => ({ ...c, logo: e.target.value }))}
                          placeholder="https://... ou use o botão para subir" style={{ ...inputStyle, flex: 1 }} />
                        <label style={{ background: '#f3f4f6', border: '1px solid #d1d5db', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#374151', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                          Enviar
                          <input type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={async e => {
                              const f = e.target.files?.[0]; if (!f) return;
                              const fd = new FormData(); fd.append('file', f);
                              setUploadando('logo');
                              const r = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-key': getKey() }, body: fd });
                              setUploadando(null);
                              if (r.ok) { const d = await r.json(); setConfig(c => ({ ...c, logo: d.url })); }
                            }} />
                        </label>
                      </div>
                      {config.logo && (
                        <div style={{ marginTop: 10, padding: 12, background: '#f9fafb', borderRadius: 8, display: 'inline-block' }}>
                          <img src={config.logo} alt="Logo" style={{ maxHeight: 60, maxWidth: 200, objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label style={labelStyle}>Cor Principal (botões, textos)</label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="color" value={config.corPrimaria || '#111827'}
                            onChange={e => setConfig(c => ({ ...c, corPrimaria: e.target.value }))}
                            style={{ width: 44, height: 40, border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                          <input value={config.corPrimaria || '#111827'}
                            onChange={e => setConfig(c => ({ ...c, corPrimaria: e.target.value }))}
                            placeholder="#111827" style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }} />
                        </div>
                        <div style={{ marginTop: 6, background: config.corPrimaria || '#111827', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-block' }}>
                          Preview botão
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Cor de Destaque (verde/acento)</label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="color" value={config.corAcento || '#16a34a'}
                            onChange={e => setConfig(c => ({ ...c, corAcento: e.target.value }))}
                            style={{ width: 44, height: 40, border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                          <input value={config.corAcento || '#16a34a'}
                            onChange={e => setConfig(c => ({ ...c, corAcento: e.target.value }))}
                            placeholder="#16a34a" style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }} />
                        </div>
                        <div style={{ marginTop: 6, background: config.corAcento || '#16a34a', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-block' }}>
                          Preview acento
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Integrações */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 28 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>Integracoes</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div>
                      <label style={labelStyle}>Mercado Pago Access Token</label>
                      <input value={config.mercadopago_token} onChange={e => setConfig(c => ({ ...c, mercadopago_token: e.target.value }))}
                        placeholder="APP_USR-..." style={inputStyle} />
                      <p style={{ color: '#9ca3af', fontSize: 11, margin: '5px 0 0' }}>mercadopago.com.br &gt; Credenciais &gt; Access Token</p>
                    </div>
                    <div>
                      <label style={labelStyle}>Resend API Key</label>
                      <input value={config.resend_api_key} onChange={e => setConfig(c => ({ ...c, resend_api_key: e.target.value }))}
                        placeholder="re_..." style={inputStyle} />
                      <p style={{ color: '#9ca3af', fontSize: 11, margin: '5px 0 0' }}>resend.com &gt; API Keys</p>
                    </div>
                    <div>
                      <label style={labelStyle}>WhatsApp Numero de Contato</label>
                      <input value={config.whatsapp_numero} onChange={e => setConfig(c => ({ ...c, whatsapp_numero: e.target.value }))}
                        placeholder="5511999999999" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>xR URL Base do Site</label>
                      <input value={config.base_url} onChange={e => setConfig(c => ({ ...c, base_url: e.target.value }))}
                        placeholder="https://seusite.vercel.app" style={inputStyle} />
                      <p style={{ color: '#9ca3af', fontSize: 11, margin: '5px 0 0' }}>Usado nos links de aprovação enviados por e-mail</p>
                    </div>
                  </div>
                </div>

                {loadingConfig ? (
                  <div style={{ color: '#9ca3af', fontSize: 13 }}>Carregando...</div>
                ) : (
                  <button type="submit" style={{ background: '#111827', color: '#fff', fontWeight: 700, padding: '14px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 15, fontFamily: 'inherit' }}>
                    Salvar Configuracoes
                  </button>
                )}
              </form>

              <div style={{ marginTop: 20, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Sobre as Configuracoes</div>
                <ul style={{ color: '#6b7280', fontSize: 12, lineHeight: 1.8, margin: 0, paddingLeft: 16 }}>
                  <li>Configurações ficam na memória enquanto o servidor estiver rodando</li>
                  <li>Para configuração permanente, adicione ao arquivo <code style={{ color: '#16a34a' }}>.env.local</code></li>
                  <li>Mercado Pago: sem token, pagamento vai pelo WhatsApp</li>
                  <li>Resend: sem API key, aprovação não envia e-mail</li>
                </ul>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
