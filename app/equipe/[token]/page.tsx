import { redirect } from 'next/navigation';
import { mem_buscarMembroPorToken, mem_listar, mem_listarEquipe } from '@/lib/db-memory';
import PortalClient from './PortalClient';

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const membro = mem_buscarMembroPorToken(token);
  if (!membro) redirect('/equipe/login');

  const leads = mem_listar();
  const equipe = mem_listarEquipe();

  return <PortalClient membro={membro} leads={leads} equipe={equipe} token={token} />;
}
