'use client';
import Link from 'next/link';
import { useState } from 'react';

const cardStyle: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', height: '100%' };
const ctaLinkStyle: React.CSSProperties = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#16a34a', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' };

function track(card: string) {
  fetch('/api/acesso/click', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card }),
  }).catch(() => {});
}

export default function CardsGrid({ token, waNumero }: { token: string; waNumero: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiarLink = () => {
    track('indicar');
    const url = `${window.location.origin}/indicar/${token}`;
    navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
      <Link href={`/acesso/${token}/loja`} onClick={() => track('loja')} style={{ textDecoration: 'none' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 42, marginBottom: 14 }}>🛒</div>
          <h3 style={{ fontSize: 19, fontWeight: 800, color: '#111827', marginBottom: 8, marginTop: 0 }}>Loja Completa</h3>
          <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
            20+ peptídeos organizados por categoria. Emagrecimento, cognição, regeneração e mais.
          </p>
          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 14 }}>Acessar loja →</span>
        </div>
      </Link>

      <Link href={`/acesso/${token}/blog`} onClick={() => track('blog')} style={{ textDecoration: 'none' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 42, marginBottom: 14 }}>📚</div>
          <h3 style={{ fontSize: 19, fontWeight: 800, color: '#111827', marginBottom: 8, marginTop: 0 }}>Blog Especializado</h3>
          <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
            Artigos técnicos e científicos sobre peptídeos, protocolos e aplicações clínicas.
          </p>
          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 14 }}>Ler artigos →</span>
        </div>
      </Link>

      <div style={cardStyle}>
        <div style={{ fontSize: 42, marginBottom: 14 }}>🔗</div>
        <h3 style={{ fontSize: 19, fontWeight: 800, color: '#111827', marginBottom: 8, marginTop: 0 }}>Indicar Paciente</h3>
        <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
          Copie seu link exclusivo e envie para seus pacientes se cadastrarem já vinculados a você.
        </p>
        <button onClick={copiarLink} style={{
          background: copiado ? '#dcfce7' : '#f0fdf4', color: '#15803d', border: '1px solid #86efac',
          padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
        }}>
          {copiado ? '✓ Link copiado!' : 'Copiar meu link →'}
        </button>
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 42, marginBottom: 14 }}>💬</div>
        <h3 style={{ fontSize: 19, fontWeight: 800, color: '#111827', marginBottom: 8, marginTop: 0 }}>Suporte</h3>
        <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
          Dúvidas sobre produtos, protocolos ou pedidos? Fale diretamente conosco.
        </p>
        <a href={`https://wa.me/${waNumero}`} target="_blank" rel="noreferrer" onClick={() => track('suporte')}
          style={{ color: '#16a34a', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
          WhatsApp →
        </a>
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 42, marginBottom: 14 }}>🎓</div>
        <h3 style={{ fontSize: 19, fontWeight: 800, color: '#111827', marginBottom: 8, marginTop: 0 }}>Mentoria Sobre Peptídeos</h3>
        <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
          Acompanhamento e orientação especializada para aplicar peptídeos na sua prática clínica.
        </p>
        <button onClick={() => track('mentoria')} style={ctaLinkStyle}>
          Saiba mais →
        </button>
      </div>
    </div>
  );
}
