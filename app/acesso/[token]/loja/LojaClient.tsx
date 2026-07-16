'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { ProdutoUnificado } from './page';

type CartItem = { produto: ProdutoUnificado; quantidade: number };

type BannerProp = { imagem: string; titulo: string; subtitulo: string };

export default function LojaClient({
  token, nomeUsuario, sobrenomeUsuario, whatsappUsuario, produtos, categorias, whatsappNumero, banners,
}: {
  token: string;
  nomeUsuario: string;
  sobrenomeUsuario: string;
  whatsappUsuario: string;
  produtos: ProdutoUnificado[];
  categorias: string[];
  whatsappNumero: string;
  banners: BannerProp[];
}) {
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [siteLogo, setSiteLogo] = useState('https://peptideos.drfamily.com.br/wp-content/uploads/2026/06/cropped-pep.jpg');
  const [toast, setToast] = useState('');
  const [slide, setSlide] = useState(0);
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [produtoDetalhe, setProdutoDetalhe] = useState<ProdutoUnificado | null>(null);
  const [carouselIdx, setCarouselIdx] = useState(0);

  useEffect(() => {
    const sc = (window as any).__SC__;
    if (sc?.logo) setSiteLogo(sc.logo);
  }, []);

  useEffect(() => {
    setCarouselIdx(0);
  }, [produtoDetalhe?.id]);

  const slideBanners = banners.length > 0 ? banners : [
    { imagem: '/banners/banner1.svg', titulo: '', subtitulo: '' },
  ];

  useEffect(() => {
    if (slideBanners.length <= 1) return;
    const t = setInterval(() => setSlide(s => (s + 1) % slideBanners.length), 5000);
    return () => clearInterval(t);
  }, [slideBanners.length]);

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((s, i) => s + i.quantidade, 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.produto.preco * i.quantidade, 0);

  const addToCart = (prod: ProdutoUnificado) => {
    setCart(prev => ({
      ...prev,
      [prod.id]: { produto: prod, quantidade: (prev[prod.id]?.quantidade || 0) + 1 },
    }));
    setToast(prod.nome);
    setTimeout(() => setToast(''), 2200);
  };

  const changeQty = (id: string, delta: number) => {
    setCart(prev => {
      const cur = prev[id];
      if (!cur) return prev;
      const next = cur.quantidade + delta;
      if (next <= 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { ...cur, quantidade: next } };
    });
  };

  const finalizarPedido = async () => {
    if (cartItems.length === 0) return;
    const linhas = cartItems.map(i =>
      `🧪 *${i.produto.nome}${i.produto.dose ? ' ' + i.produto.dose : ''}* — R$ ${i.produto.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (x${i.quantidade})`
    ).join('\n');
    const nomeCompleto = `${nomeUsuario} ${sobrenomeUsuario}`.trim();
    const msg = `Olá! Gostaria de fazer um pedido na PeptideZ Health:\n\n${linhas}\n\n📦 *Total: R$ ${cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\n👤 *Cliente:* ${nomeCompleto}\n📱 *WhatsApp:* ${whatsappUsuario}`;

    // Registra o pedido no sistema (em paralelo com abertura do WA)
    const itens = cartItems.map(i => ({ nome: i.produto.nome, preco: i.produto.preco, quantidade: i.quantidade }));
    fetch('/api/portal/pedido-cliente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_token: token, itens, total: cartTotal }),
    }).catch(() => {});

    window.open(`https://wa.me/${whatsappNumero}?text=${encodeURIComponent(msg)}`, '_blank');
    setCart({});
    setCartOpen(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#111827' }}>

      {/* Toast notification */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#111827', color: '#fff', padding: '12px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14, zIndex: 1000, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>
          ✅ {toast} adicionado ao carrinho!
        </div>
      )}

      {/* Cart drawer overlay */}
      {cartOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500 }}>
          <div onClick={() => setCartOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 380, background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>🛒 Carrinho ({cartCount})</div>
              <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>

            {cartItems.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 15, padding: 40, textAlign: 'center', gap: 12 }}>
                <div style={{ fontSize: 48 }}>🛒</div>
                Carrinho vazio.<br />Adicione produtos para continuar.
              </div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px' }}>
                  {cartItems.map(item => (
                    <div key={item.produto.id} style={{ padding: '14px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 12, alignItems: 'center' }}>
                      <img src={item.produto.imagem || '/produtos/frasco.svg'} alt={item.produto.nome}
                        style={{ width: 52, height: 52, objectFit: 'contain', background: '#f9fafb', borderRadius: 6, flexShrink: 0 }}
                        onError={e => { (e.target as HTMLImageElement).src = '/produtos/frasco.svg'; }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', lineHeight: 1.3 }}>{item.produto.nome}</div>
                        {item.produto.dose && <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.produto.dose}</div>}
                        <div style={{ fontWeight: 800, color: '#111827', fontSize: 14, marginTop: 4 }}>
                          R$ {(item.produto.preco * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => changeQty(item.produto.id, -1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: 'center' }}>{item.quantidade}</span>
                        <button onClick={() => changeQty(item.produto.id, 1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '16px 24px 28px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 16, fontWeight: 800, color: '#111827' }}>
                    <span>Total</span>
                    <span>R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <button onClick={finalizarPedido} style={{ width: '100%', background: '#25D366', color: '#fff', fontWeight: 800, fontSize: 15, padding: '14px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>📱</span> Finalizar via WhatsApp
                  </button>
                  <button onClick={() => setCartOpen(false)} style={{ width: '100%', marginTop: 10, background: 'transparent', color: '#6b7280', fontWeight: 600, fontSize: 13, padding: '10px 0', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Continuar Comprando
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de detalhe do produto */}
      {produtoDetalhe && (() => {
        const videoId = (produtoDetalhe.video || '').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
        type Slide = { type: 'image'; url: string } | { type: 'video'; videoId: string };
        const slides: Slide[] = [
          { type: 'image', url: produtoDetalhe.imagem || '/produtos/frasco.svg' },
          ...(videoId ? [{ type: 'video' as const, videoId }] : []),
          ...(produtoDetalhe.galeria || []).filter(Boolean).map(url => ({ type: 'image' as const, url })),
        ];
        const currentSlide = slides[carouselIdx] ?? slides[0];
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 700, overflowY: 'auto', padding: '24px 16px' }}>
            <div onClick={() => setProdutoDetalhe(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
            <div style={{ position: 'relative', maxWidth: 860, margin: '0 auto', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
              <button onClick={() => setProdutoDetalhe(null)} style={{ position: 'absolute', top: 14, right: 14, background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 20, cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>×</button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 480 }}>

                {/* Esquerda: carrossel */}
                <div style={{ background: '#f9fafb', padding: 24, display: 'flex', flexDirection: 'column', gap: 14, borderRight: '1px solid #e5e7eb' }}>
                  {/* Slide */}
                  <div style={{ flex: 1, position: 'relative', minHeight: 280, background: '#fff', borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {currentSlide.type === 'image' ? (
                      <img src={currentSlide.url} alt={produtoDetalhe.nome}
                        style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain', padding: 12 }}
                        onError={e => { (e.target as HTMLImageElement).src = '/produtos/frasco.svg'; }} />
                    ) : (
                      <iframe
                        src={`https://www.youtube.com/embed/${currentSlide.videoId}`}
                        style={{ width: '100%', height: '100%', minHeight: 280, border: 'none' }}
                        allowFullScreen />
                    )}
                    {/* Setas */}
                    {slides.length > 1 && (
                      <>
                        <button
                          onClick={() => setCarouselIdx(i => (i - 1 + slides.length) % slides.length)}
                          style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.42)', color: '#fff', border: 'none', borderRadius: '50%', width: 34, height: 34, fontSize: 19, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>‹</button>
                        <button
                          onClick={() => setCarouselIdx(i => (i + 1) % slides.length)}
                          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.42)', color: '#fff', border: 'none', borderRadius: '50%', width: 34, height: 34, fontSize: 19, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>›</button>
                      </>
                    )}
                    {/* Badge tipo do slide */}
                    {currentSlide.type === 'video' && (
                      <div style={{ position: 'absolute', top: 8, left: 8, background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8 }}>▶ Vídeo</div>
                    )}
                  </div>
                  {/* Dots */}
                  {slides.length > 1 && (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {slides.map((s, i) => (
                        <button key={i} onClick={() => setCarouselIdx(i)}
                          title={s.type === 'video' ? '▶ Vídeo' : `Foto ${i + 1}`}
                          style={{ width: i === carouselIdx ? 22 : 9, height: 9, borderRadius: 5, border: 'none', padding: 0, cursor: 'pointer', background: i === carouselIdx ? (s.type === 'video' ? '#dc2626' : '#16a34a') : '#d1d5db', transition: 'all 0.2s', flexShrink: 0 }} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Direita: detalhes */}
                <div style={{ padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', overflowY: 'auto', maxHeight: '85vh' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                    {produtoDetalhe.categoria}
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 900, color: '#111827', margin: '0 0 4px', lineHeight: 1.2 }}>
                    {produtoDetalhe.nome}
                  </h2>
                  {produtoDetalhe.dose && (
                    <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 14 }}>{produtoDetalhe.dose}</div>
                  )}
                  {produtoDetalhe.descricao && (
                    <p style={{ color: '#374151', fontSize: 14, lineHeight: 1.75, margin: '0 0 18px' }}>
                      {produtoDetalhe.descricao}
                    </p>
                  )}
                  {videoId && (
                    <div style={{ marginBottom: 14 }}>
                      <button onClick={() => { const vi = slides.findIndex(s => s.type === 'video'); if (vi >= 0) setCarouselIdx(vi); }}
                        style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '7px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                        ▶ Ver vídeo no carrossel
                      </button>
                    </div>
                  )}
                  <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 14 }}>
                      <span style={{ fontSize: 14, color: '#9ca3af' }}>R$</span>
                      <span style={{ fontSize: 34, fontWeight: 900, color: '#111827' }}>
                        {produtoDetalhe.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <button onClick={() => { addToCart(produtoDetalhe); setProdutoDetalhe(null); }}
                      style={{ width: '100%', background: '#111827', color: '#fff', border: 'none', padding: '13px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', marginBottom: 10 }}>
                      + Adicionar ao Carrinho
                    </button>
                    <button onClick={() => setProdutoDetalhe(null)}
                      style={{ width: '100%', background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', padding: '11px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
                      Fechar
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={siteLogo}
            alt="PeptideZ" style={{ height: 40, maxWidth: 160, objectFit: 'contain' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', lineHeight: 1 }}>PeptideZ Health</div>
            <div style={{ fontSize: 10, color: '#16a34a', letterSpacing: 1.5, marginTop: 2 }}>LOJA EXCLUSIVA</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>👤 {nomeUsuario.split(' ')[0]}</div>
          <button onClick={() => setCartOpen(true)} style={{ position: 'relative', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            🛒 Carrinho
            {cartCount > 0 && (
              <span style={{ background: '#16a34a', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{cartCount}</span>
            )}
          </button>
        </div>
      </header>

      {/* Nav */}
      <nav style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '0 24px', display: 'flex' }}>
        {[
          { href: `/acesso/${token}`, label: '🏠 Início' },
          { href: `/acesso/${token}/loja`, label: '🛒 Loja' },
          { href: `/acesso/${token}/blog`, label: '📚 Blog' },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{ padding: '12px 20px', color: '#6b7280', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Carousel */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#0f172a' }}>
        <div style={{ display: 'flex', transition: 'transform 0.5s ease', transform: `translateX(-${slide * 100}%)`, willChange: 'transform' }}>
          {slideBanners.map((b, i) => (
            <img key={i} src={b.imagem} alt={b.titulo || 'Banner'} style={{ width: '100%', flexShrink: 0, display: 'block', objectFit: 'cover' }} />
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

      {/* Barra de busca + filtros */}
      <div style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Campo de busca */}
          <div style={{ position: 'relative', maxWidth: 420 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 15 }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar produto..."
              value={busca}
              onChange={e => { setBusca(e.target.value); setCategoriaAtiva(null); }}
              style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff', boxSizing: 'border-box', color: '#111827' }}
            />
            {busca && (
              <button onClick={() => setBusca('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
            )}
          </div>
          {/* Pills de categoria */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setCategoriaAtiva(null); setBusca(''); }}
              style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${!categoriaAtiva && !busca ? '#111827' : '#d1d5db'}`, background: !categoriaAtiva && !busca ? '#111827' : '#fff', color: !categoriaAtiva && !busca ? '#fff' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Todos
            </button>
            {categorias.filter(cat => produtos.some(p => p.categoria === cat)).map(cat => (
              <button key={cat}
                onClick={() => { setCategoriaAtiva(cat); setBusca(''); }}
                style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${categoriaAtiva === cat ? '#16a34a' : '#d1d5db'}`, background: categoriaAtiva === cat ? '#16a34a' : '#fff', color: categoriaAtiva === cat ? '#fff' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {(() => {
          const termoBusca = busca.toLowerCase().trim();
          const categsFiltradas = categoriaAtiva ? [categoriaAtiva] : categorias;

          return categsFiltradas.map(cat => {
            let prods = produtos.filter(p => p.categoria === cat);
            if (termoBusca) prods = prods.filter(p =>
              p.nome.toLowerCase().includes(termoBusca) ||
              p.descricao.toLowerCase().includes(termoBusca) ||
              p.dose.toLowerCase().includes(termoBusca)
            );
            if (!prods.length) return null;
            return (
              <section key={cat} style={{ marginBottom: 52 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: '#111827' }}>{cat}</h2>
                  <div style={{ height: 1, flex: 1, background: '#e5e7eb' }} />
                  <span style={{ color: '#9ca3af', fontSize: 12 }}>{prods.length} {prods.length === 1 ? 'produto' : 'produtos'}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                  {prods.map(prod => (
                    <div key={prod.id}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
                      style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s' }}>
                      <div onClick={() => setProdutoDetalhe(prod)} style={{ background: '#f9fafb', height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #e5e7eb', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}>
                        <img src={prod.imagem || '/produtos/frasco.svg'} alt={prod.nome}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 12 }}
                          onError={e => { (e.target as HTMLImageElement).src = '/produtos/frasco.svg'; }} />
                        <div style={{ position: 'absolute', top: 8, left: 8, background: '#16a34a', color: '#fff', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                          {cat}
                        </div>
                        {(prod.galeria?.length || 0) > 0 && (
                          <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8 }}>
                            +{prod.galeria!.length} fotos
                          </div>
                        )}
                        {prod.video && (
                          <div style={{ position: 'absolute', bottom: 8, left: 8, background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8 }}>
                            ▶ vídeo
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 onClick={() => setProdutoDetalhe(prod)} style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 3px', lineHeight: 1.3, cursor: 'pointer' }}>{prod.nome}</h3>
                        {prod.dose && <p style={{ color: '#9ca3af', fontSize: 11, margin: '0 0 4px' }}>{prod.dose}</p>}
                        <p style={{ color: '#6b7280', fontSize: 12, lineHeight: 1.5, flex: 1, margin: '0 0 8px', overflow: 'hidden', maxHeight: '3.6em' }}>{prod.descricao}</p>
                        <button onClick={() => setProdutoDetalhe(prod)} style={{ background: 'none', border: 'none', color: '#16a34a', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '0 0 10px', fontFamily: 'inherit', textAlign: 'left', textDecoration: 'underline' }}>
                          Ver detalhes →
                        </button>
                        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
                          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
                            <span style={{ fontSize: 12, color: '#9ca3af' }}>R$</span>
                            <span style={{ fontSize: 24, fontWeight: 900, color: '#111827' }}>
                              {prod.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <button onClick={() => addToCart(prod)}
                            onMouseEnter={e => { (e.currentTarget.style.background = '#16a34a'); }}
                            onMouseLeave={e => { (e.currentTarget.style.background = '#111827'); }}
                            style={{ width: '100%', background: '#111827', color: '#fff', border: 'none', padding: '11px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', transition: 'background 0.2s' }}>
                            + Adicionar ao Carrinho
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!termoBusca && !categoriaAtiva && Array.from({ length: prods.length % 4 === 0 ? 0 : 4 - (prods.length % 4) }).map((_, i) => (
                    <div key={`spacer-${i}`} style={{ visibility: 'hidden', borderRadius: 12 }} />
                  ))}
                </div>
              </section>
            );
          });
        })()}

        {busca && !categorias.some(cat => produtos.filter(p => p.categoria === cat && (p.nome.toLowerCase().includes(busca.toLowerCase()) || p.descricao.toLowerCase().includes(busca.toLowerCase()))).length > 0) && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Nenhum produto encontrado para "{busca}"</div>
            <button onClick={() => setBusca('')} style={{ marginTop: 16, background: '#111827', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 14 }}>
              Ver todos os produtos
            </button>
          </div>
        )}

        <div style={{ marginTop: 40, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#15803d', fontWeight: 700, margin: '0 0 4px' }}>🔒 Compra 100% Segura via WhatsApp</p>
          <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Adicione produtos ao carrinho · Finalize pelo WhatsApp · Cadeia de frio garantida</p>
        </div>
      </div>

      <footer style={{ background: '#111827', color: '#9ca3af', padding: '24px', textAlign: 'center', fontSize: 13, marginTop: 40 }}>
        © 2026 PeptideZ Health · Exclusivo para Prescrição Médica
      </footer>
    </div>
  );
}
