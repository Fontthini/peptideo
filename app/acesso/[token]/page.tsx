import Link from 'next/link';
import { mem_buscarToken, mem_getConfig } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';
import CardsGrid from './CardsGrid';

async function getUsuario(token: string) {
  await reloadFromSupabase();
  return mem_buscarToken(token);
}

export default async function AcessoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const usuario = await getUsuario(token);
  const cfg = mem_getConfig();

  if (!usuario) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
        <div>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🔒</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: '#111827' }}>Acesso Inválido</h1>
          <p style={{ color: '#6b7280', marginBottom: 32 }}>Este link não é válido ou expirou.</p>
          <Link href="/" style={{ background: '#111827', color: '#fff', padding: '12px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>
            Solicitar Acesso
          </Link>
        </div>
      </div>
    );
  }

  const waNumero = cfg.whatsapp_numero || '5511999999999';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <style>{`
        .acesso-header { padding: 14px 24px; }
        @media (max-width: 480px) { .acesso-header { padding: 10px 14px; } }

        .acesso-nav { padding: 0 24px; overflow-x: auto; }
        .acesso-nav-link { padding: 13px 22px; }
        @media (max-width: 480px) { .acesso-nav { padding: 0 8px; } .acesso-nav-link { padding: 10px 10px !important; font-size: 12px !important; white-space: nowrap; } }

        .acesso-container { padding: 40px 24px; }
        @media (max-width: 480px) { .acesso-container { padding: 24px 14px; } }
      `}</style>

      <header className="acesso-header" style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <img src={cfg.logo || 'https://peptideos.drfamily.com.br/wp-content/uploads/2026/06/cropped-pep.jpg'}
          alt="PeptideZ" style={{ height: 40, maxWidth: 160, objectFit: 'contain' }} />
        <div style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>{usuario.nome}</div>
      </header>

      <nav className="acesso-nav" style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex' }}>
        {[
          { href: `/acesso/${token}`, label: '🏠 Início' },
          { href: `/acesso/${token}/loja`, label: '🛒 Loja' },
          { href: `/acesso/${token}/blog`, label: '📚 Blog' },
        ].map(item => (
          <Link key={item.href} href={item.href} className="acesso-nav-link" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="acesso-container" style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Welcome banner */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '32px 36px', marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div>
            <div style={{ color: '#16a34a', fontWeight: 700, fontSize: 13, marginBottom: 6, letterSpacing: 0.5 }}>BEM-VINDO DE VOLTA</div>
            <h1 style={{ fontSize: 30, fontWeight: 900, color: '#111827', margin: '0 0 10px' }}>
              Olá, {usuario.nome.split(' ')[0]}! 👋
            </h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: 15 }}>
              Seu acesso à plataforma exclusiva PeptideZ Health está ativo.
            </p>
          </div>
          <Link href={`/acesso/${token}/loja`} style={{ background: '#111827', color: '#fff', padding: '13px 28px', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: 14, whiteSpace: 'nowrap' }}>
            Ver Loja →
          </Link>
        </div>

        {/* Cards */}
        <CardsGrid token={token} waNumero={waNumero} />
      </div>
    </div>
  );
}
