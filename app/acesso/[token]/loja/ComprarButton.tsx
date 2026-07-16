'use client';

export default function ComprarButton({ token, produtoId, nome, preco }: {
  token: string; produtoId: string | number; nome: string; preco: number;
}) {
  return (
    <form action="/api/checkout" method="POST">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="produtoId" value={produtoId} />
      <input type="hidden" name="nome" value={nome} />
      <input type="hidden" name="preco" value={preco} />
      <button
        type="submit"
        style={{
          width: '100%', background: '#111827', color: '#fff',
          border: 'none', padding: '11px 0', borderRadius: 8,
          cursor: 'pointer', fontWeight: 700, fontSize: 13,
          fontFamily: 'inherit', letterSpacing: 0.5,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#374151'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#111827'; }}
      >
        COMPRAR AGORA
      </button>
    </form>
  );
}
