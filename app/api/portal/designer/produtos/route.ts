import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_listarProdutos, mem_editarProduto, mem_seedProdutos } from '@/lib/db-memory';
import { PRODUTOS } from '@/lib/produtos';

function checkDesigner(req: NextRequest) {
  const token = req.headers.get('x-member-token') || '';
  const m = mem_buscarMembroPorToken(token);
  return m && ['designer', 'superadmin', 'gerente'].includes(m.cargo) ? m : null;
}

export async function GET(req: NextRequest) {
  if (!checkDesigner(req)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  mem_seedProdutos(PRODUTOS);
  return NextResponse.json(mem_listarProdutos());
}

export async function PUT(req: NextRequest) {
  if (!checkDesigner(req)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const data = await req.json();
  if (!data.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  const { id, ...rest } = data;
  const p = mem_editarProduto(id, rest);
  if (!p) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  return NextResponse.json(p);
}
