'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EquipeLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const r = await fetch('/api/equipe/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      const d = await r.json();
      if (!r.ok) { setErro(d.error || 'Erro ao autenticar'); return; }
      router.push(`/equipe/${d.token}`);
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 6px' }}>Portal da Equipe</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>PeptideZ Health — Acesso restrito</p>
        </div>

        <form onSubmit={handleLogin} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              E-mail
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="seu@email.com"
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Senha
            </label>
            <input
              type="password" value={senha} onChange={e => setSenha(e.target.value)}
              required placeholder="••••••••"
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {erro && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>
              {erro}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ background: '#111827', color: '#fff', fontWeight: 700, padding: '13px 0', borderRadius: 8, border: 'none', cursor: loading ? 'default' : 'pointer', fontSize: 15, fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#9ca3af' }}>
          Apenas membros cadastrados pelo administrador podem acessar.
        </p>
      </div>
    </div>
  );
}
