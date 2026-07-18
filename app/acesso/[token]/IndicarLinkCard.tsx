'use client';
import { useState } from 'react';

export default function IndicarLinkCard({ token }: { token: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = () => {
    const url = `${window.location.origin}/indicar/${token}`;
    navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: 42, marginBottom: 14 }}>🔗</div>
      <h3 style={{ fontSize: 19, fontWeight: 800, color: '#111827', marginBottom: 8, marginTop: 0 }}>Indicar Paciente</h3>
      <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
        Copie seu link exclusivo e envie para seus pacientes se cadastrarem já vinculados a você.
      </p>
      <button onClick={copiar} style={{
        background: copiado ? '#dcfce7' : '#f0fdf4', color: '#15803d', border: '1px solid #86efac',
        padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
      }}>
        {copiado ? '✓ Link copiado!' : 'Copiar meu link →'}
      </button>
    </div>
  );
}
