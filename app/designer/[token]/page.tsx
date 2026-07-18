import { redirect } from 'next/navigation';
import { mem_buscarMembroPorToken, mem_listarProdutos, mem_seedProdutos } from '@/lib/db-memory';
import { PRODUTOS } from '@/lib/produtos';
import DesignerPortal from './DesignerPortal';

export default async function DesignerPage({ params, searchParams }: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const { token } = await params;

  const membro = mem_buscarMembroPorToken(token);
  if (!membro || !['designer', 'superadmin', 'gerente'].includes(membro.cargo)) {
    redirect('/equipe/login');
  }

  mem_seedProdutos(PRODUTOS);
  const produtos = mem_listarProdutos();

  return (
    <DesignerPortal
      membro={{ id: membro.id, nome: membro.nome, cargo: membro.cargo }}
      produtos={produtos}
      token={token}
      initialSection="produtos"
    />
  );
}
