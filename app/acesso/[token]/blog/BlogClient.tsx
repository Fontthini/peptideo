'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

type Material = { nome: string; url: string };
type Artigo = {
  id: string; titulo: string; conteudo: string; imagem?: string;
  video?: string; categoria?: string; materiais: Material[]; publicado: boolean;
  created_at: string; updated_at: string;
};
type BannerProp = { imagem: string; titulo: string; subtitulo: string };

export default function BlogClient({ token, nomeUsuario, artigos, banners }: {
  token: string; nomeUsuario: string; artigos: Artigo[]; banners: BannerProp[];
}) {
  const [artigoAberto, setArtigoAberto] = useState<Artigo | null>(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);
  const [siteLogo, setSiteLogo] = useState('https://peptideos.drfamily.com.br/wp-content/uploads/2026/06/cropped-pep.jpg');

  const slideBanners = banners.length > 0 ? banners : [
    { imagem: '/banners/banner1.svg', titulo: 'Área de Membros', subtitulo: 'Conteúdo exclusivo para profissionais de saúde' },
  ];

  useEffect(() => {
    const sc = (window as any).__SC__;
    if (sc?.logo) setSiteLogo(sc.logo);
  }, []);

  useEffect(() => {
    if (slideBanners.length <= 1) return;
    const t = setInterval(() => setSlide(s => (s + 1) % slideBanners.length), 5000);
    return () => clearInterval(t);
  }, [slideBanners.length]);

  const categorias = Array.from(new Set(artigos.map(a => a.categoria).filter(Boolean) as string[])).sort();

  const artigosFiltrados = categoriaAtiva
    ? artigos.filter(a => a.categoria === categoriaAtiva)
    : artigos;

  const getYoutubeId = (url: string) =>
    (url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/) || [])[1];

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#111827' }}>

      <style>{`
        .blog-header { padding: 14px 24px; }
        @media (max-width: 480px) { .blog-header { padding: 10px 14px; } }

        .blog-nav { padding: 0 24px; overflow-x: auto; }
        .blog-nav-link { padding: 12px 20px; }
        @media (max-width: 480px) { .blog-nav { padding: 0 8px; } .blog-nav-link { padding: 10px 10px !important; font-size: 12px !important; white-space: nowrap; } }

        .blog-pills { padding: 14px 24px; }
        @media (max-width: 480px) { .blog-pills { padding: 12px 14px; } }

        .blog-container { padding: 40px 24px; }
        @media (max-width: 480px) { .blog-container { padding: 24px 14px; } }

        .blog-modal-body { padding: 32px 36px 36px; }
        @media (max-width: 480px) { .blog-modal-body { padding: 20px 18px 24px; } }
      `}</style>

      {/* Modal artigo */}
      {artigoAberto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 700, overflowY: 'auto', padding: '24px 16px' }}>
          <div onClick={() => setArtigoAberto(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
          <div style={{ position: 'relative', maxWidth: 780, margin: '0 auto', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
            <button onClick={() => setArtigoAberto(null)} style={{ position: 'absolute', top: 14, right: 14, background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 20, cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            {artigoAberto.imagem && (
              <div style={{ height: 240, overflow: 'hidden' }}>
                <img src={artigoAberto.imagem} alt={artigoAberto.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div className="blog-modal-body">
              {artigoAberto.categoria && (
                <div style={{ display: 'inline-block', background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 20, marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  {artigoAberto.categoria}
                </div>
              )}
              <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: '0 0 8px', lineHeight: 1.2 }}>{artigoAberto.titulo}</h1>
              <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 24 }}>
                {new Date(artigoAberto.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
              {artigoAberto.conteudo && (
                <div style={{ color: '#374151', fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 28 }}>
                  {artigoAberto.conteudo}
                </div>
              )}
              {artigoAberto.video && getYoutubeId(artigoAberto.video) && (
                <div style={{ marginBottom: 28, borderRadius: 10, overflow: 'hidden', aspectRatio: '16/9' }}>
                  <iframe src={`https://www.youtube.com/embed/${getYoutubeId(artigoAberto.video!)}`}
                    style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                </div>
              )}
              {artigoAberto.materiais.length > 0 && (
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>📎 Materiais para Download</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {artigoAberto.materiais.map((m, i) => {
                      const href = m.url.startsWith('http') ? m.url : `${window.location.origin}${m.url.startsWith('/') ? '' : '/'}${m.url}`;
                      return (
                        <a key={i} href={href} target="_blank" rel="noreferrer" download
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none', color: '#111827', fontWeight: 600, fontSize: 14 }}>
                          <span style={{ fontSize: 20 }}>📄</span>
                          <span style={{ flex: 1 }}>{m.nome}</span>
                          <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 700 }}>Baixar ↓</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
              <button onClick={() => setArtigoAberto(null)} style={{ marginTop: 24, background: '#f3f4f6', border: 'none', color: '#374151', padding: '11px 24px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 14 }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="blog-header" style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={siteLogo}
            alt="PeptideZ" style={{ height: 40, maxWidth: 160, objectFit: 'contain' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', lineHeight: 1 }}>PeptideZ Health</div>
            <div style={{ fontSize: 10, color: '#16a34a', letterSpacing: 1.5, marginTop: 2 }}>ÁREA DE MEMBROS</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>{nomeUsuario.split(' ')[0]}</div>
      </header>

      {/* Nav */}
      <nav className="blog-nav" style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex' }}>
        {[
          { href: `/acesso/${token}`, label: '🏠 Início' },
          { href: `/acesso/${token}/loja`, label: '🛒 Loja' },
          { href: `/acesso/${token}/blog`, label: '📚 Blog' },
        ].map(item => (
          <Link key={item.href} href={item.href} className="blog-nav-link" style={{ color: item.href.endsWith('/blog') ? '#15803d' : '#6b7280', textDecoration: 'none', fontSize: 13, fontWeight: item.href.endsWith('/blog') ? 700 : 600, borderBottom: item.href.endsWith('/blog') ? '2px solid #16a34a' : '2px solid transparent' }}>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Carrossel de banners */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#0f172a' }}>
        <div style={{ display: 'flex', transition: 'transform 0.5s ease', transform: `translateX(-${slide * 100}%)`, willChange: 'transform' }}>
          {slideBanners.map((b, i) => (
            <div key={i} style={{ width: '100%', flexShrink: 0, position: 'relative', minHeight: 200 }}>
              <img src={b.imagem} alt={b.titulo || 'Banner'} style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: 320 }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              {(b.titulo || b.subtitulo) && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.38)', padding: '24px 32px', textAlign: 'center' }}>
                  {b.titulo && <div style={{ color: '#fff', fontSize: 26, fontWeight: 900, lineHeight: 1.2, textShadow: '0 2px 8px rgba(0,0,0,0.5)', marginBottom: 8 }}>{b.titulo}</div>}
                  {b.subtitulo && <div style={{ color: 'rgba(255,255,255,0.88)', fontSize: 14, fontWeight: 500, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{b.subtitulo}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
        {slideBanners.length > 1 && (
          <>
            <button onClick={() => setSlide(s => (s - 1 + slideBanners.length) % slideBanners.length)}
              style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none', borderRadius: '50%', width: 40, height: 40, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>‹</button>
            <button onClick={() => setSlide(s => (s + 1) % slideBanners.length)}
              style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none', borderRadius: '50%', width: 40, height: 40, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>›</button>
            <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 10 }}>
              {slideBanners.map((_, i) => (
                <button key={i} onClick={() => setSlide(i)} style={{ width: i === slide ? 24 : 8, height: 8, borderRadius: 4, border: 'none', background: i === slide ? '#22c55e' : 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 0, transition: 'all 0.3s' }} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Pills de categoria */}
      {categorias.length > 0 && (
        <div className="blog-pills" style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 4 }}>Filtrar:</span>
            <button
              onClick={() => setCategoriaAtiva(null)}
              style={{ padding: '5px 16px', borderRadius: 20, border: `1px solid ${!categoriaAtiva ? '#111827' : '#d1d5db'}`, background: !categoriaAtiva ? '#111827' : '#fff', color: !categoriaAtiva ? '#fff' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              Todos ({artigos.length})
            </button>
            {categorias.map(cat => {
              const count = artigos.filter(a => a.categoria === cat).length;
              return (
                <button key={cat}
                  onClick={() => setCategoriaAtiva(cat)}
                  style={{ padding: '5px 16px', borderRadius: 20, border: `1px solid ${categoriaAtiva === cat ? '#16a34a' : '#d1d5db'}`, background: categoriaAtiva === cat ? '#16a34a' : '#fff', color: categoriaAtiva === cat ? '#fff' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Grade de artigos */}
      <div className="blog-container" style={{ maxWidth: 1100, margin: '0 auto' }}>
        {categoriaAtiva && (
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>{categoriaAtiva}</h2>
            <button onClick={() => setCategoriaAtiva(null)} style={{ background: '#f3f4f6', border: 'none', color: '#6b7280', padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>× Limpar filtro</button>
          </div>
        )}
        {artigosFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{categoriaAtiva ? `Nenhum artigo em "${categoriaAtiva}"` : 'Nenhum artigo publicado ainda.'}</div>
            <p style={{ fontSize: 14, marginTop: 8 }}>Volte em breve!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {artigosFiltrados.map(a => (
              <div key={a.id}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
                style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s', display: 'flex', flexDirection: 'column' }}>
                {a.imagem ? (
                  <div style={{ height: 180, overflow: 'hidden', background: '#f9fafb', position: 'relative' }}>
                    <img src={a.imagem} alt={a.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {a.categoria && (
                      <div style={{ position: 'absolute', top: 10, left: 10, background: '#16a34a', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        {a.categoria}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ height: 100, background: 'linear-gradient(135deg, #0f172a 0%, #16a34a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <span style={{ fontSize: 36 }}>📚</span>
                    {a.categoria && (
                      <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: 0.5, textTransform: 'uppercase', backdropFilter: 'blur(4px)' }}>
                        {a.categoria}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                    {a.video && <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>▶ Vídeo</span>}
                    {a.materiais.length > 0 && <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>📎 {a.materiais.length} material{a.materiais.length > 1 ? 'is' : ''}</span>}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 8px', lineHeight: 1.3 }}>{a.titulo}</h3>
                  <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6, flex: 1, margin: '0 0 16px', overflow: 'hidden', maxHeight: '4.8em' }}>
                    {a.conteudo.substring(0, 140)}{a.conteudo.length > 140 ? '...' : ''}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
                    <span style={{ color: '#9ca3af', fontSize: 11 }}>
                      {new Date(a.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <button onClick={() => setArtigoAberto(a)}
                      style={{ background: '#111827', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}>
                      Ler artigo →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer style={{ background: '#111827', color: '#9ca3af', padding: '24px', textAlign: 'center', fontSize: 13, marginTop: 40 }}>
        © 2026 PeptideZ Health · Área Exclusiva para Membros
      </footer>
    </div>
  );
}
