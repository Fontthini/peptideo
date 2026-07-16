'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Produto = { id: string; nome: string; dose: string; preco: number; categoria: string; descricao: string; imagem: string; video?: string; };
type Material = { nome: string; url: string };
type Artigo = { id: string; titulo: string; conteudo: string; imagem?: string; video?: string; categoria?: string; materiais: Material[]; publicado: boolean; created_at: string; updated_at: string; };
type Membro = { id: string; nome: string; cargo: string; };

type Props = {
  membro: Membro;
  produtos: Produto[];
  artigos: Artigo[];
  token: string;
  initialSection: string;
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8,
  padding: '10px 13px', color: '#111827', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700,
  color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px',
};

export default function DesignerPortal({ membro, produtos: produtosInit, artigos: artigosInit, token, initialSection }: Props) {
  const router = useRouter();
  const [section, setSection] = useState(initialSection);
  const [msg, setMsg] = useState('');

  const [produtos, setProdutos] = useState(produtosInit);
  const [editandoProd, setEditandoProd] = useState<Produto | null>(null);

  const [artigos, setArtigos] = useState(artigosInit);
  const [editandoArtigo, setEditandoArtigo] = useState<Artigo | null>(null);
  const [novoArtigo, setNovoArtigo] = useState({ titulo: '', conteudo: '', imagem: '', video: '', categoria: '', publicado: false });

  const headers = { 'Content-Type': 'application/json', 'x-member-token': token };

  function showMsg(m: string) { setMsg(m); setTimeout(() => setMsg(''), 4000); }

  async function salvarProduto(e: React.FormEvent) {
    e.preventDefault();
    if (!editandoProd) return;
    const r = await fetch('/api/portal/designer/produtos', { method: 'PUT', headers, body: JSON.stringify(editandoProd) });
    if (r.ok) {
      const updated = await r.json();
      setProdutos(prev => prev.map(p => p.id === updated.id ? updated : p));
      setEditandoProd(null);
      showMsg('Produto salvo!');
    } else { showMsg('Erro ao salvar'); }
  }

  async function salvarArtigo(e: React.FormEvent) {
    e.preventDefault();
    const isEdit = !!editandoArtigo;
    const payload = isEdit ? editandoArtigo : novoArtigo;
    const r = await fetch('/api/portal/designer/artigos', {
      method: isEdit ? 'PUT' : 'POST', headers,
      body: JSON.stringify(isEdit ? payload : { ...payload, materiais: [] }),
    });
    if (r.ok) {
      const saved = await r.json();
      if (isEdit) {
        setArtigos(prev => prev.map(a => a.id === saved.id ? saved : a));
        setEditandoArtigo(null);
      } else {
        setArtigos(prev => [saved, ...prev]);
        setNovoArtigo({ titulo: '', conteudo: '', imagem: '', video: '', categoria: '', publicado: false });
      }
      showMsg(isEdit ? 'Artigo atualizado!' : 'Artigo criado!');
    } else { showMsg('Erro ao salvar artigo'); }
  }

  async function deletarArtigo(id: string) {
    if (!confirm('Excluir este artigo?')) return;
    const r = await fetch('/api/portal/designer/artigos', { method: 'DELETE', headers, body: JSON.stringify({ id }) });
    if (r.ok) { setArtigos(prev => prev.filter(a => a.id !== id)); showMsg('Artigo excluido.'); }
  }

  async function togglePublicar(a: Artigo) {
    const r = await fetch('/api/portal/designer/artigos', { method: 'PUT', headers, body: JSON.stringify({ ...a, publicado: !a.publicado }) });
    if (r.ok) { const saved = await r.json(); setArtigos(prev => prev.map(x => x.id === saved.id ? saved : x)); }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#111827', letterSpacing: -1 }}>PeptideZ</div>
          <span style={{ background: '#fdf4ff', color: '#7c3aed', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>Designer</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>Ola, <strong style={{ color: '#111827' }}>{membro.nome.split(' ')[0]}</strong></span>
          <button onClick={() => router.push(`/equipe/${token}`)}
            style={{ background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', padding: '7px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
            Voltar
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {[['produtos', 'Produtos'], ['blog', 'Blog & Artigos']].map(([k, l]) => (
            <button key={k} onClick={() => setSection(k)}
              style={{ padding: '9px 22px', borderRadius: 24, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: section === k ? 700 : 500, fontSize: 14, background: section === k ? '#111827' : '#f3f4f6', color: section === k ? '#fff' : '#374151' }}>
              {l}
            </button>
          ))}
        </div>

        {msg && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 20, color: '#15803d', fontSize: 13 }}>{msg}</div>}

        {/* PRODUTOS */}
        {section === 'produtos' && (
          <div>
            {editandoProd ? (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 28, maxWidth: 700 }}>
                <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800, color: '#111827' }}>Editar Produto</h2>
                <form onSubmit={salvarProduto} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div><label style={labelStyle}>Nome</label><input style={inputStyle} value={editandoProd.nome} onChange={e => setEditandoProd(p => p && ({ ...p, nome: e.target.value }))} required /></div>
                  <div><label style={labelStyle}>Descricao</label><textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} value={editandoProd.descricao} onChange={e => setEditandoProd(p => p && ({ ...p, descricao: e.target.value }))} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div><label style={labelStyle}>Dose</label><input style={inputStyle} value={editandoProd.dose} onChange={e => setEditandoProd(p => p && ({ ...p, dose: e.target.value }))} /></div>
                    <div><label style={labelStyle}>Preco (R$)</label><input style={inputStyle} type="number" step="0.01" value={editandoProd.preco} onChange={e => setEditandoProd(p => p && ({ ...p, preco: parseFloat(e.target.value) || 0 }))} /></div>
                  </div>
                  <div><label style={labelStyle}>Imagem (URL)</label><input style={inputStyle} value={editandoProd.imagem} onChange={e => setEditandoProd(p => p && ({ ...p, imagem: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Video (URL)</label><input style={inputStyle} value={editandoProd.video || ''} onChange={e => setEditandoProd(p => p && ({ ...p, video: e.target.value }))} /></div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button type="submit" style={{ background: '#111827', color: '#fff', border: 'none', padding: '11px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>Salvar</button>
                    <button type="button" onClick={() => setEditandoProd(null)} style={{ background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', padding: '11px 24px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                  </div>
                </form>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {produtos.map(p => (
                  <div key={p.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                    {p.imagem && <img src={p.imagem} alt={p.nome} style={{ width: '100%', height: 160, objectFit: 'cover' }} />}
                    <div style={{ padding: 16 }}>
                      <div style={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}>{p.nome}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{p.dose}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a', marginBottom: 12 }}>R$ {p.preco.toFixed(2)}</div>
                      <button onClick={() => setEditandoProd(p)}
                        style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
                {produtos.length === 0 && <p style={{ color: '#9ca3af', gridColumn: '1/-1' }}>Nenhum produto cadastrado ainda.</p>}
              </div>
            )}
          </div>
        )}

        {/* BLOG */}
        {section === 'blog' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {editandoArtigo ? (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 28, maxWidth: 700 }}>
                <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800, color: '#111827' }}>Editar Artigo</h2>
                <form onSubmit={salvarArtigo} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div><label style={labelStyle}>Titulo</label><input style={inputStyle} value={editandoArtigo.titulo} onChange={e => setEditandoArtigo(a => a && ({ ...a, titulo: e.target.value }))} required /></div>
                  <div><label style={labelStyle}>Conteudo</label><textarea style={{ ...inputStyle, minHeight: 150, resize: 'vertical' }} value={editandoArtigo.conteudo} onChange={e => setEditandoArtigo(a => a && ({ ...a, conteudo: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Imagem (URL)</label><input style={inputStyle} value={editandoArtigo.imagem || ''} onChange={e => setEditandoArtigo(a => a && ({ ...a, imagem: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Video (URL)</label><input style={inputStyle} value={editandoArtigo.video || ''} onChange={e => setEditandoArtigo(a => a && ({ ...a, video: e.target.value }))} /></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" id="pub-edit" checked={editandoArtigo.publicado} onChange={e => setEditandoArtigo(a => a && ({ ...a, publicado: e.target.checked }))} />
                    <label htmlFor="pub-edit" style={{ fontSize: 13, color: '#374151' }}>Publicado</label>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button type="submit" style={{ background: '#111827', color: '#fff', border: 'none', padding: '11px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>Salvar</button>
                    <button type="button" onClick={() => setEditandoArtigo(null)} style={{ background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', padding: '11px 24px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                  </div>
                </form>
              </div>
            ) : (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 28, maxWidth: 700 }}>
                <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: '#111827' }}>Novo Artigo</h2>
                <form onSubmit={salvarArtigo} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div><label style={labelStyle}>Titulo</label><input style={inputStyle} value={novoArtigo.titulo} onChange={e => setNovoArtigo(a => ({ ...a, titulo: e.target.value }))} required placeholder="Titulo do artigo" /></div>
                  <div><label style={labelStyle}>Conteudo</label><textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} value={novoArtigo.conteudo} onChange={e => setNovoArtigo(a => ({ ...a, conteudo: e.target.value }))} placeholder="Conteudo do artigo..." /></div>
                  <div><label style={labelStyle}>Imagem (URL)</label><input style={inputStyle} value={novoArtigo.imagem} onChange={e => setNovoArtigo(a => ({ ...a, imagem: e.target.value }))} /></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" id="pub-novo" checked={novoArtigo.publicado} onChange={e => setNovoArtigo(a => ({ ...a, publicado: e.target.checked }))} />
                    <label htmlFor="pub-novo" style={{ fontSize: 13, color: '#374151' }}>Publicar imediatamente</label>
                  </div>
                  <button type="submit" style={{ background: '#111827', color: '#fff', border: 'none', padding: '11px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', alignSelf: 'flex-start' }}>Criar Artigo</button>
                </form>
              </div>
            )}

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111827' }}>
                Artigos ({artigos.length})
              </div>
              {artigos.length === 0 && <p style={{ padding: 24, color: '#9ca3af', textAlign: 'center' }}>Nenhum artigo ainda.</p>}
              {artigos.map(a => (
                <div key={a.id} style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{a.titulo}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{new Date(a.created_at).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: a.publicado ? '#dcfce7' : '#f3f4f6', color: a.publicado ? '#15803d' : '#9ca3af' }}>
                    {a.publicado ? 'Publicado' : 'Rascunho'}
                  </span>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => togglePublicar(a)} style={{ background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
                      {a.publicado ? 'Despublicar' : 'Publicar'}
                    </button>
                    <button onClick={() => setEditandoArtigo(a)} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
                      Editar
                    </button>
                    <button onClick={() => deletarArtigo(a.id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
