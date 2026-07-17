import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_listarPedidosPorVendedor, mem_listarPedidos, mem_atualizarPedido } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

export async function GET(req: NextRequest) {
  await reloadFromSupabase();
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  if (membro.cargo === 'vendedor') {
    return NextResponse.json(mem_listarPedidosPorVendedor(membro.id));
  }
  // gerente/superadmin vê todos
  if (membro.cargo === 'gerente' || membro.cargo === 'superadmin') {
    return NextResponse.json(mem_listarPedidos());
  }
  return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id, status, obs } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  const pedido = mem_atualizarPedido(id, { status, obs });
  if (!pedido) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  return NextResponse.json(pedido);
}
