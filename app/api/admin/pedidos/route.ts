import { NextRequest, NextResponse } from 'next/server';
import { mem_listarPedidos, mem_atualizarPedido } from '@/lib/db-memory';

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === (process.env.ADMIN_PASSWORD || 'peptidez2025');
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  return NextResponse.json(mem_listarPedidos());
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  const { id, status, obs } = await req.json();
  if (!id || !status) return NextResponse.json({ error: 'id e status obrigatorios' }, { status: 400 });
  const p = mem_atualizarPedido(id, { status, obs });
  if (!p) return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 });
  return NextResponse.json(p);
}
