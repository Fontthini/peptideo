import { redirect } from 'next/navigation';
import { mem_buscarMembroPorToken, mem_listar, mem_listarEquipe, mem_getConfig } from '@/lib/db-memory';
import PortalClient from './PortalClient';

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  try { const { loadAllFromSupabase } = await import('@/lib/supabase-sync'); await loadAllFromSupabase(); } catch {}
  const { token } = await params;
  const membro = mem_buscarMembroPorToken(token);
  if (!membro) redirect('/equipe/login');

  const leads = mem_listar();
  const equipe = mem_listarEquipe();
  const logo = mem_getConfig().logo;

  return <PortalClient membro={membro} leads={leads} equipe={equipe} token={token} logo={logo} />;
}
