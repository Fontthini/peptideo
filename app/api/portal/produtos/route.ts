import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_listarProdutos } from '@/lib/db-memory';
import { ensureEquipe } from '@/lib/ensure-equipe';

// Somente leitura — estatisticas de produtos (views/cart_adds) para o
// Dashboard do portal (gerente/superadmin).
export async function GET(req: NextRequest) {
  await ensureEquipe();
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro || !['gerente', 'superadmin'].includes(membro.cargo)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  return NextResponse.json(mem_listarProdutos());
}
