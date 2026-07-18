import { mem_buscarToken } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';
import IndicarClient from './IndicarClient';

export default async function IndicarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await reloadFromSupabase();
  const medico = mem_buscarToken(token);

  if (!medico) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
        <div>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🔒</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12, color: '#111827' }}>Link Inválido</h1>
          <p style={{ color: '#6b7280' }}>Este link de indicação não é válido ou expirou.</p>
        </div>
      </div>
    );
  }

  const medicoNome = `${medico.nome} ${medico.sobrenome || ''}`.trim();
  return <IndicarClient token={token} medicoNome={medicoNome} />;
}
